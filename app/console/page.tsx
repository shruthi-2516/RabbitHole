'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import '@xyflow/react/dist/style.css';
import CustomNode from '@/components/CustomNode';

/* -------------------------------------------------------------------------- */
/*  Theme (same tokens as the landing page) + animated dot background          */
/* -------------------------------------------------------------------------- */

type Theme = 'dark' | 'light';

// Same key the landing page already uses
const THEME_KEY = 'rabbithole-theme';

const THEMES: Record<Theme, { vars: Record<string, string>; dot: string }> = {
  dark: {
    dot: '255,255,255',
    vars: {
      '--bg': '#0a0a0c',
      '--fg': '#ffffff',
      '--text': '#d4d4d4',
      '--muted': '#a3a3a3',
      '--subtle': '#737373',
      '--faint': '#2a2a2e',
      '--line': '#1c1c20',
      '--line-strong': '#2a2a30',
      '--card': 'rgba(16,16,20,0.82)',
      '--btn-bg': '#ffffff',
      '--btn-fg': '#0a0a0c',
      '--btn-hover': '#e5e5e5',
    },
  },
  light: {
    dot: '10,10,12',
    vars: {
      '--bg': '#fafaf9',
      '--fg': '#0a0a0c',
      '--text': '#262626',
      '--muted': '#525252',
      '--subtle': '#737373',
      '--faint': '#d4d4d4',
      '--line': '#e7e7e5',
      '--line-strong': '#d4d4d4',
      '--card': 'rgba(255,255,255,0.85)',
      '--btn-bg': '#0a0a0c',
      '--btn-fg': '#ffffff',
      '--btn-hover': '#262626',
    },
  },
};

/**
 * Shared theme state: restores the saved choice, applies the CSS variables to
 * <html>/<body>, persists changes and stays in sync across tabs.
 */
function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const { vars } = THEMES[theme];
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.style.backgroundColor = vars['--bg'];
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--fg'];
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return { theme, isDark: theme === 'dark', tokens: THEMES[theme], toggle };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Animated dot-matrix wave background (canvas, no dependencies).
 * - rgb:   dot colour as "r,g,b"
 * - alpha: dot opacity (lower it for dense UIs like the console)
 * - scrim: soft background-coloured patch behind hero copy (landing page only)
 */
function DotWaves({
  rgb,
  alpha = 0.5,
  scrim = true,
}: {
  rgb: string;
  alpha?: number;
  scrim?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const gap = w < 640 ? 16 : 14;
      const maxR = gap * 0.42;

      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.beginPath();
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const v =
            Math.sin(x * 0.0065 + Math.sin(y * 0.005 + t * 0.35) * 1.8 + t * 0.25) +
            Math.sin((x * 0.4 - y) * 0.006 - t * 0.3);
          const n = (v + 2) / 4;
          const r = 0.5 + smoothstep(0.45, 0.85, n) * (maxR - 0.5);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(0);
    };

    const loop = (now: number) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (reduceMotion) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [rgb, alpha]);

  const mask =
    'radial-gradient(ellipse 90% 80% at 50% 45%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 100%)';

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      />
      {scrim && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 34% 40%, color-mix(in srgb, var(--bg) 88%, transparent), transparent 80%)',
          }}
        />
      )}
    </>
  );
}

const nodeTypes = {
  customPageNode: CustomNode,
};

interface PageNodeData {
  id: number;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  visited_at: string;
  session_id?: number;
  parent_id?: number | null;
  snippets?: string[];
}

interface SessionData {
  id: number;
  title: string;
  created_at: string;
  session_overview?: string;
}

type DialogKind = 'create' | 'rename' | 'delete';

/* -------------------------------------------------------------------------- */
/*  Shared styling (same tokens and patterns as the landing page)              */
/* -------------------------------------------------------------------------- */

const CONTAINER = 'relative z-10 mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12';

