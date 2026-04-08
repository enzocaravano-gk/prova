import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "signup" | "accept-invite";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"coach" | "director">("coach");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+39 ");
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Controlla se c'è un token di invito nell'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setMode("accept-invite");
      setRole("coach");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Errore accesso", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const meta: Record<string, string> = { full_name: fullName, role };
    if (role === "coach") meta.phone = phone.trim();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) {
      toast({ title: "Errore registrazione", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Registrazione completata!",
        description: "Controlla la tua email per confermare l'account.",
      });
    }
    setLoading(false);
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Registra l'allenatore
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: "coach", phone: phone.trim() },
        emailRedirectTo: `${window.location.origin}/app?invite=${inviteToken}`,
      },
    });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Se l'utente è già confermato, accetta subito l'invito
    if (data.user && !data.user.email_confirmed_at) {
      toast({
        title: "Quasi fatto!",
        description: "Controlla la tua email e clicca il link per completare l'accettazione dell'invito.",
      });
    } else if (data.user) {
      await supabase.rpc("accept_coach_invite", {
        _token: inviteToken,
        _coach_id: data.user.id,
      });
      toast({ title: "Invito accettato!", description: "Benvenuto in SPORTHUB+" });
    }
    setLoading(false);
  };

  const Logo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold neon-glow"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}
        >
          S+
        </div>
        <h1 className="text-4xl tracking-wider text-foreground neon-text" style={{ fontFamily: "var(--font-display)" }}>
          SPORTHUB+
        </h1>
      </div>
      <p className="text-muted-foreground text-sm">
        {mode === "login" && "Accedi al tuo account"}
        {mode === "signup" && "Crea il tuo account"}
        {mode === "accept-invite" && "Accetta l'invito e crea il tuo account"}
      </p>
    </div>
  );

  const cardStyle = { background: "hsl(var(--card))" };

  // ── LOGIN ──
  if (mode === "login") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, hsl(216 28% 5%), hsl(215 25% 10%))" }}>
      <div className="w-full max-w-md">
        <Logo />
        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl p-6 border border-border" style={cardStyle}>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.com" required className="bg-input border-border" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-input border-border" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold neon-glow">
            {loading ? "Accesso in corso..." : "Accedi"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">
              Registrati
            </button>
          </p>
        </form>
      </div>
    </div>
  );

  // ── REGISTRAZIONE ──
  if (mode === "signup") return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, hsl(216 28% 5%), hsl(215 25% 10%))" }}>
      <div className="w-full max-w-md">
        <Logo />
        <form onSubmit={handleSignUp} className="space-y-4 rounded-2xl p-6 border border-border" style={cardStyle}>

          {/* Ruolo — PRIMO */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Sei un</label>
            <div className="grid grid-cols-2 gap-2">
              {(["coach", "director"] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    role === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-input text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {r === "coach" ? "🏋️ Allenatore" : "📊 Direttore"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Nome completo</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Mario Rossi" required className="bg-input border-border" />
          </div>

          {/* Telefono solo per allenatori */}
          {role === "coach" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">
                Telefono <span className="text-xs text-muted-foreground/60">(sarà usato per ricevere comunicazioni)</span>
              </label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+39 3331234567" required className="bg-input border-border" />
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.com" required className="bg-input border-border" />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-input border-border" />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold neon-glow">
            {loading ? "Registrazione..." : `Registrati come ${role === "coach" ? "Allenatore" : "Direttore"}`}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Hai già un account?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
              Accedi
            </button>
          </p>
        </form>
      </div>
    </div>
  );

  // ── ACCETTAZIONE INVITO ──
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, hsl(216 28% 5%), hsl(215 25% 10%))" }}>
      <div className="w-full max-w-md">
        <Logo />
        <div className="mb-4 p-3 rounded-xl border border-primary/30 bg-primary/5 text-sm text-primary text-center">
          Sei stato invitato come allenatore. Crea il tuo account per accettare.
        </div>
        <form onSubmit={handleAcceptInvite} className="space-y-4 rounded-2xl p-6 border border-border" style={cardStyle}>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Nome completo</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Mario Rossi" required className="bg-input border-border" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Telefono <span className="text-xs text-muted-foreground/60">(usato dall'agente AI per contattarti)</span>
            </label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+39 3331234567" required className="bg-input border-border" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.com" required className="bg-input border-border" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Scegli una password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-input border-border" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold neon-glow">
            {loading ? "Attendi..." : "Accetta invito e registrati"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Hai già un account?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
              Accedi
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
