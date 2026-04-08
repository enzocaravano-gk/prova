import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import DirectorDashboardView from "./DirectorDashboardView";

interface Society { id: string; name: string; }
interface Team { id: string; name: string; society_id: string | null; }
interface Coach { id: string; team_id: string; coach_id: string; name?: string; phone?: string; }
interface Invite { id: string; email: string; phone?: string | null; status: string; token: string; }

export default function DirectorDashboard() {
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const [society, setSociety] = useState<Society | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"manage" | "dashboard">("dashboard"); // apre su Dashboard

  const [showSocietyDialog, setShowSocietyDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showCoachDialog, setShowCoachDialog] = useState(false);

  const [societyName, setSocietyName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPhone, setCoachPhone] = useState("+39 ");
  const [coachAction, setCoachAction] = useState<"link" | "invite">("link");

  useEffect(() => {
    if (user) initDirector();
  }, [user]);

  const initDirector = async () => {
    if (!user) return;
    setLoading(true);

    // Cerca società del direttore
    const { data: soc, error: socErr } = await supabase
      .from("societies")
      .select("*")
      .eq("director_id", user.id)
      .maybeSingle();

    if (socErr) {
      console.error("Errore caricamento società:", socErr);
      toast({ title: "Errore", description: socErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (soc) {
      setSociety(soc);
      await fetchTeams(soc.id);
    } else {
      setShowSocietyDialog(true);
    }

    setLoading(false);
  };

  const fetchTeams = async (societyId: string) => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, society_id")
      .eq("society_id", societyId)
      .order("name");

    if (error) {
      console.error("Errore caricamento squadre:", error);
      toast({ title: "Errore squadre", description: error.message, variant: "destructive" });
      setTeams([]);
    } else {
      setTeams(data || []);
    }
  };

  const createSociety = async () => {
    if (!user || !societyName.trim()) return;
    const { data, error } = await supabase
      .from("societies")
      .insert({ name: societyName.trim(), director_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    setSociety(data);
    setTeams([]);
    setShowSocietyDialog(false);
    setSocietyName("");
    toast({ title: "✓ Società creata!" });
  };

  const createTeam = async () => {
    if (!society || !teamName.trim()) return;

    const { data, error } = await supabase
      .from("teams")
      .insert({ name: teamName.trim(), society_id: society.id })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione squadra:", error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }

    // Aggiorna lista squadre aggiungendo la nuova direttamente
    setTeams(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setShowTeamDialog(false);
    setTeamName("");
    toast({ title: "✓ Squadra creata!" });
  };

  const deleteTeam = async (teamId: string) => {
    if (!confirm("Eliminare questa squadra e tutti i suoi dati?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return;
    }
    setTeams(prev => prev.filter(t => t.id !== teamId));
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(null);
      setCoaches([]);
      setInvites([]);
    }
  };

  const loadTeamDetails = async (team: Team) => {
    setSelectedTeam(team);

    // Carica allenatori
    const { data: coachData } = await supabase
      .from("team_coaches")
      .select("id, team_id, coach_id")
      .eq("team_id", team.id);

    const withInfo: Coach[] = await Promise.all(
      (coachData || []).map(async (c) => {
        const [{ data: name }, { data: phone }] = await Promise.all([
          supabase.rpc("get_profile_name", { _user_id: c.coach_id }),
          supabase.rpc("get_profile_phone", { _user_id: c.coach_id }),
        ]);
        return { ...c, name: (name as string) || "Coach", phone: (phone as string) || "" };
      })
    );
    setCoaches(withInfo);

    // Carica inviti
    const { data: invData } = await supabase
      .from("coach_invites")
      .select("id, email, phone, status, token")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false });
    setInvites(invData || []);
  };

  const handleAddCoach = async () => {
    if (!selectedTeam || !coachEmail.trim()) return;

    if (coachAction === "link") {
      const { data, error } = await supabase.rpc("link_coach_to_team", {
        _coach_email: coachEmail.trim(),
        _team_id: selectedTeam.id,
        _director_id: user?.id,
      });
      const result = data as { ok: boolean; error?: string };
      if (error || !result?.ok) {
        const msg = result?.error || error?.message || "Errore";
        if (msg.includes("Nessun allenatore")) setCoachAction("invite");
        toast({ title: "Errore", description: msg, variant: "destructive" });
        return;
      }
      await loadTeamDetails(selectedTeam);
      setShowCoachDialog(false);
      setCoachEmail("");
      toast({ title: "✓ Allenatore aggiunto!" });
    } else {
      if (!society) return;
      const { error } = await supabase.from("coach_invites").insert({
        society_id: society.id,
        team_id: selectedTeam.id,
        invited_by: user?.id,
        email: coachEmail.trim(),
        phone: coachPhone.trim() || null,
        status: "pending",
      });
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
        return;
      }
      await loadTeamDetails(selectedTeam);
      setShowCoachDialog(false);
      setCoachEmail("");
      setCoachPhone("+39 ");
      toast({ title: "✓ Invito registrato!", description: "Copia il link e invialo all'allenatore." });
    }
  };

  const removeCoach = async (id: string) => {
    await supabase.from("team_coaches").delete().eq("id", id);
    if (selectedTeam) loadTeamDetails(selectedTeam);
  };

  // ── Render ────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Caricamento...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>

      {/* ── Header ── */}
      <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-4 border-b border-border shrink-0"
        style={{ background: "hsla(215,25%,8%,0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold neon-glow"
            style={{ background: "linear-gradient(135deg,hsl(var(--primary)),hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
            S+
          </div>
          <span className="hidden sm:inline text-lg tracking-wider text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            SPORTHUB+
          </span>
          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/25"
            style={{ fontFamily: "var(--font-mono)" }}>
            {society?.name || "DIRETTORE"}
          </span>
        </div>

        <nav className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {(["dashboard", "manage"] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                ${activeView === v
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {v === "manage" ? "Gestione" : "Dashboard"}
            </button>
          ))}
        </nav>

        <button onClick={signOut} className="text-xs sm:text-sm text-muted-foreground hover:text-destructive transition-colors">
          Esci
        </button>
      </header>

      {/* ── Dashboard ── */}
      {activeView === "dashboard" && (
        <div className="flex-1 overflow-auto">
          <DirectorDashboardView />
        </div>
      )}

      {/* ── Gestione ── */}
      {activeView === "manage" && (
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header sezione */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Squadre</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{teams.length} squadr{teams.length === 1 ? "a" : "e"}</p>
              </div>
              <Button onClick={() => setShowTeamDialog(true)} size="sm" className="neon-glow" disabled={!society}>
                + Nuova Squadra
              </Button>
            </div>

            {/* Avviso se non c'è società */}
            {!society && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
                <p className="text-muted-foreground mb-3">Devi prima creare la tua società per gestire le squadre.</p>
                <Button onClick={() => setShowSocietyDialog(true)} className="neon-glow">
                  Crea Società
                </Button>
              </div>
            )}

            {/* Lista squadre */}
            {society && teams.length === 0 && (
              <div className="rounded-xl border border-border p-10 text-center"
                style={{ background: "hsl(var(--card))" }}>
                <p className="text-3xl mb-3">🏆</p>
                <p className="text-muted-foreground">Nessuna squadra ancora.</p>
                <p className="text-sm text-muted-foreground mt-1">Clicca "+ Nuova Squadra" per iniziare.</p>
              </div>
            )}

            {teams.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map(team => (
                  <div key={team.id}
                    onClick={() => loadTeamDetails(team)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/50
                      ${selectedTeam?.id === team.id ? "border-primary bg-primary/5" : "border-border"}`}
                    style={{ background: selectedTeam?.id === team.id ? undefined : "hsl(var(--card))" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{team.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Clicca per gestire</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteTeam(team.id); }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors p-1">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dettaglio squadra */}
            {selectedTeam && (
              <div className="rounded-xl border border-border p-4 sm:p-6 space-y-4"
                style={{ background: "hsl(var(--card))" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedTeam.name}</h3>
                    <p className="text-xs text-muted-foreground">{coaches.length}/3 allenatori</p>
                  </div>
                  {coaches.length < 3 && (
                    <Button onClick={() => { setCoachAction("link"); setShowCoachDialog(true); }}
                      size="sm" variant="outline">
                      + Allenatore
                    </Button>
                  )}
                </div>

                {/* Allenatori */}
                <div className="space-y-2">
                  {coaches.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                      <button onClick={() => removeCoach(c.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        Rimuovi
                      </button>
                    </div>
                  ))}

                  {/* Inviti pendenti */}
                  {invites.filter(i => i.status === "pending").map(inv => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 opacity-70">
                      <div>
                        <p className="text-sm text-muted-foreground">{inv.email}</p>
                        <p className="text-xs text-primary">Invito in attesa</p>
                      </div>
                      <button
                        onClick={async () => {
                          const link = `${window.location.origin}/app?invite=${inv.token}`;
                          await navigator.clipboard.writeText(link);
                          toast({ title: "Link copiato!" });
                        }}
                        className="text-xs text-primary hover:underline">
                        Copia link
                      </button>
                    </div>
                  ))}

                  {coaches.length === 0 && invites.filter(i => i.status === "pending").length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Nessun allenatore assegnato ancora.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Crea Società */}
      <Dialog open={showSocietyDialog} onOpenChange={setShowSocietyDialog}>
        <DialogContent className="border-border" style={{ background: "hsl(var(--card))" }}>
          <DialogHeader>
            <DialogTitle>Crea la tua Società</DialogTitle>
            <DialogDescription>Inserisci il nome della società sportiva per iniziare.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input value={societyName} onChange={e => setSocietyName(e.target.value)}
              placeholder="Es. ASD Calcio Roma" className="bg-input border-border"
              onKeyDown={e => e.key === "Enter" && createSociety()} />
            <Button onClick={createSociety} className="w-full neon-glow" disabled={!societyName.trim()}>
              Crea Società
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crea Squadra */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="border-border" style={{ background: "hsl(var(--card))" }}>
          <DialogHeader>
            <DialogTitle>Nuova Squadra</DialogTitle>
            <DialogDescription>Aggiungi una squadra alla tua società.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Es. Under 17" className="bg-input border-border"
              onKeyDown={e => e.key === "Enter" && createTeam()} />
            <Button onClick={createTeam} className="w-full" disabled={!teamName.trim()}>
              Crea Squadra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aggiungi Allenatore */}
      <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
        <DialogContent className="border-border" style={{ background: "hsl(var(--card))" }}>
          <DialogHeader>
            <DialogTitle>Aggiungi Allenatore</DialogTitle>
            <DialogDescription>Cerca un allenatore già registrato o invia un invito.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {(["link", "invite"] as const).map(a => (
                <button key={a} type="button" onClick={() => setCoachAction(a)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all
                    ${coachAction === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {a === "link" ? "Già registrato" : "Invia invito"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Email allenatore</label>
              <Input type="email" value={coachEmail} onChange={e => setCoachEmail(e.target.value)}
                placeholder="coach@esempio.com" className="bg-input border-border" />
            </div>
            {coachAction === "invite" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Telefono (opzionale)</label>
                <Input type="tel" value={coachPhone} onChange={e => setCoachPhone(e.target.value)}
                  placeholder="+39 3331234567" className="bg-input border-border" />
              </div>
            )}
            <Button onClick={handleAddCoach} className="w-full" disabled={!coachEmail.trim()}>
              {coachAction === "link" ? "Aggiungi allenatore" : "Invia invito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
