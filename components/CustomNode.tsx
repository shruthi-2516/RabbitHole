import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodeData {
  title: string;
  url: string;
  domain?: string;
  favicon_url?: string;
}

export default function CustomNode({ data }: { data: NodeData }) {
  // Extract and clean domain text cleanly for metadata display
  const displayDomain = data.domain || 
    (data.url ? new URL(data.url).hostname.replace('www.', '') : 'UNKNOWN.RESOURCE');

  return (
    <div className="relative bg-neutral-950/80 backdrop-blur-md border border-neutral-800 hover:border-blue-500/50 transition-all duration-300 rounded-xs px-4 py-3 min-w-[220px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] group">
      
      {/* Precision Engineering Tech Brackets */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-neutral-600 group-hover:border-blue-400 transition-colors"></div>
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-neutral-600 group-hover:border-blue-400 transition-colors"></div>
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-neutral-600 group-hover:border-blue-400 transition-colors"></div>
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-neutral-600 group-hover:border-blue-400 transition-colors"></div>
      
      {/* Top Metadata Header Row */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-900 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {data.favicon_url ? (
            <img 
              src={data.favicon_url} 
              alt="" 
              className="w-3 h-3 min-w-[12px] opacity-40 filter grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-neutral-700" />
          )}
          <span className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase truncate">
            {displayDomain}
          </span>
        </div>
        <div className="w-1 h-1 rounded-full bg-neutral-800 group-hover:bg-blue-500 transition-colors animate-pulse" />
      </div>

      {/* Main Title Content Block */}
      <div className="text-xs font-medium text-neutral-300 tracking-wide line-clamp-2 pr-2">
        {data.title || "Untitled Session Frame"}
      </div>

      {/* Handle Tunnels for React Flow Connection Paths */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-neutral-800 !w-1.5 !h-1.5 !border-neutral-700 group-hover:!bg-blue-500 transition-colors" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-neutral-800 !w-1.5 !h-1.5 !border-neutral-700 group-hover:!bg-blue-500 transition-colors" 
      />
    </div>
  );
}