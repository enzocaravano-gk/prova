import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import mockupDirector from "@/assets/mockup-director.jpg";
import mockupCoach from "@/assets/mockup-coach.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const features = [
  {
    icon: "🏢",
    title: "Il Direttore Comanda",
    desc: "Il direttore crea la società, aggiunge squadre e collega fino a 3 allenatori per squadra. Tutto sotto il suo controllo dalla dashboard dedicata.",
  },
  {
    icon: "⚽",
    title: "L'Allenatore Gestisce",
    desc: "Ogni allenatore accede alla propria squadra e inserisce fino a 28 atleti con profili, ruoli e statistiche individuali.",
  },
  {
    icon: "📊",
    title: "Dashboard Dedicate",
    desc: "Il direttore monitora tutte le squadre dall'alto. L'allenatore ha strumenti specifici per la gestione quotidiana del team.",
  },
  {
    icon: "🔒",
    title: "Dati Separati & Protetti",
    desc: "Ogni società vede solo i propri dati. Gli allenatori vedono solo la propria squadra. Isolamento totale garantito.",
  },
  {
    icon: "📱",
    title: "100% Responsivo",
    desc: "Funziona perfettamente su desktop, tablet e smartphone. Sempre accessibile, ovunque tu sia.",
  },
  {
    icon: "📈",
    title: "Analisi Performance",
    desc: "Strumenti di analisi per match, postura e performance atletica integrati nella piattaforma.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    desc: "Perfetto per iniziare",
    features: ["1 squadra", "1 allenatore", "Fino a 15 atleti", "Dashboard base", "Analisi match"],
    cta: "Inizia Gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/mese",
    desc: "Per società in crescita",
    features: ["Fino a 5 squadre", "3 allenatori per squadra", "28 atleti per squadra", "Dashboard avanzate", "Analisi completa", "Supporto prioritario"],
    cta: "Scegli Pro",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "€79",
    period: "/mese",
    desc: "Per società professionali",
    features: ["Squadre illimitate", "Allenatori illimitati", "28 atleti per squadra", "Tutte le dashboard", "Analisi avanzata", "Supporto dedicato", "API personalizzate"],
    cta: "Scegli Premium",
    highlighted: false,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50" style={{ background: "hsla(216, 28%, 5%, 0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold neon-glow" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
              S+
            </div>
            <span className="text-lg tracking-wider text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              SPORTHUB+
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Accedi
            </button>
            <button
              onClick={() => navigate("/login?signup=true")}
              className="text-sm px-4 py-2 rounded-lg font-medium neon-glow transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}
            >
              Registrati
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-15 blur-[120px] pointer-events-none" style={{ background: "hsl(var(--primary))" }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-block text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary mb-6" style={{ fontFamily: "var(--font-mono)", background: "hsla(187, 100%, 50%, 0.08)" }}>
              La piattaforma per società sportive
            </span>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-5xl sm:text-7xl lg:text-8xl tracking-tight text-foreground mb-6 neon-text"
            style={{ fontFamily: "var(--font-display)", lineHeight: "0.95" }}
          >
            IL DIRETTORE CREA,
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>L'ALLENATORE GESTISCE</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Il direttore sportivo crea la società, aggiunge squadre e collega gli allenatori. Ogni coach gestisce i propri atleti e analizza le performance — tutto in un'unica piattaforma sicura e intelligente.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/login?signup=true")}
              className="px-8 py-3.5 rounded-xl text-base font-semibold neon-glow transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}
            >
              Inizia Gratuitamente
            </button>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-xl text-base font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              Scopri di più
            </a>
          </motion.div>
        </div>
      </section>

      {/* Mockups */}
      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl" style={{ boxShadow: "0 40px 80px -20px hsla(187, 100%, 50%, 0.15), 0 0 60px -30px hsla(187, 100%, 50%, 0.2)" }}>
              <div className="h-8 flex items-center gap-1.5 px-4 border-b border-border/50" style={{ background: "hsl(215 25% 10%)" }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--orange))" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--green))" }} />
              </div>
              <img src={mockupDirector} alt="Dashboard Direttore — panoramica squadre della società con statistiche" width={1280} height={800} className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              COME FUNZIONA
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Il direttore crea e controlla tutto dalla sua dashboard. Gli allenatori gestiscono squadra e atleti dalla propria.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="rounded-2xl border border-border p-6 transition-all hover:border-primary/30 group"
                style={{ background: "hsl(var(--card))" }}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-foreground font-semibold text-lg mb-2" style={{ fontFamily: "var(--font-body)" }}>{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coach Mockup */}
      <section className="py-20 px-4 sm:px-6" style={{ background: "hsl(215 25% 6%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
            >
              <span className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary" style={{ fontFamily: "var(--font-mono)", background: "hsla(187, 100%, 50%, 0.08)" }}>
                Per gli allenatori
              </span>
               <h2 className="text-4xl sm:text-5xl text-foreground mt-4 mb-6" style={{ fontFamily: "var(--font-display)" }}>
                LA DASHBOARD
                <br />
                <span style={{ color: "hsl(var(--primary))" }}>DELL'ALLENATORE</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Ogni allenatore accede solo alla propria squadra. Inserisce gli atleti, analizza i match e monitora le performance — il tutto in un ambiente protetto e dedicato.
              </p>
              <ul className="space-y-3">
                {["Inserimento e gestione roster (max 28 atleti)", "Analisi match & postura", "Performance tracking individuale", "Accesso solo ai dati della propria squadra"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "hsla(187, 100%, 50%, 0.15)", color: "hsl(var(--primary))" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl" style={{ boxShadow: "0 40px 80px -20px hsla(187, 100%, 50%, 0.1)" }}>
                <div className="h-8 flex items-center gap-1.5 px-4 border-b border-border/50" style={{ background: "hsl(215 25% 10%)" }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--orange))" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--green))" }} />
                </div>
                <img src={mockupCoach} alt="Dashboard Allenatore SportHub+" width={1280} height={800} loading="lazy" className="w-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              PIANI & PREZZI
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Scegli il piano più adatto alla tua società. Inizia gratis, scala quando vuoi.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className={`rounded-2xl border p-6 sm:p-8 relative transition-all ${
                  plan.highlighted
                    ? "border-primary/50 scale-[1.02]"
                    : "border-border hover:border-primary/25"
                }`}
                style={{
                  background: plan.highlighted
                    ? "linear-gradient(180deg, hsla(187, 100%, 50%, 0.06), hsl(var(--card)))"
                    : "hsl(var(--card))",
                  boxShadow: plan.highlighted ? "0 0 40px -10px hsla(187, 100%, 50%, 0.2)" : undefined,
                }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-medium" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
                    Più popolare
                  </div>
                )}

                <h3 className="text-foreground text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <span style={{ color: "hsl(var(--primary))" }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate("/login?signup=true")}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "neon-glow hover:opacity-90"
                      : "border border-border hover:border-primary/50 text-foreground"
                  }`}
                  style={
                    plan.highlighted
                      ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }
                      : { background: "hsl(var(--secondary))" }
                  }
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 relative overflow-hidden" style={{ background: "hsl(215 25% 6%)" }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)), transparent 60%)" }} />
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={0}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <h2 className="text-4xl sm:text-5xl text-foreground mb-6" style={{ fontFamily: "var(--font-display)" }}>
            PRONTO A PARTIRE?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Unisciti alle società sportive che già usano SportHub+ per gestire squadre, atleti e performance.
          </p>
          <button
            onClick={() => navigate("/login?signup=true")}
            className="px-10 py-4 rounded-xl text-base font-semibold neon-glow transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}
          >
            Crea il tuo Account
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(187 100% 40%))", color: "hsl(var(--primary-foreground))" }}>
              S+
            </div>
            <span className="text-sm text-muted-foreground">© 2026 SportHub+. Tutti i diritti riservati.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Funzionalità</a>
            <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Prezzi</a>
            <button onClick={() => navigate("/login")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Accedi</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
