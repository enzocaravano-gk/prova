import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Team { id: string; name: string; is_owner: boolean; society_name: string | null; }
interface Athlete {
  id: string; team_id: string; full_name: string; jersey_number: number | null;
  position: string | null; birth_date: string | null; birth_place: string | null;
  phone: string | null; fitness: number | null; rating: number | null;
  goals_scored: number | null; goals_conceded: number | null; assists: number | null;
  minutes: number | null; matches_played: number | null; attendance: number | null;
  measure1_height: number | null; measure1_weight: number | null;
  measure2_height: number | null; measure2_weight: number | null;
  test1_5m: number | null; test1_10m: number | null; test1_15m: number | null;
  test1_20m: number | null; test1_30m: number | null;
  test1_abs: number | null; test1_push: number | null; test1_bipo: number | null;
  test1_mono_dx: number | null; test1_mono_sx: number | null;
  test2_5m: number | null; test2_10m: number | null; test2_15m: number | null;
  test2_20m: number | null; test2_30m: number | null;
  test2_abs: number | null; test2_push: number | null; test2_bipo: number | null;
  test2_mono_dx: number | null; test2_mono_sx: number | null;
  notes: string | null; sprints: any[];
}
interface MatchScorer { athlete_id: string; goals: number; }
interface MatchAssist { athlete_id: string; assists: number; }
interface MatchGK { athlete_id: string; goals_conceded: number; clean_sheet: boolean; }
interface Match {
  id: string; team_id: string; date: string; opponent: string; type: string;
  venue: string; goals_for: number; goals_against: number; notes: string | null;
  match_scorers: MatchScorer[]; match_assists: MatchAssist[]; match_goalkeepers: MatchGK[];
}
interface TrainingAttendance { athlete_id: string; present: boolean; }
interface Training {
  id: string; team_id: string; date: string; session_type: string;
  duration_minutes: number; notes: string | null; training_attendances: TrainingAttendance[];
}

// ─── Costanti ─────────────────────────────────────────────────────────────────
const ROLES = ["Portiere","Difensore","Centrocampista","Ala","Attaccante","Jolly"];
const C = {
  bg: "#07090f", bg2: "#0d1117", bg3: "#131920", bg4: "#1a2230",
  border: "rgba(255,255,255,0.07)", borderH: "rgba(255,255,255,0.14)",
  neon: "#00e5ff", green: "#00e676", orange: "#ff9100", red: "#ff1744",
  purple: "#d500f9", gold: "#ffd600", yellow: "#ffeb3b",
  text1: "#f0f4f8", text2: "#8899aa", text3: "#4d6070",
  mono: "'JetBrains Mono', monospace",
};
const initAthlete = (): Partial<Athlete> => ({
  full_name: "", jersey_number: null, position: "Centrocampista",
  birth_date: null, birth_place: null, phone: null, fitness: 5, rating: 0,
  goals_scored: 0, goals_conceded: 0, assists: 0, minutes: 0, matches_played: 0, attendance: 0,
  measure1_height: null, measure1_weight: null, measure2_height: null, measure2_weight: null,
  test1_5m: null, test1_10m: null, test1_15m: null, test1_20m: null, test1_30m: null,
  test1_abs: null, test1_push: null, test1_bipo: null, test1_mono_dx: null, test1_mono_sx: null,
  test2_5m: null, test2_10m: null, test2_15m: null, test2_20m: null, test2_30m: null,
  test2_abs: null, test2_push: null, test2_bipo: null, test2_mono_dx: null, test2_mono_sx: null,
  notes: null, sprints: []
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
const initials = (name: string) => name.split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2);
const age = (bd: string | null) => bd ? Math.floor((Date.now() - new Date(bd).getTime()) / 31557600000) : null;
const pct = (v: number, tot: number) => tot > 0 ? Math.round(v / tot * 100) : 0;
const delta = (v1: number | null, v2: number | null) => v1 && v2 ? ((v2 - v1) / v1 * 100).toFixed(1) : null;

// ─── Componenti UI base ───────────────────────────────────────────────────────
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, ...style }}>
    {children}
  </div>
);
const Kpi = ({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) => (
  <div style={{ background: C.bg3, borderRadius: 10, padding: "12px 14px" }}>
    <div style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 22, color: color || C.neon, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{sub}</div>}
  </div>
);
const Btn = ({ children, onClick, variant = "ghost", style }: any) => {
  const styles: any = {
    ghost: { background: "transparent", border: `1px solid ${C.border}`, color: C.text2 },
    neon:  { background: `rgba(0,229,255,.1)`, border: `1px solid rgba(0,229,255,.3)`, color: C.neon },
    green: { background: `rgba(0,230,118,.1)`, border: `1px solid rgba(0,230,118,.3)`, color: C.green },
    red:   { background: `rgba(255,23,68,.1)`, border: `1px solid rgba(255,23,68,.3)`, color: C.red },
    solid: { background: C.neon, border: "none", color: "#07090f" },
  };
  return (
    <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "opacity .2s", ...styles[variant], ...style }}>
      {children}
    </button>
  );
};
const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>{children}</span>
);
const Input = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div>
    {label && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>}
    <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 10px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const }} />
  </div>
);
const Select = ({ label, value, onChange, options }: any) => (
  <div>
    {label && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>{label}</div>}
    <select value={value ?? ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 10px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, fontSize: 13 }}>
      {options.map((o: any) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 10, fontFamily: C.mono }}>{title}</div>
    {children}
  </div>
);
const Grid = ({ cols, gap = 10, children }: { cols: string; gap?: number; children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: cols, gap }}>{children}</div>
);
const Modal = ({ open, onClose, title, children, width = 600 }: any) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(7,9,15,.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ athletes, matches, trainings }: { athletes: Athlete[]; matches: Match[]; trainings: Training[]; }) {
  const wins = matches.filter(m => m.goals_for > m.goals_against).length;
  const draws = matches.filter(m => m.goals_for === m.goals_against).length;
  const losses = matches.filter(m => m.goals_for < m.goals_against).length;
  const gf = matches.reduce((s, m) => s + m.goals_for, 0);
  const ga = matches.reduce((s, m) => s + m.goals_against, 0);
  const totalSessions = trainings.length;
  const avgAtt = totalSessions > 0
    ? Math.round(trainings.reduce((s, t) => {
        const present = t.training_attendances.filter(a => a.present).length;
        return s + pct(present, athletes.length);
      }, 0) / totalSessions)
    : 0;

  // Top scorers
  const scorerMap: Record<string, number> = {};
  matches.forEach(m => m.match_scorers.forEach(s => { scorerMap[s.athlete_id] = (scorerMap[s.athlete_id] || 0) + s.goals; }));
  const topScorers = Object.entries(scorerMap)
    .map(([id, g]) => ({ ath: athletes.find(a => a.id === id), goals: g }))
    .filter(x => x.ath).sort((a, b) => b.goals - a.goals).slice(0, 5);

  // Portieri
  const gkPlayers = athletes.filter(a => a.position === "Portiere");

  // Presenze recenti
  const recent = [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {/* Col sx */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 12, fontFamily: C.mono }}>Stagione</div>
          <Grid cols="repeat(4,1fr)" gap={8}>
            <Kpi label="Atleti" value={athletes.length} color={C.neon} />
            <Kpi label="Vittorie" value={wins} color={C.green} />
            <Kpi label="Pareggi" value={draws} color={C.orange} />
            <Kpi label="Sconfitte" value={losses} color={C.red} />
            <Kpi label="Gol Fatti" value={gf} color={C.green} />
            <Kpi label="Gol Subiti" value={ga} color={C.red} />
            <Kpi label="Allenamenti" value={totalSessions} color={C.purple} />
            <Kpi label="% Presenze" value={`${avgAtt}%`} color={C.gold} />
          </Grid>
        </Card>

        <Card>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 12, fontFamily: C.mono }}>Top Marcatori</div>
          {topScorers.length === 0
            ? <div style={{ color: C.text3, fontSize: 13 }}>Nessun marcatore</div>
            : topScorers.map((x, i) => (
              <div key={x.ath!.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: C.mono, fontWeight: 700, color: [C.gold, C.text2, C.orange][i] || C.text3, minWidth: 18 }}>{i + 1}</span>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.green},#00b248)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#07090f", flexShrink: 0 }}>{initials(x.ath!.full_name)}</div>
                <span style={{ flex: 1, fontSize: 13, color: C.text1 }}>{x.ath!.full_name}</span>
                <span style={{ fontFamily: C.mono, fontWeight: 700, color: C.green }}>{x.goals} ⚽</span>
              </div>
            ))
          }
        </Card>

        <Card>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 12, fontFamily: C.mono }}>Portieri</div>
          {gkPlayers.length === 0
            ? <div style={{ color: C.text3, fontSize: 13 }}>Nessun portiere in rosa</div>
            : gkPlayers.map(gk => {
              let sub = 0, cs = 0, pres = 0;
              matches.forEach(m => {
                const e = m.match_goalkeepers.find(g => g.athlete_id === gk.id);
                if (e !== undefined) { pres++; sub += e.goals_conceded; if (!e.goals_conceded) cs++; }
              });
              return (
                <div key={gk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${C.neon},#0077ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#07090f", flexShrink: 0 }}>{initials(gk.full_name)}</div>
                  <span style={{ flex: 1, fontSize: 13, color: C.text1 }}>{gk.full_name}</span>
                  <Badge color={C.red}>{sub} sub.</Badge>
                  {cs > 0 && <Badge color={C.green}>{cs} CS 🔒</Badge>}
                </div>
              );
            })
          }
        </Card>
      </div>

      {/* Col dx */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 12, fontFamily: C.mono }}>Ultime Partite</div>
          {matches.length === 0
            ? <div style={{ color: C.text3, fontSize: 13 }}>Nessuna partita</div>
            : [...matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(m => {
              const res = m.goals_for > m.goals_against ? C.green : m.goals_for < m.goals_against ? C.red : C.orange;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, minWidth: 70 }}>{fmt(m.date)}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text1 }}>vs {m.opponent}</span>
                  <span style={{ fontFamily: C.mono, fontWeight: 700, color: res }}>{m.goals_for}—{m.goals_against}</span>
                </div>
              );
            })
          }
        </Card>

        <Card>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 12, fontFamily: C.mono }}>Allenamenti Recenti</div>
          {recent.length === 0
            ? <div style={{ color: C.text3, fontSize: 13 }}>Nessun allenamento</div>
            : recent.map(t => {
              const present = t.training_attendances.filter(a => a.present).length;
              const p = pct(present, athletes.length);
              return (
                <div key={t.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, minWidth: 70 }}>{fmt(t.date)}</span>
                    <Badge color={C.purple}>{t.session_type}</Badge>
                    <span style={{ fontSize: 11, color: C.text3, marginLeft: "auto" }}>{present}/{athletes.length} presenti</span>
                  </div>
                  <div style={{ height: 4, background: C.bg4, borderRadius: 2 }}>
                    <div style={{ height: 4, width: `${p}%`, background: p >= 70 ? C.green : p >= 50 ? C.orange : C.red, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })
          }
        </Card>
      </div>
    </div>
  );
}

