import { Link, useNavigate } from "react-router-dom";
import { Wrench, LogOut, LayoutGrid } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-black border-b-2 border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <div className="bg-orange-600 text-black p-1.5 border-2 border-orange-600 group-hover:bg-orange-500 transition-none">
            <Wrench className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-2xl tracking-wide text-white">FIX<span className="text-orange-500">FORGE</span></span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden sm:flex items-center gap-2 px-4 py-2 border-2 border-zinc-700 text-white font-mono2 text-xs uppercase font-bold hover:border-orange-500 transition-none"
                data-testid="nav-dashboard-btn"
              >
                <LayoutGrid className="w-4 h-4" /> Workshop
              </button>
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-8 h-8 border-2 border-orange-500 object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-orange-600 text-black flex items-center justify-center font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <button onClick={logout} className="p-2 text-zinc-400 hover:text-orange-500 transition-none" data-testid="logout-btn" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button onClick={login} className="btn-brutal px-5 py-2 text-xs" data-testid="login-btn">
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
