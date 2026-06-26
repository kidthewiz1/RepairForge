import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Landing from "@/pages/Landing";
import Results from "@/pages/Results";
import Dashboard from "@/pages/Dashboard";
import AuthCallback from "@/pages/AuthCallback";
import Maintenance from "@/pages/Maintenance";

const MAINTENANCE = process.env.REACT_APP_MAINTENANCE === "true";

function AppRouter() {
  const location = useLocation();
  if (MAINTENANCE) return <Maintenance />;
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/project/:id" element={<Results />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <AppRouter />
            <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { borderRadius: 0, border: "2px solid #ea580c", background: "#0a0a0a", color: "#fff", fontFamily: "Space Mono, monospace" } }} />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
