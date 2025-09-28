import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ChevronDown, X, Check, Flag, ExternalLink, Flame, Sparkles, Sun, Moon } from "lucide-react";

/**
 * Clinical Trial Intuition — Retro Terminal (Card-first onboarding)
 *
 * This file restores the full working mock with:
 * - Retro dark/light themes
 * - In-memory 3-card deck with working Next/Skip
 * - Dopamine effects
 * - Background-highlighted question parts (verb in emerald to pop)
 * - Details/Share/Report sheets
 * - Soft-gate auth modal (Apple/Google/magic link; mock)
 */

// -------- THEME (Retro Terminal) with light/dark variants -------- //
function getTheme(mode = "dark") {
  if (mode === "light") {
    return {
      key: "retroLight",
      root: "bg-amber-50 text-black",
      card: "bg-white border-amber-300",
      primaryBtn: "bg-amber-500 text-black hover:bg-amber-400",
      secondaryBtn: "bg-white border border-amber-300 text-black hover:bg-amber-50",
      accent: "text-amber-600",
      glow: "ring-amber-300/40",
      font: "font-mono",
      question: "uppercase tracking-wide",
      radius: "rounded-none",
      btnRadius: "rounded-none",
      scanlines: "[background:repeating-linear-gradient(0deg,rgba(0,0,0,0.05)_0px,rgba(0,0,0,0.05)_1px,transparent_1px,transparent_3px)]",
      phosphor: "bg-[radial-gradient(ellipse_at_center,rgba(255,200,0,0.08),transparent_60%)]",
      toast: "bg-amber-500 text-black",
    };
  }
  return {
    key: "retroDark",
    root: "bg-black text-amber-400",
    card: "bg-black border-amber-700/40",
    primaryBtn: "bg-amber-400 text-black hover:bg-amber-300",
    secondaryBtn: "bg-black border border-amber-700/40 text-amber-400 hover:bg-black/50",
    accent: "text-amber-300",
    glow: "ring-amber-400/30",
    font: "font-mono",
    question: "uppercase tracking-wide",
    radius: "rounded-none",
    btnRadius: "rounded-none",
    scanlines: "[background:repeating-linear-gradient(0deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_3px)]",
    phosphor: "bg-[radial-gradient(ellipse_at_center,rgba(255,200,0,0.06),transparent_60%)]",
    toast: "bg-amber-400 text-black",
  };
}

// Utility button (springy) respecting theme radii
const Btn = ({ className = "", variant = "primary", size = "md", theme, ...props }) => {
  const sizeCls = { sm: "h-9 px-3 text-sm", md: "h-12 px-5", lg: "h-16 px-7 text-lg" }[size];
  const base = `inline-flex items-center justify-center ${theme.btnRadius} font-semibold transition disabled:opacity-50 disabled:pointer-events-none select-none`;
  const variantCls = variant === "primary" ? theme.primaryBtn : theme.secondaryBtn;
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={`${base} ${sizeCls} ${variantCls} ${className}`}
      {...props}
    />
  );
};