const FIELD_LABEL = 'text-xs font-medium text-[color:var(--muted)]';

const CARD =
  'rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--card)] backdrop-blur';

const PANEL = `flex h-[680px] flex-col overflow-hidden ${CARD}`;

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded bg-[color:var(--btn-bg)] text-[color:var(--btn-fg)] font-medium text-xs shadow-sm transition-all duration-200 hover:bg-[color:var(--btn-hover)] active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

const BTN_GHOST =
  'inline-flex items-center justify-center rounded border border-[color:var(--line-strong)] bg-transparent text-xs font-medium text-[color:var(--muted)] transition-colors duration-200 hover:border-[color:var(--subtle)] hover:text-[color:var(--fg)] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

const BTN_DANGER =
  'inline-flex items-center justify-center rounded border border-[color:var(--line-strong)] bg-transparent text-xs font-medium text-[color:var(--muted)] transition-colors duration-200 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

const INPUT =
  'w-full select-text rounded border border-[color:var(--line-strong)] bg-[color:var(--bg)] px-3.5 py-2 text-sm text-[color:var(--fg)] transition-colors placeholder:text-[color:var(--subtle)] focus:border-[color:var(--subtle)] focus:outline-none';

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="flex h-8 w-8 items-center justify-center rounded text-[color:var(--muted)] transition-colors hover:text-[color:var(--fg)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${CARD} px-4 py-3.5 sm:px-5 sm:py-4`}>
      <p className={FIELD_LABEL}>{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[color:var(--fg)] sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm select-text rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--bg)] p-6 shadow-xl">
        <h2 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">{description}</p>
        )}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function formatVisited(iso: string) {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ConsoleDashboardPage() {
  const { theme, isDark, tokens, toggle: toggleTheme } = useTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [nodesData, setNodesData] = useState<PageNodeData[]>([]);
  const [sessionsList, setSessionsList] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'snippets'>('summary');
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const activeIdRef = useRef<number | null>(null);

  /* ------------------------------ DERIVED ------------------------------ */

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'var(--line-strong)', strokeWidth: 1.5 },
    }),
    []
  );

  const currentActiveSession = useMemo(() => {
    return (
      sessionsList.find((s) => s.id === activeSessionId) ?? sessionsList[0] ?? null
    );
  }, [activeSessionId, sessionsList]);

  useEffect(() => {
    activeIdRef.current = currentActiveSession?.id ?? null;
  }, [currentActiveSession]);

  const activeSessionNodes = useMemo(() => {
    const targetId = currentActiveSession?.id ?? null;
    return targetId ? nodesData.filter((node) => node.session_id === targetId) : [];
  }, [nodesData, currentActiveSession]);

  useEffect(() => {
    if (activeSessionNodes.length === 0) {
      if (selectedNodeId !== null) setSelectedNodeId(null);
      return;
    }
    if (!activeSessionNodes.some((n) => String(n.id) === selectedNodeId)) {
      setSelectedNodeId(String(activeSessionNodes[activeSessionNodes.length - 1].id));
    }
  }, [activeSessionNodes, selectedNodeId]);

  const highlightedNodeIds = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return new Set<string>();
    const term = searchQuery.toLowerCase().trim();
    return new Set(
      activeSessionNodes
        .filter(
          (n) =>
            (n.title || '').toLowerCase().includes(term) ||
            (n.summary || '').toLowerCase().includes(term)
        )
        .map((n) => String(n.id))
    );
  }, [activeSessionNodes, searchQuery]);

  const activeNodeDetails = useMemo(() => {
    return nodesData.find((node) => String(node.id) === selectedNodeId) || null;
  }, [nodesData, selectedNodeId]);

  const activeNodeHost = useMemo(() => {
    if (!activeNodeDetails) return '';
    try {
      return new URL(activeNodeDetails.url).hostname;
    } catch {
      return '';
    }
  }, [activeNodeDetails]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setPositions((prev) => {
      let next = prev;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (next === prev) next = { ...prev };
          next[change.id] = change.position;
        }
      }
      return next;
    });
  }, []);

  const flowNodes = useMemo<Node[]>(() => {
    const verticalSpacing = 150;
    const xCenterOffset = 180;
    const hasQuery = searchQuery.trim().length > 0;

    return activeSessionNodes.map((node, idx) => {
      let domainStr = 'web';
      try {
        domainStr = new URL(node.url).hostname;
      } catch (_) {}
      const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domainStr}&sz=32`;

      const id = String(node.id);
      const isMatch = highlightedNodeIds.has(id);
      const isSelected = id === selectedNodeId;

      return {
        id,
        type: 'customPageNode',
        position: positions[id] ?? {
          x: xCenterOffset,
          y: idx * verticalSpacing + 40,
        },
        data: {
          title: node.title,
          url: node.url,
          favicon_url: fallbackFavicon,
        },
        style: {
          width: '260px',
          opacity: hasQuery && !isMatch ? 0.35 : 1,
          border: isMatch
            ? '2px solid var(--fg)'
            : isSelected
            ? '1px solid var(--fg)'
            : '1px solid var(--line-strong)',
          boxShadow: isMatch
            ? '0 0 15px color-mix(in srgb, var(--fg) 15%, transparent)'
            : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      };
    });
  }, [activeSessionNodes, highlightedNodeIds, searchQuery, selectedNodeId, positions]);

  const flowEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < activeSessionNodes.length - 1; i++) {
      const currentNode = activeSessionNodes[i];
      const nextNode = activeSessionNodes[i + 1];
      const nextIsSelected = String(nextNode.id) === selectedNodeId;

      edges.push({
        id: `e-${currentNode.id}-${nextNode.id}`,
        source: String(currentNode.id),
        target: String(nextNode.id),
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: nextIsSelected ? 'var(--fg)' : 'var(--line-strong)',
          strokeWidth: nextIsSelected ? 2 : 1.5,
        },
      });
    }
    return edges;
  }, [activeSessionNodes, selectedNodeId]);

  const workspaceMetrics = useMemo(() => {
    const domains = new Set<string>();
    activeSessionNodes.forEach((node) => {
      try {
        domains.add(new URL(node.url).hostname);
      } catch (_) {}
    });

    let timeSpan = '—';
    const times = activeSessionNodes
      .map((n) => new Date(n.visited_at).getTime())
      .filter((t) => !Number.isNaN(t));
    if (times.length > 0) {
      const mins = Math.round((Math.max(...times) - Math.min(...times)) / 60000);
      timeSpan =
        mins < 1
          ? '< 1m'
          : mins < 60
          ? `${mins}m`
          : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }

    return {
      nodeCount: activeSessionNodes.length,
      domainCount: domains.size,
      timeSpan,
    };
  }, [activeSessionNodes]);

  /* ------------------------------ ACTIONS ------------------------------ */

  function openDialog(kind: DialogKind) {
    setDialogError(null);
    setDialogValue(kind === 'rename' ? currentActiveSession?.title ?? '' : '');
    setDialog(kind);
  }

  function closeDialog() {
    if (dialogBusy) return;
    setDialog(null);
  }

  async function submitDialog(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !dialog) return;

    setDialogBusy(true);
    setDialogError(null);

    try {
      if (dialog === 'create') {
        const title = dialogValue.trim() || `Chain #${sessionsList.length + 1}`;
        const { data, error } = await supabase
          .from('sessions')
          .insert([{ user_id: session.user.id, title }])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setActiveSessionId(data.id);
          setSessionsList((prev) =>
            prev.some((s) => s.id === data.id) ? prev : [data, ...prev]
          );
        }
      } else if (dialog === 'rename' && currentActiveSession) {
        const title = dialogValue.trim();
        if (!title) {
          setDialogError('Enter a name for this session.');
          return;
        }
        if (title !== currentActiveSession.title) {
          const { error } = await supabase
            .from('sessions')
            .update({ title })
            .eq('id', currentActiveSession.id);
          if (error) throw error;
          setSessionsList((prev) =>
            prev.map((s) => (s.id === currentActiveSession.id ? { ...s, title } : s))
          );
        }
      } else if (dialog === 'delete' && currentActiveSession) {
        const deletedId = currentActiveSession.id;
        const { error } = await supabase.from('sessions').delete().eq('id', deletedId);
        if (error) throw error;
        const remaining = sessionsList.filter((s) => s.id !== deletedId);
        setSessionsList(remaining);
        setNodesData((prev) => prev.filter((n) => n.session_id !== deletedId));
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDialog(null);
    } catch (err: any) {
      console.error('Session action failed:', err?.message);
      setDialogError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setDialogBusy(false);
    }
  }

  async function copySnippet(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch (err: any) {
      console.error('Failed to copy snippet:', err?.message);
    }
  }

  /* ------------------------------ AUTH + DATA ------------------------------ */

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthReady(true);
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      } else {
        localStorage.removeItem('sb-access-token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    let cancelled = false;

    async function fetchDashboardCoreData() {
      try {
        setLoading(true);

        const { data: sData, error: sErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (sErr) throw sErr;
        if (cancelled) return;

        const sessions = sData ?? [];
        setSessionsList(sessions);

        if (sessions.length === 0) {
          setNodesData([]);
          return;
        }

        const { data: pData, error: pErr } = await supabase
          .from('pages')
          .select('*')
          .in(
            'session_id',
            sessions.map((s) => s.id)
          )
          .order('visited_at', { ascending: true });
        if (pErr) throw pErr;
        if (!cancelled) setNodesData(pData ?? []);
      } catch (err: any) {
        console.error('[DB_FETCH_ERR]', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboardCoreData();

    const pagesChannel = supabase
      .channel(`pages_stream_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNode = payload.new as PageNodeData;
            setNodesData((prev) =>
              prev.some((n) => n.id === newNode.id) ? prev : [...prev, newNode]
            );
            if (newNode.session_id === activeIdRef.current) {
              setSelectedNodeId(String(newNode.id));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNode = payload.new as PageNodeData;
            setNodesData((prev) =>
              prev.map((n) => (n.id === updatedNode.id ? updatedNode : n))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldNode = payload.old as Partial<PageNodeData>;
            setNodesData((prev) => prev.filter((n) => n.id !== oldNode.id));
          }
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel(`sessions_stream_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
        (payload) => {
          const created = payload.new as SessionData;
          setSessionsList((prev) =>
            prev.some((s) => s.id === created.id) ? prev : [created, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updatedSession = payload.new as SessionData;
          setSessionsList((prev) =>
            prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sessions' },
        (payload) => {
          const removed = payload.old as Partial<SessionData>;
          if (removed.id === undefined) return;
          setSessionsList((prev) => prev.filter((s) => s.id !== removed.id));
          setNodesData((prev) => prev.filter((n) => n.session_id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(pagesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [session]);

  /* ------------------------------ RENDER ------------------------------ */

  const rootClass =
    'relative flex min-h-screen flex-col overflow-x-hidden bg-[color:var(--bg)] font-sans text-[color:var(--fg)] antialiased transition-colors duration-300 selection:bg-neutral-500/40';

  if (!authReady) {
    return (
      <div
        style={tokens.vars as React.CSSProperties}
        className={`${rootClass} items-center justify-center`}
      >
        <span className="text-xs text-[color:var(--subtle)]">Loading workspace…</span>
      </div>
    );
  }

  if (!session) {
    const v = tokens.vars;
    return (
      <div
        style={tokens.vars as React.CSSProperties}
        className={`${rootClass} items-center justify-center p-6`}
      >
        <DotWaves rgb={tokens.dot} alpha={0.35} scrim={false} />

        <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
          <Link
            href="/"
            className="px-2 py-1.5 text-xs font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--fg)]"
          >
            Home
          </Link>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        <div className={`${CARD} relative z-10 w-full max-w-md p-8`}>
          <div className="mb-6 text-center">
            <Link href="/" className="mb-4 inline-flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--fg)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text)]">
                RabbitHole
              </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">
              Sign in to your workspace
            </h1>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Open the console to see your learning maps.
            </p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: v['--btn-bg'],
                    brandAccent: v['--btn-hover'],
                    brandButtonText: v['--btn-fg'],
                    inputBackground: v['--bg'],
                    inputText: v['--fg'],
                    inputBorder: v['--line-strong'],
                    inputPlaceholder: v['--subtle'],
                    defaultButtonBackground: v['--bg'],
                    defaultButtonBorder: v['--line-strong'],
                    defaultButtonText: v['--fg'],
                  },
                },
              },
            }}
            theme={isDark ? 'dark' : 'default'}
            providers={[]}
          />
        </div>
      </div>
    );
  }

  const email = session.user.email ?? null;
  const initial = (email ?? '?').charAt(0).toUpperCase();

  return (
    <div style={tokens.vars as React.CSSProperties} className={`${rootClass} select-none`}>
      <DotWaves rgb={tokens.dot} alpha={0.28} scrim={false} />

      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <header className={`${CONTAINER} flex items-center justify-between gap-4 py-3.5`}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2" title="Back to home">
              <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--fg)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text)]">
                RabbitHole
              </span>
            </Link>
            <span className="text-[color:var(--line-strong)]" aria-hidden>
              /
            </span>
            <span className="text-sm font-medium text-[color:var(--text)]">Dashboard</span>
          </div>

          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="px-2.5 py-1.5 text-xs font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--fg)]"
            >
              Home
            </Link>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="mx-1 hidden h-5 w-px bg-[color:var(--line-strong)] sm:block" />
            <div className="hidden min-w-0 items-center gap-2 md:flex" title={email ?? undefined}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--card)] font-mono text-[10px] text-[color:var(--text)]">
                {initial}
              </span>
              <span className="max-w-[220px] truncate text-xs text-[color:var(--muted)]">
                {email ?? 'Signed in'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className={`${BTN_GHOST} ml-1 px-3 py-1.5`}
            >
              Sign out
            </button>
          </div>
        </header>
      </div>

      <main className={`${CONTAINER} flex-1 space-y-4 py-6 sm:py-8`}>
        {/* OVERVIEW */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat label="Pages captured" value={workspaceMetrics.nodeCount} />
          <Stat label="Unique domains" value={workspaceMetrics.domainCount} />
          <Stat label="Session duration" value={workspaceMetrics.timeSpan} />
        </div>

        {currentActiveSession && (
          <div className={`${CARD} flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4`}>
            <span className={`${FIELD_LABEL} shrink-0`}>Objective</span>
            <p className="text-sm leading-relaxed text-[color:var(--text)]">
              {currentActiveSession.session_overview ||
                'The session overview is still being generated.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* CANVAS */}
          <section className={PANEL}>
            <div className="flex flex-col gap-3 border-b border-[color:var(--line-strong)] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[color:var(--fg)]">Session canvas</h2>
                  <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">
                    {currentActiveSession
                      ? currentActiveSession.title
                      : 'Create a session to start mapping'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {currentActiveSession && (
                    <>
                      <button
                        onClick={() => openDialog('rename')}
                        className={`${BTN_GHOST} px-2.5 py-1.5`}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => openDialog('delete')}
                        className={`${BTN_DANGER} px-2.5 py-1.5`}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openDialog('create')}
                    className={`${BTN_PRIMARY} px-3 py-1.5`}
                  >
                    New session
                  </button>
                </div>
              </div>

              {sessionsList.length > 0 && (
                <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-0.5">
                  {sessionsList.map((s) => {
                    const isCurrent = currentActiveSession?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`max-w-[180px] flex-shrink-0 truncate px-3 py-1.5 ${
                          isCurrent ? BTN_PRIMARY : BTN_GHOST
                        }`}
                      >
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative flex-1">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-[color:var(--subtle)]">
                  Loading pages…
                </div>
              ) : sessionsList.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <h3 className="text-sm font-semibold text-[color:var(--text)]">
                    No sessions yet
                  </h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[color:var(--muted)]">
                    A session groups the pages you read on one topic. Create your first one to
                    start mapping.
                  </p>
                  <button
                    onClick={() => openDialog('create')}
                    className={`${BTN_PRIMARY} mt-5 px-4 py-2`}
                  >
                    Create session
                  </button>
                </div>
              ) : activeSessionNodes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-8 w-8 animate-spin items-center justify-center rounded-full border border-dashed border-[color:var(--line-strong)] [animation-duration:8s]">
                    <div className="h-2 w-2 rounded-full bg-[color:var(--subtle)]" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[color:var(--text)]">
                    No pages captured yet
                  </h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[color:var(--muted)]">
                    Turn on the Chrome extension and browse documentation. New pages will appear
                    here as nodes.
                  </p>
                </div>
              ) : (
                <ReactFlow
                  key={currentActiveSession?.id}
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  defaultEdgeOptions={defaultEdgeOptions}
                  colorMode={isDark ? 'dark' : 'light'}
                  style={{ background: 'transparent' }}
                  onNodesChange={onNodesChange}
                  fitView
                  minZoom={0.2}
                  maxZoom={1.5}
                  panOnScroll={true}
                  panOnScrollMode="free"
                  zoomOnScroll={false}
                  zoomOnPinch={true}
                  nodesDraggable={true}
                  elementsSelectable={true}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                >
                  <Background gap={24} size={1} color="var(--faint)" />
                </ReactFlow>
              )}
            </div>
          </section>

          {/* INSPECTOR */}
          <section className={PANEL}>
            <div className="flex flex-col gap-3 border-b border-[color:var(--line-strong)] px-5 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-5">
                  {(
                    [
                      ['summary', 'Summary'],
                      ['snippets', `Snippets (${activeNodeDetails?.snippets?.length || 0})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'border-[color:var(--fg)] text-[color:var(--fg)]'
                          : 'border-transparent text-[color:var(--subtle)] hover:text-[color:var(--muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {activeNodeDetails && (
                  <span className="rounded border border-[color:var(--line-strong)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--muted)]">
                    Page #{activeNodeDetails.id}
                  </span>
                )}
              </div>

              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--subtle)]"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search pages by title or summary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT} !py-2 !pl-9 !text-xs`}
                />
              </div>
            </div>

            <div className="flex-1 select-text overflow-y-auto p-6">
              {!activeNodeDetails ? (
                <div className="flex h-full items-center justify-center text-center text-xs text-[color:var(--subtle)]">
                  Select a node on the canvas to see its details.
                </div>
              ) : activeTab === 'summary' ? (
                <div className="space-y-6">
                  <div>
                    <a
                      href={activeNodeDetails.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-words text-lg font-semibold leading-snug tracking-tight text-[color:var(--fg)] hover:underline"
                    >
                      {activeNodeDetails.title || 'Untitled page'}
                    </a>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[color:var(--muted)]">
                      {activeNodeHost && <span className="font-mono">{activeNodeHost}</span>}
                      {activeNodeHost && activeNodeDetails.visited_at && (
                        <span className="text-[color:var(--line-strong)]">•</span>
                      )}
                      {activeNodeDetails.visited_at && (
                        <span>{formatVisited(activeNodeDetails.visited_at)}</span>
                      )}
                    </p>
                  </div>

                  <div className="border-t border-[color:var(--line)] pt-5">
                    <p className={`${FIELD_LABEL} mb-2`}>Summary</p>
                    <p className="text-sm leading-relaxed text-[color:var(--text)]">
                      {activeNodeDetails.summary || 'The summary is still being generated.'}
                    </p>
                  </div>

                  <div className="border-t border-[color:var(--line)] pt-5">
                    <p className={`${FIELD_LABEL} mb-2`}>Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {activeNodeDetails.tags && activeNodeDetails.tags.length > 0 ? (
                        activeNodeDetails.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="rounded border border-[color:var(--line-strong)] bg-[color:var(--card)] px-2.5 py-0.5 font-mono text-[11px] text-[color:var(--muted)]"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[color:var(--subtle)]">
                          No tags for this page yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeNodeDetails.snippets && activeNodeDetails.snippets.length > 0 ? (
                    activeNodeDetails.snippets.map((snip, i) => {
                      const snippetKey = `${activeNodeDetails.id}-${i}`;
                      const copied = copiedKey === snippetKey;
                      return (
                        <div
                          key={snippetKey}
                          className="group relative overflow-hidden rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--card)] transition-colors duration-200 hover:border-[color:var(--subtle)]"
                        >
                          <div className="flex items-center justify-between border-b border-[color:var(--line-strong)] px-3.5 py-2">
                            <span className="text-xs font-medium text-[color:var(--muted)]">
                              Snippet {i + 1}
                            </span>
                            <button
                              onClick={() => copySnippet(snippetKey, snip)}
                              className={`${BTN_GHOST} px-2 py-0.5 !text-[11px] transition-opacity duration-150 ${
                                copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="select-text whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-[color:var(--text)]">
                            {snip}
                          </pre>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--line-strong)] px-6 py-16 text-center">
                      <p className="text-sm font-medium text-[color:var(--text)]">
                        No snippets saved for this page
                      </p>
                      <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[color:var(--muted)]">
                        Highlight text or code on a page while the extension is on, and it will
                        be saved here.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <div className="relative z-10 border-t border-[color:var(--line)]">
        <footer
          className={`${CONTAINER} flex items-center justify-between py-6 font-mono text-[11px] text-[color:var(--subtle)]`}
        >
          <span>RabbitHole Workspace Engine</span>
          <span>© 2026</span>
        </footer>
      </div>

      {/* SESSION DIALOGS (replace the browser prompt/confirm popups) */}
      {dialog && (
        <Dialog
          title={
            dialog === 'create'
              ? 'New session'
              : dialog === 'rename'
              ? 'Rename session'
              : 'Delete session'
          }
          description={
            dialog === 'create'
              ? 'Give this session a name, or leave it blank to use a default.'
              : dialog === 'rename'
              ? 'Choose a new name for this session.'
              : `Delete "${currentActiveSession?.title}" and all pages captured in it? This can't be undone.`
          }
          onClose={closeDialog}
        >
          <form onSubmit={submitDialog}>
            {dialog !== 'delete' && (
              <input
                autoFocus
                type="text"
                value={dialogValue}
                onChange={(e) => setDialogValue(e.target.value)}
                placeholder="e.g. Learning Next.js routing"
                className={INPUT}
              />
            )}

            {dialogError && (
              <p className="mt-3 text-xs text-red-500" role="alert">
                {dialogError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={dialogBusy}
                className={`${BTN_GHOST} px-3.5 py-2`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dialogBusy}
                className={
                  dialog === 'delete'
                    ? 'inline-flex items-center justify-center rounded bg-red-500 px-3.5 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-red-600 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none'
                    : `${BTN_PRIMARY} px-3.5 py-2`
                }
              >
                {dialogBusy
                  ? 'Working…'
                  : dialog === 'create'
                  ? 'Create'
                  : dialog === 'rename'
                  ? 'Save'
                  : 'Delete'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}