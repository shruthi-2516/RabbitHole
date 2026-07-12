'use client';

import React, { useEffect, useRef } from 'react';

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  pixelSize?: number;
}

export default function DitherBackground({
  waveSpeed = 0.02,
  waveFrequency = 0.015,
  waveAmplitude = 18,
  pixelSize = 4
}: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: 600 };
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      ctx.clearRect(0, 0, width, height);
      time += waveSpeed;

      // Draw the mathematical wave displacement grid
      for (let x = 0; x < width; x += pixelSize) {
        // Calculate an shifting wave pattern matching the reactbits algorithm
        const waveOffset = Math.sin(x * waveFrequency + time) * waveAmplitude;
        const baselineY = height * 0.55 + waveOffset;

        for (let y = 0; y < height; y += pixelSize) {
          // Check proximity to wave front to apply pixel clustering
          const distanceToWave = Math.abs(y - baselineY);
          
          if (distanceToWave < 120) {
            // Dither cross-hatch calculation
            const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5);
            const intensity = (120 - distanceToWave) / 120;

            if ((x + y) % (pixelSize * 2) === 0 && intensity > parseFloat((Math.random() * 0.8).toFixed(2))) {
              ctx.fillStyle = `rgba(71, 85, 105, ${0.12 * intensity})`;
              ctx.fillRect(x, y, pixelSize - 1, pixelSize - 1);
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    resizeCanvas();
    render();
    
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [waveSpeed, waveFrequency, waveAmplitude, pixelSize]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 bg-slate-950" />;
}