// Sheets & Toast
const Sheet = ({ open, onClose, title, children, theme }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className={`relative z-10 w-full sm:w-[560px] max-w-[95vw] ${theme.radius} p-5 ${theme.card}`}>
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5"><X className="h-5 w-5" /></button>
          </div>
          <div className="text-sm opacity-90 space-y-3">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Toast = ({ show, message, theme }) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${theme.toast} px-4 py-2 rounded shadow-lg font-mono`}>
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

// Effects
const useHaptics = () => React.useCallback((pattern) => { try { if (navigator && 'vibrate' in navigator) navigator.vibrate(pattern); } catch {} }, []);
const GradientFlash = ({ colorA, colorB }) => (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.18 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }} />);
const ScorePop = ({ show, text = "+1", theme }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ y: 6, opacity: 0, scale: 0.8 }}
        animate={{ y: -24, opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className={`absolute left-1/2 top-4 -translate-x-1/2 ${theme.font} text-amber-500 font-bold`}
      >
        {text}
      </motion.div>
    )}
  </AnimatePresence>
);
const EmojiBurst = ({ trigger }) => { const emojis = ["🎉", "🧠", "👍", "⭐", "🧪"]; return (<AnimatePresence>{trigger && (<div className="pointer-events-none absolute inset-0 overflow-hidden">{Array.from({ length: 16 }).map((_, i) => (<motion.span key={i} className="absolute text-2xl" initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }} animate={{ opacity: [0,1,0], x: (Math.random()*2-1)*160, y: -80 - Math.random()*160, rotate: Math.random()*180 }} transition={{ duration: 0.9 + Math.random()*0.3, ease: "easeOut" }} style={{ left: "50%", top: "50%" }}>{emojis[i % emojis.length]}</motion.span>))}</div>)}</AnimatePresence>); };
const ParticleTrail = ({ points }) => (<>{points.map((p) => (<motion.span key={p.id} className="pointer-events-none absolute" style={{ left: p.x, top: p.y, width: 6, height: 6, background: "currentColor" }} initial={{ opacity: 0.6, scale: 1 }} animate={{ opacity: 0, scale: 0 }} transition={{ duration: 0.5 }} />))}</>);

// ---- Tiny in-memory deck for demo ---- //
const DEMO_DECK = [
  { id: "CARD-1234", question: "At 6 months, did treadmill training increase daily energy expenditure vs stretching in stroke survivors?", context: "stroke survivors • 6 months • vs stretching", why: "At 6 months, treadmill training increased daily energy expenditure vs stretching (p=0.02; n=142).", others: 62, n: 1204, nct: "NCT02043574", correct: "Yes",
    parts: { intervention: "treadmill training", verb: "increase", outcome: "daily energy expenditure", timeframe: "6 months", population: "stroke survivors", comparator: "stretching" }
  },
  { id: "CARD-5678", question: "Did exposure therapy reduce CAPS-IV scores at 3-month follow-up in combat-related PTSD?", context: "combat PTSD • 3 months • exposure vs control", why: "Exposure therapy reduced CAPS-IV vs control (Δ=-9.4; p=0.01; n=88).", others: 54, n: 862, nct: "NCT00371176", correct: "Yes",
    parts: { intervention: "exposure therapy", verb: "reduce", outcome: "CAPS-IV score", timeframe: "3 months", population: "combat-related PTSD", comparator: "control" }
  },
  { id: "CARD-9012", question: "Did CBT improve Roland-Morris disability score at 9 months in chronic low back pain?", context: "low back pain • 9 months • CBT vs usual care", why: "CBT improved RMDQ at 9 months (p=0.03; n=240).", others: 49, n: 1011, nct: "NCT00386243", correct: "Yes",
    parts: { intervention: "CBT", verb: "improve", outcome: "Roland–Morris disability score", timeframe: "9 months", population: "chronic low back pain", comparator: "usual care" }
  },
];

// Demo state
function useCardDemo() {
  const [state, setState] = React.useState({
    idx: 0,
    phase: "question",
    guess: null,
    correct: null,
    openDetails: false,
    openShare: false,
    openReport: false,
    toast: "",
    flash: null,
    streak: 0,
    pop: false,
    celebrate: false,
    trail: [],
  });

  const sample = DEMO_DECK[state.idx];
  const haptics = useHaptics();

  const answer = (choice) => {
    const isCorrect = choice === sample.correct; // demo logic from deck
    setState((s) => ({
      ...s,
      phase: "reveal",
      guess: choice,
      correct: isCorrect,
      flash: isCorrect ? { a: "#FBBF24", b: "#F59E0B" } : { a: "#FB7185", b: "#E11D48" },
      streak: isCorrect ? s.streak + 1 : 0,
      pop: isCorrect,
      celebrate: isCorrect,
    }));
    haptics(isCorrect ? 30 : [40, 60, 40]);
    setTimeout(() => setState((s) => ({ ...s, pop: false })), 600);
    setTimeout(() => setState((s) => ({ ...s, celebrate: false })), 1100);
  };

  const next = () =>
    setState((s) => ({
      ...s,
      idx: (s.idx + 1) % DEMO_DECK.length,
      phase: "question",
      guess: null,
      correct: null,
      flash: null,
      pop: false,
      celebrate: false,
      trail: [],
    }));

  const share = (mode) => {
    setState((s) => ({ ...s, openShare: false, toast: mode === "image" ? "Image saved" : "Link copied" }));
    setTimeout(() => setState((s) => ({ ...s, toast: "" })), 1400);
  };

  const addTrail = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const id = Math.random();
    setState((s) => ({ ...s, trail: [...s.trail, { id, x, y }] }));
    setTimeout(() => setState((s) => ({ ...s, trail: s.trail.filter((t) => t.id !== id) })), 500);
  };

  return { state, setState, sample, answer, next, share, addTrail };
}

// Helper: render question with structured parts (Background highlights only)
function QuestionStyles({ theme, parts }) {
  const { intervention, verb, outcome, timeframe, population, comparator } = parts;

  return (
    <div className="mt-4">
      <div className="text-base leading-relaxed">
        Did <span className="px-1 bg-amber-500/15 ring-1 ring-amber-500/20">{intervention}</span>{" "}
        <span className="px-1 bg-emerald-500/15 ring-1 ring-emerald-500/20 text-emerald-300 font-semibold">{verb}</span>{" "}
        <span className="px-1 bg-teal-500/15 ring-1 ring-teal-500/20">{outcome}</span>{" "}
        at <span className="px-1 bg-sky-500/15 ring-1 ring-sky-500/20">{timeframe}</span>{" "}
        in <span className="px-1 bg-violet-500/15 ring-1 ring-violet-500/20">{population}</span>{" "}
        vs <span className="px-1 bg-zinc-500/15 ring-1 ring-zinc-500/20">{comparator}</span>?
      </div>
    </div>
  );
}

// Mobile Card — Retro Terminal
function MobileCard({ theme, onAnswered, onNext }) {
  const { state, setState, sample, answer, next, share, addTrail } = useCardDemo();
  const onYes = (e) => { addTrail(e); answer("Yes"); onAnswered && onAnswered(); };
  const onNo = (e) => { addTrail(e); answer("No"); onAnswered && onAnswered(); };
  const handleNext = () => { next(); onNext && onNext(); };
  const streakHot = state.streak >= 3;

  return (
    <div className={`w-[390px] max-w-full mx-auto ${theme.font}`}>
      <div className={`relative ${theme.radius} border ${theme.card} ${streakHot ? theme.glow + ' ring-4' : ''} shadow-lg p-5 overflow-hidden`}>
        {/* Retro CRT scanlines + soft phosphor glow */}
        <div className={`pointer-events-none absolute inset-0 ${theme.scanlines}`} />
        <div className={`pointer-events-none absolute inset-0 ${theme.phosphor}`} />

        {/* Gradient flash / emoji burst / score pop */}
        <AnimatePresence>{state.flash && <GradientFlash colorA={state.flash.a} colorB={state.flash.b} />}</AnimatePresence>
        <EmojiBurst trigger={state.celebrate} />
        <ScorePop show={state.pop} text={state.streak > 1 ? `+1  x${state.streak}` : "+1"} theme={theme} />

        {/* Streak bar */}
        <div className="absolute left-0 top-0 h-1 w-full overflow-hidden">
          <motion.div className={`h-full ${theme.key==='retroDark' ? 'bg-amber-400' : 'bg-amber-500'}`} initial={false} animate={{ width: `${Math.min(state.streak, 10) * 10}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between text-xs opacity-70">
          <div className="inline-flex items-center gap-1">PLAY {streakHot && <Flame className={`h-4 w-4 ${theme.accent}`} />}</div>
          <div>{state.idx + 1}/{DEMO_DECK.length}</div>
        </div>

        {/* Question */}
        <div className="mt-3">
          <h1 className={`text-xl font-semibold leading-snug ${theme.question}`}>{sample.question}</h1>
          <div className="mt-1 text-sm opacity-70">{sample.context}</div>
          {sample.parts && <QuestionStyles theme={theme} parts={sample.parts} />}
        </div>

        {/* Particle trail container */}
        <div className="relative">
          <ParticleTrail points={state.trail} />
        </div>

        {/* Answer buttons */}
        {state.phase === "question" && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn size="lg" theme={theme} onClick={onYes}>Yes</Btn>
            <Btn size="lg" variant="secondary" theme={theme} onClick={onNo}>No</Btn>
          </div>
        )}

        {/* Reveal */}
        {state.phase === "reveal" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-5 space-y-3">
            <motion.div initial={state.correct ? { scale: 0.9, opacity: 0 } : { x: 0 }} animate={state.correct ? { scale: 1, opacity: 1 } : { x: [0, -6, 6, -3, 3, 0] }} transition={{ type: "spring", stiffness: 260, damping: 18, duration: 0.4 }} className={`flex items-center gap-2 text-base font-semibold ${state.correct ? (theme.key==='retroDark' ? 'text-amber-300' : 'text-amber-600') : 'text-rose-500'}`}>
              {state.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />} {state.correct ? "Correct" : "Incorrect"}
            </motion.div>
            {state.correct && (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`inline-flex items-center gap-1 ${theme.key==='retroDark' ? 'text-amber-300' : 'text-amber-600'} font-medium`}><Sparkles className="h-4 w-4" /> Sharp call!</motion.div>)}
            <div className="text-[15px] opacity-90">{sample.why} <button className="inline-flex items-center gap-1 opacity-70 hover:opacity-90 underline underline-offset-2" onClick={() => setState((s)=>({ ...s, openDetails: true }))}>NCT link <ExternalLink className="h-3 w-3"/></button></div>
            <div className="text-sm opacity-70">You beat {sample.others}% (n={sample.n}).</div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ delay: 0.05, duration: 0.2 }}>
                <Btn variant="secondary" theme={theme} onClick={() => setState((s)=>({ ...s, openShare: true }))} className="animate-[pulse_1.2s_ease-in-out_1]">
                  <Share2 className="mr-2 h-5 w-5"/> Share
                </Btn>
              </motion.div>
              <Btn theme={theme} onClick={handleNext}>Next</Btn>
            </div>
            <div className="text-xs opacity-60 pt-1">
              <button className="inline-flex items-center gap-1 hover:opacity-90" onClick={() => setState((s)=>({ ...s, openReport: true }))}><Flag className="h-3.5 w-3.5"/> Report an issue</button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs opacity-70">
          <button onClick={() => setState((s)=>({ ...s, openDetails: true }))} className="hover:opacity-100 inline-flex items-center gap-1">Details <ChevronDown className="h-3.5 w-3.5"/></button>
          <button className="hover:opacity-100" onClick={handleNext}>Skip</button>
        </div>
      </div>

      {/* ---- Sheets mounted so their toggles work ---- */}
      <Sheet open={state.openDetails} onClose={() => setState((s)=>({ ...s, openDetails: false }))} title="Study details" theme={theme}>
        <div>
          <div className="font-medium">Participants</div>
          <div className="opacity-80">Adults with post-stroke limitations (n=142).</div>
        </div>
        <div>
          <div className="font-medium">Intervention & Comparator</div>
          <div className="opacity-80">Treadmill training vs stretching (control).</div>
        </div>
        <div>
          <div className="font-medium">Statistical measure</div>
          <div className="opacity-80">Between-group difference at 6 months (p-value/effect size reported).</div>
        </div>
        <div className="pt-2 text-xs opacity-70">Source: <a className="underline" href="#" onClick={(e)=>e.preventDefault()}>NCT02043574</a></div>
      </Sheet>

      <Sheet open={state.openShare} onClose={() => setState((s)=>({ ...s, openShare: false }))} title="Challenge a friend" theme={theme}>
        <div className="grid gap-3">
          <Btn onClick={() => share("card")} theme={theme} className="w-full justify-start">Share **this card**</Btn>
          <Btn onClick={() => share("stack")} variant="secondary" theme={theme} className="w-full justify-start">Share a **3-card stack**</Btn>
          <Btn onClick={() => share("image")} variant="secondary" theme={theme} className="w-full justify-start">Share as **image**</Btn>
        </div>
      </Sheet>

      <Sheet open={state.openReport} onClose={() => setState((s)=>({ ...s, openReport: false }))} title="Report an issue" theme={theme}>
        <form onSubmit={(e)=>{e.preventDefault(); setState((s)=>({ ...s, openReport:false, toast: "Thanks — we’ll review." })); setTimeout(()=> setState((s)=>({ ...s, toast: "" })), 1400);}} className="grid gap-3">
          <fieldset className="grid gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" name="reason" defaultChecked/> Answer seems wrong</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="reason"/> Unclear question</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="reason"/> Formatting issue</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="reason"/> Sensitive topic</label>
          </fieldset>
          <textarea placeholder="What looks off? (e.g., wrong timepoint)" className={`w-full min-h-[96px] ${theme.btnRadius} border border-amber-300 p-3`} />
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">Auto-attaches card ID {sample.id}</div>
            <Btn type="submit" theme={theme}>Submit</Btn>
          </div>
        </form>
      </Sheet>

      <Toast show={!!state.toast} message={state.toast} theme={theme} />
    </div>
  );
}

