import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface CoachTeam {
  team_id: string;
  team_name: string;
  society_name: string | null;
  is_owner: boolean;
  is_assigned: boolean;
}

interface Subscription {
  plan: string;
  max_teams: number;
  max_athletes: number;
  teams_used: number;
}

const tabs = [
  { id: "jump", label: "Jump", src: "/deepsalto18.html" },
  { id: "postura", label: "Postura", src: "/postura.html" },
  { id: "match", label: "Match", src: "/MATCH.html" },
  { id: "jarvis", label: "Jarvis", src: "/JARVIS.html" },
];

export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const sh2Ref = useRef<HTMLIFrameElement>(null);

  // Manda sessione Supabase all'iframe SH2 via postMessage
  const sendSessionToSH2 = useCallback(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!keys.length) return;
    try {
      const session = JSON.parse(localStorage.getItem(keys[0]) || '');
      if (session?.access_token && sh2Ref.current?.contentWindow) {
        sh2Ref.current.contentWindow.postMessage({ type: 'SB_SESSION', session }, '*');
      }
    } catch(e) {}
  }, []);
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const [teams, setTeams] = useState<CoachTeam[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => { loadTeams(); }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    const [{ data: teamRows }, { data: sub }] = await Promise.all([
      supabase.rpc("get_coach_teams", { _coach_id: user.id }),
      supabase.rpc("get_subscription", { _user_id: user.id }),
    ]);
    setTeams(teamRows || []);
    setSubscription(sub as Subscription || null);
  };

  const createTeam = async () => {
    if (!user || !newTeamName.trim()) return;
    setLoadingTeam(true);
    const { data, error } = await supabase.rpc("create_coach_team", {
      _coach_id: user.id,
      _team_name: newTeamName.trim(),
    });
    const result = data as { ok: boolean; error?: string; team_id?: string };
    if (error || !result?.ok) {
      toast({ title: "Errore", description: result?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Squadra creata!" });
      setShowNewTeamDialog(false);
      setNewTeamName("");
      loadTeams();
    }
    setLoadingTeam(false);
  };

  const planColor = subscription?.plan === "pro" ? "text-primary" : subscription?.plan === "team" ? "text-yellow-400" : "text-muted-foreground";
  const planLabel = { free: "Free", pro: "Pro", team: "Team" }[subscription?.plan || "free"] || "Free";
  const canCreateTeam = !subscription || (subscription.teams_used < subscription.max_teams);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <header className="h-14 sm:h-16 flex items-center justify-between px-2 sm:px-4 border-b border-border shrink-0" style={{ background: "hsla(215, 25%, 8%, 0.92)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold neon-glow" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
            S+
          </div>
          <span className="hidden sm:inline text-lg tracking-wider text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            SPORTHUB+
          </span>
          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 ${planColor}`} style={{ fontFamily: "var(--font-mono)" }}>
            COACH · {planLabel}
          </span>
        </div>

        {/* Tab nav */}
        <nav className="flex items-center gap-0.5 sm:gap-1 absolute left-1/2 -translate-x-1/2">
          {/* Tab Dashboard nativo */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-primary/10 text-primary border border-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Dashboard
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Squadre badge */}
          {teams.length > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              {teams.length} squadr{teams.length === 1 ? "a" : "e"}
            </span>
          )}
          <button onClick={signOut} className="text-xs sm:text-sm text-muted-foreground hover:text-destructive transition-colors">
            Esci
          </button>
        </div>
      </header>

      {/* Banner squadre (se nessuna squadra assegnata) */}
      {teams.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 text-center">
          <div className="text-4xl">🏆</div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Nessuna squadra ancora</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Puoi creare la tua prima squadra, oppure aspettare che un direttore ti assegni alla sua società.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowNewTeamDialog(true)} className="neon-glow">
              + Crea squadra
            </Button>
          </div>
          {subscription && (
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              Piano {planLabel} · {subscription.teams_used}/{subscription.max_teams} squadre · max {subscription.max_athletes} atleti
            </p>
          )}
        </div>
      )}

      {/* Dashboard nativa React */}
      {/* SH2 iframe con postMessage sessione */}
      {teams.length > 0 && (
        <iframe
          ref={sh2Ref}
          src="/SH2.html"
          className="app-iframe"
          style={{ display: activeTab === "dashboard" ? "block" : "none" }}
          title="Dashboard"
          allow="camera; microphone"
          onLoad={sendSessionToSH2}
        />
      )}

      {/* App iframes (visibili solo se c'è almeno una squadra) */}
      {teams.length > 0 && tabs.map((tab) => (
        <iframe
          key={tab.id}
          src={tab.src}
          className="app-iframe"
          style={{ display: activeTab === tab.id ? "block" : "none" }}
          title={tab.label}
          allow="camera; microphone"
        />
      ))}

      {/* FAB: crea squadra (visibile se può crearne altre) */}
      {teams.length > 0 && canCreateTeam && (
        <button
          onClick={() => setShowNewTeamDialog(true)}
          style={{
            position: "fixed", bottom: 24, left: 24, zIndex: 9000,
            background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)",
            color: "#00e5ff", padding: "8px 16px", borderRadius: 8,
            fontSize: 12, cursor: "pointer", fontFamily: "var(--font-mono)",
            backdropFilter: "blur(10px)"
          }}
        >
          + Nuova squadra ({subscription?.teams_used || 0}/{subscription?.max_teams || 1})
        </button>
      )}

      {/* Dialog: crea nuova squadra */}
      <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
        <DialogContent className="border-border" style={{ background: "hsl(var(--card))" }}>
          <DialogHeader>
            <DialogTitle>Crea squadra</DialogTitle>
            <DialogDescription>
              Crea una tua squadra personale. Puoi aggiungerci atleti e gestire allenamenti, partite e test atletici.
              {subscription && (
                <span className="block mt-1 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                  Piano {planLabel}: {subscription.teams_used}/{subscription.max_teams} squadre usate
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Es. Under 17 A"
              className="bg-input border-border"
              onKeyDown={e => e.key === "Enter" && createTeam()}
            />
            <Button onClick={createTeam} className="w-full neon-glow" disabled={!newTeamName.trim() || loadingTeam}>
              {loadingTeam ? "Creazione..." : "Crea squadra"}
            </Button>
            {!canCreateTeam && (
              <p className="text-xs text-center text-destructive">
                Hai raggiunto il limite del piano {planLabel}. Passa a Pro per più squadre.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
