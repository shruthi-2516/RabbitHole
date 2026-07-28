'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode, { CustomNodeType } from '@/components/CustomNode';

const initialNodes: CustomNodeType[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 250, y: 100 },
    data: {
      title: 'Debugging Next.js App Router Turbopack Errors',
      url: 'https://nextjs.org/docs/app/building-your-application/configuring/turbopack',
      domain: 'nextjs.org',
    },
  },
];

export default function WorkspaceCanvas() {
  // Memoize nodeTypes to prevent unnecessary canvas re-renders
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a' }}>
      <ReactFlow 
        nodes={initialNodes} 
        nodeTypes={nodeTypes}
        fitView 
      >
        <Background color="#262626" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}