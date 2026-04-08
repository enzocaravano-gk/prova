import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Login from "./Login";
import CoachDashboard from "./CoachDashboard";
import DirectorDashboard from "./DirectorDashboard";

export default function Index() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold neon-glow animate-pulse" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
            S+
          </div>
          <p className="text-muted-foreground text-sm">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (role === "director") {
    return <DirectorDashboard />;
  }

  return <CoachDashboard />;
}
