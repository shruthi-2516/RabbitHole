'use client';

import React, { useState, useMemo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';

// 1. Define custom Node data schema
export type CustomNodeData = {
  title?: string;
  url?: string;
  domain?: string;
  favicon_url?: string;
};

// 2. Export strict React Flow Node Type
export type CustomNodeType = Node<CustomNodeData, 'custom'>;

export default function CustomNode({ data }: NodeProps<CustomNodeType>) {
  const [imageError, setImageError] = useState(false);

  // Safely extract domain without crashing React on malformed URLs
  const displayDomain = useMemo(() => {
    if (data.domain) return data.domain;
    if (!data.url) return 'UNKNOWN.RESOURCE';

    try {
      const parsedUrl = new URL(
        data.url.startsWith('http') ? data.url : `https://${data.url}`
      );
      return parsedUrl.hostname.replace(/^www\./, '');
    } catch {
      return 'INVALID.URL';
    }
  }, [data.domain, data.url]);

  return (
    <div className="relative bg-neutral-950/90 backdrop-blur-md border border-neutral-800/80 hover:border-blue-500/50 transition-all duration-300 rounded-xs px-4 py-3 min-w-[220px] max-w-[280px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] group">
      
      {/* Visual Tech Brackets */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-neutral-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-neutral-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-neutral-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-neutral-700 group-hover:border-blue-400 transition-colors" />

      {/* Header Metadata */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-900/80 pb-1.5 mb-2">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {data.favicon_url && !imageError ? (
            <img 
              src={data.favicon_url} 
              alt="" 
              onError={() => setImageError(true)}
              className="w-3 h-3 min-w-[12px] opacity-60 filter grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-neutral-700 shrink-0" />
          )}
          <span className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase truncate">
            {displayDomain}
          </span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-blue-500 transition-colors shrink-0 animate-pulse" />
      </div>

      {/* Title Display */}
      <div 
        className="text-xs font-medium text-neutral-300 tracking-wide line-clamp-2 pr-1"
        title={data.title || "Untitled Session Frame"}
      >
        {data.title || "Untitled Session Frame"}
      </div>

      {/* React Flow Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-neutral-800 !w-2 !h-2 !border-neutral-700 group-hover:!bg-blue-500 transition-colors" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-neutral-800 !w-2 !h-2 !border-neutral-700 group-hover:!bg-blue-500 transition-colors" 
      />
    </div>
  );
}