import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
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
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Edit3,
  Clock,
  Flame,
} from "lucide-react";

/**
 * One Another by Koinonia
 * v10.0 — Full Spec Alignment
 *
 * Changes from v9.1:
 * - Real timestamps & relative time display
 * - 7-day active window with Day X of 7 indicator
 * - Mark as Answered flow with testimony modal
 * - Three-tier Prayer Wall (Answered / Still Praying / All)
 * - Poster private stats: prayer count + time
 * - Post Update flow (one-way updates from poster)
 * - Haptic feedback on hold-to-pray
 * - Dashboard: ring legend, sparkline, combined totals
 * - Enhanced hold visuals (3 ripple layers, golden screen tint)
 * - Compose polish (Other chip, char count, prompt as header)
 * - Journal real timestamps
 * - Context-aware header subtitle
 * - Onboarding overlay
 * - Tab transition animation
 * - Dead code cleanup
 */

// --- ICONS ---
const ClockIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// --- UTILITY FUNCTIONS ---
const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const secondsToMinutes = (s) => Math.max(0, Math.round(s / 60));
const fmtMin = (m) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

const HOUR = 3600000;
const DAY = 86400000;

const relativeTime = (ts) => {
  const diff = Date.now() - ts;
  if (diff < HOUR) return "Just now";
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const dayOfSeven = (ts) => Math.min(7, Math.floor((Date.now() - ts) / DAY) + 1);
const isExpired = (ts) => dayOfSeven(ts) > 7;

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

const NOW = Date.now();

const SEED_PRAYERS = [
  { id: 1, author: "Sarah M.", category: "Health", text: "Please pray for my mom's surgery tomorrow morning. She's having a double bypass and she's scared. We trust God's plan, but we'd love prayer for the surgeons and a smooth recovery.", created: NOW - 2 * HOUR, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 2, author: "A Church Member", category: "Family", text: "Going through a really difficult season in my marriage. We're both believers but struggling to communicate. Praying for restoration and wisdom.", created: NOW - 5 * HOUR, isMine: false, anon: true, answered: false, answerNote: "", updates: [] },
  { id: 3, author: "You", category: "Spiritual", text: "Praying for our church leadership as they transition into this new season. For wisdom, protection, and a deep unity in the Spirit.", created: NOW - 1 * HOUR, isMine: true, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 4, author: "James K.", category: "Work", text: "I was laid off last Friday after 12 years. Feeling lost but trusting God has a plan. Prayers for provision and for the right doors to open.", created: NOW - 8 * HOUR, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 5, author: "David R.", category: "Spiritual", text: "Asking for prayer as I prepare to lead our youth group through a study on identity in Christ. Pray that the students' hearts would be open.", created: NOW - 2 * DAY, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 6, author: "Elder Thomas", category: "Spiritual", text: "Pray for our church's unity this season as we navigate changes in leadership. May God's wisdom guide every decision and every conversation.", created: NOW - 3 * DAY, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 7, author: "Maria L.", category: "Gratitude", text: "Overflowing with thankfulness today. My son came home safely from deployment. God is faithful. Please join me in praising Him.", created: NOW - 12 * HOUR, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
  { id: 8, author: "You", category: "Health", text: "Asking for prayers as I deal with some ongoing back pain that's been affecting my ability to work and be present with my family. Trusting God for healing.", created: NOW - 4 * DAY, isMine: true, anon: false, answered: false, answerNote: "", updates: [{ text: "Had an MRI yesterday — waiting on results. Appreciate the continued prayers.", created: NOW - 2 * DAY }] },
  { id: 9, author: "A Church Member", category: "Struggles", text: "Battling anxiety that won't let go. Some days I can barely get out of bed. I know God is with me but I need my church family to carry this with me.", created: NOW - 1 * DAY, isMine: false, anon: true, answered: false, answerNote: "", updates: [] },
  // Answered prayer (for Wall content)
  { id: 10, author: "Rachel W.", category: "Health", text: "Please pray for my daughter Emma. She's been in the hospital for three days with a high fever they can't explain.", created: NOW - 10 * DAY, isMine: false, anon: false, answered: true, answerNote: "Emma is home and healthy! The fever broke on day four. Thank you for every prayer — we felt them all.", updates: [] },
  { id: 11, author: "Mark D.", category: "Work", text: "Interview tomorrow for a position I've been praying about for months. Pray for favor and peace.", created: NOW - 12 * DAY, isMine: false, anon: false, answered: true, answerNote: "I got the job! Starting next month. God's timing is perfect.", updates: [] },
  // Expired but unanswered (for "Still Praying" tier)
  { id: 12, author: "Linda P.", category: "Family", text: "My adult son hasn't spoken to me in over a year. I'm asking God to soften his heart and open a door for reconciliation.", created: NOW - 9 * DAY, isMine: false, anon: false, answered: false, answerNote: "", updates: [] },
];

const SEED_JOURNAL = [
  { id: 101, category: "Family", created: NOW - 3 * HOUR, text: "Give me patience with the kids this week. Help me be the parent they need when I'm tired after work." },
  { id: 102, category: "Family", created: NOW - 2 * DAY, text: "Praying for Jessica's work situation — the staffing changes are stressing her out. Give her wisdom and peace." },
  { id: 103, category: "Gratitude", created: NOW - 4 * DAY, text: "Thank you for Mia's safety. Continue to watch over her wherever she goes." },
  { id: 104, category: "Struggles", created: NOW - 1 * DAY, text: "I keep losing my temper with the people I love most. Lord, change my heart. Give me self-control and gentleness." },
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
    } catch { return fallback; }
  });
  useEffect(() => {
    if (!isBrowser) return;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v, isBrowser]);
  return [v, setV];
}

