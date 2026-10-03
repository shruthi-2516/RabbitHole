import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white flex flex-col justify-between p-8 selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="flex items-center justify-between max-w-6xl mx-auto w-full py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg">
            R
          </div>
          <span className="font-semibold text-lg tracking-tight">RabbitHole</span>
        </div>
        <Link
          href="/console"
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition border border-white/10"
        >
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto text-center py-20 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Interactive Visual Workspace
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Explore your web trails visually with dynamic nodes.
        </h1>

        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          RabbitHole visualizes your research journeys, sessions, and connected browsing branches into a unified node canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/console"
            className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-600/25 transition duration-200"
          >
            Launch Console →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-500 py-6 border-t border-white/5">
        RabbitHole © {new Date().getFullYear()} • Visual Graph Engine
      </footer>
    </main>
  );
}