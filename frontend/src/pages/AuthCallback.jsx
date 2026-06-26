import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");
    if (!sessionId) {
      navigate("/");
      return;
    }

    const run = async () => {
      try {
        const res = await api.post("/auth/session", {}, { headers: { "X-Session-ID": sessionId } });
        setUser(res.data);
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: res.data } });
      } catch (e) {
        navigate("/");
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-orange-500 font-mono2 uppercase tracking-widest animate-pulse" data-testid="auth-loading">
        // Authenticating...
      </div>
    </div>
  );
}