function WebCard({ theme, onAnswered, onNext }) { return (<div className="w-full"><MobileCard theme={theme} onAnswered={onAnswered} onNext={onNext} /></div>); }

// -------- Auth modal (for soft gate) -------- //
function AuthModal({ open, onClose, theme }) {
  const [email, setEmail] = React.useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Save your streak & compare with friends" theme={theme}>
      <div className="grid gap-3">
        <Btn theme={theme} className="w-full justify-center">Continue with Apple</Btn>
        <Btn theme={theme} variant="secondary" className="w-full justify-center">Continue with Google</Btn>
        <div className="text-center text-xs opacity-60">or</div>
        <form onSubmit={(e)=>{ e.preventDefault(); onClose(); }} className="grid gap-2">
          <input value={email} onChange={(e)=> setEmail(e.target.value)} type="email" required placeholder="your@email.com" className={`h-12 px-3 ${theme.btnRadius} border border-amber-300 ${theme.key==='retroDark' ? 'bg-black text-amber-400' : 'bg-white text-black'}`} />
          <Btn theme={theme} type="submit" className="w-full justify-center">Send magic link</Btn>
        </form>
        <div className="text-xs opacity-60 text-center">No passwords. One-tap login.</div>
      </div>
    </Sheet>
  );
}

// -------- Landing / First Page (Card as CTA) -------- //
function Landing({ theme }) {
  const playsRef = React.useRef(0);
  const [authOpen, setAuthOpen] = React.useState(false);

  const onPlayed = () => {
    playsRef.current += 1;
    if (playsRef.current === 3) {
      setAuthOpen(true);
    }
  };

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl md:text-3xl font-semibold ${theme.font}`}>How sharp is your science intuition?</h1>
          <p className={`opacity-70 mt-1 ${theme.font}`}>Real results. Real trials. Guess yes/no — build intuition fast.</p>
        </div>
        <ModeToggle />
      </header>

      {/* Card area */}
      <div className="max-w-[420px]">
        <PlayableCard theme={theme} onPlayed={onPlayed} />
      </div>

      <AuthModal open={authOpen} onClose={()=> setAuthOpen(false)} theme={theme} />
    </div>
  );
}

// Wrapper to notify plays back to Landing
function PlayableCard({ theme, onPlayed }) {
  return (
    <div className={`w-[390px] max-w-full`}>
      <MobileCard theme={theme} onAnswered={onPlayed} onNext={() => { /* could track skips if desired */ }} />
    </div>
  );
}

// -------- Icon Mode Toggle (Sun/Moon) -------- //
function ModeToggle() {
  const [mode, setMode] = React.useState(() => (typeof window !== 'undefined' && window.__retroMode) || 'dark');
  React.useEffect(()=>{ window.__retroMode = mode; }, [mode]);
  const theme = getTheme(mode);
  return (
    <button onClick={()=> setMode(mode === 'dark' ? 'light' : 'dark')} className="p-2 border border-amber-300/50 hover:bg-white/5">
      {mode === 'dark' ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
    </button>
  );
}

function WebShell({ children }) {
  const [mode, setMode] = React.useState('dark');
  const theme = React.useMemo(()=> getTheme(mode), [mode]);
  return (
    <div className={`${theme.root} min-h-screen w-full p-4 sm:p-8`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-xl font-semibold ${theme.font}`}>Clinical Trial Intuition — Retro Terminal</h1>
            <p className={`opacity-70 ${theme.font}`}>Card-first onboarding mock. Dark/Light icon toggle. Apple/Google buttons (mock).</p>
          </div>
          <button onClick={()=> setMode(mode === 'dark' ? 'light' : 'dark')} className="p-2 border border-amber-300/50 hover:bg-white/5">
            {mode === 'dark' ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
          </button>
        </div>
        {children(theme)}
      </div>
    </div>
  );
}

export default function TrialIntuitionMock() {
  return (
    <WebShell>
      {(theme)=> (
        <Landing theme={theme} />
      )}
    </WebShell>
  );
}
