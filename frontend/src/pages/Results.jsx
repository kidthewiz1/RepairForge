import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock, DollarSign, Gauge, Wrench, Package, ShieldAlert, ExternalLink,
  Bookmark, BookmarkCheck, ArrowLeft, Video, FileText, BookOpen, FolderPlus, Check,
  Lock, Printer, Zap, Crown, Youtube,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const RES_ICON = { video: Video, article: FileText, guide: BookOpen };

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, checkAuth } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [collections, setCollections] = useState([]);
  const [newCol, setNewCol] = useState("");
  const [paying, setPaying] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const r = await api.get(`/projects/${id}`);
      setProject(r.data);
    } catch {
      toast.error("Project not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { setLoading(true); fetchProject(); }, [fetchProject]);

  useEffect(() => {
    if (!user) return;
    api.get("/favorites/ids").then((r) => setFavorited(r.data.ids.includes(id))).catch(() => {});
  }, [user, id]);

  // Handle return from Stripe checkout
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;
    let attempts = 0;
    const poll = async () => {
      try {
        const r = await api.get(`/payments/checkout/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          toast.success("Payment successful — guide unlocked!");
          await checkAuth();
          await fetchProject();
          navigate(`/project/${id}`, { replace: true });
          return;
        }
        if (r.data.status === "expired" || attempts >= 6) {
          toast.error("Payment not completed.");
          navigate(`/project/${id}`, { replace: true });
          return;
        }
        attempts += 1;
        setTimeout(poll, 2000);
      } catch {
        navigate(`/project/${id}`, { replace: true });
      }
    };
    toast.loading("Confirming payment...", { id: "pay" });
    poll().finally(() => toast.dismiss("pay"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadCollections = () => api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});

  const toggleFav = async () => {
    if (!user) { login(); return; }
    try {
      const r = await api.post(`/favorites/${id}`);
      setFavorited(r.data.favorited);
      toast.success(r.data.favorited ? "Saved to favorites" : "Removed from favorites");
    } catch { toast.error("Action failed"); }
  };

  const createAndAdd = async () => {
    if (!newCol.trim()) return;
    try {
      const r = await api.post("/collections", { name: newCol.trim() });
      await api.post(`/collections/${r.data.id}/items/${id}`);
      setNewCol(""); loadCollections();
      toast.success(`Added to "${r.data.name}"`);
    } catch { toast.error("Failed"); }
  };

  const addToCol = async (col) => {
    try {
      const r = await api.post(`/collections/${col.id}/items/${id}`);
      loadCollections();
      toast.success(r.data.added ? `Added to "${col.name}"` : `Removed from "${col.name}"`);
    } catch { toast.error("Failed"); }
  };

  const checkout = async (packageId) => {
    if (!user) { login(); return; }
    setPaying(true);
    try {
      const r = await api.post("/payments/checkout/session", {
        package_id: packageId,
        origin_url: window.location.origin,
        return_path: `/project/${id}`,
        project_id: id,
      });
      window.location.href = r.data.url;
    } catch {
      toast.error("Could not start checkout");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center py-40 text-orange-500 font-mono2 uppercase tracking-widest animate-pulse">// Loading blueprint...</div>
      </div>
    );
  }
  if (!project) return <div className="min-h-screen bg-black"><Navbar /></div>;

  const lockedCount = project.locked ? (project.total_steps - (project.steps?.length || 0)) : 0;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Printable shopping list (free for everyone) */}
      <div className="print-only">
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "32px", marginBottom: "4px" }}>{project.title}</h1>
        <p style={{ marginBottom: "16px" }}>Shopping & Tools List — FixForge</p>
        <h2 style={{ borderBottom: "2px solid #000", paddingBottom: "4px" }}>TOOLS</h2>
        <ul>{project.tools?.map((t, i) => <li key={i}>☐ {t}</li>)}</ul>
        <h2 style={{ borderBottom: "2px solid #000", paddingBottom: "4px", marginTop: "16px" }}>MATERIALS</h2>
        <ul>{project.materials?.map((m, i) => <li key={i}>☐ {m.name}{m.quantity ? ` — ${m.quantity}` : ""}</li>)}</ul>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-orange-500 font-mono2 text-xs uppercase mb-6" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="border-2 border-zinc-800 bg-zinc-950 p-6 sm:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <span className="bg-orange-600/20 border border-orange-600 text-orange-500 font-mono2 text-[10px] font-bold uppercase px-2 py-1">{project.category}</span>
              <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-white uppercase leading-none mt-4 mb-3">{project.title}</h1>
              <p className="font-mono2 text-zinc-300 max-w-2xl">{project.summary}</p>
              <div className="flex flex-wrap gap-6 mt-6 font-mono2 text-sm">
                <span className="flex items-center gap-2 text-zinc-300"><Gauge className="w-4 h-4 text-orange-500" /> {project.difficulty}</span>
                <span className="flex items-center gap-2 text-zinc-300"><Clock className="w-4 h-4 text-orange-500" /> {project.estimated_time}</span>
                <span className="flex items-center gap-2 text-zinc-300"><DollarSign className="w-4 h-4 text-orange-500" /> {project.estimated_cost}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:w-56">
              <button onClick={toggleFav} className={favorited ? "btn-ghost px-4 py-3 flex items-center justify-center gap-2" : "btn-brutal px-4 py-3 flex items-center justify-center gap-2"} data-testid="favorite-btn">
                {favorited ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
              </button>
              <button onClick={() => window.print()} className="border-2 border-zinc-700 text-white font-mono2 font-bold uppercase px-4 py-3 flex items-center justify-center gap-2 hover:border-orange-500 transition-none text-sm" data-testid="print-btn">
                <Printer className="w-4 h-4" /> Print List
              </button>
              <Dialog onOpenChange={(o) => o && (user ? loadCollections() : login())}>
                <DialogTrigger asChild>
                  <button className="border-2 border-zinc-700 text-white font-mono2 font-bold uppercase px-4 py-3 flex items-center justify-center gap-2 hover:border-orange-500 transition-none text-sm" data-testid="add-collection-btn">
                    <FolderPlus className="w-4 h-4" /> Collection
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-2 border-orange-600 rounded-none text-white">
                  <DialogHeader><DialogTitle className="font-display text-3xl tracking-wide uppercase text-orange-500">Add to Collection</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    {collections.map((c) => {
                      const inside = c.project_ids?.includes(id);
                      return (
                        <button key={c.id} onClick={() => addToCol(c)} className="w-full flex items-center justify-between border-2 border-zinc-700 hover:border-orange-500 px-4 py-3 font-mono2 text-sm transition-none" data-testid={`collection-opt-${c.id}`}>
                          <span>{c.name}</span>{inside && <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      );
                    })}
                    <div className="flex gap-0 pt-2">
                      <input value={newCol} onChange={(e) => setNewCol(e.target.value)} placeholder="New collection name" className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-3 py-2 font-mono2 text-sm outline-none focus:border-orange-500" data-testid="new-collection-input" />
                      <button onClick={createAndAdd} className="btn-brutal px-4 text-xs" data-testid="create-collection-btn">Add</button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-4xl tracking-tight text-orange-500 uppercase mb-6">Build Steps</h2>
            <div className="space-y-4">
              {project.steps?.map((s, i) => (
                <div key={i} className="border-2 border-zinc-800 bg-zinc-950 p-5" data-testid={`step-${i}`}>
                  <div className="flex gap-5">
                    <span className="font-display text-5xl text-orange-600 leading-none">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <h3 className="font-mono2 font-bold uppercase text-white mb-2">{s.title}</h3>
                      <p className="font-mono2 text-sm text-zinc-300">{s.detail}</p>
                      {s.tip && <p className="font-mono2 text-xs text-orange-400 mt-3 border-l-2 border-orange-600 pl-3">PRO TIP: {s.tip}</p>}
                    </div>
                  </div>
                  {!project.locked && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                      {s.image_url && (
                        <div className="sm:col-span-2 border-2 border-zinc-800 overflow-hidden">
                          <img src={s.image_url} alt={s.title} className="w-full h-44 object-cover" data-testid={`step-image-${i}`} />
                        </div>
                      )}
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${project.title} ${s.title} tutorial`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className={`${s.image_url ? "" : "sm:col-span-3"} flex flex-col items-center justify-center gap-2 border-2 border-zinc-700 bg-zinc-900 hover:border-red-500 hover:bg-red-950/20 transition-none p-4 text-center group`}
                        data-testid={`step-video-${i}`}
                      >
                        <Youtube className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                        <span className="font-mono2 text-xs font-bold uppercase text-zinc-200">Watch on YouTube</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paywall */}
            {project.locked && (
              <div className="border-2 border-orange-600 bg-zinc-950 p-6 sm:p-8 mt-4 relative overflow-hidden" data-testid="paywall">
                <div className="absolute inset-0 grid-texture opacity-50" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <Lock className="w-6 h-6 text-orange-500" />
                    <h3 className="font-display text-3xl tracking-wide text-white uppercase">{lockedCount} More Steps Locked</h3>
                  </div>
                  <p className="font-mono2 text-sm text-zinc-300 mb-6 max-w-xl">
                    Unlock the complete step-by-step procedure, pro tips, safety notes and curated web/video resources.
                    The tools & materials shopping list above is always free.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <button onClick={() => checkout("guide")} disabled={paying} className="border-2 border-zinc-700 bg-zinc-900 p-5 text-left hover:border-orange-500 transition-none disabled:opacity-60" data-testid="unlock-guide-btn">
                      <Zap className="w-6 h-6 text-orange-500 mb-2" />
                      <p className="font-mono2 font-bold uppercase text-white">Unlock This Guide</p>
                      <p className="font-display text-4xl text-orange-500 leading-none mt-1">$2.99</p>
                      <p className="font-mono2 text-xs text-zinc-500 mt-1">One-time, this build only</p>
                    </button>
                    <button onClick={() => checkout("pro")} disabled={paying} className="border-2 border-orange-600 bg-orange-600/10 p-5 text-left hover:bg-orange-600/20 transition-none disabled:opacity-60" data-testid="go-pro-btn">
                      <Crown className="w-6 h-6 text-orange-500 mb-2" />
                      <p className="font-mono2 font-bold uppercase text-white">Go Pro</p>
                      <p className="font-display text-4xl text-orange-500 leading-none mt-1">$9<span className="text-lg">/mo</span></p>
                      <p className="font-mono2 text-xs text-zinc-500 mt-1">Unlock every guide + all resources</p>
                    </button>
                  </div>
                  {!user && <p className="font-mono2 text-xs text-orange-400 mt-4">Sign in required to purchase.</p>}
                </div>
              </div>
            )}

            {!project.locked && project.safety_tips?.length > 0 && (
              <div className="border-2 border-red-900 bg-red-950/20 p-5 mt-8">
                <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-red-400 mb-3"><ShieldAlert className="w-5 h-5" /> Safety</h3>
                <ul className="space-y-2">
                  {project.safety_tips.map((t, i) => (<li key={i} className="font-mono2 text-sm text-zinc-300 flex gap-2"><span className="text-red-500">›</span> {t}</li>))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
              <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-white mb-4"><Wrench className="w-5 h-5 text-orange-500" /> Tools</h3>
              <ul className="space-y-2">{project.tools?.map((t, i) => (<li key={i} className="font-mono2 text-sm text-zinc-300 flex gap-2"><span className="text-orange-500">▪</span> {t}</li>))}</ul>
            </div>

            <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
              <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-white mb-4"><Package className="w-5 h-5 text-orange-500" /> Materials</h3>
              <ul className="space-y-2">
                {project.materials?.map((m, i) => (
                  <li key={i} className="font-mono2 text-sm text-zinc-300 border-b border-zinc-800 pb-2">
                    <span className="block break-words">{m.name}</span>
                    {m.quantity && <span className="block text-orange-400 text-xs mt-0.5">{m.quantity}</span>}
                  </li>
                ))}
              </ul>
              <button onClick={() => window.print()} className="btn-brutal w-full mt-4 px-3 py-2 text-xs flex items-center justify-center gap-2" data-testid="print-list-btn">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>

            {!project.locked && project.resources?.length > 0 && (
              <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
                <h3 className="font-mono2 font-bold uppercase text-white mb-4">Web Resources</h3>
                <div className="space-y-3">
                  {project.resources.map((r, i) => {
                    const Icon = RES_ICON[r.type] || FileText;
                    return (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group" data-testid={`resource-${i}`}>
                        <Icon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-mono2 text-sm text-zinc-200 group-hover:text-orange-400 transition-none flex items-center gap-1">{r.title} <ExternalLink className="w-3 h-3 opacity-50" /></p>
                          <p className="font-mono2 text-[10px] text-zinc-500 uppercase">{r.source}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
