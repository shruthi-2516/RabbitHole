'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ReactFlow } from '@xyflow/react';
import { supabase } from '@/lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import '@xyflow/react/dist/style.css';
import CustomNode from '@/components/CustomNode';

const nodeTypes = {
  customPageNode: CustomNode
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
}

interface SessionData {
  id: number;
  title: string;
  created_at: string;
  session_overview?: string;
}

export default function ConsoleDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [isDark, setIsDark] = useState(true);
  const [nodesData, setNodesData] = useState<PageNodeData[]>([]);
  const [sessionsList, setSessionsList] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: true,
    style: { 
      stroke: isDark ? '#262626' : '#e5e5e5', 
      strokeWidth: 1.5 
    },
  }), [isDark]);

  const currentActiveSession = useMemo(() => {
    if (activeSessionId) {
      return sessionsList.find(s => s.id === activeSessionId) || null;
    }
    return sessionsList.length > 0 ? sessionsList[0] : null;
  }, [activeSessionId, sessionsList]);

  // CREATE ACTION
  async function handleCreateNewSession() {
    if (!session) return;
    
    const customName = prompt("Enter a description or name for this session path:");
    const finalTitle = customName && customName.trim() ? customName.trim() : `Chain #${sessionsList.length + 1}`;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ user_id: session.user.id, title: finalTitle }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setActiveSessionId(data.id);
        setSessionsList(prev => [data, ...prev]);
      }
    } catch (err: any) {
      console.error('Failed to create workspace session stream:', err.message);
    }
  }

  // RENAME ACTION
  async function handleRenameSession() {
    if (!session || !currentActiveSession) return;

    const newName = prompt(`Rename "${currentActiveSession.title}" to:`, currentActiveSession.title);
    if (!newName || !newName.trim() || newName.trim() === currentActiveSession.title) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ title: newName.trim() })
        .eq('id', currentActiveSession.id);

      if (error) throw error;

      setSessionsList(prev => 
        prev.map(s => s.id === currentActiveSession.id ? { ...s, title: newName.trim() } : s)
      );
    } catch (err: any) {
      console.error('Failed to rename target branch track:', err.message);
    }
  }

  // DELETE ACTION
  async function handleDeleteSession() {
    if (!session || !currentActiveSession) return;

    const confirmed = confirm(`Are you sure you want to delete "${currentActiveSession.title}"? This action drops all recorded sub-nodes permanently.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', currentActiveSession.id);

      if (error) throw error;

      const remainingSessions = sessionsList.filter(s => s.id !== currentActiveSession.id);
      setSessionsList(remainingSessions);
      
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id);
      } else {
        setActiveSessionId(null);
      }
    } catch (err: any) {
      console.error('Failed to purge workspace data track:', err.message);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

    async function fetchDashboardCoreData() {
      try {
        setLoading(true);
        
        const { data: sData, error: sErr } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false });
        if (sErr) throw sErr;
        if (sData) setSessionsList(sData);

        const { data: pData, error: pErr } = await supabase
          .from('pages')
          .select('*')
          .order('visited_at', { ascending: true });
        if (pErr) throw pErr;
        
        if (pData) {
          setNodesData(pData);
          if (pData.length > 0) {
            setSelectedNodeId(String(pData[pData.length - 1].id));
          }
        }
      } catch (err: any) {
        console.error('[DB_FETCH_ERR]', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardCoreData();

    const channel = supabase
      .channel(`user_stream_${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        supabase.from('pages').select('*').order('visited_at', { ascending: true }).then(({ data }) => {
          if (data) setNodesData(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const activeSessionNodes = useMemo(() => {
    const dynamicTargetId = currentActiveSession?.id || null;
    return dynamicTargetId ? nodesData.filter(node => node.session_id === dynamicTargetId) : [];
  }, [nodesData, currentActiveSession]);

  const highlightedNodeIds = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return new Set<string>();
    const term = searchQuery.toLowerCase().trim();
    return new Set(
      activeSessionNodes
        .filter(n => (n.title || '').toLowerCase().includes(term) || (n.summary || '').toLowerCase().includes(term))
        .map(n => String(n.id))
    );
  }, [activeSessionNodes, searchQuery]);

  const activeNodeDetails = useMemo(() => {
    return nodesData.find((node) => String(node.id) === selectedNodeId) || null;
  }, [nodesData, selectedNodeId]);

  // Clean Absolute Vertical Node Stack
  const flowNodes = useMemo(() => {
    const verticalSpacing = 150; 
    const xCenterOffset = 180;    
    
    return activeSessionNodes.map((node, idx) => {
      let domainStr = 'web';
      try { domainStr = new URL(node.url).hostname; } catch(_) {}
      const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domainStr}&sz=32`;

      const isMatch = highlightedNodeIds.has(String(node.id));
      const hasQuery = searchQuery.trim().length > 0;

      return {
        id: String(node.id),
        type: 'customPageNode', 
        position: { 
          x: xCenterOffset, 
          y: idx * verticalSpacing + 40 
        }, 
        data: { 
          title: node.title,
          url: node.url,
          favicon_url: fallbackFavicon
        },
        style: { 
          width: '260px',
          opacity: hasQuery && !isMatch ? 0.35 : 1,
          border: isMatch ? (isDark ? '2px solid #ffffff' : '2px solid #000000') : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isMatch ? '0 0 15px rgba(255,255,255,0.15)' : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }
      };
    });
  }, [activeSessionNodes, highlightedNodeIds, searchQuery, isDark]);

  // Sequential Direct Target Connector Mapping
  const flowEdges = useMemo(() => {
    const edges: any[] = [];
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
          stroke: nextIsSelected ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#262626' : '#cbd5e1'), 
          strokeWidth: nextIsSelected ? 2 : 1.5 
        },
      });
    }
    return edges;
  }, [activeSessionNodes, selectedNodeId, isDark]);

  const workspaceMetrics = useMemo(() => {
  const totalNodes = activeSessionNodes.length;
  const domains = new Set<string>();
  activeSessionNodes.forEach(node => { 
    try { domains.add(new URL(node.url).hostname); } catch(_) {} 
  });
  return { 
    nodeCount: totalNodes, 
    domainCount: domains.size, 
    timeSpan: `${Math.min(totalNodes * 3, 60)}m active` 
  };
}, [activeSessionNodes]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800 backdrop-blur-md rounded-xl p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">RabbitHole</h1>
            <p className="text-xs text-neutral-400 mt-1">Sign in to your dashboard workspace</p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#27272a',
                    brandAccent: '#3f3f46',
                    inputBackground: '#09090b',
                    inputText: '#f4f4f5',
                    inputBorder: '#27272a',
                    inputPlaceholder: '#52525b',
                  },
                },
              },
            }}
            theme="dark"
            providers={[]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ease-in-out select-none flex flex-col justify-between
      ${isDark ? 'bg-[#0a0a0c] text-neutral-200' : 'bg-[#fcfcfc] text-neutral-900'}`}
    >
      
      {/* HEADER */}
      <header className={`border-b px-8 py-4 flex justify-between items-center backdrop-blur-xs sticky top-0 z-10 transition-colors duration-500
        ${isDark ? 'border-neutral-900 bg-[#0a0a0c]/85' : 'border-neutral-200 bg-[#fcfcfc]/85'}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`h-1.5 w-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`} />
          <h1 className="text-xs font-semibold tracking-wider uppercase">
            RabbitHole Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <span className={`text-xs transition-colors duration-500 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {session.user.email}
          </span>
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`text-xs border px-3 py-1.5 font-medium cursor-pointer transition-all duration-200 rounded-md
              ${isDark 
                ? 'border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:text-white hover:border-neutral-700' 
                : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-300 shadow-xs'}`}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className={`text-xs font-medium border px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer
              ${isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white' : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-950'}`}
          >
            Disconnect
          </button>
        </div>
      </header>

      
      {/* METRIC BANNER & INTEGRATED SESSION OVERVIEW */}
      <section className={`border-b transition-colors duration-500 ${isDark ? 'border-neutral-900 bg-neutral-950/50' : 'border-neutral-200 bg-neutral-50'}`}>
        <div className="px-8 py-3 grid grid-cols-3 gap-4 text-xs">
          <div className="flex flex-col">
            <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Exploration Depth</span>
            <span className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{workspaceMetrics.nodeCount} Ingested Nodes</span>
          </div>
          <div className="flex flex-col border-l pl-4 border-neutral-800/40">
            <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Domain Breadth</span>
            <span className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{workspaceMetrics.domainCount} Resource Tracks</span>
          </div>
          <div className="flex flex-col border-l pl-4 border-neutral-800/40">
            <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Session Span</span>
            <span className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{workspaceMetrics.timeSpan}</span>
          </div>
        </div>

        {currentActiveSession && (
          <div className={`border-t px-8 py-2.5 text-xs flex gap-4 items-center transition-colors duration-300 ${isDark ? 'border-neutral-900/60 bg-neutral-950/80' : 'border-neutral-200/50 bg-white'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border ${isDark ? 'text-white border-neutral-700 bg-neutral-900' : 'text-neutral-950 border-neutral-300 bg-neutral-100'}`}>
              Session Objective
            </span>
            <p className={`font-medium tracking-wide flex-1 transition-colors duration-300 ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              {currentActiveSession.session_overview || "Compiling overarching path objectives via background pipeline..."}
            </p>
          </div>
        )}
      </section>

      
      {/* MAIN TWO-COLUMN SPLIT */}
      <main className="p-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* CANVAS WORKSPACE BOX */}
        <div className={`border rounded-lg flex flex-col h-[680px] overflow-hidden transition-all duration-500
          ${isDark ? 'bg-neutral-950/20 border-neutral-900' : 'bg-white border-neutral-200 shadow-xs'}`}
        >
          <div className={`px-5 py-3.5 border-b flex flex-col gap-3 transition-colors duration-500
            ${isDark ? 'border-neutral-900 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'}`}
          >
            <div className="flex justify-between items-center">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Session Canvas</h2>
              
              <div className="flex items-center gap-2">
                {currentActiveSession && (
                  <>
                    <button 
                      onClick={handleRenameSession}
                      className={`text-xs border px-2.5 py-1.5 transition-all duration-200 rounded-md cursor-pointer font-medium
                        ${isDark ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'}`}
                    >
                      Rename
                    </button>
                    <button 
                      onClick={handleDeleteSession}
                      className="text-xs border border-red-900/30 bg-red-950/10 text-red-400 hover:bg-red-900 hover:text-white px-2.5 py-1.5 transition-all duration-200 rounded-md cursor-pointer font-medium"
                    >
                      Delete
                    </button>
                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
                  </>
                )}
                <button 
                  onClick={handleCreateNewSession}
                  className={`text-xs border font-medium px-3 py-1.5 transition-all duration-200 rounded-md cursor-pointer
                    ${isDark ? 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-950 hover:text-white text-neutral-800 shadow-xs'}`}
                >
                  New Session
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {sessionsList.map((s) => {
                const isCurrent = currentActiveSession?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`text-xs px-3 py-1.5 transition-all duration-200 rounded-md border flex-shrink-0 max-w-[160px] truncate cursor-pointer font-medium ${
                      isCurrent
                        ? (isDark ? 'bg-white text-neutral-950 border-white' : 'bg-neutral-950 text-white border-neutral-950')
                        : (isDark ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:text-neutral-200' : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 shadow-xs')
                    }`}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs">
                Synchronizing live indices...
              </div>
            ) : activeSessionNodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-radial from-transparent to-neutral-950/10">
                <div className={`h-8 w-8 rounded-full border border-dashed flex items-center justify-center animate-spin [animation-duration:8s] ${isDark ? 'border-neutral-800' : 'border-neutral-300'}`}>
                  <div className={`h-2 w-2 rounded-full ${isDark ? 'bg-neutral-700' : 'bg-neutral-400'}`} />
                </div>
                <h3 className={`text-sm font-bold mt-4 ${isDark ? 'text-neutral-300' : 'text-neutral-800'}`}>No Active Ingest Stream</h3>
                <p className="text-xs text-neutral-500 max-w-xs mt-1 leading-relaxed">Activate your Chrome Extension, or create a brand new tracking session to start mapping document traces.</p>
              </div>
            ) : (
              <ReactFlow 
                nodes={flowNodes} 
                edges={flowEdges} 
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView 
                minZoom={0.2}                  
                maxZoom={1.5}                  
                panOnScroll={true}       
                panOnScrollMode={'free' as any}
                zoomOnScroll={false}
                zoomOnPinch={true}             
                nodesDraggable={true}
                elementsSelectable={true}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              />
            )}
          </div>
        </div>
        
        {/* LOG PANEL INSPECTOR */}
        <div className={`border rounded-lg flex flex-col h-[680px] overflow-hidden transition-all duration-500
          ${isDark ? 'bg-neutral-950/20 border-neutral-900' : 'bg-white border-neutral-200 shadow-xs'}`}
        >
          <div className={`p-4 border-b flex flex-col gap-3 transition-colors duration-500
            ${isDark ? 'border-neutral-900 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider pb-1">
                Telemetry Summary
              </span>
              {activeNodeDetails && (
                <span className={`text-[11px] px-2.5 py-0.5 rounded-md border font-medium ${isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'}`}>
                  Record #{activeNodeDetails.id}
                </span>
              )}
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search index keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-md px-3.5 py-2 text-xs focus:outline-none transition-colors
                  ${isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-neutral-700 placeholder-neutral-600' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-400 placeholder-neutral-400'}`}
              />
            </div>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {!activeNodeDetails ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                Select a canvas sequence element to load pipeline metadata.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className={`text-[11px] font-semibold tracking-wider uppercase block mb-1 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Target Resource</label>
                  <a 
                    href={activeNodeDetails.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`text-base font-bold hover:underline transition-colors break-all leading-tight tracking-tight ${isDark ? 'text-slate-100 hover:text-white' : 'text-neutral-900 hover:text-black'}`}
                  >
                    {activeNodeDetails.title || 'Untitled Node'}
                  </a>
                </div>

                <div className={`border-t pt-4 ${isDark ? 'border-neutral-900' : 'border-neutral-200'}`}>
                  <label className={`text-[11px] font-semibold tracking-wider uppercase block mb-1.5 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Context Summary</label>
                  <p className={`text-sm leading-relaxed border p-4 rounded-md transition-colors duration-500
                    ${isDark ? 'bg-neutral-950/40 border-neutral-900 text-neutral-400' : 'bg-neutral-50/50 border-neutral-200 text-neutral-600'}`}>
                    {activeNodeDetails.summary || 'Context processing...'}
                  </p>
                </div>

                <div className={`border-t pt-4 ${isDark ? 'border-neutral-900' : 'border-neutral-200'}`}>
                  <label className={`text-[11px] font-semibold tracking-wider uppercase block mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>Automated Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {activeNodeDetails.tags && activeNodeDetails.tags.length > 0 ? (
                      activeNodeDetails.tags.map((tag, idx) => (
                        <span key={idx} className={`text-xs font-medium border px-2.5 py-0.5 rounded-md ${isDark ? 'bg-neutral-900/60 text-neutral-400 border-neutral-800' : 'bg-neutral-100 text-slate-600 border-slate-200'}`}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400 italic">No tags allocated.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className={`border-t px-8 py-4 text-xs text-center sm:text-left transition-colors duration-500
        ${isDark ? 'border-neutral-900 bg-neutral-950/60 text-neutral-500' : 'border-neutral-200 bg-white text-neutral-400'}`}
      >
        <p>© 2026 RabbitHole Workspace Engine.</p>
      </footer>

    </div>
  );
}