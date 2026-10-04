'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const [isDark, setIsDark] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const titleRow1Ref = useRef<HTMLHeadingElement>(null);
  const titleRow2Ref = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featureSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
      setCheckedAuth(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      setCheckedAuth(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Balanced Dither Grid Layer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const spacing = 20;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = isDark
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.06)';

      phase += 0.02;

      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          const distFromCenter = Math.sqrt(
            Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
          );
          const wave1 = Math.sin(x * 0.006 + phase);
          const wave2 = Math.cos(
            y * 0.005 + phase + distFromCenter * 0.003
          );
          const offset = (wave1 + wave2) * 8;

          ctx.fillRect(x, y + offset, 1.6, 1.6);
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  // Entrance Reveal Animations
  useEffect(() => {
    const tl = gsap.timeline({
      defaults: { ease: 'power4.out', duration: 1.4 },
    });
    gsap.set([headerRef.current, descRef.current, ctaRef.current], {
      opacity: 0,
    });
    gsap.set([titleRow1Ref.current, titleRow2Ref.current], {
      y: 25,
      opacity: 0,
    });
    if (featureSectionRef.current) {
      gsap.set(featureSectionRef.current.children, { opacity: 0, y: 15 });
    }

    tl.to(containerRef.current, { opacity: 1, duration: 0.3 })
      .to(
        [titleRow1Ref.current, titleRow2Ref.current],
        { y: 0, opacity: 1, stagger: 0.1 }
      )
      .to(headerRef.current, { opacity: 1, y: 0 }, '-=1')
      .to(descRef.current, { opacity: 1, y: 0 }, '-=1')
      .to(ctaRef.current, { opacity: 1, y: 0 }, '-=1');

    if (featureSectionRef.current) {
      tl.to(
        featureSectionRef.current.children,
        { opacity: 1, y: 0, stagger: 0.06 },
        '-=0.8'
      );
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen relative overflow-hidden flex flex-col justify-between transition-colors duration-700 ease-in-out select-none font-sans
        ${
          isDark
            ? 'bg-[#0a0a0c] text-neutral-200'
            : 'bg-[#fcfcfc] text-neutral-900'
        }`}
    >
      {/* MONOCHROME SLATE MESH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute top-[-10%] left-[-5%] w-[75vw] h-[65vh] rounded-full filter blur-[120px] transition-all duration-700
          ${isDark ? 'bg-zinc-800/20' : 'bg-neutral-200/50'}`}
        />
        <div
          className={`absolute bottom-[-5%] right-[-5%] w-[65vw] h-[60vh] rounded-full filter blur-[140px] transition-all duration-700
          ${isDark ? 'bg-slate-800/15' : 'bg-slate-200/40'}`}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* TOP HEADER */}
      <header
        ref={headerRef}
        className={`border-b px-8 py-5 flex justify-between items-center relative z-20 transition-colors duration-500
          ${
            isDark
              ? 'border-neutral-900 bg-neutral-950/20'
              : 'border-neutral-200 bg-white/20'
          }`}
      >
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              isDark ? 'bg-white' : 'bg-black'
            }`}
          />
          <span className="text-xs font-semibold tracking-wider uppercase">
            RabbitHole
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {checkedAuth && userEmail && (
            <div
              className={`hidden md:flex items-center gap-2 border px-3 py-1.5 rounded-md ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-600'
              }`}
            >
              <div
                className={`h-1 w-1 rounded-full ${
                  isDark ? 'bg-neutral-500' : 'bg-neutral-400'
                }`}
              />
              <span className="text-xs font-medium max-w-[180px] truncate">
                {userEmail}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsDark(!isDark)}
            className={`text-xs border px-3 py-1.5 font-medium cursor-pointer transition-all duration-200 rounded-md
              ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:text-white hover:border-neutral-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 hover:border-neutral-300 shadow-xs'
              }`}
          >
            {isDark ? 'Light' : 'Dark'}
          </button>

          {checkedAuth &&
            (userEmail ? (
              <>
                <Link href="/console">
                  <button
                    className={`text-xs border px-3 py-1.5 font-semibold transition-all duration-200 rounded-md cursor-pointer
                    ${
                      isDark
                        ? 'bg-neutral-100 text-neutral-950 border-neutral-100 hover:bg-white'
                        : 'bg-neutral-950 text-white border-neutral-950 hover:bg-neutral-800'
                    }`}
                  >
                    Console
                  </button>
                </Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className={`text-xs border px-3 py-1.5 font-medium transition-all duration-200 rounded-md cursor-pointer
                    ${
                      isDark
                        ? 'border-neutral-800 bg-neutral-900/20 text-neutral-400 hover:text-white'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-950'
                    }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/console">
                <button
                  className={`text-xs border px-3 py-1.5 font-semibold transition-all duration-200 rounded-md cursor-pointer
                  ${
                    isDark
                      ? 'bg-white text-neutral-950 border-white hover:bg-neutral-200'
                      : 'bg-neutral-950 text-white border-neutral-950 hover:bg-neutral-800'
                  }`}
                >
                  Sign In
                </button>
              </Link>
            ))}
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-24 relative z-20 max-w-[1500px] w-full mx-auto">
        <div className="space-y-6 max-w-5xl">
          <div
            className={`inline-flex items-center gap-2 border px-2.5 py-0.5 rounded-md ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/50 text-neutral-400'
                : 'border-neutral-200 bg-neutral-100 text-neutral-600'
            }`}
          >
            <span className="text-[10px] font-medium tracking-wider uppercase">
              Stable Release v1.0.0
            </span>
          </div>

          <div className="space-y-2 overflow-hidden">
            <h1
              ref={titleRow1Ref}
              className={`text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              Visualize your learning
            </h1>
            <h1
              ref={titleRow2Ref}
              className={`text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              rabbit holes
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            <p
              ref={descRef}
              className={`text-sm tracking-wide lg:col-span-7 leading-relaxed max-w-xl transition-colors duration-500 ${
                isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Stop drowning in open documentation tabs. A professional pipeline
              architecture engineered to harvest documentation trails and
              automatically map learning states into live, interactive node
              flow structures.
            </p>

            <div
              ref={ctaRef}
              className="lg:col-span-5 lg:justify-self-end w-full sm:w-auto"
            >
              <Link href="/console">
                <button
                  className={`w-full sm:w-auto px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer rounded-md border
                  ${
                    isDark
                      ? 'text-neutral-950 bg-white border-white hover:bg-neutral-200 shadow-xs'
                      : 'text-white bg-neutral-950 border-neutral-950 hover:bg-neutral-800'
                  }`}
                >
                  {userEmail ? 'Open Console Workspace' : 'Get Started'}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* THE THREE-STEP PIPELINE TIMELINE SECTION */}
      <section
        className={`border-t py-20 relative z-20 transition-colors duration-500 ${
          isDark
            ? 'border-neutral-900 bg-neutral-950/10'
            : 'border-neutral-200 bg-neutral-50/50'
        }`}
      >
        <div className="max-w-[1500px] mx-auto px-8 lg:px-16">
          <div className="mb-12">
            <h2
              className={`text-xs font-bold uppercase tracking-widest ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              Architectural Blueprint
            </h2>
            <p
              className={`text-lg font-semibold mt-1 ${
                isDark ? 'text-neutral-300' : 'text-neutral-800'
              }`}
            >
              How context tracks into reactive graph nodes.
            </p>
          </div>

          <div
            ref={featureSectionRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          >
            <div
              className={`border p-8 rounded-lg space-y-4 transition-all duration-300 backdrop-blur-xs relative group ${
                isDark
                  ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="text-4xl font-extrabold tracking-tight opacity-10 font-mono absolute right-6 top-4 select-none">
                01
              </div>
              <div
                className={`text-xs font-semibold px-2 py-0.5 inline-block rounded-md ${
                  isDark
                    ? 'bg-neutral-900 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                Ingestion Layer
              </div>
              <h3
                className={`text-base font-bold ${
                  isDark ? 'text-white' : 'text-neutral-950'
                }`}
              >
                Background Extension Harvest
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                The lightweight browser companion quietly logs hierarchical
                token updates as you navigate document trees without dropping
                performance rates.
              </p>
            </div>

            <div
              className={`border p-8 rounded-lg space-y-4 transition-all duration-300 backdrop-blur-xs relative group ${
                isDark
                  ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="text-4xl font-extrabold tracking-tight opacity-10 font-mono absolute right-6 top-4 select-none">
                02
              </div>
              <div
                className={`text-xs font-semibold px-2 py-0.5 inline-block rounded-md ${
                  isDark
                    ? 'bg-neutral-900 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                Analysis Engine
              </div>
              <h3
                className={`text-base font-bold ${
                  isDark ? 'text-white' : 'text-neutral-950'
                }`}
              >
                LLM Structural Summary
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                Raw web documentation fragments route directly through our deep
                trace models to isolate key architectural code paths and index
                clean learning states.
              </p>
            </div>

            <div
              className={`border p-8 rounded-lg space-y-4 transition-all duration-300 backdrop-blur-xs relative group ${
                isDark
                  ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="text-4xl font-extrabold tracking-tight opacity-10 font-mono absolute right-6 top-4 select-none">
                03
              </div>
              <div
                className={`text-xs font-semibold px-2 py-0.5 inline-block rounded-md ${
                  isDark
                    ? 'bg-neutral-900 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                Projection Canvas
              </div>
              <h3
                className={`text-base font-bold ${
                  isDark ? 'text-white' : 'text-neutral-950'
                }`}
              >
                Interactive Node Mappings
              </h3>
              <p className="text-xs leading-relaxed text-neutral-500">
                Structured indexes land onto a reactive canvas, organizing messy
                document tab chains into logical, structured flow paths.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* METRIC PANELS */}
      <section
        className={`border-t transition-colors duration-500 py-12 relative z-20 ${
          isDark
            ? 'border-neutral-900 bg-neutral-950/20'
            : 'border-neutral-200 bg-slate-50/20'
        }`}
      >
        <div className="max-w-[1500px] mx-auto px-8 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            className={`border p-6 rounded-md space-y-2 transition-all duration-300 backdrop-blur-xs ${
              isDark
                ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              01 / Harvester
            </div>
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Context Ingestion
            </h3>
            <p className="text-xs leading-relaxed mt-1 text-neutral-500">
              Silently indexes tab hierarchy arrays background-side without
              structural drops.
            </p>
          </div>

          <div
            className={`border p-6 rounded-md space-y-2 transition-all duration-300 backdrop-blur-xs ${
              isDark
                ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              02 / Canvas
            </div>
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Reactive Networks
            </h3>
            <p className="text-xs leading-relaxed mt-1 text-neutral-500">
              Transforms flat database configurations into clear branch history
              paths.
            </p>
          </div>

          <div
            className={`border p-6 rounded-md space-y-2 transition-all duration-300 backdrop-blur-xs ${
              isDark
                ? 'border-neutral-900 bg-neutral-950/40 hover:border-neutral-800'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              03 / Isolation
            </div>
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Hardened Privacy
            </h3>
            <p className="text-xs leading-relaxed mt-1 text-neutral-500">
              Protected at the database layer via strict Row-Level Security
              mappings.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className={`border-t px-8 py-4 text-xs text-center sm:text-left transition-colors duration-500 relative z-20 ${
          isDark
            ? 'border-neutral-900 bg-neutral-950/40 text-neutral-500'
            : 'border-neutral-200 bg-white text-neutral-400'
        }`}
      >
        <p>
          © 2026 RabbitHole Workspace Engine. Secure multitenant layout
          configuration operational.
        </p>
      </footer>
    </div>
  );
}gu