// --- SUB-COMPONENTS ---
function FitnessRing({ size = 120, stroke = 12, percentage = 0, color = "#ff4d4d", index = 0, bgOpacity = 0.2 }) {
  const radius = (size / 2) - (index * (stroke + 4)) - (stroke / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  return (
    <>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={color} strokeWidth={stroke} strokeOpacity={bgOpacity} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </>
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

    // Haptic feedback
    try { if (navigator.vibrate) navigator.vibrate(30); } catch {}

    setIsPraying(true);
    setLocalDur(0);
    timerRef.current.start = performance.now();
    const tick = () => {
      const s = Math.floor((performance.now() - timerRef.current.start) / 1000);
      setLocalDur(prev => (prev === s ? prev : s));
      timerRef.current.raf = requestAnimationFrame(tick);
    };
    timerRef.current.raf = requestAnimationFrame(tick);
  };

  const handleEnd = (e) => {
    if (!isPraying) return;
    if (timerRef.current.raf) cancelAnimationFrame(timerRef.current.raf);

    const finalElapsed = Math.floor((performance.now() - timerRef.current.start) / 1000);
    if (finalElapsed >= 2) {
      onComplete(finalElapsed);
    }
    setIsPraying(false);
    setLocalDur(0);
    if (btnRef.current && e.pointerId) btnRef.current.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="holdWrap">
      <div className={`ripple r1 ${isPraying ? "active" : ""}`} />
      <div className={`ripple r2 ${isPraying ? "active" : ""}`} />
      <div className={`ripple r3 ${isPraying ? "active" : ""}`} />
      <button
        ref={btnRef}
        className={`holdBtn ${isPraying ? "active" : ""}`}
        onPointerDown={handleStart}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
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

function Sparkline({ points }) {
  const w = 240, h = 52;
  const max = Math.max(1, ...points);
  const d = points.length < 2 ? "" : points
    .map((v, i) => {
      const x = 6 + (i * (w - 12)) / (points.length - 1);
      const y = h - 8 - (v / max) * (h - 18);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  if (!d) return <div className="faint" style={{ fontSize: 10 }}>Not enough data yet</div>;
  return (
    <svg width={w} height={h} className="spark">
      <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`${d} L ${w - 6} ${h - 6} L 6 ${h - 6} Z`} fill="var(--goldSoft)" opacity="0.6" />
    </svg>
  );
}

function Screen({ children, prayingTint }) {
  return (
    <section className="screen" style={prayingTint ? { background: 'var(--goldTint)' } : undefined}>
      {children}
    </section>
  );
}

function OnboardingOverlay({ onDismiss }) {
  return (
    <div className="onboardOverlay">
      <div className="onboardCard">
        <div className="onboardStep">
          <div style={{ fontSize: 48, marginBottom: 8 }}>🤲</div>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Hold to Pray</h3>
          <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dim)', lineHeight: 1.5 }}>Press and hold the Pray button while you intercede. Your prayer time is recorded privately.</p>
        </div>
        <div className="onboardStep">
          <div style={{ fontSize: 48, marginBottom: 8 }}>📖</div>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Your Journal</h3>
          <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dim)', lineHeight: 1.5 }}>A private space for personal prayers. Never leaves your device. Share with your church when you're ready.</p>
        </div>
        <div className="onboardStep">
          <div style={{ fontSize: 48, marginBottom: 8 }}>⬇️</div>
          <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Swipe to Continue</h3>
          <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dim)', lineHeight: 1.5 }}>Each prayer fills the screen. Scroll down to the next need.</p>
        </div>
        <button className="primary" style={{ marginTop: 20 }} onClick={onDismiss}>Enter</button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useLS("pf_theme", "dark");
  const [tab, setTab] = useState("feed");
  const [prayers, setPrayers] = useLS("pf_prayers_v10", SEED_PRAYERS);
  const [journal, setJournal] = useLS("pf_journal_v10", SEED_JOURNAL);
  const [prayerLogs, setPrayerLogs] = useLS("pf_logs_v10", []);
  const [bookmarks, setBookmarks] = useLS("pf_bookmarks_v10", []);
  const [goals, setGoals] = useLS("pf_goals_v10", { church: { mins: 10, count: 5, needs: 3 }, personal: { mins: 5, count: 3 } });
  const [onboarded, setOnboarded] = useLS("pf_onboarded_v10", false);

  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);

  const [compose, setCompose] = useState(null);
  const [composeText, setComposeText] = useState("");
  const [composeCat, setComposeCat] = useState("Other");
  const [composeAnon, setComposeAnon] = useState(false);
  const [isFork, setIsFork] = useState(false);
  const [composePromptLabel, setComposePromptLabel] = useState(null);

  const [dash, setDash] = useState(false);
  const [dashPeriod, setDashPeriod] = useState("day");
  const [dashTab, setDashTab] = useState("church");

  // Mark Answered modal
  const [answerModal, setAnswerModal] = useState(null); // prayer id
  const [answerNote, setAnswerNote] = useState("");

  // Post Update modal
  const [updateModal, setUpdateModal] = useState(null); // prayer id
  const [updateText, setUpdateText] = useState("");

  // Wall sub-filter
  const [wallFilter, setWallFilter] = useState("answered");

  // Tab animation key
  const [tabKey, setTabKey] = useState(0);

  const triggerNotif = useCallback((msg) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif(msg);
    notifTimer.current = setTimeout(() => setNotif(null), 2200);
  }, []);

  useEffect(() => {
    return () => { if (notifTimer.current) clearTimeout(notifTimer.current); };
  }, []);

  const switchTab = (t) => {
    setTab(t);
    setTabKey(k => k + 1);
  };

  const handlePrayerComplete = (id, elapsed) => {
    const type = tab === "journal" ? "personal" : "church";
    setPrayerLogs((prev) => [{ t: Date.now(), s: elapsed, id, type }, ...prev].slice(0, 2000));
    triggerNotif(`Recorded · ${elapsed}s`);
  };

  const toggleBookmark = (id) => {
    if (bookmarks.includes(id)) {
      setBookmarks(bookmarks.filter(b => b !== id));
      triggerNotif("Bookmark removed");
    } else {
      setBookmarks([id, ...bookmarks]);
      triggerNotif("Prayer bookmarked");
    }
  };

  const handleMarkAnswered = () => {
    if (!answerModal) return;
    setPrayers(prev => prev.map(p => p.id === answerModal ? { ...p, answered: true, answerNote: answerNote.trim() } : p));
    triggerNotif("Marked as answered");
    setAnswerModal(null);
    setAnswerNote("");
  };

  const handlePostUpdate = () => {
    if (!updateModal || !updateText.trim()) return;
    setPrayers(prev => prev.map(p => p.id === updateModal ? { ...p, updates: [...(p.updates || []), { text: updateText.trim(), created: Date.now() }] } : p));
    triggerNotif("Update posted");
    setUpdateModal(null);
    setUpdateText("");
  };

  // --- DERIVED DATA ---
  const feed = useMemo(() => prayers.filter((p) => !p.answered && !isExpired(p.created)), [prayers]);
  const wallAnswered = useMemo(() => prayers.filter((p) => p.answered), [prayers]);
  const wallStillPraying = useMemo(() => prayers.filter((p) => !p.answered && isExpired(p.created)), [prayers]);
  const wallAll = useMemo(() => [...wallAnswered, ...wallStillPraying], [wallAnswered, wallStillPraying]);

  const wallList = useMemo(() => {
    if (wallFilter === "answered") return wallAnswered;
    if (wallFilter === "still") return wallStillPraying;
    return wallAll;
  }, [wallFilter, wallAnswered, wallStillPraying, wallAll]);

  const bookmarksList = useMemo(() => {
    const allItems = [...prayers, ...journal];
    return allItems.filter(item => bookmarks.includes(item.id));
  }, [prayers, journal, bookmarks]);

  const getPrivateStats = (id) => {
    const logs = Array.isArray(prayerLogs) ? prayerLogs : [];
    const related = logs.filter(log => log.id === id);
    const totalSec = related.reduce((acc, curr) => acc + curr.s, 0);
    const count = related.length;
    return { time: fmtMin(secondsToMinutes(totalSec)), count };
  };

  const aggregates = useMemo(() => {
    const now = Date.now();
    let cutOff, multiplier = 1;
    if (dashPeriod === 'day') { cutOff = startOfDay(now); }
    else if (dashPeriod === 'week') { cutOff = startOfDay(now - 7 * DAY); multiplier = 7; }
    else { cutOff = startOfDay(now - 365 * DAY); multiplier = 365; }
    const filteredLogs = prayerLogs.filter(l => l.t >= cutOff);
    const churchLogs = filteredLogs.filter(l => l.type === 'church');
    const personalLogs = filteredLogs.filter(l => l.type === 'personal');
    const churchUnique = new Set(churchLogs.map(l => l.id)).size;
    return {
      church: {
        prayers: churchLogs.length,
        time: secondsToMinutes(churchLogs.reduce((a, c) => a + (c.s || 0), 0)),
        needs: churchUnique
      },
      personal: {
        prayers: personalLogs.length,
        time: secondsToMinutes(personalLogs.reduce((a, c) => a + (c.s || 0), 0)),
      },
      combined: {
        prayers: filteredLogs.length,
        time: secondsToMinutes(filteredLogs.reduce((a, c) => a + (c.s || 0), 0)),
      },
      multiplier
    };
  }, [prayerLogs, dashPeriod]);

  const trendData = useMemo(() => {
    const days = 14;
    const start = startOfDay(Date.now() - (days - 1) * DAY);
    const buckets = new Map();
    for (let i = 0; i < days; i++) buckets.set(dayKey(start + i * DAY), 0);
    for (const log of prayerLogs) {
      const k = dayKey(log.t);
      if (buckets.has(k)) buckets.set(k, buckets.get(k) + (log.s || 0));
    }
    return Array.from(buckets.values()).map((sec) => Math.round(sec / 60));
  }, [prayerLogs]);

  const submitCompose = () => {
    if (!composeText.trim()) return;
    const timestamp = Date.now();
    if (compose === "journal") {
      setJournal([{ id: timestamp, category: composeCat, created: timestamp, text: composeText.trim() }, ...journal]);
      triggerNotif("Saved to Journal");
    } else {
      setPrayers([{ id: timestamp, author: composeAnon ? "A Church Member" : "You", category: composeCat, text: composeText.trim(), created: timestamp, isMine: true, anon: composeAnon, answered: false, answerNote: "", updates: [] }, ...prayers]);
      triggerNotif("Shared with Church");
    }
    setCompose(null);
    setComposeText("");
    setComposePromptLabel(null);
    setIsFork(false);
  };

  const openCompose = (mode, category, prefill = "", fork = false, promptLabel = null) => {
    setCompose(mode);
    setComposeText(prefill);
    setComposeCat(category || "Other");
    setComposeAnon(false);
    setIsFork(fork);
    setComposePromptLabel(promptLabel);
  };

  const currentPrompt = useMemo(() => {
    if (compose !== "journal") return null;
    return PROMPTS.find(p => p.q === composeCat);
  }, [compose, composeCat]);

  const headerSubtitle = useMemo(() => {
    if (tab === "feed") return "Church Prayers";
    if (tab === "journal") return "My Journal";
    if (tab === "wall") return "Prayer Wall";
    if (tab === "bookmarks") return "Saved Prayers";
    return "";
  }, [tab]);

  return (
    <div className="app" data-theme={theme}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet" />
      <style>{`
        :root{
          --serif: 'Cormorant Garamond', serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --goldLighter: rgba(247, 232, 195, 0.4);
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
          --goldTint: rgba(200,180,140,0.04);
          --shadow: rgba(0,0,0,0.55);
          --overlay: rgba(0,0,0,0.85);
          --headerFade: linear-gradient(180deg, rgba(13,17,23,1) 0%, rgba(13,17,23,0.85) 60%, rgba(13,17,23,0) 100%);
          --green: #2ea97a;
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
          --goldTint: rgba(47,123,189,0.03);
          --shadow: rgba(10,30,45,0.18);
          --overlay: rgba(10,30,45,0.22);
          --headerFade: linear-gradient(180deg, rgba(248,252,255,1) 0%, rgba(248,252,255,0.85) 60%, rgba(248,252,255,0) 100%);
          --green: #1a8a5a;
        }
        *{ box-sizing:border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar{ display:none; }

        .header{ position:absolute; top:0; left:0; right:0; z-index:100; padding:20px 20px 10px; background:var(--headerFade); }
        .titleRow{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .brandWrap{ flex: 1; min-width: 0; }
        .h1{ margin:0; font-family:var(--sans); font-size:20px; font-weight:900; color:var(--text); letter-spacing:-0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub{ font-family:var(--serif); color:var(--gold); font-size:11px; font-weight: 600; font-style: italic; letter-spacing: 0.5px;}
        .hdrBtns{ display:flex; gap:6px; align-items:center; flex-shrink: 0; }
        .ghostBtn{ background:var(--card); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:6px 12px; cursor:pointer; font-family:var(--sans); font-weight: 700; font-size: 10px; box-shadow:0 4px 12px var(--shadow); backdrop-filter: blur(12px); display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
        .tabs{ display:flex; margin-top:14px; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
        .tab{ flex:1; background:none; border:none; cursor:pointer; padding:10px 0; font-family:var(--sans); font-weight:800; letter-spacing:0.5px; color:var(--faint); border-bottom:2px solid transparent; text-transform: uppercase; font-size: 10px; white-space: nowrap; }
        .tab.active{ color:var(--text); border-bottom-color:var(--gold); }

        .notif{ position:absolute; top:120px; left:50%; transform:translateX(-50%); z-index:120; padding:10px 18px; border-radius:12px; background: var(--gold); color: #fff; font-family:var(--sans); font-weight:800; font-size: 11px; text-transform: uppercase; box-shadow:0 20px 40px var(--shadow); max-width:90%; white-space:nowrap; animation: fadeInNotif 300ms cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; }

        .content{ position:absolute; inset:0; padding-top:124px; padding-bottom: calc(40px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; }
        .snap{ flex: 1; min-height: 0; overflow-y: scroll; scroll-snap-type: y mandatory; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }

        .screen{ height: 100%; min-height: 100%; width: 100%; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px 20px; position: relative; overflow: hidden; transition: background 0.5s ease; }

        .topRow{ position:absolute; top:15px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center; }
        .day{ font-size:10px; font-weight:900; letter-spacing:1.5px; color:var(--faint); font-family:var(--sans); text-transform: uppercase; }
        .dayBadge{ font-size:9px; font-weight:900; letter-spacing:1px; color:var(--gold); font-family:var(--sans); text-transform: uppercase; background: var(--goldSoft); padding: 4px 10px; border-radius: 8px; }

        .pill{ display:inline-flex; align-items:center; justify-content: center; gap:8px; padding:6px 14px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px; backdrop-filter: blur(10px); box-shadow: 0 4px 12px var(--shadow); }
        .dot{ width:6px; height:6px; border-radius:50%; }
        .pillText{ font-size:10px; font-weight:900; letter-spacing:1px; text-transform:uppercase; font-family:var(--sans); }

        .textWrap{ width:100%; max-width:440px; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow-y:auto; padding: 10px 4px; text-align: center; }
        .prayText{ margin:0; font-family:var(--serif); font-size:24px; line-height:1.5; color:var(--text); font-weight: 300; }
        .meta{ margin-top:8px; text-align:center; font-family:var(--sans); font-size:11px; color:var(--faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .authorRow{ display:flex; align-items:center; gap:12px; margin-top:12px; margin-bottom:12px; }
        .avatar{ width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-family:var(--sans); color: #fff; font-size: 14px; box-shadow: 0 6px 12px var(--shadow); }
        .authorText{ font-family:var(--sans); color:var(--dim); font-size:13px; font-weight: 700; }

        .privateStats { display: flex; gap: 14px; margin-top: 10px; padding: 8px 16px; background: var(--mutedCard); border-radius: 99px; border: 1px solid var(--border); animation: fadeIn 1s ease; }
        .pStatItem { font-family: var(--sans); font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 4px; }
        .pStatDivider { width: 1px; height: 14px; background: var(--border); }

        .updatesList { margin-top: 12px; width: 100%; max-width: 440px; }
        .updateItem { text-align: left; padding: 10px 14px; background: var(--mutedCard); border-radius: 14px; border: 1px solid var(--border); margin-bottom: 8px; }
        .updateLabel { font-family: var(--sans); font-size: 9px; font-weight: 900; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .updateBody { font-family: var(--serif); font-size: 15px; color: var(--dim); line-height: 1.4; font-style: italic; }

        .mineActions { display: flex; gap: 8px; margin-top: 10px; }
        .mineBtn { background: var(--mutedCard); border: 1px solid var(--border); border-radius: 10px; padding: 6px 14px; color: var(--dim); font-family: var(--sans); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
        .mineBtn:hover { color: var(--text); border-color: var(--gold); }

        .actions{ width:100%; display:flex; flex-direction: column; justify-content:flex-end; align-items:center; z-index: 10; padding-bottom: 20px; }
        .bridgeLink { background: none; border: none; margin-top: 14px; color: var(--faint); font-family: var(--sans); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .bookmarkBtn { background: none; border: none; color: var(--dim); padding: 10px; margin-top: 8px; cursor: pointer; transition: color 0.2s; }
        .bookmarkBtn.active { color: var(--gold); fill: var(--gold); }
        .scrollHint{ position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:var(--gold); animation:bob 2s ease-in-out infinite; pointer-events:none; }

        .holdWrap{ position:relative; height:140px; width: 140px; display:flex; align-items:center; justify-content:center; flex-direction:column; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .ripple { position: absolute; top: 50%; left: 50%; border-radius: 50%; border: 1px solid var(--gold); transform: translate(-50%, -50%) scale(1); opacity: 0; pointer-events: none; }
        .ripple.active.r1 { animation: rippleEffect 2s linear infinite; width: 100px; height: 100px; }
        .ripple.active.r2 { animation: rippleEffect 2s linear 0.6s infinite; width: 100px; height: 100px; }
        .ripple.active.r3 { animation: rippleEffect 2.4s linear 1.2s infinite; width: 100px; height: 100px; }

        .holdBtn{ width:88px; height:88px; border-radius:50%; border:1px solid var(--border); background: var(--card); cursor:pointer; box-shadow:0 12px 32px var(--shadow); color:var(--text); font-family:var(--sans); font-weight: 900; text-transform: uppercase; font-size:12px; letter-spacing: 1px; touch-action: none; -webkit-tap-highlight-color: transparent; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); z-index: 2; position: relative; display: flex; align-items: center; justify-content: center; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .holdBtn.active{ background: var(--gold); border-color: rgba(255,255,255,0.2); color: #fff; transform: scale(1.5); box-shadow: 0 0 50px var(--goldSoft); }
        .holdTime{ font-size:26px; font-weight:300; pointer-events: none; letter-spacing: -1px; line-height: 1; }
        .prayingText{ position: absolute; bottom: 0; font-family:var(--serif); font-style:italic; color:var(--gold); font-size:13px; animation:fadeIn 1000ms ease; }

        .fab{ position:absolute; bottom: calc(20px + env(safe-area-inset-bottom)); right:20px; width:56px; height:56px; border-radius:20px; background: var(--gold); color: #fff; display: flex; align-items: center; justify-content: center; cursor:pointer; z-index:100; box-shadow:0 12px 30px var(--shadow); border: none; }

        .modal{ position:fixed; inset:0; z-index:200; background:var(--overlay); backdrop-filter: blur(12px); display:flex; align-items:flex-end; justify-content:center; padding:14px; }
        .modal.center { align-items: center; }
        .sheet{ width:100%; max-width:500px; background: var(--bg); border:1px solid var(--border); border-radius:32px; box-shadow:0 30px 100px var(--shadow); overflow:hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .sheetCenter { max-height: 85vh; }
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
        .charCount { text-align: right; font-family: var(--sans); font-size: 10px; color: var(--faint); margin-top: 6px; font-weight: 700; }
        .charCount.warn { color: #e06060; }
        .primary{ width:100%; border:none; border-radius:20px; padding:18px; cursor:pointer; font-family:var(--sans); font-weight:900; letter-spacing:1px; text-transform: uppercase; background: var(--gold); color: #fff; box-shadow: 0 12px 24px var(--goldSoft); transition: transform 0.2s; }
        .primary:disabled { opacity: 0.4; cursor: default; }

        .promptGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%; max-width: 440px; margin: 0 auto; }
        .promptCard { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 8px 24px var(--shadow); }
        .pIcon { color: var(--gold); margin-bottom: 8px; }
        .pText { font-family: var(--sans); font-weight: 900; font-size: 14px; color: var(--text); text-transform: uppercase; }
        .pDesc { font-family: var(--serif); font-size: 13px; color: var(--dim); margin-top: 4px; }

        /* Dashboard */
        .dashToggle { display: flex; background: var(--mutedCard); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
        .dashToggleBtn { flex: 1; border: none; background: transparent; padding: 8px; border-radius: 8px; color: var(--faint); font-family: var(--sans); font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s; }
        .dashToggleBtn.active { background: var(--card); color: var(--text); box-shadow: 0 4px 10px var(--shadow); }
        .heroRingSection { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; animation: fadeIn 0.5s ease; }
        .ringWrap { position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        .ringLegend { display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }
        .legendItem { display: flex; align-items: center; gap: 6px; font-family: var(--sans); font-size: 10px; font-weight: 800; color: var(--dim); text-transform: uppercase; letter-spacing: 0.5px; }
        .legendDot { width: 8px; height: 8px; border-radius: 50%; }
        .combinedTotal { margin-top: 20px; padding: 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--mutedCard); text-align: center; }
        .combinedLabel { font-family: var(--sans); font-size: 9px; font-weight: 900; color: var(--faint); text-transform: uppercase; letter-spacing: 1px; }
        .combinedVal { font-family: var(--sans); font-size: 20px; font-weight: 900; color: var(--gold); margin-top: 4px; }
        .sparkSection { margin-top: 16px; text-align: center; }
        .sparkLabel { font-family: var(--sans); font-size: 9px; font-weight: 900; color: var(--faint); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }

        /* Wall sub-tabs */
        .wallTabs { display: flex; gap: 6px; margin-bottom: 4px; }
        .wallTab { background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 5px 12px; font-family: var(--sans); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--faint); cursor: pointer; transition: all 0.2s; }
        .wallTab.active { background: var(--gold); color: #fff; border-color: var(--gold); }

        /* Answer note on wall */
        .answerBanner { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 10px 16px; background: rgba(46, 169, 122, 0.1); border: 1px solid rgba(46, 169, 122, 0.2); border-radius: 14px; }
        .answerIcon { color: var(--green); flex-shrink: 0; }
        .answerText { font-family: var(--serif); font-size: 15px; color: var(--text); font-style: italic; line-height: 1.4; }

        /* Onboarding */
        .onboardOverlay { position: fixed; inset: 0; z-index: 300; background: var(--overlay); backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.5s ease; }
        .onboardCard { width: 100%; max-width: 400px; background: var(--bg); border: 1px solid var(--border); border-radius: 32px; padding: 32px 28px; box-shadow: 0 40px 100px var(--shadow); }
        .onboardStep { text-align: center; margin-bottom: 24px; }

        .forkNote { margin-bottom: 12px; font-size: 13px; color: var(--faint); font-style: italic; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
        .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--dim); font-size: 11px; text-transform: uppercase; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .chip.on { background: var(--gold); color: white; border-color: var(--gold); }
        .check { display: flex; align-items: center; gap: 8px; margin: 12px 0 20px; font-size: 13px; color: var(--dim); cursor: pointer; }

        @keyframes fadeIn{ from{ opacity:0; transform:translateY(12px);} to{opacity:1; transform:translateY(0);} }
        @keyframes tabFadeIn{ from{ opacity:0; } to{ opacity:1; } }
        @keyframes fadeInNotif{ from{ opacity:0; transform:translate(-50%, 20px);} to{opacity:1; transform:translate(-50%, 0);} }
        @keyframes bob{ 0%,100% { transform:translateX(-50%) translateY(0);} 50% { transform:translateX(-50%) translateY(8px);} }
        @keyframes rippleEffect { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(3); opacity: 0; } }
      `}</style>

      {/* ONBOARDING */}
      {!onboarded && <OnboardingOverlay onDismiss={() => setOnboarded(true)} />}

      <header className="header">
        <div className="titleRow">
          <div className="brandWrap">
            <h1 className="h1">One Another</h1>
            <div className="sub">{headerSubtitle}</div>
          </div>
          <div className="hdrBtns">
            <button className="ghostBtn" onClick={() => setDash(true)}>
              <ClockIcon size={14} /> My Prayer Life
            </button>
            <button className="ghostBtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab === "feed" ? "active" : ""}`} onClick={() => switchTab("feed")}>Prayers</button>
          <button className={`tab ${tab === "journal" ? "active" : ""}`} onClick={() => switchTab("journal")}>Journal</button>
          <button className={`tab ${tab === "wall" ? "active" : ""}`} onClick={() => switchTab("wall")}>Wall</button>
          <button className={`tab ${tab === "bookmarks" ? "active" : ""}`} onClick={() => switchTab("bookmarks")}>Bookmarks</button>
        </nav>
      </header>

      {notif && <div className="notif">{notif}</div>}

      <main className="content">
        <div className="snap" key={tabKey} style={{ animation: 'tabFadeIn 0.35s ease' }}>
            {/* ===== FEED TAB ===== */}
            {tab === "feed" ? (
              feed.length ? (
                feed.map((p, i) => (
                  <Screen key={p.id}>
                    <div className="topRow">
                      <div className="day">NEED {i + 1} OF {feed.length}</div>
                      <div className="dayBadge">Day {dayOfSeven(p.created)} of 7</div>
                    </div>

                    <div className="textWrap">
                      <CategoryPill category={p.category} />
                      <p className="prayText">{p.text}</p>

                      {/* Updates */}
                      {p.updates && p.updates.length > 0 && (
                        <div className="updatesList">
                          {p.updates.map((u, idx) => (
                            <div key={idx} className="updateItem">
                              <div className="updateLabel">Update · {relativeTime(u.created)}</div>
                              <div className="updateBody">{u.text}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="authorRow">
                        <div className="avatar" style={{ background: `linear-gradient(135deg, ${CAT[p.category] || CAT.Other}cc, ${CAT[p.category] || CAT.Other})` }}>
                          {p.anon ? "?" : (p.author || "U")[0]}
                        </div>
                        <div className="authorText">{p.author} · {relativeTime(p.created)}</div>
                      </div>

                      {/* Poster private stats */}
                      {p.isMine && (() => {
                        const stats = getPrivateStats(p.id);
                        return (
                          <>
                            <div className="privateStats">
                              <div className="pStatItem"><Users size={12} /> {stats.count} {stats.count === 1 ? 'prayer' : 'prayers'}</div>
                              <div className="pStatDivider" />
                              <div className="pStatItem"><ClockIcon size={12} /> {stats.time}</div>
                            </div>
                            <div className="mineActions">
                              <button className="mineBtn" onClick={() => { setUpdateModal(p.id); setUpdateText(""); }}>
                                <Edit3 size={12} /> Add Update
                              </button>
                              <button className="mineBtn" onClick={() => { setAnswerModal(p.id); setAnswerNote(""); }}>
                                <CheckCircle2 size={12} /> Mark Answered
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="actions">
                      <HoldButton onComplete={(elapsed) => handlePrayerComplete(p.id, elapsed)} />
                      <button className={`bookmarkBtn ${bookmarks.includes(p.id) ? 'active' : ''}`} onClick={() => toggleBookmark(p.id)}>
                        <Bookmark size={20} fill={bookmarks.includes(p.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    {i < feed.length - 1 && <div className="scrollHint"><ChevronDown size={18} /></div>}
                  </Screen>
                ))
              ) : (
                <Screen>
                  <Wind size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                  <div className="prayText" style={{ fontSize: 20 }}>A quiet moment in the feed.</div>
                  <div className="meta" style={{ marginTop: 12 }}>Be the first to share a prayer need.</div>
                </Screen>
              )

            /* ===== JOURNAL TAB ===== */
            ) : tab === "journal" ? (
              <>
                {journal.map((e) => (
                  <Screen key={e.id}>
                    <div className="topRow"><div className="day">JOURNAL</div></div>
                    <div className="textWrap">
                      <CategoryPill category={e.category} />
                      <p className="prayText" style={{ fontStyle: 'italic' }}>{e.text}</p>
                      <div className="meta">{relativeTime(e.created)}</div>
                    </div>
                    <div className="actions">
                      <HoldButton onComplete={(elapsed) => handlePrayerComplete(e.id, elapsed)} />
                      <button className="bridgeLink" onClick={() => openCompose("feed", e.category, e.text, true)}>
                        Share with church <ArrowRight size={14} />
                      </button>
                      <button className={`bookmarkBtn ${bookmarks.includes(e.id) ? 'active' : ''}`} onClick={() => toggleBookmark(e.id)}>
                        <Bookmark size={20} fill={bookmarks.includes(e.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </Screen>
                ))}
                <Screen>
                  <div className="day" style={{ marginBottom: 24 }}>REFLECT</div>
                  <div className="promptGrid">
                    {PROMPTS.map((p, i) => (
                      <div key={i} className="promptCard" onClick={() => openCompose("journal", p.q, "", false, p.q)}>
                        <div className="pIcon">{p.icon}</div>
                        <div className="pText">{p.q}</div>
                        <div className="pDesc">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </Screen>
              </>

            /* ===== BOOKMARKS TAB ===== */
            ) : tab === "bookmarks" ? (
              bookmarksList.length > 0 ? (
                bookmarksList.map((item, i) => (
                  <Screen key={item.id}>
                    <div className="topRow">
                      <div className="day">BOOKMARK {i + 1} OF {bookmarksList.length}</div>
                    </div>
                    <div className="textWrap">
                      <CategoryPill category={item.category} />
                      <p className="prayText">{item.text}</p>
                      {item.created && <div className="meta">{relativeTime(item.created)}</div>}
                    </div>
                    <div className="actions">
                      <HoldButton onComplete={(elapsed) => handlePrayerComplete(item.id, elapsed)} />
                      <button className="bookmarkBtn active" onClick={() => toggleBookmark(item.id)}>
                        <Bookmark size={20} fill="currentColor" />
                      </button>
                    </div>
                    {i < bookmarksList.length - 1 && <div className="scrollHint"><ChevronDown size={18} /></div>}
                  </Screen>
                ))
              ) : (
                <Screen>
                  <Bookmark size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                  <div className="prayText" style={{ fontSize: 20 }}>No bookmarks yet.</div>
                  <div className="meta">Save prayers to find them here.</div>
                </Screen>
              )

            /* ===== PRAYER WALL TAB ===== */
            ) : (
              <>
                {wallList.length > 0 ? (
                  wallList.map((p, i) => (
                    <Screen key={p.id}>
                      <div className="topRow">
                        <div className="day">
                          {p.answered ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Sparkles size={12} color="var(--green)" /> ANSWERED
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Flame size={12} color="var(--gold)" /> STILL PRAYING
                            </span>
                          )}
                        </div>
                        <div className="wallTabs">
                          <button className={`wallTab ${wallFilter === 'answered' ? 'active' : ''}`} onClick={() => setWallFilter('answered')}>Answered</button>
                          <button className={`wallTab ${wallFilter === 'still' ? 'active' : ''}`} onClick={() => setWallFilter('still')}>Praying</button>
                          <button className={`wallTab ${wallFilter === 'all' ? 'active' : ''}`} onClick={() => setWallFilter('all')}>All</button>
                        </div>
                      </div>
                      <div className="textWrap">
                        <CategoryPill category={p.category} />
                        <p className="prayText">{p.text}</p>

                        {/* Answer testimony */}
                        {p.answered && p.answerNote && (
                          <div className="answerBanner">
                            <CheckCircle2 size={18} className="answerIcon" />
                            <div className="answerText">{p.answerNote}</div>
                          </div>
                        )}

                        <div className="authorRow">
                          <div className="avatar" style={{ background: `linear-gradient(135deg, ${CAT[p.category] || CAT.Other}cc, ${CAT[p.category] || CAT.Other})` }}>
                            {p.anon ? "?" : (p.author || "U")[0]}
                          </div>
                          <div className="authorText">{p.author} · {p.answered ? "Answered" : relativeTime(p.created)}</div>
                        </div>
                      </div>
                      {!p.answered && (
                        <div className="actions">
                          <HoldButton onComplete={(elapsed) => handlePrayerComplete(p.id, elapsed)} />
                        </div>
                      )}
                    </Screen>
                  ))
                ) : (
                  <Screen>
                    <div className="topRow">
                      <div className="day">{wallFilter === 'answered' ? 'ANSWERED' : wallFilter === 'still' ? 'STILL PRAYING' : 'ALL'}</div>
                      <div className="wallTabs">
                        <button className={`wallTab ${wallFilter === 'answered' ? 'active' : ''}`} onClick={() => setWallFilter('answered')}>Answered</button>
                        <button className={`wallTab ${wallFilter === 'still' ? 'active' : ''}`} onClick={() => setWallFilter('still')}>Praying</button>
                        <button className={`wallTab ${wallFilter === 'all' ? 'active' : ''}`} onClick={() => setWallFilter('all')}>All</button>
                      </div>
                    </div>
                    {wallFilter === 'answered' ? (
                      <>
                        <Sparkles size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                        <div className="prayText" style={{ fontSize: 20 }}>No answers recorded yet.</div>
                        <div className="meta">Celebrate when God moves.</div>
                      </>
                    ) : wallFilter === 'still' ? (
                      <>
                        <Heart size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                        <div className="prayText" style={{ fontSize: 20 }}>No expired prayers.</div>
                        <div className="meta">All prayers are still in the active feed.</div>
                      </>
                    ) : (
                      <>
                        <Wind size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                        <div className="prayText" style={{ fontSize: 20 }}>The wall is empty.</div>
                      </>
                    )}
                  </Screen>
                )}
              </>
            )}
        </div>
      </main>

      <button className="fab" onClick={() => openCompose("feed", "Other")}><Plus size={28} /></button>

      {/* ===== COMPOSE MODAL ===== */}
      {compose && (
        <Modal onClose={() => { setCompose(null); setIsFork(false); setComposePromptLabel(null); }}>
          <div className="sheetHead">
            <h3 className="sheetTitle">
              {isFork ? "Share with Your Church" : (compose === "journal" ? `Journal: ${composeCat}` : "Share a Need")}
            </h3>
            <button className="ghostBtn" onClick={() => { setCompose(null); setIsFork(false); setComposePromptLabel(null); }}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            {isFork && (
              <div className="forkNote">
                Edit this however you'd like before sharing. Your journal entry stays private.
              </div>
            )}
            {compose === "journal" && currentPrompt && (
              <div className="promptList">
                {currentPrompt.bullets.map((bullet, idx) => (
                  <div key={idx} className="promptItem">
                    <span className="promptBullet">•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="ta"
              value={composeText}
              onChange={(e) => setComposeText(e.target.value.slice(0, 500))}
              placeholder={compose === "journal" ? "Reflect here..." : "What do you need prayer for?"}
              autoFocus
            />
            <div className={`charCount ${composeText.length > 450 ? 'warn' : ''}`}>{composeText.length}/500</div>

            {!currentPrompt && (
              <div className="row">
                {Object.keys(CAT).map(c => (
                  <button key={c} className={`chip ${composeCat === c ? 'on' : ''}`} onClick={() => setComposeCat(c)}>{c}</button>
                ))}
              </div>
            )}

            {compose === "feed" && (
              <label className="check">
                <input type="checkbox" checked={composeAnon} onChange={() => setComposeAnon(!composeAnon)} style={{ accentColor: 'var(--gold)' }} />
                Post anonymously
              </label>
            )}

            <button className="primary" disabled={!composeText.trim()} onClick={submitCompose}>
              {compose === "journal" ? "Save to Journal" : "Share"}
            </button>
          </div>
        </Modal>
      )}

      {/* ===== MARK ANSWERED MODAL ===== */}
      {answerModal && (
        <Modal center onClose={() => setAnswerModal(null)}>
          <div className="sheetHead">
            <h3 className="sheetTitle">Mark as Answered</h3>
            <button className="ghostBtn" onClick={() => setAnswerModal(null)}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.5 }}>
              Share how God answered this prayer. Your testimony encourages the church.
            </div>
            <textarea
              className="ta"
              value={answerNote}
              onChange={(e) => setAnswerNote(e.target.value.slice(0, 300))}
              placeholder="How did God answer? (optional)"
              style={{ minHeight: 100 }}
              autoFocus
            />
            <div className={`charCount ${answerNote.length > 260 ? 'warn' : ''}`}>{answerNote.length}/300</div>
            <button className="primary" style={{ marginTop: 16 }} onClick={handleMarkAnswered}>
              Confirm Answered
            </button>
          </div>
        </Modal>
      )}

      {/* ===== POST UPDATE MODAL ===== */}
      {updateModal && (
        <Modal center onClose={() => setUpdateModal(null)}>
          <div className="sheetHead">
            <h3 className="sheetTitle">Post Update</h3>
            <button className="ghostBtn" onClick={() => setUpdateModal(null)}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.5 }}>
              Share an update on this prayer. Only people who prayed will see it.
            </div>
            <textarea
              className="ta"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value.slice(0, 300))}
              placeholder="What's the latest?"
              style={{ minHeight: 100 }}
              autoFocus
            />
            <div className={`charCount ${updateText.length > 260 ? 'warn' : ''}`}>{updateText.length}/300</div>
            <button className="primary" style={{ marginTop: 16 }} disabled={!updateText.trim()} onClick={handlePostUpdate}>
              Post Update
            </button>
          </div>
        </Modal>
      )}

      {/* ===== DASHBOARD ===== */}
      {dash && (
        <Modal center onClose={() => setDash(false)}>
          <div className="sheetHead">
            <div>
              <h3 className="sheetTitle">My Prayer Life</h3>
              <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Only you can see this</div>
            </div>
            <button className="ghostBtn" onClick={() => setDash(false)}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            {/* Period toggle */}
            <div className="dashToggle">
              {['day', 'week', 'year'].map(p => (
                <button key={p} className={`dashToggleBtn ${dashPeriod === p ? 'active' : ''}`} onClick={() => setDashPeriod(p)}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Church / Personal toggle */}
            <div className="dashToggle" style={{ marginTop: 0 }}>
              <button className={`dashToggleBtn ${dashTab === 'church' ? 'active' : ''}`} onClick={() => setDashTab('church')}>CHURCH</button>
              <button className={`dashToggleBtn ${dashTab === 'personal' ? 'active' : ''}`} onClick={() => setDashTab('personal')}>PERSONAL</button>
            </div>

            <div className="heroRingSection">
              {dashTab === 'church' ? (
                <div className="ringWrap">
                  <svg width="200" height="200">
                    <FitnessRing size={200} stroke={16} index={0} percentage={(aggregates.church.prayers / (goals.church.count * aggregates.multiplier)) * 100} color="#e06060" />
                    <FitnessRing size={200} stroke={16} index={1} percentage={(aggregates.church.time / (goals.church.mins * aggregates.multiplier)) * 100} color="#5b8db8" />
                    <FitnessRing size={200} stroke={16} index={2} percentage={(aggregates.church.needs / (goals.church.needs * aggregates.multiplier)) * 100} color="#2ea97a" />
                  </svg>
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <div className="statVal" style={{ fontSize: 32 }}>{fmtMin(aggregates.church.time)}</div>
                    <div className="statLabel">Time in Prayer</div>
                  </div>
                </div>
              ) : (
                <div className="ringWrap">
                  <svg width="200" height="200">
                    <FitnessRing size={200} stroke={16} index={0} percentage={(aggregates.personal.prayers / (goals.personal.count * aggregates.multiplier)) * 100} color="#c9a227" />
                    <FitnessRing size={200} stroke={16} index={1} percentage={(aggregates.personal.time / (goals.personal.mins * aggregates.multiplier)) * 100} color="#8b6caf" />
                  </svg>
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <div className="statVal" style={{ fontSize: 32 }}>{fmtMin(aggregates.personal.time)}</div>
                    <div className="statLabel">Time in Journal</div>
                  </div>
                </div>
              )}

              {/* Ring Legend */}
              <div className="ringLegend">
                {dashTab === 'church' ? (
                  <>
                    <div className="legendItem"><div className="legendDot" style={{ background: '#e06060' }} />Prayers</div>
                    <div className="legendItem"><div className="legendDot" style={{ background: '#5b8db8' }} />Minutes</div>
                    <div className="legendItem"><div className="legendDot" style={{ background: '#2ea97a' }} />Needs</div>
                  </>
                ) : (
                  <>
                    <div className="legendItem"><div className="legendDot" style={{ background: '#c9a227' }} />Entries</div>
                    <div className="legendItem"><div className="legendDot" style={{ background: '#8b6caf' }} />Minutes</div>
                  </>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="dashGrid" style={{ marginTop: 20 }}>
              {dashTab === 'church' ? (
                <>
                  <div className="stat"><div className="statLabel">Prayers</div><div className="statVal">{aggregates.church.prayers}</div></div>
                  <div className="stat"><div className="statLabel">Needs Covered</div><div className="statVal">{aggregates.church.needs}</div></div>
                </>
              ) : (
                <>
                  <div className="stat"><div className="statLabel">Entries</div><div className="statVal">{aggregates.personal.prayers}</div></div>
                  <div className="stat"><div className="statLabel">Time</div><div className="statVal">{fmtMin(aggregates.personal.time)}</div></div>
                </>
              )}
            </div>

            {/* 14-Day Trend Sparkline */}
            <div className="sparkSection">
              <div className="sparkLabel">14-Day Prayer Trend (minutes)</div>
              <Sparkline points={trendData} />
            </div>

            {/* Combined Total */}
            <div className="combinedTotal">
              <div className="combinedLabel">Combined Total ({dashPeriod})</div>
              <div className="combinedVal">{aggregates.combined.prayers} prayers · {fmtMin(aggregates.combined.time)}</div>
            </div>

            <button className="primary" style={{ marginTop: 24 }} onClick={() => setDash(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
