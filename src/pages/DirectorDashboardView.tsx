import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────
interface Team { id: string; name: string; }
interface Athlete {
  id: string; team_id: string; full_name: string;
  position: string | null; jersey_number: number | null; birth_date: string | null;
  birth_place?: string | null; phone?: string | null;
  fitness?: number | null; rating?: number | null;
  goals_scored?: number; goals_conceded?: number; assists?: number;
  minutes?: number; matches_played?: number; attendance?: number;
  measure1_height?: number | null; measure1_weight?: number | null;
  measure2_height?: number | null; measure2_weight?: number | null;
  test1_5m?: number|null; test1_10m?: number|null; test1_15m?: number|null;
  test1_20m?: number|null; test1_30m?: number|null;
  test1_abs?: number|null; test1_push?: number|null; test1_bipo?: number|null;
  test1_mono_dx?: number|null; test1_mono_sx?: number|null;
  test2_5m?: number|null; test2_10m?: number|null; test2_15m?: number|null;
  test2_20m?: number|null; test2_30m?: number|null;
  test2_abs?: number|null; test2_push?: number|null; test2_bipo?: number|null;
  test2_mono_dx?: number|null; test2_mono_sx?: number|null;
  sprints?: any[]; notes?: string | null;
}
interface Match {
  id: string; team_id: string; date: string; opponent: string;
  type: string; venue: string; goals_for: number; goals_against: number; notes: string | null;
}
interface TrainingSession {
  id: string; team_id: string; date: string; type: string; duration_min: number; notes: string | null;
}
interface Attendance { session_id: string; athlete_id: string; present: boolean; }
interface Scorer { match_id: string; athlete_id: string; goals: number; }
interface AssistRow { match_id: string; athlete_id: string; assists: number; }
interface JumpTest {
  id: string; athlete_id: string; test_type: string; is_long_jump: boolean;
  best_height_cm: number | null; avg_height_cm: number | null;
  flight_time_s: number | null; takeoff_speed: number | null; date: string;
}
interface PostureSession {
  id: string; athlete_id: string; label: string | null; date: string;
  checks: Record<string, number>;
}

interface Goalkeeper { match_id: string; athlete_id: string; goals_conceded: number; }

interface DB {
  teams: Team[]; athletes: Athlete[]; matches: Match[];
  sessions: TrainingSession[]; attendances: Attendance[];
  scorers: Scorer[]; assists: AssistRow[]; goalkeepers: Goalkeeper[];
  jumps: JumpTest[]; postures: PostureSession[];
}

// ── Colors ─────────────────────────────────────────────
const C = {
  neon: "#00e5ff", green: "#00e676", orange: "#ff9100",
  red: "#ff1744", purple: "#d500f9", gold: "#ffd600",
  bg: "#07090f", bg1: "#0d1117", bg2: "#131920", bg3: "#1a2230",
  border: "rgba(255,255,255,0.07)", borderH: "rgba(255,255,255,0.14)",
  text1: "#f0f4f8", text2: "#8899aa", text3: "#4d6070",
  mono: "'JetBrains Mono',monospace", display: "'Bebas Neue',sans-serif",
};

const teamColors = ["#00e5ff","#00e676","#d500f9","#ff9100","#ff1744","#ffd600"];

// ── Helpers ────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
const initials = (name: string) => name.split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
const positionShort = (p: string|null) => {
  if (!p) return "—";
  const m: Record<string,string> = { Portiere:"POR", Difensore:"DIF", Centrocampista:"CEN", Attaccante:"ATT", Terzino:"TER", Ala:"ALA" };
  return m[p] || p.slice(0,3).toUpperCase();
};

const checkColor = (v: number) => v <= 3 ? C.green : v <= 6 ? C.orange : C.red;
const checkLabel = (v: number) => v <= 3 ? "OK" : v <= 6 ? "ATT" : "CRIT";
const POSTURE_CHECKS = ["shoulders","hips","knee_dx","knee_sx","spine","head"];
const POSTURE_LABELS: Record<string,string> = {
  shoulders:"Spalle", hips:"Anca", knee_dx:"Ginocchio DX",
  knee_sx:"Ginocchio SX", spine:"Colonna", head:"Testa"
};

// ── Main Component ─────────────────────────────────────
export default function DirectorDashboardView() {
  const { user } = useAuth();
  const [db, setDb] = useState<DB|null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team|null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: soc } = await supabase.from("societies").select("id").eq("director_id", user.id).maybeSingle();
    if (!soc) { setLoading(false); return; }
    const { data: teams } = await supabase.from("teams").select("id,name").eq("society_id", soc.id).order("name");
    if (!teams?.length) { setDb({ teams:[], athletes:[], matches:[], sessions:[], attendances:[], scorers:[], assists:[], goalkeepers:[], jumps:[], postures:[] }); setLoading(false); return; }
    const tIds = teams.map((t: Team) => t.id);
    const aIds_res = await supabase.from("athletes").select("*").in("team_id", tIds).order("full_name");
    const aIds = (aIds_res.data||[]).map((a: Athlete) => a.id);
    const [r2,r3,r4,r5,r6,r7,r8,r9] = await Promise.all([
      supabase.from("matches").select("id,team_id,date,opponent,type,venue,goals_for,goals_against,notes").in("team_id",tIds).order("date",{ascending:false}),
      supabase.from("training_sessions").select("id,team_id,date,type,duration_min,notes").in("team_id",tIds).order("date",{ascending:false}),
      supabase.from("training_attendances").select("session_id,athlete_id,present"),
      supabase.from("match_scorers").select("match_id,athlete_id,goals"),
      supabase.from("match_assists").select("match_id,athlete_id,assists"),
      supabase.from("match_goalkeepers").select("match_id,athlete_id,goals_conceded"),
      aIds.length ? supabase.from("jump_tests").select("id,athlete_id,test_type,is_long_jump,best_height_cm,avg_height_cm,flight_time_s,takeoff_speed,date").in("athlete_id",aIds).order("date",{ascending:false}) : { data: [] },
      aIds.length ? supabase.from("posture_sessions").select("id,athlete_id,label,date,checks").in("athlete_id",aIds).order("date",{ascending:false}) : { data: [] },
    ]);
    setDb({
      teams: teams||[], athletes: aIds_res.data||[], matches: r2.data||[],
      sessions: r3.data||[], attendances: r4.data||[], scorers: r5.data||[],
      assists: r6.data||[], goalkeepers: r7.data||[], jumps: r8.data||[], postures: r9.data||[],
    });
    setLastUpdate(new Date());
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const openTeam = (team: Team) => { setSelectedTeam(team); setActiveTab("dashboard"); };
  const backToTeams = () => { setSelectedTeam(null); };

  // ── Loading ──────────────────────────────────────────
  if (loading && !db) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12,background:C.bg}}>
      <div style={{width:36,height:36,border:`3px solid ${C.bg3}`,borderTopColor:C.neon,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <p style={{color:C.text3,fontSize:13,fontFamily:C.mono}}>Caricamento...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!db) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:C.bg,color:C.text3,textAlign:"center",padding:24}}>
      <div><div style={{fontSize:32,marginBottom:12}}>🏆</div><p>Nessuna società trovata.</p><p style={{fontSize:12,marginTop:8}}>Creane una dalla sezione Gestione.</p></div>
    </div>
  );

  // ── Views ─────────────────────────────────────────────
  return (
    <div style={{background:C.bg,color:C.text1,fontFamily:"DM Sans,sans-serif",minHeight:"100%",overflowY:"auto"}}>
      <style>{`
        .dir-tab{flex:0 0 auto;display:flex;align-items:center;gap:7px;padding:10px 18px 11px;border:none;background:none;color:${C.text3};font-family:DM Sans,sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;position:relative;transition:color .2s}
        .dir-tab::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:${C.gold};border-radius:2px 2px 0 0;opacity:0;transform:scaleX(.4);transition:opacity .2s,transform .2s}
        .dir-tab:hover{color:${C.text2}}
        .dir-tab.active{color:${C.text1}}
        .dir-tab.active::after{opacity:1;transform:scaleX(1)}
        .dir-badge{font-size:10px;font-weight:700;font-family:${C.mono};padding:1px 5px;border-radius:50px;background:${C.bg3};color:${C.text3};min-width:18px;text-align:center}
        .dir-tab.active .dir-badge{background:rgba(255,214,0,.15);color:${C.gold}}
        .pcard{background:${C.bg2};border:1px solid ${C.border};border-radius:12px;cursor:pointer;transition:all .3s;overflow:hidden}
        .pcard:hover{border-color:rgba(255,214,0,.25);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
        .tcard{background:${C.bg2};border:1px solid ${C.border};border-radius:16px;padding:24px;cursor:pointer;transition:all .3s}
        .tcard:hover{border-color:rgba(255,214,0,.2);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
        .attend-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid ${C.border}}
        .attend-row:last-child{border:none}
        .match-item{background:${C.bg3};border:1px solid ${C.border};border-radius:10px;margin-bottom:8px;overflow:hidden}
        .match-row-dir{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer}
        .match-row-dir:hover{background:rgba(255,255,255,.03)}
        .sect{background:${C.bg1};border:1px solid ${C.border};border-radius:12px;padding:20px;margin-top:16px}
        .chk-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:${C.mono};margin:3px}
        .training-row{background:${C.bg3};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;margin-bottom:8px}
        .jump-row{background:${C.bg3};border:1px solid ${C.border};border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px}
      `}</style>

      {!selectedTeam ? (
        <TeamsOverview db={db} loading={loading} onRefresh={load} lastUpdate={lastUpdate} onOpenTeam={openTeam} />
      ) : (
        <TeamDetail db={db} team={selectedTeam} activeTab={activeTab} onTabChange={setActiveTab} onBack={backToTeams} onRefresh={load} loading={loading} />
      )}
    </div>
  );
}