// ─── Athlete Modal ────────────────────────────────────────────────────────────
function AthleteModal({ open, onClose, athlete, teamId, onSave }: any) {
  const [data, setData] = useState<Partial<Athlete>>(initAthlete());
  const [testTab, setTestTab] = useState(1);
  const [measTab, setMeasTab] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (athlete) setData({ ...athlete });
    else setData({ ...initAthlete(), team_id: teamId });
  }, [athlete, teamId, open]);

  const set = (key: keyof Athlete) => (val: any) => setData(d => ({ ...d, [key]: val === "" ? null : val }));
  const setN = (key: keyof Athlete) => (val: string) => setData(d => ({ ...d, [key]: val === "" ? null : parseFloat(val) }));
  const setI = (key: keyof Athlete) => (val: string) => setData(d => ({ ...d, [key]: val === "" ? null : parseInt(val) }));

  const save = async () => {
    if (!data.full_name?.trim()) return;
    setSaving(true);
    const row = {
      team_id: teamId, full_name: data.full_name?.trim(),
      jersey_number: data.jersey_number, position: data.position,
      birth_date: data.birth_date, birth_place: data.birth_place, phone: data.phone,
      fitness: data.fitness ?? 5, rating: data.rating ?? 0,
      goals_scored: data.goals_scored ?? 0, goals_conceded: data.goals_conceded ?? 0,
      assists: data.assists ?? 0, minutes: data.minutes ?? 0,
      matches_played: data.matches_played ?? 0, attendance: data.attendance ?? 0,
      measure1_height: data.measure1_height, measure1_weight: data.measure1_weight,
      measure2_height: data.measure2_height, measure2_weight: data.measure2_weight,
      test1_5m: data.test1_5m, test1_10m: data.test1_10m, test1_15m: data.test1_15m,
      test1_20m: data.test1_20m, test1_30m: data.test1_30m,
      test1_abs: data.test1_abs, test1_push: data.test1_push, test1_bipo: data.test1_bipo,
      test1_mono_dx: data.test1_mono_dx, test1_mono_sx: data.test1_mono_sx,
      test2_5m: data.test2_5m, test2_10m: data.test2_10m, test2_15m: data.test2_15m,
      test2_20m: data.test2_20m, test2_30m: data.test2_30m,
      test2_abs: data.test2_abs, test2_push: data.test2_push, test2_bipo: data.test2_bipo,
      test2_mono_dx: data.test2_mono_dx, test2_mono_sx: data.test2_mono_sx,
      notes: data.notes, sprints: data.sprints ?? []
    };
    if (athlete?.id) {
      await supabase.from("athletes").update(row).eq("id", athlete.id);
    } else {
      await supabase.from("athletes").insert(row);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const hDelta = data.measure1_height && data.measure2_height ? (data.measure2_height - data.measure1_height).toFixed(1) : null;
  const wDelta = data.measure1_weight && data.measure2_weight ? (data.measure2_weight - data.measure1_weight).toFixed(1) : null;

  return (
    <Modal open={open} onClose={onClose} title={athlete ? "Modifica Atleta" : "Nuovo Atleta"} width={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Dati base */}
        <Section title="Anagrafica">
          <Grid cols="1fr 1fr 80px" gap={10}>
            <Input label="Nome Completo *" value={data.full_name} onChange={set("full_name")} placeholder="Cognome Nome" />
            <Input label="Data di Nascita" type="date" value={data.birth_date} onChange={set("birth_date")} />
            <Input label="N°" type="number" value={data.jersey_number} onChange={setI("jersey_number")} placeholder="#" />
          </Grid>
          <div style={{ height: 10 }} />
          <Grid cols="1fr 1fr 1fr" gap={10}>
            <Input label="Luogo di Nascita" value={data.birth_place} onChange={set("birth_place")} placeholder="Città" />
            <Input label="Telefono" value={data.phone} onChange={set("phone")} placeholder="+39 333..." />
            <Select label="Ruolo" value={data.position} onChange={set("position")} options={ROLES} />
          </Grid>
        </Section>

        {/* Statistiche */}
        <Section title="Statistiche">
          <Grid cols="repeat(5,1fr)" gap={10}>
            <Input label="Partite" type="number" value={data.matches_played} onChange={setI("matches_played")} />
            <Input label="Gol Fatti" type="number" value={data.goals_scored} onChange={setI("goals_scored")} />
            <Input label="Gol Subiti" type="number" value={data.goals_conceded} onChange={setI("goals_conceded")} />
            <Input label="Assist" type="number" value={data.assists} onChange={setI("assists")} />
            <Input label="Minuti" type="number" value={data.minutes} onChange={setI("minutes")} />
          </Grid>
          <div style={{ height: 10 }} />
          <Grid cols="1fr 1fr 1fr" gap={10}>
            <div>
              <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Forma Fisica (1-10)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={1} max={10} value={data.fitness ?? 5} onChange={e => setI("fitness")(e.target.value)}
                  style={{ flex: 1 }} />
                <span style={{ fontFamily: C.mono, color: C.neon, minWidth: 20 }}>{data.fitness ?? 5}</span>
              </div>
            </div>
            <Input label="Rating (0-10)" type="number" value={data.rating} onChange={setN("rating")} placeholder="0.0" />
            <Input label="Presenze Allenamenti" type="number" value={data.attendance} onChange={setI("attendance")} />
          </Grid>
        </Section>

        {/* Misurazioni */}
        <Section title="Misurazioni Fisiche">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[1, 2].map(i => (
              <button key={i} onClick={() => setMeasTab(i)}
                style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: measTab === i ? `rgba(0,229,255,.15)` : C.bg3, border: `1px solid ${measTab === i ? C.neon : C.border}`, color: measTab === i ? C.neon : C.text2 }}>
                Rilevazione {i}
              </button>
            ))}
            {hDelta && (
              <div style={{ marginLeft: "auto", fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
                📈 Δ Alt: {Number(hDelta) >= 0 ? "+" : ""}{hDelta}cm · Δ Peso: {Number(wDelta) >= 0 ? "+" : ""}{wDelta}kg
              </div>
            )}
          </div>
          {measTab === 1 ? (
            <Grid cols="1fr 1fr" gap={10}>
              <Input label="Altezza T1 (cm)" type="number" value={data.measure1_height} onChange={setN("measure1_height")} placeholder="175.5" />
              <Input label="Peso T1 (kg)" type="number" value={data.measure1_weight} onChange={setN("measure1_weight")} placeholder="72.0" />
            </Grid>
          ) : (
            <Grid cols="1fr 1fr" gap={10}>
              <Input label="Altezza T2 (cm)" type="number" value={data.measure2_height} onChange={setN("measure2_height")} placeholder="175.5" />
              <Input label="Peso T2 (kg)" type="number" value={data.measure2_weight} onChange={setN("measure2_weight")} placeholder="72.0" />
            </Grid>
          )}
        </Section>

        {/* Test fisici */}
        <Section title="Test Fisici">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[1, 2].map(i => (
              <button key={i} onClick={() => setTestTab(i)}
                style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: testTab === i ? `rgba(0,229,255,.15)` : C.bg3, border: `1px solid ${testTab === i ? C.neon : C.border}`, color: testTab === i ? C.neon : C.text2 }}>
                Test {i}
              </button>
            ))}
          </div>
          {[1, 2].map(t => (
            <div key={t} style={{ display: testTab === t ? "grid" : "none", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
              {(["5m","10m","15m","20m","30m"] as const).map(d => (
                <Input key={d} label={`${d} (s)`} type="number" value={(data as any)[`test${t}_${d}`]} onChange={setN(`test${t}_${d}` as any)} placeholder="0.00" />
              ))}
              <Input label="Addominali" type="number" value={(data as any)[`test${t}_abs`]} onChange={setI(`test${t}_abs` as any)} />
              <Input label="Flessioni" type="number" value={(data as any)[`test${t}_push`]} onChange={setI(`test${t}_push` as any)} />
              <Input label="Bipodalico (cm)" type="number" value={(data as any)[`test${t}_bipo`]} onChange={setI(`test${t}_bipo` as any)} />
              <Input label="Mono DX (cm)" type="number" value={(data as any)[`test${t}_mono_dx`]} onChange={setI(`test${t}_mono_dx` as any)} />
              <Input label="Mono SX (cm)" type="number" value={(data as any)[`test${t}_mono_sx`]} onChange={setI(`test${t}_mono_sx` as any)} />
            </div>
          ))}
        </Section>

        {/* Note */}
        <Section title="Note">
          <textarea value={data.notes ?? ""} onChange={e => set("notes")(e.target.value)}
            placeholder="Note sull'atleta..."
            style={{ width: "100%", minHeight: 80, padding: "8px 10px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
        </Section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onClose}>Annulla</Btn>
          <Btn onClick={save} variant="solid" style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvataggio..." : "Salva Atleta"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Athlete Detail Panel ─────────────────────────────────────────────────────
function AthleteDetail({ ath, matches, trainings, athletes, onEdit, onClose }: any) {
  const [tab, setTab] = useState<"stats"|"tests"|"note">("stats");
  const a = ath as Athlete;
  const a_age = age(a.birth_date);

  // Statistiche match
  const myMatches = matches.filter((m: Match) => m.match_scorers.some((s: MatchScorer) => s.athlete_id === a.id)
    || m.match_assists.some((x: MatchAssist) => x.athlete_id === a.id)
    || m.match_goalkeepers.some((g: MatchGK) => g.athlete_id === a.id));
  const myGoals = matches.reduce((s: number, m: Match) => s + (m.match_scorers.find((x: MatchScorer) => x.athlete_id === a.id)?.goals || 0), 0);
  const myAssists = matches.reduce((s: number, m: Match) => s + (m.match_assists.find((x: MatchAssist) => x.athlete_id === a.id)?.assists || 0), 0);

  // Presenze allenamenti
  const present = trainings.filter((t: Training) => t.training_attendances.some((x: TrainingAttendance) => x.athlete_id === a.id && x.present)).length;
  const attPct = pct(present, trainings.length);

  // Delta test
  const dKeys = ["5m","10m","15m","20m","30m"] as const;

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, rgba(0,229,255,.15), rgba(213,0,249,.1))`, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${C.neon},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#07090f", flexShrink: 0 }}>{initials(a.full_name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text1 }}>{a.full_name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" as const }}>
            {a.position && <Badge color={C.neon}>{a.position}</Badge>}
            {a.jersey_number && <Badge color={C.text2}>#{a.jersey_number}</Badge>}
            {a_age && <Badge color={C.text3}>{a_age} anni</Badge>}
            {a.phone && <Badge color={C.purple}>📞 {a.phone}</Badge>}
          </div>
        </div>
        <Btn onClick={onEdit} variant="neon" style={{ fontSize: 11 }}>✏️ Modifica</Btn>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      {/* KPI row */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}` }}>
        <Grid cols="repeat(6,1fr)" gap={8}>
          <Kpi label="Partite" value={a.matches_played ?? 0} />
          <Kpi label="Gol" value={myGoals} color={C.green} />
          <Kpi label="Assist" value={myAssists} color={C.purple} />
          <Kpi label="Minuti" value={a.minutes ?? 0} color={C.orange} />
          <Kpi label="Presenze" value={`${attPct}%`} color={attPct >= 70 ? C.green : attPct >= 50 ? C.orange : C.red} sub={`${present}/${trainings.length}`} />
          <Kpi label="Forma" value={`${a.fitness ?? 0}/10`} color={C.gold} />
        </Grid>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "10px 20px 0" }}>
        {(["stats","tests","note"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 14px", borderRadius: "7px 7px 0 0", fontSize: 12, fontWeight: 600, cursor: "pointer", background: tab === t ? C.bg3 : "transparent", border: `1px solid ${tab === t ? C.neon : C.border}`, borderBottom: "none", color: tab === t ? C.neon : C.text2 }}>
            {t === "stats" ? "Statistiche" : t === "tests" ? "Test Fisici" : "Note"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 20, background: C.bg3, margin: "0 0 0 0" }}>
        {tab === "stats" && (
          <div>
            {/* Misurazioni */}
            {(a.measure1_height || a.measure2_height) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 8, fontFamily: C.mono }}>Misurazioni</div>
                <Grid cols="1fr 1fr" gap={10}>
                  {[1,2].map(t => (
                    <div key={t} style={{ background: C.bg2, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 10, color: C.text3, marginBottom: 6 }}>RILEVAZIONE {t}</div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div><span style={{ fontFamily: C.mono, fontWeight: 700, color: C.text1 }}>{(a as any)[`measure${t}_height`] ?? "—"}</span><span style={{ fontSize: 10, color: C.text3 }}> cm</span></div>
                        <div><span style={{ fontFamily: C.mono, fontWeight: 700, color: C.text1 }}>{(a as any)[`measure${t}_weight`] ?? "—"}</span><span style={{ fontSize: 10, color: C.text3 }}> kg</span></div>
                      </div>
                    </div>
                  ))}
                </Grid>
                {a.measure1_height && a.measure2_height && (
                  <div style={{ marginTop: 8, padding: 10, background: `rgba(0,230,118,.08)`, borderRadius: 8, fontSize: 12, color: C.green }}>
                    📈 Crescita: Altezza {(a.measure2_height - a.measure1_height).toFixed(1)}cm · Peso {((a.measure2_weight||0) - (a.measure1_weight||0)).toFixed(1)}kg
                  </div>
                )}
              </div>
            )}
            {/* Anagrafica dettaglio */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 8, fontFamily: C.mono }}>Anagrafica</div>
            <Grid cols="1fr 1fr 1fr" gap={8}>
              {a.birth_date && <div style={{ background: C.bg2, borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: C.text3 }}>Data nascita</div><div style={{ color: C.text1, marginTop: 2 }}>{fmt(a.birth_date)} ({a_age} anni)</div></div>}
              {a.birth_place && <div style={{ background: C.bg2, borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: C.text3 }}>Luogo nascita</div><div style={{ color: C.text1, marginTop: 2 }}>{a.birth_place}</div></div>}
              {a.phone && <div style={{ background: C.bg2, borderRadius: 8, padding: 10 }}><div style={{ fontSize: 10, color: C.text3 }}>Telefono</div><div style={{ color: C.text1, marginTop: 2 }}>{a.phone}</div></div>}
            </Grid>
          </div>
        )}

        {tab === "tests" && (
          <div>
            {/* Sprint */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.neon, textTransform: "uppercase", marginBottom: 10, fontFamily: C.mono }}>Test Velocità</div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "left" as const, borderBottom: `1px solid ${C.border}` }}>TEST</th>
                    {dKeys.map(k => <th key={k} style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>{k}</th>)}
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>ABS</th>
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>PUSH</th>
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>BIPO</th>
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>DX</th>
                    <th style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, padding: "4px 10px", textAlign: "center" as const, borderBottom: `1px solid ${C.border}` }}>SX</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2].map(t => (
                    <tr key={t} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", color: C.neon, fontFamily: C.mono, fontWeight: 700 }}>T{t}</td>
                      {dKeys.map(k => <td key={k} style={{ padding: "8px 10px", color: C.text1, textAlign: "center" as const, fontFamily: C.mono }}>{(a as any)[`test${t}_${k}`] ?? "—"}</td>)}
                      {["abs","push","bipo","mono_dx","mono_sx"].map(k => <td key={k} style={{ padding: "8px 10px", color: C.text1, textAlign: "center" as const, fontFamily: C.mono }}>{(a as any)[`test${t}_${k}`] ?? "—"}</td>)}
                    </tr>
                  ))}
                  {/* Delta */}
                  <tr style={{ background: `rgba(0,229,255,.04)` }}>
                    <td style={{ padding: "8px 10px", color: C.gold, fontFamily: C.mono, fontWeight: 700, fontSize: 10 }}>Δ%</td>
                    {dKeys.map(k => {
                      const d = delta((a as any)[`test1_${k}`], (a as any)[`test2_${k}`]);
                      const col = d ? (parseFloat(d) < 0 ? C.green : C.red) : C.text3;
                      return <td key={k} style={{ padding: "8px 10px", color: col, textAlign: "center" as const, fontFamily: C.mono, fontWeight: 700, fontSize: 11 }}>{d ? `${parseFloat(d) > 0 ? "+" : ""}${d}%` : "—"}</td>;
                    })}
                    {["abs","push","bipo","mono_dx","mono_sx"].map(k => {
                      const d = delta((a as any)[`test1_${k}`], (a as any)[`test2_${k}`]);
                      const col = d ? (parseFloat(d) > 0 ? C.green : C.red) : C.text3;
                      return <td key={k} style={{ padding: "8px 10px", color: col, textAlign: "center" as const, fontFamily: C.mono, fontWeight: 700, fontSize: 11 }}>{d ? `${parseFloat(d) > 0 ? "+" : ""}${d}%` : "—"}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "note" && (
          <div style={{ color: a.notes ? C.text1 : C.text3, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" as const }}>
            {a.notes || "Nessuna nota per questo atleta."}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rosa Tab ─────────────────────────────────────────────────────────────────
function RosaTab({ athletes, matches, trainings, teamId, onRefresh }: any) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tutti");
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Athlete | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = athletes.filter((a: Athlete) => {
    const q = search.toLowerCase();
    const nameMatch = a.full_name.toLowerCase().includes(q) || String(a.jersey_number ?? "").includes(q);
    const roleMatch = roleFilter === "Tutti" || a.position === roleFilter;
    return nameMatch && roleMatch;
  });

  const del = async (id: string) => {
    if (!confirm("Eliminare questo atleta?")) return;
    setDeleting(id);
    await supabase.from("athletes").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
    onRefresh();
  };

  return (
    <div>
      {/* Barra filtri */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" as const }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Cerca nome, numero..."
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 13 }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: "8px 12px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 13 }}>
          <option value="Tutti">Tutti i ruoli</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <Btn onClick={() => { setEditTarget(null); setModalOpen(true); }} variant="neon">+ Nuovo Atleta</Btn>
        <span style={{ fontSize: 12, color: C.text3 }}>{filtered.length} di {athletes.length} atleti</span>
      </div>

      {/* Grid atleti */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        {filtered.map((a: Athlete) => {
          const isSelected = selected?.id === a.id;
          const present = trainings.filter((t: Training) => t.training_attendances.some((x: TrainingAttendance) => x.athlete_id === a.id && x.present)).length;
          const goals = matches.reduce((s: number, m: Match) => s + (m.match_scorers.find((x: MatchScorer) => x.athlete_id === a.id)?.goals || 0), 0);
          return (
            <div key={a.id} onClick={() => setSelected(isSelected ? null : a)}
              style={{ background: C.bg2, border: `1px solid ${isSelected ? C.neon : C.border}`, borderRadius: 10, padding: 14, cursor: "pointer", transition: "border-color .2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${C.neon},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#07090f", flexShrink: 0 }}>{initials(a.full_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: C.text1, fontSize: 14, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{a.full_name}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{a.position || "—"}{a.jersey_number ? ` · #${a.jersey_number}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                <div style={{ background: C.bg3, borderRadius: 6, padding: "6px 8px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: C.mono, fontWeight: 700, color: C.green, fontSize: 14 }}>{goals}</div>
                  <div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>Gol</div>
                </div>
                <div style={{ background: C.bg3, borderRadius: 6, padding: "6px 8px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: C.mono, fontWeight: 700, color: C.text1, fontSize: 14 }}>{a.matches_played ?? 0}</div>
                  <div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>Partite</div>
                </div>
                <div style={{ background: C.bg3, borderRadius: 6, padding: "6px 8px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: C.mono, fontWeight: 700, color: pct(present,trainings.length) >= 70 ? C.green : C.orange, fontSize: 14 }}>{pct(present,trainings.length)}%</div>
                  <div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: 1 }}>Presenze</div>
                </div>
              </div>
              {/* Fitness bar */}
              <div style={{ height: 3, background: C.bg4, borderRadius: 2, marginBottom: 8 }}>
                <div style={{ height: 3, width: `${(a.fitness ?? 0) * 10}%`, background: (a.fitness ?? 0) >= 7 ? C.green : (a.fitness ?? 0) >= 4 ? C.orange : C.red, borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Btn onClick={e => { e.stopPropagation(); setEditTarget(a); setModalOpen(true); }} variant="ghost" style={{ fontSize: 11, padding: "4px 10px" }}>✏️ Modifica</Btn>
                <Btn onClick={e => { e.stopPropagation(); del(a.id); }} variant="red" style={{ fontSize: 11, padding: "4px 10px", opacity: deleting === a.id ? 0.5 : 1 }}>🗑️</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <AthleteDetail ath={selected} matches={matches} trainings={trainings} athletes={athletes}
          onEdit={() => { setEditTarget(selected); setModalOpen(true); }}
          onClose={() => setSelected(null)} />
      )}

      {/* Modal atleta */}
      <AthleteModal open={modalOpen} onClose={() => setModalOpen(false)}
        athlete={editTarget} teamId={teamId}
        onSave={() => { onRefresh(); setSelected(null); }} />
    </div>
  );
}

// ─── Partite Tab ──────────────────────────────────────────────────────────────
function PartiteTab({ matches, athletes, teamId, onRefresh }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);

  const sorted = [...matches].sort((a: Match, b: Match) => b.date.localeCompare(a.date));
  const wins = matches.filter((m: Match) => m.goals_for > m.goals_against).length;
  const draws = matches.filter((m: Match) => m.goals_for === m.goals_against).length;
  const losses = matches.filter((m: Match) => m.goals_for < m.goals_against).length;
  const gf = matches.reduce((s: number, m: Match) => s + m.goals_for, 0);
  const ga = matches.reduce((s: number, m: Match) => s + m.goals_against, 0);

  const del = async (id: string) => {
    if (!confirm("Eliminare questa partita?")) return;
    await supabase.from("matches").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div>
      {/* Season bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <Kpi label="Vittorie" value={wins} color={C.green} />
        <Kpi label="Pareggi" value={draws} color={C.orange} />
        <Kpi label="Sconfitte" value={losses} color={C.red} />
        <Kpi label="Gol" value={`${gf} — ${ga}`} color={C.neon} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => { setEditMatch(null); setModalOpen(true); }} variant="neon">+ Nuova Partita</Btn>
      </div>

      {sorted.length === 0
        ? <div style={{ color: C.text3, textAlign: "center", padding: 40 }}>Nessuna partita registrata</div>
        : sorted.map((m: Match) => {
          const res = m.goals_for > m.goals_against ? C.green : m.goals_for < m.goals_against ? C.red : C.orange;
          const isOpen = open === m.id;
          return (
            <div key={m.id} style={{ marginBottom: 8 }}>
              <div onClick={() => setOpen(isOpen ? null : m.id)}
                style={{ background: C.bg2, border: `1px solid ${isOpen ? C.neon + "60" : C.border}`, borderRadius: isOpen ? "10px 10px 0 0" : 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color .2s" }}>
                <div style={{ textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>{new Date(m.date).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text1 }}>vs {m.opponent}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                    <Badge color={C.text3}>{m.type}</Badge>
                    <Badge color={m.venue === "Casa" ? C.green : C.orange}>{m.venue === "Casa" ? "🏠" : "✈️"} {m.venue}</Badge>
                    {m.notes?.startsWith("{") && <Badge color={C.purple}>📊 Analisi</Badge>}
                  </div>
                </div>
                <div style={{ fontFamily: C.mono, fontWeight: 900, fontSize: 20, color: res }}>{m.goals_for}—{m.goals_against}</div>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <Btn onClick={() => { setEditMatch(m); setModalOpen(true); }} variant="ghost" style={{ fontSize: 11, padding: "4px 10px" }}>✏️</Btn>
                  <Btn onClick={() => del(m.id)} variant="red" style={{ fontSize: 11, padding: "4px 10px" }}>🗑️</Btn>
                </div>
              </div>

              {isOpen && (
                <div style={{ background: C.bg3, border: `1px solid ${C.neon}60`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
                  <Grid cols="1fr 1fr 1fr" gap={12}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>⚽ Marcatori</div>
                      {m.match_scorers.length === 0 ? <span style={{ color: C.text3, fontSize: 12 }}>—</span>
                        : m.match_scorers.map((s, i) => {
                          const a = athletes.find((x: Athlete) => x.id === s.athlete_id);
                          return <div key={i} style={{ fontSize: 12, color: C.text1, marginBottom: 3 }}>{a?.full_name || "?"} <Badge color={C.green}>×{s.goals}</Badge></div>;
                        })}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>👋 Assist</div>
                      {m.match_assists.length === 0 ? <span style={{ color: C.text3, fontSize: 12 }}>—</span>
                        : m.match_assists.map((s, i) => {
                          const a = athletes.find((x: Athlete) => x.id === s.athlete_id);
                          return <div key={i} style={{ fontSize: 12, color: C.text1, marginBottom: 3 }}>{a?.full_name || "?"} <Badge color={C.purple}>×{s.assists}</Badge></div>;
                        })}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.neon, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>🧤 Portieri</div>
                      {m.match_goalkeepers.length === 0 ? <span style={{ color: C.text3, fontSize: 12 }}>Nessun gol subito</span>
                        : m.match_goalkeepers.map((g, i) => {
                          const a = athletes.find((x: Athlete) => x.id === g.athlete_id);
                          return <div key={i} style={{ fontSize: 12, color: C.text1, marginBottom: 3 }}>
                            {a?.full_name || "?"} <Badge color={g.goals_conceded === 0 ? C.green : C.red}>{g.goals_conceded === 0 ? "🔒 CS" : `${g.goals_conceded} sub.`}</Badge>
                          </div>;
                        })}
                    </div>
                  </Grid>
                  {/* Report analisi MATCH */}
                  {m.notes?.startsWith("{") && (() => {
                    try {
                      const p = JSON.parse(m.notes!);
                      if (!p.eventi) return null;
                      return (
                        <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}
                          dangerouslySetInnerHTML={{ __html: (window as any)._renderMatchReport?.(p.eventi, p.logs || []) || "" }} />
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}
            </div>
          );
        })
      }

      <MatchModal open={modalOpen} onClose={() => setModalOpen(false)} match={editMatch} athletes={athletes} teamId={teamId} onSave={() => { onRefresh(); }} />
    </div>
  );
}

// ─── Match Modal ──────────────────────────────────────────────────────────────
function MatchModal({ open, onClose, match, athletes, teamId, onSave }: any) {
  const [date, setDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [type, setType] = useState("Campionato");
  const [venue, setVenue] = useState("Casa");
  const [gf, setGf] = useState(0);
  const [ga, setGa] = useState(0);
  const [scorers, setScorers] = useState<{athlete_id:string;goals:number}[]>([]);
  const [assists, setAssists] = useState<{athlete_id:string;assists:number}[]>([]);
  const [gks, setGks] = useState<{athlete_id:string;goals_conceded:number;clean_sheet:boolean}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match) {
      setDate(match.date); setOpponent(match.opponent); setType(match.type); setVenue(match.venue);
      setGf(match.goals_for); setGa(match.goals_against);
      setScorers(match.match_scorers.map((s: MatchScorer) => ({ athlete_id: s.athlete_id, goals: s.goals })));
      setAssists(match.match_assists.map((a: MatchAssist) => ({ athlete_id: a.athlete_id, assists: a.assists })));
      setGks(match.match_goalkeepers.map((g: MatchGK) => ({ athlete_id: g.athlete_id, goals_conceded: g.goals_conceded, clean_sheet: g.clean_sheet })));
    } else {
      setDate(new Date().toISOString().split("T")[0]); setOpponent(""); setType("Campionato"); setVenue("Casa");
      setGf(0); setGa(0); setScorers([]); setAssists([]); setGks([]);
    }
  }, [match, open]);

  const { data: { user } } = useAuth() as any;

  const save = async () => {
    if (!opponent.trim()) return;
    setSaving(true);
    const row = { team_id: teamId, coach_id: user?.id, date, opponent: opponent.trim(), type, venue, goals_for: gf, goals_against: ga };
    let mid = match?.id;
    if (mid) {
      await supabase.from("matches").update(row).eq("id", mid);
    } else {
      const { data } = await supabase.from("matches").insert(row).select("id").single();
      mid = data?.id;
    }
    if (mid) {
      await supabase.from("match_scorers").delete().eq("match_id", mid);
      await supabase.from("match_assists").delete().eq("match_id", mid);
      await supabase.from("match_goalkeepers").delete().eq("match_id", mid);
      for (const s of scorers) if (s.athlete_id) await supabase.from("match_scorers").insert({ match_id: mid, athlete_id: s.athlete_id, goals: s.goals });
      for (const a of assists) if (a.athlete_id) await supabase.from("match_assists").insert({ match_id: mid, athlete_id: a.athlete_id, assists: a.assists });
      for (const g of gks) if (g.athlete_id) await supabase.from("match_goalkeepers").insert({ match_id: mid, athlete_id: g.athlete_id, goals_conceded: g.goals_conceded, clean_sheet: g.goals_conceded === 0 });
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const athOpts = [{ value: "", label: "— Seleziona —" }, ...athletes.map((a: Athlete) => ({ value: a.id, label: a.full_name }))];

  return (
    <Modal open={open} onClose={onClose} title={match ? "Modifica Partita" : "Nuova Partita"} width={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Grid cols="1fr 1fr" gap={10}>
          <Input label="Data" type="date" value={date} onChange={setDate} />
          <Input label="Avversario" value={opponent} onChange={setOpponent} placeholder="Nome squadra" />
        </Grid>
        <Grid cols="1fr 1fr 1fr 1fr" gap={10}>
          <Select label="Tipo" value={type} onChange={setType} options={["Campionato","Coppa","Amichevole","Torneo"]} />
          <Select label="Campo" value={venue} onChange={setVenue} options={["Casa","Trasferta"]} />
          <div><div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Gol Fatti</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setGf(Math.max(0,gf-1))} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg3, border: `1px solid ${C.border}`, color: C.text1, cursor: "pointer" }}>−</button>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 18, color: C.green, minWidth: 20, textAlign: "center" }}>{gf}</span>
              <button onClick={() => setGf(gf+1)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg3, border: `1px solid ${C.border}`, color: C.text1, cursor: "pointer" }}>+</button>
            </div>
          </div>
          <div><div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Gol Subiti</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setGa(Math.max(0,ga-1))} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg3, border: `1px solid ${C.border}`, color: C.text1, cursor: "pointer" }}>−</button>
              <span style={{ fontFamily: C.mono, fontWeight: 700, fontSize: 18, color: C.red, minWidth: 20, textAlign: "center" }}>{ga}</span>
              <button onClick={() => setGa(ga+1)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg3, border: `1px solid ${C.border}`, color: C.text1, cursor: "pointer" }}>+</button>
            </div>
          </div>
        </Grid>

        {/* Marcatori */}
        <Section title="Marcatori">
          {scorers.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <div style={{ flex: 1 }}><Select value={s.athlete_id} onChange={(v: string) => setScorers(sc => sc.map((x,j) => j===i?{...x,athlete_id:v}:x))} options={athOpts} /></div>
              <input type="number" min={1} value={s.goals} onChange={e => setScorers(sc => sc.map((x,j) => j===i?{...x,goals:+e.target.value}:x))}
                style={{ width: 50, padding: "8px 6px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, textAlign: "center" }} />
              <button onClick={() => setScorers(sc => sc.filter((_,j) => j!==i))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          ))}
          <Btn onClick={() => setScorers(s => [...s, { athlete_id: "", goals: 1 }])} variant="ghost" style={{ fontSize: 11 }}>+ Marcatore</Btn>
        </Section>

        {/* Assist */}
        <Section title="Assist">
          {assists.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <div style={{ flex: 1 }}><Select value={a.athlete_id} onChange={(v: string) => setAssists(as => as.map((x,j) => j===i?{...x,athlete_id:v}:x))} options={athOpts} /></div>
              <input type="number" min={1} value={a.assists} onChange={e => setAssists(as => as.map((x,j) => j===i?{...x,assists:+e.target.value}:x))}
                style={{ width: 50, padding: "8px 6px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, textAlign: "center" }} />
              <button onClick={() => setAssists(as => as.filter((_,j) => j!==i))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          ))}
          <Btn onClick={() => setAssists(a => [...a, { athlete_id: "", assists: 1 }])} variant="ghost" style={{ fontSize: 11 }}>+ Assist</Btn>
        </Section>

        {/* Portieri */}
        <Section title="Portieri">
          {gks.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <div style={{ flex: 1 }}><Select value={g.athlete_id} onChange={(v: string) => setGks(gs => gs.map((x,j) => j===i?{...x,athlete_id:v}:x))} options={athOpts} /></div>
              <input type="number" min={0} value={g.goals_conceded} onChange={e => setGks(gs => gs.map((x,j) => j===i?{...x,goals_conceded:+e.target.value}:x))}
                style={{ width: 50, padding: "8px 6px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, textAlign: "center" }} />
              <span style={{ fontSize: 11, color: C.text3 }}>sub.</span>
              <button onClick={() => setGks(gs => gs.filter((_,j) => j!==i))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          ))}
          <Btn onClick={() => setGks(g => [...g, { athlete_id: "", goals_conceded: 0, clean_sheet: true }])} variant="ghost" style={{ fontSize: 11 }}>+ Portiere</Btn>
        </Section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onClose}>Annulla</Btn>
          <Btn onClick={save} variant="solid" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "Salvataggio..." : "Salva"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Allenamenti Tab ──────────────────────────────────────────────────────────
function AllenamentiTab({ trainings, athletes, teamId, onRefresh }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Training | null>(null);

  const sorted = [...trainings].sort((a: Training, b: Training) => b.date.localeCompare(a.date));
  const avgAtt = trainings.length > 0
    ? Math.round(trainings.reduce((s: number, t: Training) => {
        const p = t.training_attendances.filter((a: TrainingAttendance) => a.present).length;
        return s + pct(p, athletes.length);
      }, 0) / trainings.length)
    : 0;

  const del = async (id: string) => {
    if (!confirm("Eliminare questa sessione?")) return;
    await supabase.from("training_sessions").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        <Kpi label="Sessioni Totali" value={trainings.length} color={C.purple} />
        <Kpi label="Media Presenze" value={`${avgAtt}%`} color={avgAtt >= 70 ? C.green : avgAtt >= 50 ? C.orange : C.red} />
        <Kpi label="Atleti in Rosa" value={athletes.length} color={C.neon} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => { setEditSession(null); setModalOpen(true); }} variant="neon">+ Nuova Sessione</Btn>
      </div>

      {sorted.length === 0
        ? <div style={{ color: C.text3, textAlign: "center", padding: 40 }}>Nessun allenamento registrato</div>
        : sorted.map((t: Training) => {
          const present = t.training_attendances.filter((a: TrainingAttendance) => a.present).length;
          const p = pct(present, athletes.length);
          const isOpen = open === t.id;
          return (
            <div key={t.id} style={{ marginBottom: 8 }}>
              <div onClick={() => setOpen(isOpen ? null : t.id)}
                style={{ background: C.bg2, border: `1px solid ${isOpen ? C.purple + "60" : C.border}`, borderRadius: isOpen ? "10px 10px 0 0" : 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3, minWidth: 80 }}>{fmt(t.date)}</span>
                <Badge color={C.purple}>{t.session_type}</Badge>
                <span style={{ fontSize: 12, color: C.text2 }}>{t.duration_minutes} min</span>
                <div style={{ flex: 1 }} />
                <div style={{ textAlign: "right", minWidth: 100 }}>
                  <div style={{ fontFamily: C.mono, fontWeight: 700, color: p >= 70 ? C.green : p >= 50 ? C.orange : C.red }}>{p}%</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{present}/{athletes.length} presenti</div>
                </div>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <Btn onClick={() => { setEditSession(t); setModalOpen(true); }} variant="ghost" style={{ fontSize: 11, padding: "4px 10px" }}>✏️</Btn>
                  <Btn onClick={() => del(t.id)} variant="red" style={{ fontSize: 11, padding: "4px 10px" }}>🗑️</Btn>
                </div>
              </div>
              {isOpen && (
                <div style={{ background: C.bg3, border: `1px solid ${C.purple}60`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: 16 }}>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {athletes.map((a: Athlete) => {
                      const att = t.training_attendances.find((x: TrainingAttendance) => x.athlete_id === a.id);
                      const isPresent = att?.present ?? false;
                      return (
                        <div key={a.id} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, background: isPresent ? `rgba(0,230,118,.12)` : `rgba(255,23,68,.08)`, color: isPresent ? C.green : C.text3, border: `1px solid ${isPresent ? C.green + "30" : C.border}` }}>
                          {initials(a.full_name)} {a.full_name}
                        </div>
                      );
                    })}
                  </div>
                  {t.notes && <div style={{ marginTop: 10, fontSize: 12, color: C.text2, fontStyle: "italic" }}>📝 {t.notes}</div>}
                </div>
              )}
            </div>
          );
        })
      }
      <TrainingModal open={modalOpen} onClose={() => setModalOpen(false)} session={editSession} athletes={athletes} teamId={teamId} onSave={() => { onRefresh(); }} />
    </div>
  );
}

// ─── Training Modal ───────────────────────────────────────────────────────────
function TrainingModal({ open, onClose, session, athletes, teamId, onSave }: any) {
  const [date, setDate] = useState("");
  const [type, setType] = useState("Tecnico");
  const [duration, setDuration] = useState(90);
  const [notes, setNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string,boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setDate(session.date); setType(session.session_type); setDuration(session.duration_minutes); setNotes(session.notes || "");
      const att: Record<string,boolean> = {};
      session.training_attendances.forEach((a: TrainingAttendance) => { att[a.athlete_id] = a.present; });
      setAttendance(att);
    } else {
      setDate(new Date().toISOString().split("T")[0]); setType("Tecnico"); setDuration(90); setNotes("");
      const att: Record<string,boolean> = {};
      athletes.forEach((a: Athlete) => { att[a.id] = true; });
      setAttendance(att);
    }
  }, [session, athletes, open]);

  const { data: { user } } = useAuth() as any;

  const save = async () => {
    setSaving(true);
    const row = { team_id: teamId, coach_id: user?.id, date, session_type: type, duration_minutes: duration, notes: notes || null };
    let sid = session?.id;
    if (sid) { await supabase.from("training_sessions").update(row).eq("id", sid); }
    else { const { data } = await supabase.from("training_sessions").insert(row).select("id").single(); sid = data?.id; }
    if (sid) {
      await supabase.from("training_attendances").delete().eq("session_id", sid);
      for (const [aid, present] of Object.entries(attendance)) {
        await supabase.from("training_attendances").insert({ session_id: sid, athlete_id: aid, present });
      }
    }
    setSaving(false); onSave(); onClose();
  };

  const allPresent = athletes.every((a: Athlete) => attendance[a.id]);
  const toggleAll = () => { const att: Record<string,boolean> = {}; athletes.forEach((a: Athlete) => { att[a.id] = !allPresent; }); setAttendance(att); };

  return (
    <Modal open={open} onClose={onClose} title={session ? "Modifica Sessione" : "Nuova Sessione"} width={580}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Grid cols="1fr 1fr 1fr" gap={10}>
          <Input label="Data" type="date" value={date} onChange={setDate} />
          <Select label="Tipo" value={type} onChange={setType} options={["Tecnico","Tattico","Fisico","Portieri","Partitella","Defaticante","Altro"]} />
          <Input label="Durata (min)" type="number" value={duration} onChange={(v: string) => setDuration(+v)} />
        </Grid>
        <Section title="Presenze">
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <Btn onClick={toggleAll} variant={allPresent ? "green" : "ghost"} style={{ fontSize: 11 }}>
              {allPresent ? "✓ Tutti presenti" : "Seleziona tutti"}
            </Btn>
            <span style={{ fontSize: 12, color: C.text3 }}>{Object.values(attendance).filter(Boolean).length}/{athletes.length} presenti</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 6 }}>
            {athletes.map((a: Athlete) => (
              <div key={a.id} onClick={() => setAttendance(at => ({ ...at, [a.id]: !at[a.id] }))}
                style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: attendance[a.id] ? `rgba(0,230,118,.1)` : C.bg3, border: `1px solid ${attendance[a.id] ? C.green + "40" : C.border}`, transition: "all .15s" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: attendance[a.id] ? C.green : C.bg4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#07090f", fontWeight: 700 }}>
                  {attendance[a.id] ? "✓" : ""}
                </div>
                <span style={{ fontSize: 12, color: attendance[a.id] ? C.green : C.text2 }}>{a.full_name}</span>
              </div>
            ))}
          </div>
        </Section>
        <div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>Note sessione</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note..."
            style={{ width: "100%", minHeight: 70, padding: "8px 10px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text1, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" as const }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn onClick={onClose}>Annulla</Btn>
          <Btn onClick={save} variant="solid" style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "Salvataggio..." : "Salva"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoachDashboardV2() {
  const { signOut, user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [tab, setTab] = useState<"dashboard"|"rosa"|"partite"|"allenamenti">("dashboard");
  const [loading, setLoading] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [subscription, setSubscription] = useState<string>("free");

  // Carica squadre
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("get_coach_teams", { _coach_id: user.id });
      setTeams(data || []);
      // Subscription
      const { data: sub } = await supabase.rpc("get_subscription", { _user_id: user.id });
      setSubscription((sub as any)?.plan || "free");
      if (data && data.length > 0) {
        // Ripristina ultima squadra
        const lastId = localStorage.getItem("sh2_active_team");
        const last = lastId ? data.find((t: any) => t.team_id === lastId) : null;
        await loadTeam(last || data[0]);
      } else {
        setLoading(false);
      }
    })();
  }, [user]);

  const loadTeam = useCallback(async (team: any) => {
    setLoadingTeam(true);
    setActiveTeam({ id: team.team_id, name: team.team_name, is_owner: team.is_owner, society_name: team.society_name });
    localStorage.setItem("sh2_active_team", team.team_id);
    localStorage.setItem("teamStats_lastTeam", String(Math.abs(team.team_id.split("").reduce((h: number, c: string) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)) + 800000));

    const [{ data: ath }, { data: mat }, { data: tra }] = await Promise.all([
      supabase.from("athletes").select("*").eq("team_id", team.team_id).order("jersey_number", { ascending: true }),
      supabase.from("matches").select("*,match_scorers(*),match_assists(*),match_goalkeepers(*)").eq("team_id", team.team_id).order("date", { ascending: false }),
      supabase.from("training_sessions").select("*,training_attendances(*)").eq("team_id", team.team_id).order("date", { ascending: false }),
    ]);

    setAthletes((ath || []) as Athlete[]);
    setMatches((mat || []) as Match[]);
    setTrainings((tra || []) as Training[]);
    setLoadingTeam(false);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!activeTeam) return;
    const [{ data: ath }, { data: mat }, { data: tra }] = await Promise.all([
      supabase.from("athletes").select("*").eq("team_id", activeTeam.id).order("jersey_number", { ascending: true }),
      supabase.from("matches").select("*,match_scorers(*),match_assists(*),match_goalkeepers(*)").eq("team_id", activeTeam.id).order("date", { ascending: false }),
      supabase.from("training_sessions").select("*,training_attendances(*)").eq("team_id", activeTeam.id).order("date", { ascending: false }),
    ]);
    setAthletes((ath || []) as Athlete[]);
    setMatches((mat || []) as Match[]);
    setTrainings((tra || []) as Training[]);
  }, [activeTeam]);

  const TABS = [
    { id: "dashboard", label: "Dashboard", count: null },
    { id: "rosa", label: "Rosa", count: athletes.length },
    { id: "partite", label: "Partite", count: matches.length },
    { id: "allenamenti", label: "Allenamenti", count: trainings.length },
  ] as const;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: `3px solid ${C.bg3}`, borderTopColor: C.neon, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Caricamento...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (teams.length === 0) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40 }}>
      <div style={{ fontSize: 48 }}>🏋️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text1 }}>Nessuna squadra trovata</div>
      <div style={{ color: C.text3, textAlign: "center" }}>Crea una squadra dalla Dashboard o contatta il tuo direttore.</div>
      <Btn onClick={signOut} variant="ghost">Esci</Btn>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        input,select,textarea{outline:none}
        input:focus,select:focus,textarea:focus{border-color:${C.neon}!important}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.bg4};border-radius:2px}
      `}</style>

      {/* Header */}
      <header style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "rgba(13,17,23,.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        {/* Logo + squadra */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.neon},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#07090f" }}>S+</div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowTeamPicker(!showTeamPicker)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, color: C.text1, fontSize: 15 }}>{activeTeam?.name || "Squadra"}</span>
              {teams.length > 1 && <span style={{ color: C.text3, fontSize: 11 }}>▾</span>}
            </button>
            {showTeamPicker && teams.length > 1 && (
              <div style={{ position: "absolute", top: 34, left: 0, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, minWidth: 200, zIndex: 200, boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
                {teams.map((t: any) => (
                  <button key={t.team_id} onClick={async () => { setShowTeamPicker(false); await loadTeam(t); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: t.team_id === activeTeam?.id ? `rgba(0,229,255,.1)` : "none", border: "none", borderRadius: 7, color: t.team_id === activeTeam?.id ? C.neon : C.text1, cursor: "pointer", fontSize: 13 }}>
                    {t.team_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `rgba(0,229,255,.1)`, color: C.neon, border: `1px solid rgba(0,229,255,.2)`, fontFamily: C.mono, textTransform: "uppercase" }}>
            COACH · {subscription}
          </span>
        </div>

        {/* Tab nav */}
        <nav style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: tab === t.id ? `rgba(0,229,255,.12)` : "transparent", border: `1px solid ${tab === t.id ? "rgba(0,229,255,.3)" : "transparent"}`, color: tab === t.id ? C.neon : C.text2, transition: "all .2s", display: "flex", alignItems: "center", gap: 5 }}>
              {t.label}
              {t.count !== null && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: tab === t.id ? `rgba(0,229,255,.2)` : C.bg3, color: tab === t.id ? C.neon : C.text3 }}>{t.count}</span>}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: C.text3 }}>{teams.length} squadr{teams.length === 1 ? "a" : "e"}</span>
          <Btn onClick={signOut} variant="ghost" style={{ fontSize: 11 }}>Esci</Btn>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        {loadingTeam ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 12 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.bg3}`, borderTopColor: C.neon, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: C.text3, fontFamily: C.mono, fontSize: 12 }}>Caricamento {activeTeam?.name}...</span>
          </div>
        ) : (
          <>
            {tab === "dashboard" && <DashboardTab athletes={athletes} matches={matches} trainings={trainings} />}
            {tab === "rosa" && <RosaTab athletes={athletes} matches={matches} trainings={trainings} teamId={activeTeam?.id} onRefresh={refresh} />}
            {tab === "partite" && <PartiteTab matches={matches} athletes={athletes} teamId={activeTeam?.id} onRefresh={refresh} />}
            {tab === "allenamenti" && <AllenamentiTab trainings={trainings} athletes={athletes} teamId={activeTeam?.id} onRefresh={refresh} />}
          </>
        )}
      </main>
    </div>
  );
}
