import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Wrench, Zap, BookOpen, Bookmark } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import ForgingLoader from "@/components/ForgingLoader";
import { api } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

const HERO_IMG = "https://images.unsplash.com/photo-1614585849038-272ee92d30fa";

export default function Landing() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgingTerm, setForgingTerm] = useState("");
  const [trending, setTrending] = useState([]);
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const suggestions = t("suggestions");

  useEffect(() => {
    api.get("/projects/trending").then((r) => setTrending(r.data)).catch(() => {});
  }, []);

  const runSearch = async (q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setForgingTerm(term);
    setLoading(true);
    try {
      const res = await api.post("/projects/search", { query: term, lang });
      navigate(`/project/${res.data.id}`);
    } catch (e) {
      toast.error(t("toastForgeError"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {loading && <ForgingLoader query={forgingTerm} />}
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
              {t("badge")}
            </span>
            <h1 className="font-display text-5xl sm:text-7xl tracking-tight text-white leading-[0.9] uppercase mb-4">
              {t("heroTitle1")}<br />
              <span className="text-orange-500">{t("heroTitle2")}</span>
            </h1>
            <p className="font-mono2 text-base sm:text-lg text-zinc-300 mb-8 max-w-xl">
              {t("heroSubtitle")}
            </p>

            <div className="flex flex-col sm:flex-row gap-0 sm:gap-0 max-w-2xl">
              <div className="flex-1 flex items-center bg-zinc-900 border-2 border-zinc-700 focus-within:border-orange-500">
                <Search className="w-5 h-5 text-zinc-500 ml-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder={t("searchPlaceholder")}
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
                {loading ? t("forging") : <>{t("forgeGuide")} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {suggestions.map((s, idx) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); runSearch(s); }}
                  className="border border-zinc-700 text-zinc-400 hover:text-orange-500 hover:border-orange-500 font-mono2 text-xs px-3 py-1.5 transition-none"
                  data-testid={`suggestion-${idx}`}
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
            { icon: Zap, t: t("feature1Title"), d: t("feature1Desc") },
            { icon: BookOpen, t: t("feature2Title"), d: t("feature2Desc") },
            { icon: Bookmark, t: t("feature3Title"), d: t("feature3Desc") },
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
            <h2 className="font-display text-4xl tracking-tight text-orange-500 uppercase">{t("popularBuilds")}</h2>
            <div className="flex-1 h-0.5 bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
          </div>
        </section>
      )}

      <footer className="border-t-2 border-zinc-800 py-8 text-center">
        <p className="font-mono2 text-xs text-zinc-600 uppercase tracking-widest">{t("footer")}</p>
      </footer>
    </div>
  );
}
