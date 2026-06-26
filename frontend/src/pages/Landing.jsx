import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Wrench, Zap, BookOpen, Bookmark } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import { api } from "@/lib/api";

const SUGGESTIONS = [
  "Build a wooden workbench",
  "Replace a car brake pad",
  "Build a raised garden bed",
  "Wire a smart light switch",
  "Make a floating bookshelf",
  "Fix a leaking faucet",
];

const HERO_IMG = "https://images.unsplash.com/photo-1614585849038-272ee92d30fa";

export default function Landing() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/projects/trending").then((r) => setTrending(r.data)).catch(() => {});
  }, []);

  const runSearch = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true);
    try {
      const res = await api.post("/projects/search", { query: term });
      navigate(`/project/${res.data.id}`);
    } catch (e) {
      toast.error("Could not forge that guide. Try rephrasing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero */}
      <section className="relative border-b-2 border-zinc-800 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 grid-texture" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-block bg-orange-600 text-black font-mono2 text-xs font-bold uppercase tracking-[0.2em] px-3 py-1 mb-6">
              // AI DIY Aggregator
            </span>
            <h1 className="font-display text-5xl sm:text-7xl tracking-tight text-white leading-[0.9] uppercase mb-4">
              Any Project.<br />
              <span className="text-orange-500">One Master Guide.</span>
            </h1>
            <p className="font-mono2 text-base sm:text-lg text-zinc-300 mb-8 max-w-xl">
              Search any DIY build or repair. We aggregate the best of the web into one
              definitive step-by-step blueprint — tools, materials, steps & video links.
            </p>

            <div className="flex flex-col sm:flex-row gap-0 sm:gap-0 max-w-2xl">
              <div className="flex-1 flex items-center bg-zinc-900 border-2 border-zinc-700 focus-within:border-orange-500">
                <Search className="w-5 h-5 text-zinc-500 ml-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="e.g. build a chicken coop"
                  className="flex-1 bg-transparent text-white font-mono2 px-3 py-4 outline-none placeholder:text-zinc-600"
                  data-testid="search-input"
                />
              </div>
              <button
                onClick={() => runSearch()}
                disabled={loading}
                className="btn-brutal px-6 py-4 flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="search-submit-btn"
              >
                {loading ? "Forging..." : <>Forge Guide <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); runSearch(s); }}
                  className="border border-zinc-700 text-zinc-400 hover:text-orange-500 hover:border-orange-500 font-mono2 text-xs px-3 py-1.5 transition-none"
                  data-testid={`suggestion-${s.slice(0,6)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Zap, t: "AI-Forged Guides", d: "Claude reads the maker web and synthesizes one accurate build plan instantly." },
            { icon: BookOpen, t: "Tools & Materials", d: "Exact shopping list with quantities so you buy right the first time." },
            { icon: Bookmark, t: "Save & Organize", d: "Bookmark builds and group them into your personal workshop collections." },
          ].map((f, i) => (
            <div key={i} className="border-2 border-zinc-800 bg-zinc-950 p-6">
              <f.icon className="w-8 h-8 text-orange-500 mb-4" strokeWidth={2} />
              <h3 className="font-mono2 font-bold uppercase text-white text-lg mb-2">{f.t}</h3>
              <p className="font-mono2 text-sm text-zinc-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-center gap-3 mb-8">
            <Wrench className="w-6 h-6 text-orange-500" />
            <h2 className="font-display text-4xl tracking-tight text-orange-500 uppercase">Popular Builds</h2>
            <div className="flex-1 h-0.5 bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        </section>
      )}

      <footer className="border-t-2 border-zinc-800 py-8 text-center">
        <p className="font-mono2 text-xs text-zinc-600 uppercase tracking-widest">FixForge // Build Anything</p>
      </footer>
    </div>
  );
}