// ── Teams Overview ─────────────────────────────────────
function TeamsOverview({ db, loading, onRefresh, lastUpdate, onOpenTeam }: {
  db: DB; loading: boolean; onRefresh: ()=>void; lastUpdate: Date; onOpenTeam: (t:Team)=>void;
}) {
  const C2 = { neon:"#00e5ff",green:"#00e676",orange:"#ff9100",red:"#ff1744",gold:"#ffd600",bg:"#07090f",bg2:"#131920",bg3:"#1a2230",border:"rgba(255,255,255,0.07)",borderH:"rgba(255,255,255,0.14)",text1:"#f0f4f8",text2:"#8899aa",text3:"#4d6070",mono:"'JetBrains Mono',monospace" };
  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontFamily:C.display,fontSize:32,letterSpacing:2,color:C.text1}}>SQUADRE</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:C.text3,fontFamily:C.mono}}>aggiornato {lastUpdate.toLocaleTimeString("it-IT")}</span>
          <button onClick={onRefresh} style={{background:"rgba(0,229,255,.1)",border:`1px solid rgba(0,229,255,.3)`,color:C.neon,padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:C.mono}}>
            {loading?"...":"↻"}
          </button>
        </div>
      </div>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(255,214,0,.08)",border:"1px solid rgba(255,214,0,.2)",borderRadius:20,fontSize:11,color:C.gold,marginBottom:20,fontFamily:C.mono}}>
        👁 Modalità sola lettura
      </div>

      {db.teams.length === 0 ? (
        <div style={{textAlign:"center",padding:60,color:C.text3}}>
          <div style={{fontSize:40,marginBottom:12}}>🏆</div>
          <p>Nessuna squadra ancora. Creane una dalla sezione Gestione.</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {db.teams.map((team, i) => {
            const ath = db.athletes.filter(a=>a.team_id===team.id);
            const mat = db.matches.filter(m=>m.team_id===team.id);
            const W = mat.filter(m=>m.goals_for>m.goals_against).length;
            const GF = mat.reduce((s,m)=>s+m.goals_for,0);
            const GA = mat.reduce((s,m)=>s+m.goals_against,0);
            const color = teamColors[i % teamColors.length];
            const sess = db.sessions.filter(s=>s.team_id===team.id);
            return (
              <div key={team.id} className="tcard" onClick={()=>onOpenTeam(team)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div>
                    <div style={{width:10,height:10,borderRadius:"50%",background:color,marginBottom:8}}/>
                    <div style={{fontFamily:C.display,fontSize:26,letterSpacing:1}}>{team.name}</div>
                  </div>
                  <div style={{fontFamily:C.display,fontSize:36,color:C.border,lineHeight:1}}>{ath.length}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingTop:16,borderTop:`1px solid ${C.border}`,marginBottom:16}}>
                  {[{v:W,l:"Vittorie",c:color},{v:GF,l:"Gol Fatti",c:C.text1},{v:GA,l:"Gol Sub.",c:C.text2},{v:mat.length,l:"Partite",c:C.text2}].map(({v,l,c})=>(
                    <div key={l}><div style={{fontFamily:C.mono,fontSize:18,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:1}}>{l}</div></div>
                  ))}
                </div>
                <button style={{width:"100%",padding:"9px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={e=>{e.stopPropagation();onOpenTeam(team);}}>
                  👁 Visualizza ({sess.length} sessioni)
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Team Detail ────────────────────────────────────────
function TeamDetail({ db, team, activeTab, onTabChange, onBack, onRefresh, loading }: {
  db: DB; team: Team; activeTab: string; onTabChange:(t:string)=>void; onBack:()=>void; onRefresh:()=>void; loading:boolean;
}) {
  const athletes = db.athletes.filter(a=>a.team_id===team.id);
  const matches = db.matches.filter(m=>m.team_id===team.id);
  const sessions = db.sessions.filter(s=>s.team_id===team.id);
  const athIds = new Set(athletes.map(a=>a.id));
  const jumps = db.jumps.filter(j=>athIds.has(j.athlete_id));
  const postures = db.postures.filter(p=>athIds.has(p.athlete_id));
  const scorers = db.scorers.filter(s=>matches.some(m=>m.id===s.match_id));
  const attendances = db.attendances.filter(a=>sessions.some(s=>s.id===a.session_id));

  const sprintCount = athletes.filter(a=>(a.sprints||[]).length>0).length;
  const matchesWithReport = matches.filter(m => { try { const p=JSON.parse(m.notes||''); return !!p.eventi; } catch{ return false; } });
  const tabs = [
    {id:"dashboard",label:"Dashboard",badge:athletes.length},
    {id:"matches",label:"Partite",badge:matches.length},
    {id:"storico",label:"Storico",badge:matchesWithReport.length},
    {id:"training",label:"Allenamenti",badge:sessions.length},
    {id:"sprint",label:"Sprint",badge:sprintCount},
    {id:"jump",label:"Jump",badge:jumps.length},
    {id:"posture",label:"Postura",badge:postures.length},
  ];

  const teamIdx = db.teams.findIndex(t=>t.id===team.id);
  const teamColor = teamColors[teamIdx % teamColors.length];

  return (
    <div style={{padding:24}}>
      {/* Back + refresh */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:8,background:"transparent",border:`1px solid ${C.border}`,color:C.text2,padding:"8px 16px",borderRadius:8,fontSize:13,cursor:"pointer"}}>
          ← Tutte le squadre
        </button>
        <button onClick={onRefresh} style={{background:"rgba(0,229,255,.1)",border:`1px solid rgba(0,229,255,.3)`,color:C.neon,padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:C.mono}}>
          {loading?"...":"↻ Aggiorna"}
        </button>
      </div>

      {/* Team banner */}
      <div style={{background:`linear-gradient(135deg,${teamColor}22,${teamColor}44)`,border:`1px solid ${teamColor}44`,borderRadius:12,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <span style={{fontSize:20}}>🛡</span>
        <span style={{fontFamily:C.display,fontSize:22,letterSpacing:2,color:teamColor}}>{team.name}</span>
        <span style={{marginLeft:"auto",fontSize:11,color:C.text3,fontFamily:C.mono}}>Solo lettura</span>
      </div>

      {/* Tab nav */}
      <div style={{display:"flex",flexWrap:"nowrap",overflowX:"auto",borderBottom:`1px solid ${C.border}`,marginBottom:0,gap:0,scrollbarWidth:"none"}}>
        {tabs.map(t=>(
          <button key={t.id} className={`dir-tab${activeTab===t.id?" active":""}`} onClick={()=>onTabChange(t.id)}>
            {t.label} <span className="dir-badge">{t.badge}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab==="dashboard" && <DashTab athletes={athletes} matches={matches} sessions={sessions} attendances={attendances} scorers={scorers} db={db} />}
      {activeTab==="matches" && <MatchesTab matches={matches} athletes={athletes} db={db} />}
      {activeTab==="storico" && <StoricoTab matches={matches} />}
      {activeTab==="training" && <TrainingTab sessions={sessions} athletes={athletes} attendances={attendances} />}
      {activeTab==="sprint" && <SprintTab athletes={athletes} />}
      {activeTab==="jump" && <JumpTab jumps={jumps} athletes={athletes} />}
      {activeTab==="posture" && <PostureTab postures={postures} athletes={athletes} />}
    </div>
  );
}

// ── Athlete Roster con dettaglio completo ──────────────
function AthleteRoster({ athletes, goalMap, assistMap, presMap }: {
  athletes: Athlete[];
  goalMap: Record<string,number>;
  assistMap: Record<string,number>;
  presMap: Record<string,number>;
}) {
  const [openId, setOpenId] = useState<string|null>(null);
  const fmtT = (v: number|null|undefined) => v != null ? v+"s" : "—";
  const fmtN = (v: number|null|undefined, u="") => v != null ? v+u : "—";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {athletes.map(a=>{
        const isOpen = openId===a.id;
        const goals = goalMap[a.id]||0;
        const assists = assistMap[a.id]||0;
        const pres = presMap[a.id]||0;
        const mins = a.minutes||0;
        const hasTests = [a.test1_5m,a.test1_10m,a.test1_abs,a.test1_bipo].some(v=>v!=null);
        const hasBody = a.measure1_height||a.measure2_height;
        const hasSprints = (a.sprints||[]).length>0;
        return (
          <div key={a.id} style={{background:C.bg3,border:`1px solid ${isOpen?C.neon+"50":C.border}`,borderRadius:10,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Header riga */}
            <div onClick={()=>setOpenId(isOpen?null:a.id)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",cursor:"pointer"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#ff9100)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#07090f",flexShrink:0}}>
                {initials(a.full_name)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{a.full_name}</div>
                <div style={{fontSize:11,color:C.text3}}>{a.position||"—"} {a.jersey_number?"· #"+a.jersey_number:""}</div>
              </div>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                {goals>0&&<span style={{fontFamily:C.mono,fontSize:12,color:C.green}}>{goals}⚽</span>}
                {assists>0&&<span style={{fontFamily:C.mono,fontSize:12,color:C.purple}}>{assists}🅰</span>}
                <span style={{fontFamily:C.mono,fontSize:12,color:C.neon}}>{pres}pres</span>
                <span style={{color:C.text3,fontSize:11}}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>

            {/* Dettaglio espanso */}
            {isOpen && (
              <div style={{borderTop:`1px solid ${C.border}`,padding:"14px 16px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

                  {/* Anagrafica */}
                  <div>
                    <div style={{fontSize:9,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Anagrafica</div>
                    {[
                      ["Data nascita", a.birth_date ? new Date(a.birth_date).toLocaleDateString("it-IT") : null],
                      ["Luogo nascita", a.birth_place],
                      ["Telefono", a.phone],
                      ["Ruolo", a.position],
                      ["Maglia", a.jersey_number ? "#"+a.jersey_number : null],
                      ["Fitness", a.fitness != null ? a.fitness+"/10" : null],
                      ["Rating", a.rating != null ? a.rating+"/10" : null],
                    ].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.text3}}>{l as string}</span>
                        <span style={{color:C.text1,fontWeight:600}}>{v as string}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div>
                    <div style={{fontSize:9,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Statistiche</div>
                    {[
                      ["Gol", goals, C.green],
                      ["Assist", assists, C.purple],
                      ["Presenze allenamento", pres, C.neon],
                      ["Partite giocate", a.matches_played||0, C.text1],
                      ["Minuti totali", mins ? mins+"'" : 0, C.text2],
                      ["Gol subiti", a.goals_conceded||0, C.red],
                    ].map(([l,v,c])=>(
                      <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.text3}}>{l as string}</span>
                        <span style={{color:c as string,fontWeight:700}}>{v as any}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Misurazioni antropometriche */}
                {hasBody && (
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:9,color:C.orange,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Misurazioni</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["Altezza T1", a.measure1_height, "cm"],
                        ["Peso T1", a.measure1_weight, "kg"],
                        ["Altezza T2", a.measure2_height, "cm"],
                        ["Peso T2", a.measure2_weight, "kg"],
                      ].filter(([,v])=>v!=null).map(([l,v,u])=>(
                        <div key={l as string} style={{background:C.bg2,borderRadius:6,padding:"6px 10px",display:"flex",justifyContent:"space-between",fontSize:12}}>
                          <span style={{color:C.text3}}>{l as string}</span>
                          <span style={{color:C.orange,fontWeight:700}}>{v}{u}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test fisici */}
                {hasTests && (
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:9,color:C.purple,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Test fisici (T1 → T2)</div>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr>{["Test","T1","T2","Δ"].map(h=><th key={h} style={{color:C.text3,fontFamily:C.mono,fontSize:9,letterSpacing:1,textTransform:"uppercase",padding:"4px 8px",textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {[
                          {n:"5m",t1:a.test1_5m,t2:a.test2_5m,u:"s",low:true},
                          {n:"10m",t1:a.test1_10m,t2:a.test2_10m,u:"s",low:true},
                          {n:"20m",t1:a.test1_20m,t2:a.test2_20m,u:"s",low:true},
                          {n:"30m",t1:a.test1_30m,t2:a.test2_30m,u:"s",low:true},
                          {n:"Addominali",t1:a.test1_abs,t2:a.test2_abs,u:"",low:false},
                          {n:"Piegamenti",t1:a.test1_push,t2:a.test2_push,u:"",low:false},
                          {n:"Balzo bipo",t1:a.test1_bipo,t2:a.test2_bipo,u:"cm",low:false},
                          {n:"Balzo DX",t1:a.test1_mono_dx,t2:a.test2_mono_dx,u:"cm",low:false},
                          {n:"Balzo SX",t1:a.test1_mono_sx,t2:a.test2_mono_sx,u:"cm",low:false},
                        ].filter(r=>r.t1!=null||r.t2!=null).map(r=>{
                          let delta="—", deltaC=C.text3;
                          if(r.t1!=null&&r.t2!=null){
                            const d=r.low?r.t1-r.t2:r.t2-r.t1;
                            const pct=((d/r.t1)*100).toFixed(1);
                            delta=(d>0?"+":"")+pct+"%";
                            deltaC=d>0?C.green:d<0?C.red:C.text3;
                          }
                          return <tr key={r.n}>
                            <td style={{padding:"4px 8px",color:C.text2,borderBottom:`1px solid ${C.border}`}}>{r.n}</td>
                            <td style={{padding:"4px 8px",fontFamily:C.mono,color:C.text1,borderBottom:`1px solid ${C.border}`}}>{r.t1!=null?r.t1+r.u:"—"}</td>
                            <td style={{padding:"4px 8px",fontFamily:C.mono,color:C.text1,borderBottom:`1px solid ${C.border}`}}>{r.t2!=null?r.t2+r.u:"—"}</td>
                            <td style={{padding:"4px 8px",fontFamily:C.mono,color:deltaC,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{delta}</td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sprint highlights */}
                {hasSprints && (
                  <div style={{marginTop:14}}>
                    <div style={{fontSize:9,color:C.gold,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Sprint ({(a.sprints||[]).length} test)</div>
                    {(() => {
                      const best = [...(a.sprints||[])].sort((x,y)=>x.totalSec-y.totalSec)[0];
                      return best ? (
                        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 12px"}}>
                            <div style={{fontSize:9,color:C.text3,marginBottom:3}}>Miglior tempo</div>
                            <div style={{fontFamily:C.mono,fontWeight:700,fontSize:18,color:C.gold}}>{best.totalSec?.toFixed(2)}s</div>
                          </div>
                          {[["30m",best.t30],["20m",best.t20],["10m",best.t10]].filter(([,v])=>v!=null).map(([l,v])=>(
                            <div key={l as string} style={{background:C.bg2,borderRadius:8,padding:"8px 12px"}}>
                              <div style={{fontSize:9,color:C.text3,marginBottom:3}}>{l as string}</div>
                              <div style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:C.text1}}>{(v as number).toFixed(2)}s</div>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Note */}
                {a.notes && (
                  <div style={{marginTop:12,padding:"8px 12px",background:C.bg2,borderRadius:8,fontSize:12,color:C.text2,fontStyle:"italic",borderLeft:`3px solid ${C.gold}`}}>
                    {a.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── Dashboard Tab ──────────────────────────────────────
function DashTab({ athletes, matches, sessions, attendances, scorers, db }: {
  athletes: Athlete[]; matches: Match[]; sessions: TrainingSession[];
  attendances: Attendance[]; scorers: Scorer[]; db: DB;
}) {
  const mIds = new Set(matches.map(m=>m.id));
  const gkStats: Record<string,number> = {}; // athlete_id → gol subiti totali
  db.goalkeepers.filter(g=>mIds.has(g.match_id)).forEach(g=>{
    gkStats[g.athlete_id]=(gkStats[g.athlete_id]||0)+g.goals_conceded;
  });
  const GF = matches.reduce((s,m)=>s+m.goals_for,0);
  const GA = matches.reduce((s,m)=>s+m.goals_against,0);
  const W = matches.filter(m=>m.goals_for>m.goals_against).length;
  const D = matches.filter(m=>m.goals_for===m.goals_against).length;
  const L = matches.filter(m=>m.goals_for<m.goals_against).length;

  const goalMap: Record<string,number> = {};
  const presMap: Record<string,number> = {};
  const assistMap: Record<string,number> = {};
  db.scorers.filter(s=>matches.some(m=>m.id===s.match_id)).forEach(s=>{goalMap[s.athlete_id]=(goalMap[s.athlete_id]||0)+s.goals;});
  db.assists.filter(a=>matches.some(m=>m.id===a.match_id)).forEach(a=>{assistMap[a.athlete_id]=(assistMap[a.athlete_id]||0)+a.assists;});
  attendances.filter(a=>a.present).forEach(a=>{presMap[a.athlete_id]=(presMap[a.athlete_id]||0)+1;});

  const top = [...athletes].sort((a,b)=>(goalMap[b.id]||0)-(goalMap[a.id]||0)).filter(a=>(goalMap[a.id]||0)>0).slice(0,5);
  const byPres = [...athletes].sort((a,b)=>(presMap[b.id]||0)-(presMap[a.id]||0));
  const roles: Record<string,number> = {};
  athletes.forEach(a=>{ const r=a.position||"N/D"; roles[r]=(roles[r]||0)+1; });

  return (
    <div style={{marginTop:16}}>
      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        {[
          {v:athletes.length,l:"Atleti",c:C.neon},
          {v:W,l:"Vittorie",c:C.green},
          {v:D,l:"Pareggi",c:C.orange},
          {v:L,l:"Sconfitte",c:C.red},
          {v:GF,l:"Gol Fatti",c:C.green},
          {v:GA,l:"Gol Sub.",c:C.red},
          {v:sessions.length,l:"Training",c:C.purple},
          {v:matches.length,l:"Partite",c:C.text1},
        ].map(({v,l,c})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:26,fontWeight:700,color:c,lineHeight:1,marginBottom:4}}>{v}</div>
            <div style={{fontSize:10,color:C.text3,fontFamily:C.mono,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Rosa con dettaglio espandibile */}
        <div className="sect">
          <div style={{fontSize:11,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Rosa — {athletes.length} atleti</div>
          <AthleteRoster athletes={athletes} goalMap={goalMap} assistMap={assistMap} presMap={presMap} />
        </div>

        {/* Top marcatori */}
        <div className="sect">
          <div style={{fontSize:11,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Top Marcatori</div>
          {top.length === 0 ? <p style={{color:C.text3,fontSize:12}}>Nessun gol registrato ancora.</p> : top.map((a,i)=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<top.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{fontFamily:C.mono,fontSize:11,color:C.text3,minWidth:16}}>{i+1}.</div>
              <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#ff9100)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#07090f",flexShrink:0}}>{initials(a.full_name)}</div>
              <div style={{flex:1,fontSize:13}}>{a.full_name}</div>
              <div style={{fontFamily:C.mono,fontWeight:700,color:C.green}}>{goalMap[a.id]||0}</div>
              <div style={{fontFamily:C.mono,fontSize:11,color:C.text3}}>{assistMap[a.id]||0}A</div>
            </div>
          ))}

          {/* Portieri con gol subiti */}
          {Object.keys(gkStats).length>0 && (<>
            <div style={{marginTop:16,fontSize:11,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Portieri</div>
            {athletes.filter(a=>gkStats[a.id]!==undefined).map((a,i)=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"5px 0",borderBottom:i<Object.keys(gkStats).length-1?`1px solid ${C.border}`:'none'}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.neon}20`,border:`1px solid ${C.neon}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.neon}}>P</div>
                <div style={{flex:1,fontSize:13}}>{a.full_name}</div>
                <div style={{fontFamily:C.mono,fontSize:11,color:gkStats[a.id]===0?C.green:C.text2}}>
                  {gkStats[a.id]===0?'🔒 CS':`${gkStats[a.id]} sub.`}
                </div>
              </div>
            ))}
          </>)}
          <div style={{marginTop:16,fontSize:11,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Presenze Allenamenti</div>
          {byPres.slice(0,5).map((a,i)=>{
            const p=presMap[a.id]||0; const max=presMap[byPres[0].id]||1;
            return (
              <div key={a.id} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                  <span>{a.full_name}</span><span style={{fontFamily:C.mono,color:C.neon}}>{p}</span>
                </div>
                <div style={{height:4,background:C.bg3,borderRadius:2}}>
                  <div style={{height:4,borderRadius:2,background:C.neon,width:`${(p/max)*100}%`,transition:"width .5s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ruoli */}
      <div className="sect" style={{marginTop:16}}>
        <div style={{fontSize:11,color:C.neon,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Distribuzione Ruoli</div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {Object.entries(roles).map(([r,n])=>(
            <div key={r} style={{textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:700,color:C.gold,fontFamily:C.mono}}>{n}</div>
              <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:1}}>{r}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Matches Tab ────────────────────────────────────────
function MatchesTab({ matches, athletes, db }: { matches: Match[]; athletes: Athlete[]; db: DB; }) {
  const gkMap: Record<string, {name:string; conceded:number}[]> = {};
  db.goalkeepers.filter(g=>matches.some(m=>m.id===g.match_id)).forEach(g=>{
    const ath=athletes.find(a=>a.id===g.athlete_id);
    if(!gkMap[g.match_id]) gkMap[g.match_id]=[];
    gkMap[g.match_id].push({name:ath?.full_name||'Portiere', conceded:g.goals_conceded});
  });
  const [openId, setOpenId] = useState<string|null>(null);
  const W=matches.filter(m=>m.goals_for>m.goals_against).length;
  const D=matches.filter(m=>m.goals_for===m.goals_against).length;
  const L=matches.filter(m=>m.goals_for<m.goals_against).length;
  const GF=matches.reduce((s,m)=>s+m.goals_for,0);
  const GA=matches.reduce((s,m)=>s+m.goals_against,0);

  return (
    <div style={{marginTop:16}}>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        {[{v:W,l:"Vittorie",c:C.green},{v:D,l:"Pareggi",c:C.orange},{v:L,l:"Sconfitte",c:C.red},{v:GF,l:"Gol F.",c:C.neon},{v:GA,l:"Gol S.",c:C.red}].map(({v,l,c})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",minWidth:80,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:C.mono}}>{v}</div>
            <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>
      {matches.length===0 ? <p style={{color:C.text3,textAlign:"center",padding:30}}>Nessuna partita ancora.</p> :
        matches.map(m=>{
          const res=m.goals_for>m.goals_against?"win":m.goals_for<m.goals_against?"loss":"draw";
          const resC={win:C.green,draw:C.orange,loss:C.red}[res];
          const resL={win:"V",draw:"P",loss:"S"}[res];
          const mScorers=db.scorers.filter(s=>s.match_id===m.id);
          const mAssists=db.assists.filter(a=>a.match_id===m.id);
          const isOpen=openId===m.id;
          return (
            <div key={m.id} className="match-item">
              <div className="match-row-dir" onClick={()=>setOpenId(isOpen?null:m.id)}>
                <div style={{fontFamily:C.mono,fontSize:11,color:C.text3,minWidth:64}}>{fmt(m.date)}</div>
                <div style={{flex:1,fontWeight:700}}>vs {m.opponent}</div>
                <div style={{fontFamily:C.mono,fontWeight:700,color:resC}}>{m.goals_for} — {m.goals_against}</div>
                <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontFamily:C.mono,fontWeight:700,background:`${resC}20`,color:resC,border:`1px solid ${resC}50`}}>{resL}</span>
                <span style={{color:C.text3,fontSize:11,marginLeft:4}}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen && (
                <div style={{padding:"14px 16px",borderTop:`1px solid ${C.border}`,background:C.bg}}>
                  {/* KPI partita */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                    {[
                      {v:m.goals_for,l:"Gol Fatti",c:C.green},
                      {v:m.goals_against,l:"Gol Subiti",c:C.red},
                      {v:m.type,l:"Tipo",c:C.text2},
                      {v:m.venue,l:"Campo",c:C.text2}
                    ].map(({v,l,c})=>(
                      <div key={l} style={{textAlign:"center",background:C.bg2,borderRadius:8,padding:"8px 4px"}}>
                        <div style={{fontFamily:C.mono,fontWeight:700,fontSize:15,color:c}}>{v}</div>
                        <div style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Marcatori */}
                  {mScorers.length>0 && (
                    <div style={{marginBottom:8,padding:"8px 12px",background:C.bg2,borderRadius:8,borderLeft:`3px solid ${C.green}`}}>
                      <div style={{fontSize:9,color:C.green,textTransform:"uppercase",letterSpacing:1,fontFamily:C.mono,marginBottom:4}}>Marcatori</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {mScorers.map((s,i)=>{
                          const a=athletes.find(x=>x.id===s.athlete_id);
                          return <span key={i} style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:`${C.green}15`,color:C.green,border:`1px solid ${C.green}30`}}>
                            {a?.full_name||'?'} <strong>×{s.goals}</strong>
                          </span>;
                        })}
                      </div>
                    </div>
                  )}
                  {/* Assist */}
                  {mAssists.length>0 && (
                    <div style={{marginBottom:8,padding:"8px 12px",background:C.bg2,borderRadius:8,borderLeft:`3px solid ${C.purple}`}}>
                      <div style={{fontSize:9,color:C.purple,textTransform:"uppercase",letterSpacing:1,fontFamily:C.mono,marginBottom:4}}>Assist</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {mAssists.map((a,i)=>{
                          const ath=athletes.find(x=>x.id===a.athlete_id);
                          return <span key={i} style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:`${C.purple}15`,color:C.purple,border:`1px solid ${C.purple}30`}}>
                            {ath?.full_name||'?'} <strong>×{a.assists}</strong>
                          </span>;
                        })}
                      </div>
                    </div>
                  )}
                  {/* Portieri */}
                  {(gkMap[m.id]||[]).length>0 && (
                    <div style={{marginBottom:8,padding:"8px 12px",background:C.bg2,borderRadius:8,borderLeft:`3px solid ${C.neon}`}}>
                      <div style={{fontSize:9,color:C.neon,textTransform:"uppercase",letterSpacing:1,fontFamily:C.mono,marginBottom:4}}>Portieri</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {(gkMap[m.id]||[]).map((g,i)=>(
                          <span key={i} style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:`${C.neon}12`,color:C.neon,border:`1px solid ${C.neon}25`}}>
                            {g.name} {g.conceded===0?'🔒 CS':`${g.conceded} sub.`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Report MATCH identico a MATCH.html */}
                  {m.notes && m.notes.startsWith('{') && (() => {
                    try {
                      const parsed = JSON.parse(m.notes);
                      if (!parsed.eventi) return null;
                      // Usa _renderMatchReport se disponibile (iniettata via script)
                      const reportFn = (window as any)._renderMatchReport;
                      if (!reportFn) return null;
                      const html = reportFn(parsed.eventi, parsed.logs || []);
                      return (
                        <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:12}}
                          dangerouslySetInnerHTML={{__html: html}} />
                      );
                    } catch { return null; }
                  })()}
                  {m.notes && !m.notes.startsWith('{') && m.notes.length < 300 && (
                    <div style={{fontSize:11,color:C.text3,fontStyle:"italic",padding:"6px 0"}}>{m.notes}</div>
                  )}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

// ── Training Tab ───────────────────────────────────────

// ── StoricoTab v2 — storico partite con analisi MATCH e tendenze ─────────────
function StoricoTab({ matches }: { matches: Match[] }) {
  const [filtroN, setFiltroN] = useState(5);
  const [filtroEvento, setFiltroEvento] = useState("all");

  const EVENTI = [
    { id:"gol",              nome:"⚽ Gol",          colore:"#ff1744" },
    { id:"tiro",             nome:"Tiro",             colore:"#ef4444" },
    { id:"tiro_fatto",       nome:"Tiro in Porta",    colore:"#8b5cf6" },
    { id:"cross",            nome:"Cross",            colore:"#3b82f6" },
    { id:"cross_fatto",      nome:"Cross Riuscito",   colore:"#06b6d4" },
    { id:"palla_persa",      nome:"Palla Persa",      colore:"#f59e0b" },
    { id:"palla_recuperata", nome:"Palla Recuperata", colore:"#10b981" },
    { id:"filtrante",        nome:"Filtrante",        colore:"#ec4899" },
  ];

  // Filtra partite con analisi JSON
  const withReport = matches.filter(m => {
    try { const p = JSON.parse(m.notes||""); return !!p.eventi; } catch { return false; }
  }).map(m => {
    const p = JSON.parse(m.notes!);
    return { ...m, eventi: p.eventi||{}, logs: p.logs||[] };
  });

  if (withReport.length === 0) return (
    <div style={{textAlign:"center",padding:60,color:C.text3}}>
      <div style={{fontSize:32,marginBottom:12}}>📊</div>
      <div>Nessuna partita con analisi trovata.</div>
      <div style={{fontSize:12,marginTop:6}}>Usa MATCH per registrare eventi durante le partite.</div>
    </div>
  );

  const slice = filtroN > 0 ? withReport.slice(0,filtroN) : withReport;

  // Conta totali per tipo
  const totTipo: Record<string,number> = {};
  EVENTI.forEach(e => totTipo[e.id] = 0);
  slice.forEach(m => {
    Object.values(m.eventi as Record<string,Record<string,number>>).forEach(zona =>
      Object.entries(zona).forEach(([t,n]) => { if(totTipo[t]!==undefined) totTipo[t]+=n; })
    );
  });

  // Zone aggregate
  const zc: Record<number,number> = {};
  for (let z=1;z<=16;z++) zc[z]=0;
  slice.forEach(m => {
    for (let z=1;z<=16;z++) {
      const zona = ((m.eventi as any)[String(z)]||{});
      if (filtroEvento==="all") Object.values(zona).forEach((n:any) => zc[z]+=n);
      else zc[z] += zona[filtroEvento]||0;
    }
  });

  const mx = Math.max(1,...Object.values(zc));
  const maxTipo = Math.max(1,...Object.values(totTipo));
  const totEventi = Object.values(totTipo).reduce((a,b)=>a+b,0);
  const zonaMax = Object.entries(zc).sort((a,b)=>b[1]-a[1])[0][0];

  const filtrati = filtroEvento==="all" ? EVENTI : EVENTI.filter(e=>e.id===filtroEvento);
  const cronologica = [...slice].reverse();

  return (
    <div style={{paddingTop:16}}>
      {/* Filtri */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:20}}>
        <select value={filtroN} onChange={e=>setFiltroN(+e.target.value)}
          style={{padding:"6px 12px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text1,fontSize:13}}>
          <option value={0}>Tutte le partite</option>
          <option value={3}>Ultime 3</option>
          <option value={5}>Ultime 5</option>
          <option value={10}>Ultime 10</option>
        </select>
        <select value={filtroEvento} onChange={e=>setFiltroEvento(e.target.value)}
          style={{padding:"6px 12px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text1,fontSize:13}}>
          <option value="all">Tutti gli eventi</option>
          {EVENTI.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <span style={{fontSize:11,color:C.text3,fontFamily:C.mono}}>{slice.length} partite analizzate</span>
      </div>

      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {l:"Partite",v:slice.length,c:C.neon},
          {l:"Totale Eventi",v:totEventi,c:C.purple},
          {l:"Media/Partita",v:(totEventi/slice.length).toFixed(1),c:C.orange},
          {l:"Zona Più Attiva",v:"Z"+zonaMax,c:C.red},
        ].map(k=>(
          <div key={k.l} style={{background:C.bg3,borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontFamily:C.mono,fontWeight:700,fontSize:20,color:k.c,lineHeight:1}}>{k.v}</div>
            <div style={{fontSize:10,color:C.text3,letterSpacing:1.5,textTransform:"uppercase",marginTop:4}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Heatmap + Barre */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* Heatmap */}
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.neon,textTransform:"uppercase",marginBottom:12,fontFamily:C.mono}}>Heatmap Aggregata</div>
          <div style={{position:"relative",background:"#1a4a2e",aspectRatio:"105/68",width:"100%",overflow:"hidden",borderRadius:6,
            backgroundImage:"linear-gradient(rgba(255,255,255,.45) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.45) 2px,transparent 2px),linear-gradient(90deg,transparent calc(50% - 1px),rgba(255,255,255,.45) calc(50% - 1px),rgba(255,255,255,.45) calc(50% + 1px),transparent calc(50% + 1px))"}}>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"18%",aspectRatio:"1",border:"2px solid rgba(255,255,255,.45)",borderRadius:"50%"}}/>
            <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",left:0,width:"16%",height:"57%",border:"2px solid rgba(255,255,255,.45)",borderLeft:"none"}}/>
            <div style={{position:"absolute",top:"50%",transform:"translateY(-50%)",right:0,width:"16%",height:"57%",border:"2px solid rgba(255,255,255,.45)",borderRight:"none"}}/>
            <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gridTemplateRows:"repeat(4,1fr)"}}>
              {(() => {
                const cells=[];
                for(let row=0;row<4;row++) for(let col=0;col<4;col++) {
                  const zona=col*4+row+1, c=zc[zona]||0;
                  const bg=c>0?`rgba(239,68,68,${Math.min(0.15+(c/mx)*0.75,0.92).toFixed(2)})`:"transparent";
                  cells.push(<div key={zona} style={{border:"1px solid rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center",background:bg}}>
                    <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.7)",textAlign:"center",lineHeight:1.3}}>
                      Z{zona}{c>0&&<><br/><b style={{color:"#fff",fontSize:9}}>{c}</b></>}
                    </div>
                  </div>);
                }
                return cells;
              })()}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:10,fontWeight:700,letterSpacing:2,color:C.text3}}>
            <span>◀ DIFESA</span><span>ATTACCO ▶</span>
          </div>
        </div>

        {/* Barre */}
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.neon,textTransform:"uppercase",marginBottom:12,fontFamily:C.mono}}>Totale per Tipologia</div>
          {filtrati.map(e=>(
            <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:120,fontSize:12,color:C.text2,flexShrink:0}}>{e.nome}</div>
              <div style={{flex:1,height:7,background:C.bg3,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:7,borderRadius:4,width:`${(totTipo[e.id]/maxTipo*100).toFixed(1)}%`,background:e.colore,transition:"width .4s"}}/>
              </div>
              <div style={{width:24,textAlign:"right",fontSize:12,fontWeight:700,color:C.text1,fontFamily:C.mono}}>{totTipo[e.id]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grafico tendenza */}
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.neon,textTransform:"uppercase",marginBottom:12,fontFamily:C.mono}}>Tendenza nel Tempo</div>
        <div style={{overflowX:"auto"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120,minWidth:Math.max(300,cronologica.length*80)}}>
            {cronologica.map((m,mi)=>{
              const ev=filtroEvento==="all"?totEventi/slice.length:(()=>{let t=0;Object.values((m.eventi as any)).forEach((z:any)=>t+=(z[filtroEvento]||0));return t;})();
              const maxEv=Math.max(1,...cronologica.map(x=>{
                if(filtroEvento==="all"){let t=0;Object.values((x.eventi as any)).forEach((z:any)=>Object.values(z as any).forEach((n:any)=>t+=n));return t;}
                let t=0;Object.values((x.eventi as any)).forEach((z:any)=>t+=(z[filtroEvento]||0));return t;
              }));
              const thisEv=(()=>{if(filtroEvento==="all"){let t=0;Object.values((m.eventi as any)).forEach((z:any)=>Object.values(z as any).forEach((n:any)=>t+=n));return t;}let t=0;Object.values((m.eventi as any)).forEach((z:any)=>t+=(z[filtroEvento]||0));return t;})();
              const h=Math.max(4,(thisEv/maxEv)*100);
              const res=m.goals_for>m.goals_against?C.green:m.goals_for<m.goals_against?C.red:C.orange;
              const d=new Date(m.date);
              return(
                <div key={m.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:60}}>
                  <div style={{fontFamily:C.mono,fontSize:9,color:C.text3,textAlign:"center"}}>{thisEv}</div>
                  <div style={{width:"60%",height:h,background:filtroEvento==="all"?C.neon:EVENTI.find(e=>e.id===filtroEvento)?.colore||C.neon,borderRadius:"3px 3px 0 0",opacity:0.8}}/>
                  <div style={{fontSize:9,color:res,fontFamily:C.mono,fontWeight:700,textAlign:"center"}}>{m.goals_for}-{m.goals_against}</div>
                  <div style={{fontSize:9,color:C.text3,textAlign:"center"}}>{String(d.getDate()).padStart(2,"0")}/{String(d.getMonth()+1).padStart(2,"0")}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista partite */}
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.neon,textTransform:"uppercase",marginBottom:12,fontFamily:C.mono}}>Partite Incluse</div>
        {slice.map(m=>{
          let totM=0;
          Object.values(m.eventi as Record<string,Record<string,number>>).forEach(z=>Object.values(z).forEach(n=>totM+=n));
          const res=m.goals_for>m.goals_against?C.green:m.goals_for<m.goals_against?C.red:C.orange;
          return(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:11,color:C.text3,fontFamily:C.mono,minWidth:70}}>{new Date(m.date).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</span>
              <span style={{flex:1,fontSize:13,color:C.text1}}>vs {m.opponent}</span>
              <span style={{fontFamily:C.mono,fontWeight:700,color:res}}>{m.goals_for}—{m.goals_against}</span>
              <span style={{fontSize:11,color:C.text3,fontFamily:C.mono,minWidth:55,textAlign:"right"}}>{totM} ev.</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrainingTab({ sessions, athletes, attendances }: { sessions: TrainingSession[]; athletes: Athlete[]; attendances: Attendance[]; }) {
  const typeColor: Record<string,string> = {Tecnico:C.neon,Tattico:C.purple,Fisico:C.orange,Portieri:C.green,Amichevole:C.gold,Recupero:C.text2,Scarico:C.text3};
  const totalPres = sessions.reduce((s,sess)=>s+attendances.filter(a=>a.session_id===sess.id&&a.present).length,0);
  const avgPres = sessions.length ? Math.round(totalPres/sessions.length) : 0;

  return (
    <div style={{marginTop:16}}>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        {[{v:sessions.length,l:"Sessioni",c:C.neon},{v:avgPres,l:"Media Presenti",c:C.green},{v:sessions.reduce((s,x)=>s+x.duration_min,0)+"'",l:"Min Totali",c:C.orange}].map(({v,l,c})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",minWidth:100,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:C.mono}}>{v}</div>
            <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
          </div>
        ))}
      </div>
      {sessions.length===0 ? <p style={{color:C.text3,textAlign:"center",padding:30}}>Nessun allenamento ancora.</p> :
        sessions.map(sess=>{
          const pres=attendances.filter(a=>a.session_id===sess.id&&a.present);
          const tot=athletes.length;
          const pct=tot>0?Math.round(pres.length/tot*100):0;
          const presAthletes=pres.map(a=>athletes.find(x=>x.id===a.athlete_id)).filter(Boolean) as Athlete[];
          const color=typeColor[sess.type]||C.text2;
          return (
            <div key={sess.id} className="training-row">
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <div style={{fontFamily:C.mono,fontSize:11,color:C.text3,minWidth:64}}>{fmt(sess.date)}</div>
                <span style={{padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}30`}}>{sess.type}</span>
                <span style={{fontSize:12,color:C.text3}}>{sess.duration_min}'</span>
                <span style={{marginLeft:"auto",fontFamily:C.mono,fontSize:12,color:pct>=75?C.green:pct>=50?C.orange:C.red}}>{pres.length}/{tot} · {pct}%</span>
              </div>
              {sess.notes && <div style={{fontSize:11,color:C.text3,marginBottom:6,fontStyle:"italic"}}>{sess.notes}</div>}
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {presAthletes.slice(0,10).map(a=>(
                  <span key={a.id} style={{fontSize:10,padding:"2px 7px",borderRadius:12,background:"rgba(0,230,118,.1)",color:C.green,border:"1px solid rgba(0,230,118,.2)"}}>{a.full_name.split(" ")[0]}</span>
                ))}
                {presAthletes.length>10 && <span style={{fontSize:10,color:C.text3}}>+{presAthletes.length-10}</span>}
                {presAthletes.length===0 && <span style={{fontSize:10,color:C.text3}}>Nessuna presenza registrata</span>}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ── Sprint Tab ─────────────────────────────────────────
function SprintTab({ athletes }: { athletes: Athlete[] }) {
  const [selId, setSelId] = useState<string|null>(null);
  const withSprints = athletes.filter(a=>(a.sprints||[]).length>0);
  const selAth = selId ? athletes.find(a=>a.id===selId) : withSprints[0] || null;
  const sprints: any[] = selAth?.sprints || [];

  const fmtT = (v: number|null|undefined) => v != null ? v.toFixed(2)+"s" : "—";

  return (
    <div style={{marginTop:16}}>
      {withSprints.length===0 ? <p style={{color:C.text3,textAlign:"center",padding:30}}>Nessun test sprint ancora.</p> : (<>
        {/* Selettore atleta */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {withSprints.map(a=>(
            <button key={a.id} onClick={()=>setSelId(a.id)}
              style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${(selAth?.id===a.id)?C.neon:C.border}`,
                background:(selAth?.id===a.id)?"rgba(0,229,255,.1)":"transparent",
                color:(selAth?.id===a.id)?C.neon:C.text2,fontSize:12,cursor:"pointer"}}>
              {a.full_name}
            </button>
          ))}
        </div>

        {selAth && sprints.length>0 && (<>
          {/* Best */}
          {(() => {
            const best = [...sprints].sort((a,b)=>a.totalSec-b.totalSec)[0];
            return best ? (
              <div style={{background:C.bg2,border:`1px solid ${C.neon}30`,borderRadius:10,padding:"14px 18px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap"}}>
                <div><div style={{fontSize:10,color:C.text3,fontFamily:C.mono,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Miglior tempo</div>
                  <div style={{fontFamily:C.mono,fontSize:24,fontWeight:700,color:C.neon}}>{best.totalSec?.toFixed(2)}s</div>
                  <div style={{fontSize:11,color:C.text3}}>{new Date(best.date).toLocaleDateString("it-IT")}</div>
                </div>
                {[["5m",best.t5],["10m",best.t10],["20m",best.t20],["30m",best.t30]].filter(([,v])=>v!=null).map(([l,v])=>(
                  <div key={l as string}><div style={{fontSize:10,color:C.text3,fontFamily:C.mono,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{l as string}</div>
                    <div style={{fontFamily:C.mono,fontSize:16,fontWeight:700,color:C.text1}}>{(v as number).toFixed(2)}s</div>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          {/* Storico */}
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.text3,fontFamily:C.mono,letterSpacing:2,textTransform:"uppercase"}}>
              Storico ({sprints.length} sessioni)
            </div>
            {[...sprints].reverse().map((sp,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<sprints.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{fontFamily:C.mono,fontSize:11,color:C.text3,minWidth:72}}>{new Date(sp.date).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</span>
                <span style={{fontFamily:C.mono,fontWeight:700,color:C.neon,minWidth:60}}>{sp.totalSec?.toFixed(2)}s</span>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {[["5m",sp.t5],["10m",sp.t10],["15m",sp.t15],["20m",sp.t20],["30m",sp.t30]].filter(([,v])=>v!=null).map(([l,v])=>(
                    <span key={l as string} style={{fontSize:11,color:C.text2,fontFamily:C.mono}}>{l}: {(v as number).toFixed(2)}s</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>)}
      </>)}
    </div>
  );
}


// ── Jump Tab ───────────────────────────────────────────
function JumpTab({ jumps, athletes }: { jumps: JumpTest[]; athletes: Athlete[]; }) {
  const [openId, setOpenId] = useState<string|null>(null);
  const byAthlete: Record<string,JumpTest[]> = {};
  jumps.forEach(j=>{ if(!byAthlete[j.athlete_id]) byAthlete[j.athlete_id]=[]; byAthlete[j.athlete_id].push(j); });

  return (
    <div style={{marginTop:16}}>
      {athletes.length===0 && <p style={{color:C.text3,textAlign:"center",padding:30}}>Nessun atleta nella squadra.</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {athletes.map(ath=>{
          const tests=byAthlete[ath.id]||[];
          const best=tests.length?Math.max(...tests.map(t=>t.best_height_cm||0)):0;
          const bestTest=tests.length?tests.reduce((b,t)=>(t.best_height_cm||0)>(b.best_height_cm||0)?t:b):null;
          const isOpen=openId===ath.id;
          return (
            <div key={ath.id} style={{background:C.bg2,border:`1px solid ${isOpen?C.gold+"60":C.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"border-color .2s"}}
              onClick={()=>setOpenId(isOpen?null:ath.id)}>
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#ff9100)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#07090f",flexShrink:0}}>
                  {initials(ath.full_name)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{ath.full_name}</div>
                  <div style={{fontSize:11,color:C.text3}}>{ath.position||"—"}{ath.jersey_number?" · #"+ath.jersey_number:""}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:C.mono,fontWeight:700,fontSize:16,color:tests.length?C.gold:C.text3}}>
                    {best>0?best.toFixed(1)+"cm":"—"}
                  </div>
                  <div style={{fontSize:10,color:C.text3}}>{tests.length} sess.</div>
                </div>
              </div>
              {isOpen && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px",background:C.bg}}>
                  {bestTest && (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                      {[
                        {v:best.toFixed(1)+"cm",l:"Miglior salto",c:C.gold},
                        {v:bestTest.flight_time_s?(bestTest.flight_time_s*1000).toFixed(0)+"ms":"—",l:"T.volo best",c:C.neon},
                        {v:bestTest.takeoff_speed?parseFloat(String(bestTest.takeoff_speed)).toFixed(2)+"m/s":"—",l:"Vel. decollo",c:C.purple},
                      ].map(({v,l,c})=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px",textAlign:"center"}}>
                          <div style={{fontFamily:C.mono,fontWeight:700,color:c,fontSize:13}}>{v}</div>
                          <div style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tests.length===0
                    ? <p style={{color:C.text3,textAlign:"center",padding:"12px 0",fontSize:12}}>Nessun test ancora.</p>
                    : tests.slice().reverse().map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                        <span style={{fontFamily:C.mono,fontSize:11,color:C.text3,minWidth:60}}>{fmt(t.date)}</span>
                        <span style={{padding:"2px 8px",borderRadius:12,fontSize:10,background:"rgba(0,229,255,.1)",color:C.neon,border:`1px solid rgba(0,229,255,.2)`,whiteSpace:"nowrap"}}>{t.test_type}</span>
                        <span style={{flex:1}}/>
                        {t.best_height_cm!=null&&<span style={{fontFamily:C.mono,fontWeight:700,color:C.gold,fontSize:13}}>{t.best_height_cm}cm</span>}
                        {t.flight_time_s!=null&&<span style={{fontFamily:C.mono,fontSize:11,color:C.text3}}>{(t.flight_time_s*1000).toFixed(0)}ms</span>}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Posture Tab ────────────────────────────────────────
function PostureTab({ postures, athletes }: { postures: PostureSession[]; athletes: Athlete[]; }) {
  const byAthlete: Record<string,PostureSession[]> = {};
  postures.forEach(p=>{ if(!byAthlete[p.athlete_id]) byAthlete[p.athlete_id]=[]; byAthlete[p.athlete_id].push(p); });

  return (
    <div style={{marginTop:16}}>
      {Object.keys(byAthlete).length===0 ? <p style={{color:C.text3,textAlign:"center",padding:30}}>Nessuna scheda posturale ancora.</p> :
        Object.entries(byAthlete).map(([aid,sessions])=>{
          const ath=athletes.find(a=>a.id===aid);
          const latest=sessions[0];
          const checks=latest?.checks||{};
          const vals=Object.values(checks) as number[];
          const crit=vals.filter(v=>v>6).length;
          const warn=vals.filter(v=>v>3&&v<=6).length;
          const ok=vals.filter(v=>v<=3).length;
          return (
            <div key={aid} style={{marginBottom:16,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},#ff9100)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#07090f"}}>
                  {ath?initials(ath.full_name):"?"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600}}>{ath?.full_name||aid}</div>
                  <div style={{fontSize:11,color:C.text3}}>{sessions.length} schede · ultima: {fmt(latest.date)}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {ok>0&&<span className="chk-pill" style={{background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}30`}}>{ok} OK</span>}
                  {warn>0&&<span className="chk-pill" style={{background:`${C.orange}18`,color:C.orange,border:`1px solid ${C.orange}30`}}>{warn} ATT</span>}
                  {crit>0&&<span className="chk-pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}30`}}>{crit} CRIT</span>}
                </div>
              </div>
              {latest && Object.keys(checks).length>0 && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
                  {POSTURE_CHECKS.filter(k=>checks[k]!==undefined).map(k=>{
                    const v=checks[k]as number;
                    const c=checkColor(v);
                    return (
                      <div key={k} style={{background:C.bg3,borderRadius:8,padding:"8px 10px",borderLeft:`3px solid ${c}`}}>
                        <div style={{fontSize:10,color:C.text3,marginBottom:3}}>{POSTURE_LABELS[k]||k}</div>
                        <div style={{fontFamily:C.mono,fontWeight:700,fontSize:14,color:c}}>{v}/10</div>
                        <div style={{fontSize:9,color:c,textTransform:"uppercase",letterSpacing:1}}>{checkLabel(v)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {latest?.notes&&<div style={{marginTop:10,fontSize:11,color:C.text3,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8}}>{latest.notes}</div>}
            </div>
          );
        })
      }
    </div>
  );
}
