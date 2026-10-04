'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
// Adjust this import to wherever your browser Supabase client lives.
import { supabase } from '@/lib/supabase';

/* -------------------------------------------------------------------------- */
/*  Theme tokens (applied as CSS variables, so no Tailwind dark-mode config)   */
/* -------------------------------------------------------------------------- */

type Theme = 'dark' | 'light';

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

const THEME_KEY = 'rabbithole-theme';

/* -------------------------------------------------------------------------- */
/*  Animated dot-wave background (canvas, no dependencies)                     */
/* -------------------------------------------------------------------------- */

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function DotWaves({ rgb }: { rgb: string }) {
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

      ctx.fillStyle = `rgba(${rgb},0.5)`;
      ctx.beginPath();
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          // Two interfering sine fields produce flowing bands of larger dots
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
  }, [rgb]);

  const mask = 'radial-gradient(ellipse 90% 80% at 50% 45%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 100%)';

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      />
      {/* Soft scrim behind the hero copy so text stays readable over the dots */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 34% 40%, color-mix(in srgb, var(--bg) 88%, transparent), transparent 80%)',
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scroll reveal: "fade" (subtle) or "pop" (cards), one-shot IntersectionObserver */
/* -------------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  pop = false,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  pop?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hidden = pop
    ? 'opacity-0 translate-y-10 scale-[0.96] blur-sm'
    : 'opacity-0 translate-y-4 blur-sm';
  const visible = 'opacity-100 translate-y-0 scale-100 blur-0';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={[
        'transition-[opacity,transform,filter] will-change-[opacity,transform,filter]',
        pop
          ? 'duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
          : 'duration-700 ease-out',
        'motion-reduce:!translate-y-0 motion-reduce:!scale-100 motion-reduce:!opacity-100 motion-reduce:!blur-0 motion-reduce:transition-none',
        shown ? visible : hidden,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    layer: 'Ingestion Layer',
    index: '01',
    title: 'Background Extension Harvest',
    body: 'A browser extension quietly records the documentation pages you open and the path you took between them, so nothing depends on you remembering to save it.',
  },
  {
    layer: 'Analysis Engine',
    index: '02',
    title: 'LLM Structural Summary',
    body: 'An LLM reads each captured page and writes a structural summary: the key concepts, and how they connect to the pages around it.',
  },
  {
    layer: 'Projection Canvas',
    index: '03',
    title: 'Interactive Node Mappings',
    body: 'Summaries become reactive graph nodes on a live canvas. Follow connections to see how everything you read fits together.',
  },
];

// Shared horizontal container so every section aligns on all viewports.
const CONTAINER = 'relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12';

// Soft halo in the background colour keeps text legible over moving dots
const HALO =
  '[text-shadow:0_0_10px_var(--bg),0_0_22px_var(--bg),0_0_38px_var(--bg)]';

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded bg-[color:var(--btn-bg)] text-[color:var(--btn-fg)] font-medium text-xs shadow-sm transition-all duration-200 hover:bg-[color:var(--btn-hover)] active:scale-95';

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Restore saved theme (defaults to dark, the original look)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Apply the theme site-wide: variables and background on <html> and <body>,
  // so overscroll areas and any other page reading these variables follow too.
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

  // Keep other tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const email = session?.user?.email ?? null;
  const tokens = THEMES[theme];

  return (
    <div
      style={tokens.vars as React.CSSProperties}
      className="relative flex min-h-screen flex-col overflow-x-hidden bg-[color:var(--bg)] font-sans text-[color:var(--fg)] antialiased transition-colors duration-300 selection:bg-neutral-500/40"
    >
      <DotWaves rgb={tokens.dot} />

      {/* Navigation Header */}
      <div className="relative z-10 border-b border-[color:var(--line)]">
        <header className={`${CONTAINER} flex items-center justify-between gap-4 py-5 sm:py-6`}>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--fg)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text)]">
              RabbitHole
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
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

            {!authReady ? (
              <div className="h-7 w-24 rounded bg-[color:var(--line)]" aria-hidden />
            ) : session ? (
              <>
                <div className="hidden min-w-0 items-center gap-2 md:flex" title={email ?? undefined}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
                  <span className="max-w-[200px] truncate font-mono text-[11px] text-[color:var(--muted)]">
                    {email ?? 'Signed in'}
                  </span>
                </div>

                <Link className={`${BTN_PRIMARY} px-3 py-1.5 sm:px-4`} href="/console">
                  Go to Console
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-2 py-1.5 text-xs font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--fg)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500 disabled:opacity-50 sm:px-3"
                >
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </>
            ) : (
              <Link className={`${BTN_PRIMARY} px-4 py-1.5`} href="/console">
                Sign In
              </Link>
            )}
          </div>
        </header>
      </div>

      <main className="relative z-10 flex-1">
        {/* Hero Section: fills the first screen so the rest reveals on scroll */}
        <section
          className={`${CONTAINER} flex min-h-[calc(100svh-4.5rem)] flex-col justify-center py-16 sm:py-20`}
        >
          <div className="max-w-3xl">
            <Reveal className="mb-6 inline-block">
              <span className="rounded border border-[color:var(--line-strong)] bg-[color:var(--card)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--muted)] backdrop-blur">
                STABLE RELEASE V1.2.0
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className={`mb-8 text-4xl font-bold leading-[1.08] tracking-tight text-[color:var(--fg)] sm:text-6xl md:text-7xl ${HALO}`}>
                Visualize your learning <br className="hidden sm:block" />
                <span className="text-[color:var(--muted)]">rabbit holes</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
                <p className={`text-sm font-normal leading-relaxed text-[color:var(--muted)] sm:text-base md:col-span-2 ${HALO}`}>
                  Stop drowning in open documentation tabs. A professional pipeline architecture
                  engineered to harvest documentation trails and automatically map learning states
                  into live, interactive node flow structures.
                </p>

                <div className="flex md:justify-end">
                  <Link className={`${BTN_PRIMARY} px-6 py-2.5`} href="/console">
                    Get Started
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* About the project */}
        <section className={`${CONTAINER} border-t border-[color:var(--line)] py-20 sm:py-28`}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-12">
            <Reveal className="md:col-span-2">
              <span className={`mb-3 block font-mono text-[10px] uppercase tracking-widest text-[color:var(--subtle)] ${HALO}`}>
                ABOUT THE PROJECT
              </span>
              <h2 className={`text-2xl font-semibold leading-snug tracking-tight text-[color:var(--fg)] sm:text-3xl ${HALO}`}>
                Documentation is where you learn. It just doesn&apos;t leave a map.
              </h2>
            </Reveal>

            <div className={`space-y-5 text-sm leading-relaxed text-[color:var(--muted)] sm:text-base md:col-span-3 ${HALO}`}>
              <Reveal delay={80}>
                <p>
                  Learning a new framework rarely follows a straight line. You open one page, it
                  links to another, that one sends you to a third, and an hour later you have thirty
                  tabs and no memory of how they connect.
                </p>
              </Reveal>
              <Reveal delay={160}>
                <p>
                  RabbitHole follows that trail for you. A background extension records the
                  documentation you visit, an LLM condenses each page into a structural summary, and
                  the console lays it all out as a live node graph you can explore and return to.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <p>
                  Sign in to open the console and keep your maps tied to your account.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ARCHITECTURAL BLUEPRINT SECTION */}
        <section className={`${CONTAINER} border-t border-[color:var(--line)] py-20 sm:py-28`}>
          <Reveal className="mb-10">
            <span className={`mb-1 block font-mono text-[10px] uppercase tracking-widest text-[color:var(--subtle)] ${HALO}`}>
              ARCHITECTURAL BLUEPRINT
            </span>
            <p className={`text-sm font-semibold text-[color:var(--text)] ${HALO}`}>
              How context tracks into reactive graph nodes.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.index} pop delay={i * 120} className="h-full">
                <div className="group relative flex h-full flex-col rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--card)] p-6 backdrop-blur transition-colors duration-300 hover:border-[color:var(--subtle)]">
                  <div className="mb-4 flex items-baseline justify-between border-b border-[color:var(--line-strong)] pb-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--subtle)]">
                      {step.layer}
                    </span>
                    <span className="font-mono text-xl font-bold text-[color:var(--faint)] transition-colors group-hover:text-[color:var(--subtle)]">
                      {step.index}
                    </span>
                  </div>
                  <h4 className="mb-2 text-sm font-semibold text-[color:var(--text)]">
                    {step.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-[color:var(--muted)]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className={`${CONTAINER} border-t border-[color:var(--line)] py-20 sm:py-28`}>
          <Reveal pop>
            <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-[color:var(--line-strong)] bg-[color:var(--card)] p-8 backdrop-blur sm:flex-row sm:items-center sm:p-10">
              <div className="max-w-xl">
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-[color:var(--fg)] sm:text-2xl">
                  Map your next rabbit hole.
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--muted)]">
                  Open the console and turn your open tabs into a graph you can follow.
                </p>
              </div>
              <Link className={`${BTN_PRIMARY} shrink-0 px-6 py-2.5`} href="/console">
                {session ? 'Go to Console' : 'Get Started'}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <div className="relative z-10 border-t border-[color:var(--line)]">
        <footer
          className={`${CONTAINER} flex items-center justify-between py-6 font-mono text-[11px] text-[color:var(--subtle)]`}
        >
          <span>RabbitHole Engine</span>
          <span>© 2026</span>
        </footer>
      </div>
    </div>
  );
}