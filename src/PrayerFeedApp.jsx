import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  BarChart2,
  Moon,
  Sun,
  Heart,
  Home,
  Briefcase,
  Users,
  Book,
  Wind,
  ChevronDown,
  Sparkles,
  ArrowRight
} from "lucide-react";

/**
 * One Another by Koinonia
 * v6.2 - Stability Fix & Interaction Model Refinement
 */

// --- UTILITY FUNCTIONS ---

const dayKey = (t) => {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const secondsToMinutes = (s) => Math.max(0, Math.round(s / 60));

const fmtMin = (m) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

// --- CONSTANTS ---
const CAT = {
  Health: "#e06060",
  Family: "#5b8db8",
  Work: "#c9a227",
  Gratitude: "#2ea97a",
  Spiritual: "#8b6caf",
  Struggles: "#7a8a9a",
  Other: "#a0a0a0",
};

const SEED_PRAYERS = [
  { id: 1, author: "Sarah M.", category: "Health", text: "Please pray for my mom's surgery tomorrow morning. She's having a double bypass and she's scared. We trust God's plan, but we'd love prayer for the surgeons and a smooth recovery.", time: "2h ago", day: 1, isMine: false, anon: false, answered: false, answerNote: "" },
  { id: 2, author: "A Church Member", category: "Family", text: "Going through a difficult season in my marriage. We're both believers but struggling to communicate well. Please pray for humility, wisdom, and restoration.", time: "5h ago", day: 2, isMine: false, anon: true, answered: false, answerNote: "" },
  { id: 3, author: "You", category: "Spiritual", text: "Praying for our church leadership as they transition into this new season. For wisdom, protection, and a deep unity in the Spirit.", time: "1h ago", day: 1, isMine: true, anon: false, answered: false, answerNote: "" },
];

const SEED_JOURNAL = [
  { id: 101, category: "Family", created: "Today", text: "Give me patience with the kids this week. Help me be the parent they need when I'm tired after work." },
];

const PROMPTS = [
  { icon: <Home size={22} />, q: "Family", desc: "Home life", bullets: ["What's been weighing on your family lately?", "Any specific needs for your spouse or children?", "Is there a conflict needing peace?"] },
  { icon: <Briefcase size={22} />, q: "Work", desc: "Career", bullets: ["Any work struggles you need to bring before God?", "Pray for wisdom in upcoming decisions.", "Are there colleagues who need encouragement?"] },
  { icon: <Wind size={22} />, q: "Spiritual", desc: "Trusting", bullets: ["How has your personal time in God's word been?", "Where are you struggling to trust Him?", "What is He teaching you right now?"] },
  { icon: <Heart size={22} />, q: "Gratitude", desc: "Blessings", bullets: ["What do you have to be thankful for right now?", "Name three small blessings from today.", "How has His provision been evident?"] },
  { icon: <Users size={22} />, q: "Other", desc: "Community", bullets: ["Any friends or neighbors on your heart?", "Pray for an opportunity to serve someone.", "Ask for a heart of compassion for those around you."] },
  { icon: <Book size={22} />, q: "Struggles", desc: "Strength", bullets: ["What personal struggle needs God's strength today?", "Ask for endurance in a difficult season.", "Pray for a breakthrough in a specific area?"] },
];

// --- HOOKS ---

function useLS(key, fallback) {
  const isBrowser = typeof window !== "undefined";
  const [v, setV] = useState(() => {
    if (!isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v, isBrowser]);
  return [v, setV];
}

// --- SUB-COMPONENTS ---

function Sparkline({ points }) {
  const w = 240;
  const h = 52;
  const max = Math.max(1, ...points);
  const d =
    points.length < 2
      ? ""
      : points
          .map((v, i) => {
            const x = 6 + (i * (w - 12)) / (points.length - 1);
            const y = h - 8 - (v / max) * (h - 18);
            return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(" ");
  if (!d) return <div className="faint" style={{ fontSize: 10 }}>Insufficient data</div>;
  return (
    <svg width={w} height={h} className="spark">
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`${d} L ${w - 6} ${h - 6} L 6 ${h - 6} Z`} fill="var(--goldSoft)" opacity="0.6" />
    </svg>
  );
}

function Modal({ children, onClose, center }) {
  return (
    <div className={`modal ${center ? "center" : ""}`} onClick={onClose}>
      <div className={`sheet ${center ? "sheetCenter" : ""}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function HoldButton({ onComplete }) {
  const [isPraying, setIsPraying] = useState(false);
  const [localDur, setLocalDur] = useState(0);
  const btnRef = useRef(null);
  const timerRef = useRef({ start: 0, raf: null });

  const handleStart = (e) => {
    e.preventDefault();
    if (btnRef.current && e.pointerId) btnRef.current.setPointerCapture(e.pointerId);

    setIsPraying(true);
    setLocalDur(0);
    timerRef.current.start = performance.now();

    const tick = () => {
      const s = Math.floor((performance.now() - timerRef.current.start) / 1000);
      setLocalDur((prev) => (prev === s ? prev : s));
      timerRef.current.raf = requestAnimationFrame(tick);
    };
    timerRef.current.raf = requestAnimationFrame(tick);
  };

  const handleEnd = () => {
    if (!isPraying) return;
    if (timerRef.current.raf) cancelAnimationFrame(timerRef.current.raf);

    const finalElapsed = Math.floor((performance.now() - timerRef.current.start) / 1000);
    if (finalElapsed >= 2) {
      onComplete(finalElapsed);
    }

    setIsPraying(false);
    setLocalDur(0);
  };

  return (
    <div className="holdWrap">
      <div className={`localRadiance ${isPraying ? "active" : ""}`} />
      <button
        ref={btnRef}
        className={`holdBtn ${isPraying ? "active" : ""}`}
        onPointerDown={handleStart}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        onPointerOut={() => isPraying && handleEnd()}
      >
        {isPraying ? <span className="holdTime">{localDur}</span> : <span className="holdLabel">Pray</span>}
      </button>
      {isPraying && <div className="prayingText">Praying...</div>}
    </div>
  );
}

function CategoryPill({ category }) {
  const c = CAT[category] || CAT.Other;
  return (
    <div className="pill" style={{ borderColor: `${c}44`, background: `${c}10` }}>
      <span className="dot" style={{ background: c }} />
      <span className="pillText" style={{ color: c }}>{category}</span>
    </div>
  );
}

function Screen({ children }) {
  return <section className="screen">{children}</section>;
}

// --- MAIN APP ---

export default function App() {
  const [theme, setTheme] = useLS("pf_theme", "dark");
  const [tab, setTab] = useState("feed");
  const [prayers, setPrayers] = useLS("pf_prayers", SEED_PRAYERS);
  const [journal, setJournal] = useLS("pf_journal", SEED_JOURNAL);
  const [prayerLogs, setPrayerLogs] = useLS("pf_prayer_logs", []);

  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);

  const [compose, setCompose] = useState(null);
  const [composeText, setComposeText] = useState("");
  const [composeCat, setComposeCat] = useState("Other");
  const [composeAnon, setComposeAnon] = useState(false);
  const [isFork, setIsFork] = useState(false);

  const [dash, setDash] = useState(false);

  const triggerNotif = useCallback((msg) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif(msg);
    notifTimer.current = setTimeout(() => setNotif(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
    };
  }, []);

  const handlePrayerComplete = (id, elapsed) => {
    const type = tab === "journal" ? "personal" : "church";
    setPrayerLogs((prev) => [{ t: Date.now(), s: elapsed, id, type }, ...prev].slice(0, 2000));
    triggerNotif(`Recorded - ${elapsed}s`);
  };

  const feed = useMemo(() => prayers.filter((p) => !p.answered), [prayers]);

  const aggregates = useMemo(() => {
    const t0 = startOfDay();
    let churchTodayMin = 0;
    let personalTodayMin = 0;
    let churchAllMin = 0;
    let personalAllMin = 0;
    let churchTodayCount = 0;
    let personalTodayCount = 0;

    for (const log of prayerLogs) {
      const t = log.t;
      const s = log.s || 0;
      const type = log.type || "church";
      if (type === "personal") {
        personalAllMin += s;
        if (t >= t0) {
          personalTodayMin += s;
          personalTodayCount += 1;
        }
      } else {
        churchAllMin += s;
        if (t >= t0) {
          churchTodayMin += s;
          churchTodayCount += 1;
        }
      }
    }
    return {
      church: { todayMin: secondsToMinutes(churchTodayMin), allMin: secondsToMinutes(churchAllMin), todayCount: churchTodayCount },
      personal: { todayMin: secondsToMinutes(personalTodayMin), allMin: secondsToMinutes(personalAllMin), todayCount: personalTodayCount },
    };
  }, [prayerLogs]);

  const trendData = useMemo(() => {
    const days = 14;
    const start = startOfDay(Date.now() - (days - 1) * 864e5);
    const buckets = new Map();
    for (let i = 0; i < days; i++) buckets.set(dayKey(start + i * 864e5), 0);

    for (const log of prayerLogs) {
      const k = dayKey(log.t);
      if (buckets.has(k)) buckets.set(k, buckets.get(k) + (log.s || 0));
    }
    return Array.from(buckets.values()).map((sec) => Math.round(sec / 60));
  }, [prayerLogs]);

  const getPrivateStats = (id) => {
    const related = prayerLogs.filter((log) => log.id === id);
    const totalSec = related.reduce((acc, curr) => acc + curr.s, 0);
    return {
      time: fmtMin(secondsToMinutes(totalSec)),
    };
  };

  const submitCompose = () => {
    if (!composeText.trim()) return;
    if (compose === "journal") {
      setJournal([{ id: Date.now(), category: composeCat, created: "Just now", text: composeText.trim() }, ...journal]);
      triggerNotif("Saved");
    } else {
      setPrayers([{ id: Date.now(), author: composeAnon ? "A Church Member" : "You", category: composeCat, text: composeText.trim(), time: "Just now", day: 1, isMine: true, anon: composeAnon, answered: false, answerNote: "" }, ...prayers]);
      triggerNotif("Shared");
    }
    setCompose(null);
    setComposeText("");
    setIsFork(false);
  };

  const openCompose = (mode, category, prefill = "", fork = false) => {
    setCompose(mode);
    setComposeText(prefill);
    setComposeCat(category || "Other");
    setComposeAnon(false);
    setIsFork(fork);
  };

  const currentPrompt = useMemo(() => {
    if (compose !== "journal") return null;
    return PROMPTS.find((p) => p.q === composeCat);
  }, [compose, composeCat]);

  return (
    <div className="app" data-theme={theme}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet" />
      <style>{`
        :root{
          --serif: 'Cormorant Garamond', serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .app{ height:100svh; max-width:520px; margin:0 auto; position:relative; overflow:hidden; font-family:var(--sans); background: var(--bg); transition: background 1.5s ease; }
        .app[data-theme="dark"]{
          --bg: linear-gradient(160deg, #0d1117 0%, #131a24 40%, #0d1117 100%);
          --card: rgba(255,255,255,0.06);
          --mutedCard: rgba(255,255,255,0.10);
          --border: rgba(255,255,255,0.10);
          --text: rgba(255,255,255,0.92);
          --dim: rgba(255,255,255,0.60);
          --faint: rgba(255,255,255,0.30);
          --gold: #c8b48c;
          --goldSoft: rgba(200,180,140,0.15);
          --shadow: rgba(0,0,0,0.55);
          --overlay: rgba(0,0,0,0.85);
          --headerFade: linear-gradient(180deg, rgba(13,17,23,1) 0%, rgba(13,17,23,0.85) 60%, rgba(13,17,23,0) 100%);
        }
        .app[data-theme="light"]{
          --bg: linear-gradient(180deg, #f7fbff 0%, #eef7ff 40%, #f8fffd 100%);
          --card: rgba(255,255,255,0.92);
          --mutedCard: rgba(10,30,45,0.08);
          --border: rgba(20,40,60,0.08);
          --text: rgba(10,30,45,0.92);
          --dim: rgba(10,30,45,0.65);
          --faint: rgba(10,30,45,0.35);
          --gold: #2f7bbd;
          --goldSoft: rgba(47,123,189,0.12);
          --shadow: rgba(10,30,45,0.18);
          --overlay: rgba(10,30,45,0.22);
          --headerFade: linear-gradient(180deg, rgba(248,252,255,1) 0%, rgba(248,252,255,0.85) 60%, rgba(248,252,255,0) 100%);
        }
        *{ box-sizing:border-box; }
        ::-webkit-scrollbar{ display:none; }

        .header{ position:absolute; top:0; left:0; right:0; z-index:100; padding:20px 20px 10px; background:var(--headerFade); }
        .titleRow{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .brandWrap{ flex: 1; min-width: 0; }
        .h1{ margin:0; font-family:var(--sans); font-size:20px; font-weight:900; color:var(--text); letter-spacing:-0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub{ font-family:var(--serif); color:var(--gold); font-size:11px; font-weight: 600; font-style: italic; letter-spacing: 0.5px;}
        .hdrBtns{ display:flex; gap:6px; align-items:center; flex-shrink: 0; }

        .ghostBtn{ background:var(--card); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:6px 10px; cursor:pointer; font-family:var(--sans); font-weight: 700; font-size: 10px; box-shadow:0 4px 12px var(--shadow); backdrop-filter: blur(12px); display: flex; align-items: center; gap: 4px; transition: all 0.2s; }

        .tabs{ display:flex; margin-top:14px; gap: 4px; }
        .tab{ flex:1; background:none; border:none; cursor:pointer; padding:10px 0; font-family:var(--sans); font-weight:800; letter-spacing:0.5px; color:var(--faint); border-bottom:2px solid transparent; text-transform: uppercase; font-size: 10px; }
        .tab.active{ color:var(--text); border-bottom-color:var(--gold); }

        .notif{ position:absolute; top:120px; left:50%; transform:translateX(-50%); z-index:120; padding:10px 18px; border-radius:12px; background: var(--gold); color: #fff; font-family:var(--sans); font-weight:800; font-size: 11px; text-transform: uppercase; box-shadow:0 20px 40px var(--shadow); max-width:90%; white-space:nowrap; animation: fadeInNotif 300ms cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; }

        .content{ position:absolute; inset:0; padding-top:124px; padding-bottom: calc(40px + env(safe-area-inset-bottom)); }

        .snap{
          height: 100%;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .screen{
          height: 100%;
          width: 100%;
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 24px;
          position: relative;
          overflow: hidden;
        }

        .topRow{ position:absolute; top:15px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center; }
        .day{ font-size:10px; font-weight:900; letter-spacing:1.5px; color:var(--faint); font-family:var(--sans); text-transform: uppercase; }

        .pill{ display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px; backdrop-filter: blur(10px); }
        .dot{ width:6px; height:6px; border-radius:50%; }
        .pillText{ font-size:10px; font-weight:900; letter-spacing:1px; text-transform:uppercase; font-family:var(--sans); }

        .textWrap{ width:100%; max-width:440px; flex: 1; display: flex; flex-direction: column; justify-content: center; overflow-y:auto; padding: 10px 4px; }
        .prayText{ margin:0; text-align:center; font-family:var(--serif); font-size:24px; line-height:1.5; color:var(--text); font-weight: 300; }
        .meta{ margin-top:8px; text-align:center; font-family:var(--sans); font-size:11px; color:var(--faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

        .authorRow{ display:flex; align-items:center; gap:12px; margin-top:12px; margin-bottom:12px; }
        .avatar{ width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-family:var(--sans); color: #fff; font-size: 14px; }
        .authorText{ font-family:var(--sans); color:var(--dim); font-size:13px; font-weight: 700; }

        .privateStats { display: flex; gap: 14px; margin-top: 10px; padding: 8px 16px; background: var(--mutedCard); border-radius: 99px; border: 1px solid var(--border); animation: fadeIn 1s ease; }
        .pStatItem { font-family: var(--sans); font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; }

        .actions{ width:100%; display:flex; flex-direction: column; justify-content:flex-end; align-items:center; z-index: 10; padding-bottom: 20px; }
        .bridgeLink { background: none; border: none; margin-top: 14px; color: var(--faint); font-family: var(--sans); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        .scrollHint{ position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:var(--gold); animation:bob 2s ease-in-out infinite; pointer-events:none; }

        .holdWrap{ position:relative; height:110px; display:flex; align-items:center; justify-content:center; flex-direction:column; }
        .localRadiance { position: absolute; top: 50%; left: 50%; width: 320px; height: 320px; border-radius: 50%; pointer-events: none; opacity: 0; transform: translate(-50%, -50%) scale(0.3); background: radial-gradient(circle, rgba(200,180,140,0.4) 0%, rgba(200,180,140,0.15) 30%, rgba(247,232,195,0.05) 55%, transparent 75%); transition: opacity 0.8s ease, transform 1.2s cubic-bezier(0.16, 1, 0.3, 1); z-index: 0; }
        .localRadiance.active { opacity: 1; transform: translate(-50%, -50%) scale(1); }

        .holdBtn{ width:88px; height:88px; border-radius:50%; border:1px solid var(--border); background: var(--card); cursor:pointer; box-shadow:0 12px 32px var(--shadow); color:var(--text); font-family:var(--sans); font-weight: 900; text-transform: uppercase; font-size:12px; letter-spacing: 1px; touch-action: none; -webkit-tap-highlight-color: transparent; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); z-index: 2; position: relative; display: flex; align-items: center; justify-content: center; }
        .holdBtn.active{ background: var(--gold); border-color: rgba(255,255,255,0.2); color: #fff; transform: scale(1.3); box-shadow: 0 0 40px var(--goldSoft); animation: focusBreath 4s ease-in-out infinite; }
        .holdTime{ font-size:26px; font-weight:300; pointer-events: none; letter-spacing: -1px; line-height: 1; }
        .prayingText{ margin-top:10px; font-family:var(--serif); font-style:italic; color:var(--gold); font-size:13px; animation:fadeIn 1000ms ease; }

        .fab{ position:absolute; bottom: calc(20px + env(safe-area-inset-bottom)); right:20px; width:56px; height:56px; border-radius:20px; background: var(--gold); color: #fff; display: flex; align-items: center; justify-content: center; cursor:pointer; z-index:100; box-shadow:0 12px 30px var(--shadow); border: none; }

        .modal{ position:fixed; inset:0; z-index:200; background:var(--overlay); backdrop-filter: blur(12px); display:flex; align-items:flex-end; justify-content:center; padding:14px; }
        .sheet{ width:100%; max-width:500px; background: var(--bg); border:1px solid var(--border); border-radius:32px; box-shadow:0 30px 100px var(--shadow); overflow:hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .sheetHead{ padding:24px 24px 14px; display:flex; justify-content:space-between; align-items:center; }
        .sheetTitle{ margin:0; font-family:var(--sans); font-size:20px; color:var(--text); font-weight:900; letter-spacing: -0.5px; }
        .sheetBody{ padding: 0 24px 24px; overflow-y: auto; }

        .dashGrid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-top:14px; }
        .stat{ padding:16px; border-radius:20px; border:1px solid var(--border); background: var(--card); box-shadow:0 10px 24px var(--shadow); }
        .statLabel{ font-family:var(--sans); font-size:9px; letter-spacing:1px; font-weight:900; color:var(--faint); text-transform:uppercase; }
        .statVal{ margin-top:8px; font-family:var(--sans); font-size:24px; font-weight:900; color:var(--text); letter-spacing: -1px; }

        .promptList { margin-bottom: 20px; padding: 14px; background: var(--mutedCard); border-radius: 18px; border: 1px solid var(--border); }
        .promptItem { color: var(--dim); font-family: var(--serif); font-size: 15px; margin-bottom: 8px; line-height: 1.4; display: flex; gap: 10px; }
        .promptBullet { color: var(--gold); font-weight: 900; }
        .ta{ width:100%; min-height:140px; resize:none; border-radius:20px; border:1px solid var(--border); background: var(--mutedCard); color:var(--text); font-family:var(--serif); font-size:19px; padding:18px; outline:none; line-height: 1.5; }
        .primary{ width:100%; border:none; border-radius:20px; padding:18px; cursor:pointer; font-family:var(--sans); font-weight:900; letter-spacing:1px; text-transform: uppercase; background: var(--gold); color: #fff; box-shadow: 0 12px 24px var(--goldSoft); transition: transform 0.2s; }
        .primary:disabled{ opacity:0.5; cursor:not-allowed; }
        .promptGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%; max-width: 440px; margin: 0 auto; }
        .promptCard { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 8px 24px var(--shadow); }
        .pIcon { color: var(--gold); margin-bottom: 8px; }
        .pText { font-family: var(--sans); font-weight: 900; font-size: 14px; color: var(--text); text-transform: uppercase; }
        .pDesc { font-family: var(--serif); font-size: 13px; color: var(--dim); margin-top: 4px; }

        .sparkWrap { margin-top: 18px; padding: 18px; border-radius: 24px; border: 1px solid var(--border); background: var(--card); box-shadow: 0 14px 40px var(--shadow); display: flex; flex-direction: column; gap: 12px; align-items: center; }
        .sparkTop { display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; }

        .chip{ padding:7px 11px; border-radius:999px; border:1px solid var(--border); background:var(--card); color:var(--dim); font-size:11px; font-weight:700; cursor:pointer; }
        .chip.on{ color:var(--text); border-color:var(--gold); }

        @keyframes focusBreath { 0%, 100% { transform: scale(1.3); } 50% { transform: scale(1.24); } }
        @keyframes fadeIn{ from{ opacity:0; transform:translateY(12px);} to{opacity:1; transform:translateY(0);} }
        @keyframes fadeInNotif{ from{ opacity:0; transform:translate(-50%, 20px);} to{opacity:1; transform:translate(-50%, 0);} }
        @keyframes bob{ 0%,100% { transform:translateX(-50%) translateY(0);} 50% { transform:translateX(-50%) translateY(8px);} }
      `}</style>

      <header className="header">
        <div className="titleRow">
          <div className="brandWrap">
            <h1 className="h1">One Another</h1>
            <div className="sub">by Koinonia</div>
          </div>
          <div className="hdrBtns">
            <button className="ghostBtn" onClick={() => setDash(true)}>
              <BarChart2 size={14} /> Dash
            </button>
            <button className="ghostBtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>Prayers</button>
          <button className={`tab ${tab === "journal" ? "active" : ""}`} onClick={() => setTab("journal")}>Journal</button>
          <button className={`tab ${tab === "wall" ? "active" : ""}`} onClick={() => setTab("wall")}>Answered</button>
        </nav>
      </header>

      {notif && <div className="notif">{notif}</div>}

      <main className="content">
        {tab === "feed" && (
          <div className="snap">
            {feed.length ? (
              feed.map((p, i) => (
                <Screen key={p.id}>
                  <div className="topRow">
                    <div className="day">NEED {i + 1} OF {feed.length}</div>
                  </div>

                  <div className="textWrap">
                    <CategoryPill category={p.category} />
                    <p className="prayText">{p.text}</p>
                    <div className="authorRow">
                      <div className="avatar" style={{ background: `linear-gradient(135deg, ${CAT[p.category] || CAT.Other}cc, ${CAT[p.category] || CAT.Other})` }}>
                        {p.anon ? "?" : (p.author || "U")[0]}
                      </div>
                      <div className="authorText">{p.author} - {p.time}</div>
                    </div>

                    {p.isMine && (
                      <div className="privateStats">
                        <div className="pStatItem">{getPrivateStats(p.id).time} Prayer Time</div>
                      </div>
                    )}
                  </div>

                  <div className="actions">
                    <HoldButton onComplete={(elapsed) => handlePrayerComplete(p.id, elapsed)} />
                  </div>
                  {i < feed.length - 1 && <div className="scrollHint"><ChevronDown size={18} /></div>}
                </Screen>
              ))
            ) : (
              <Screen>
                <div style={{ textAlign: "center" }}>
                  <Wind size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                  <div className="prayText" style={{ fontSize: 20 }}>A quiet moment in the feed.</div>
                </div>
              </Screen>
            )}
          </div>
        )}

        {tab === "journal" && (
          <div className="snap">
            {journal.map((e) => (
              <Screen key={e.id}>
                <div className="topRow"><div className="day">JOURNAL</div></div>

                <div className="textWrap">
                  <CategoryPill category={e.category} />
                  <p className="prayText" style={{ fontStyle: "italic" }}>{e.text}</p>
                  <div className="meta">{e.created}</div>
                </div>

                <div className="actions">
                  <HoldButton onComplete={(elapsed) => handlePrayerComplete(e.id, elapsed)} />
                  <button
                    className="bridgeLink"
                    onClick={() => openCompose("feed", e.category, e.text, true)}
                  >
                    Share with church <ArrowRight size={14} />
                  </button>
                </div>
              </Screen>
            ))}
            <Screen>
              <div className="day" style={{ marginBottom: 24 }}>REFLECT</div>
              <div className="promptGrid">
                {PROMPTS.map((p, i) => (
                  <div key={i} className="promptCard" onClick={() => openCompose("journal", p.q)}>
                    <div className="pIcon">{p.icon}</div>
                    <div className="pText">{p.q}</div>
                    <div className="pDesc">{p.desc}</div>
                  </div>
                ))}
              </div>
            </Screen>
          </div>
        )}

        {tab === "wall" && (
          <Screen>
            <div style={{ textAlign: "center" }}>
              <Sparkles size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
              <div className="prayText" style={{ fontSize: 20 }}>No answers recorded yet.</div>
            </div>
          </Screen>
        )}
      </main>

      <button className="fab" onClick={() => openCompose("feed", "Other")}><Plus size={28} /></button>

      {compose && (
        <Modal onClose={() => { setCompose(null); setIsFork(false); }}>
          <div className="sheetHead">
            <h3 className="sheetTitle">
              {isFork ? "Share with Your Church" : (compose === "journal" ? `Journal: ${composeCat}` : "Share a Need")}
            </h3>
            <button className="ghostBtn" onClick={() => { setCompose(null); setIsFork(false); }}><X size={18} /></button>
          </div>
          <div className="sheetBody">
            {isFork && (
              <div className="forkNote" style={{ marginBottom: "15px", fontStyle: "italic", fontSize: "13px", color: "var(--faint)" }}>
                Edit this however you'd like before sharing. Your journal entry stays private.
              </div>
            )}

            {compose === "journal" && currentPrompt && (
              <div className="promptList">
                {currentPrompt.bullets.map((bullet, idx) => (
                  <div key={idx} className="promptItem">
                    <span className="promptBullet">-</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              className="ta"
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder={compose === "journal" ? "Reflect here..." : "What do you need prayer for?"}
              autoFocus
            />

            {!currentPrompt && (
              <div className="row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                {Object.keys(CAT).filter((c) => c !== "Other").map((c) => (
                  <button key={c} className={`chip ${composeCat === c ? "on" : ""}`} onClick={() => setComposeCat(c)}>{c}</button>
                ))}
              </div>
            )}

            {compose === "feed" && (
              <label className="check" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 20px", cursor: "pointer", fontSize: "13px", color: "var(--dim)" }}>
                <input type="checkbox" checked={composeAnon} onChange={() => setComposeAnon(!composeAnon)} style={{ accentColor: "var(--gold)" }} />
                Post anonymously
              </label>
            )}

            <button className="primary" disabled={!composeText.trim()} onClick={submitCompose}>
              {compose === "journal" ? "Save to Journal" : "Share"}
            </button>
          </div>
        </Modal>
      )}

      {dash && (
        <Modal center onClose={() => setDash(false)}>
          <div className="sheetHead">
            <div>
              <h3 className="sheetTitle">Progress</h3>
              <div style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Only you can see this</div>
            </div>
            <button className="ghostBtn" onClick={() => setDash(false)}><X size={18} /></button>
          </div>
          <div className="sheetBody">
            <div style={{ marginBottom: 20 }}>
              <div className="day" style={{ marginBottom: 10 }}>CHURCH PRAYER</div>
              <div className="dashGrid" style={{ marginTop: 0 }}>
                <div className="stat">
                  <div className="statLabel">Today's Needs</div>
                  <div className="statVal">{aggregates.church.todayCount}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Today's Time</div>
                  <div className="statVal">{fmtMin(aggregates.church.todayMin)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="day" style={{ marginBottom: 10 }}>PERSONAL JOURNAL</div>
              <div className="dashGrid" style={{ marginTop: 0 }}>
                <div className="stat">
                  <div className="statLabel">Today's Entries</div>
                  <div className="statVal">{aggregates.personal.todayCount}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Today's Time</div>
                  <div className="statVal">{fmtMin(aggregates.personal.todayMin)}</div>
                </div>
              </div>
            </div>

            <div className="sparkWrap">
              <div className="sparkTop" style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", fontWeight: "900", color: "var(--faint)", textTransform: "uppercase" }}>14-DAY TOTAL ACTIVITY</span>
                <span style={{ fontSize: "9px", fontWeight: "900", color: "var(--faint)", textTransform: "uppercase" }}>MINUTES</span>
              </div>
              <Sparkline points={trendData} />
              <div style={{ width: "100%", textAlign: "center", marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div className="statLabel">All Time Combined</div>
                <div className="statVal" style={{ fontSize: 20 }}>{fmtMin(aggregates.church.allMin + aggregates.personal.allMin)}</div>
              </div>
            </div>

            <button className="primary" style={{ marginTop: 24 }} onClick={() => setDash(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
