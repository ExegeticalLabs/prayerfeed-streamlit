import React, { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */
const PRAYERS = [
  { id: 1, author: "Sarah M.", cat: "Health", text: "Please pray for my mom's surgery tomorrow morning. She's having a double bypass and she's scared. We trust God's plan but could use your prayers for the surgical team and a smooth recovery.", time: "2h ago", day: 1, pc: 47, pm: 192, mine: false, ans: false, anon: false },
  { id: 2, author: "A Church Member", cat: "Family", text: "Going through a really difficult season in my marriage. We're both believers but struggling to communicate. Praying for restoration and wisdom.", time: "5h ago", day: 2, pc: 31, pm: 98, mine: false, ans: false, anon: true },
  { id: 3, author: "James K.", cat: "Work", text: "I was laid off last Friday after 12 years. Feeling lost but trusting God has a plan. Prayers for provision and for the right doors to open.", time: "8h ago", day: 3, pc: 63, pm: 287, mine: false, ans: false, anon: false },
  { id: 4, author: "You", cat: "Health", text: "Asking for prayers as I deal with some ongoing back pain that's been affecting my ability to work and be present with my family. Trusting God for healing.", time: "1d ago", day: 4, pc: 38, pm: 156, mine: true, ans: false, anon: false },
  { id: 5, author: "David R.", cat: "Spiritual", text: "Asking for prayer as I prepare to lead our youth group through a study on identity in Christ. Pray that the students' hearts would be open.", time: "2d ago", day: 5, pc: 28, pm: 67, mine: false, ans: false, anon: false },
  { id: 6, author: "Elder Thomas", cat: "Spiritual", text: "Pray for our church's unity this season as we navigate changes in leadership. May God's wisdom guide every decision and every conversation.", time: "3d ago", day: 6, pc: 55, pm: 230, mine: false, ans: false, anon: false },
];

const JOURNAL = [
  { id: 101, text: "Lord, give me patience with the kids this week. Help me be the dad they need.", cat: "Family", created: "Today", ans: false },
  { id: 102, text: "Praying for Jessica's work situation — the staffing changes are stressing her out. Give her wisdom and peace.", cat: "Family", created: "2 days ago", ans: false },
  { id: 103, text: "Thank you for Mia's safety. Continue to watch over her wherever she goes.", cat: "Gratitude", created: "4 days ago", ans: false },
];

const PROMPTS = [
  { icon: "🏠", q: "What's been weighing on your family lately?" },
  { icon: "💼", q: "Any work struggles you need to bring before God?" },
  { icon: "🙏", q: "How has your personal time in God's word been?" },
  { icon: "💛", q: "What do you have to be thankful for right now?" },
  { icon: "🤝", q: "Any friends or neighbors on your heart?" },
  { icon: "⚔️", q: "What personal struggle needs God's strength today?" },
];

const CC = { Health: "#e06060", Family: "#5b8db8", Work: "#c9a227", Gratitude: "#5a9e6f", Spiritual: "#8b6caf", Other: "#7a8a9a" };
const GOLD = "rgba(200,180,140,";
const fmtTime = m => m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60 > 0 ? m%60+'m':''}`;

/* ═══════════════════════════════════════════
   RING
   ═══════════════════════════════════════════ */
function Ring({ pct, size, sw, color, children }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={c - Math.min(pct, 1) * c} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOLD-TO-PRAY BUTTON (FIXED)
   ═══════════════════════════════════════════ */
function PrayButton({ onRecord, disabled }) {
  const [active, setActive] = useState(false);
  const [secs, setSecs] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const activeRef = useRef(false);

  const tick = useCallback(() => {
    if (!activeRef.current || !startRef.current) return;
    const elapsed = (Date.now() - startRef.current) / 1000;
    setSecs(elapsed);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    activeRef.current = true;
    setActive(true);
    setSecs(0);
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, disabled]);

  const stop = useCallback((e) => {
    if (!activeRef.current) return;
    e?.preventDefault();
    activeRef.current = false;
    setActive(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const elapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : 0;
    startRef.current = null;
    if (elapsed >= 0.5) onRecord(Math.round(elapsed));
    setSecs(0);
  }, [onRecord]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const displaySec = Math.floor(secs);
  const pulse = active ? Math.sin(secs * 1.5) * 0.15 + 0.85 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
      {/* Outer breathing ring */}
      {active && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 130, height: 130, borderRadius: "50%",
          border: `2px solid ${GOLD}${(pulse * 0.4).toFixed(2)})`,
          transform: `translate(-50%, -50%) scale(${0.9 + pulse * 0.25})`,
          transition: "none", pointerEvents: "none",
        }} />
      )}
      {active && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 160, height: 160, borderRadius: "50%",
          border: `1px solid ${GOLD}${(pulse * 0.15).toFixed(2)})`,
          transform: `translate(-50%, -50%) scale(${0.85 + pulse * 0.3})`,
          transition: "none", pointerEvents: "none",
        }} />
      )}
      <button
        onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchEnd={stop} onTouchCancel={stop}
        style={{
          width: active ? 96 : 80, height: active ? 96 : 80,
          borderRadius: "50%",
          background: active
            ? `radial-gradient(circle, ${GOLD}0.3) 0%, ${GOLD}0.08) 60%, transparent 100%)`
            : `radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 70%)`,
          border: active ? `2px solid ${GOLD}0.6)` : `1.5px solid rgba(255,255,255,0.15)`,
          cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transition: "width 0.4s ease, height 0.4s ease, background 0.4s ease, border 0.4s ease, box-shadow 0.4s ease",
          boxShadow: active ? `0 0 50px ${GOLD}0.2), 0 0 100px ${GOLD}0.08)` : "none",
          userSelect: "none", WebkitUserSelect: "none",
          position: "relative", zIndex: 2, touchAction: "none",
        }}
      >
        {active ? (
          <span style={{ fontSize: 22, fontWeight: 300, color: `${GOLD}0.95)`, fontFamily: "'Cormorant Garamond', serif" }}>
            {displaySec}s
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={`${GOLD}0.5)`} strokeWidth="1.5">
              <path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"/>
            </svg>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3, letterSpacing: 1, textTransform: "uppercase" }}>Hold</span>
          </>
        )}
      </button>
      {active && (
        <span style={{ fontSize: 12, color: `${GOLD}0.4)`, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
          praying...
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FULL-SCREEN PRAYER CARD
   ═══════════════════════════════════════════ */
function PrayerScreen({ prayer, onRecord, idx, total, onShareJournal, isJournal }) {
  const cc = CC[prayer.cat] || CC.Other;
  const [glow, setGlow] = useState(false);

  const handleRecord = useCallback((s) => {
    setGlow(true);
    setTimeout(() => setGlow(false), 1500);
    onRecord(prayer.id, s);
  }, [prayer.id, onRecord]);

  return (
    <div style={{
      height: "100%", width: "100%", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", padding: "70px 28px 80px",
      position: "relative", scrollSnapAlign: "start",
    }}>
      {/* Glow effect after prayer recorded */}
      {glow && <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 60%, ${GOLD}0.08) 0%, transparent 70%)`,
        animation: "glowFade 1.5s ease-out forwards",
      }} />}

      {/* Day indicator */}
      {!isJournal && (
        <div style={{ position: "absolute", top: 16, right: 20, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1.2, fontFamily: "'Cormorant Garamond', serif" }}>
          DAY {prayer.day} OF 7
        </div>
      )}

      {isJournal && (
        <div style={{ fontSize: 10, fontWeight: 600, color: `${GOLD}0.35)`, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
          Personal Prayer
        </div>
      )}

      {/* Category */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 28,
        padding: "5px 14px", borderRadius: 20, background: `${cc}18`, border: `1px solid ${cc}35`,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: cc }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: cc, letterSpacing: 1.4, textTransform: "uppercase" }}>{prayer.cat}</span>
      </div>

      {/* Prayer text */}
      <p style={{
        fontSize: 21, lineHeight: 1.75, color: "rgba(255,255,255,0.9)",
        textAlign: "center", maxWidth: 360, margin: "0 0 28px",
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
        fontStyle: isJournal ? "italic" : "normal",
      }}>
        {prayer.text}
      </p>

      {/* Author / meta */}
      {!isJournal && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: prayer.anon ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${cc}bb, ${cc})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, fontWeight: 700,
          }}>
            {prayer.anon ? "?" : prayer.author[0]}
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'Cormorant Garamond', serif" }}>
            {prayer.author} · {prayer.time}
          </span>
        </div>
      )}
      {isJournal && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginBottom: 28 }}>{prayer.created}</span>
      )}

      {/* Poster-only stats */}
      {prayer.mine && !isJournal && (
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 24px",
          marginBottom: 24, border: `1px solid rgba(255,255,255,0.06)`, textAlign: "center",
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: `${GOLD}0.5)`, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            Your prayer's support
          </div>
          <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
            <div>
              <span style={{ fontSize: 26, fontWeight: 300, color: `${GOLD}0.85)`, fontFamily: "'Cormorant Garamond', serif" }}>{prayer.pc}</span>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>prayed</div>
            </div>
            <div>
              <span style={{ fontSize: 26, fontWeight: 300, color: `${GOLD}0.85)`, fontFamily: "'Cormorant Garamond', serif" }}>{fmtTime(prayer.pm)}</span>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>in prayer</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {prayer.mine && !isJournal ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "none", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 22, padding: "10px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.5 }}>Update</button>
          <button style={{ background: "none", border: `1px solid rgba(90,158,111,0.25)`, borderRadius: 22, padding: "10px 20px", fontSize: 12, fontWeight: 600, color: "#5a9e6f", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.5 }}>Answered</button>
        </div>
      ) : isJournal ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <PrayButton onRecord={handleRecord} />
          <button onClick={() => onShareJournal && onShareJournal(prayer.text, prayer.cat)} style={{
            background: "none", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 20,
            padding: "8px 18px", fontSize: 11, color: "rgba(255,255,255,0.3)", cursor: "pointer",
            fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.8,
            transition: "all 0.3s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = `${GOLD}0.7)`; e.currentTarget.style.borderColor = `${GOLD}0.3)`; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          >
            Share with church →
          </button>
        </div>
      ) : (
        <PrayButton onRecord={handleRecord} />
      )}

      {/* Scroll hint */}
      {idx < total - 1 && (
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          animation: "bob 2.5s ease-in-out infinite", opacity: 0.2,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPOSE MODAL
   ═══════════════════════════════════════════ */
function Compose({ onClose, onSubmit, mode, initText, initCat }) {
  const [text, setText] = useState(initText || "");
  const [cat, setCat] = useState(initCat || "Other");
  const [priv, setPriv] = useState(false);
  const isJ = mode === "journal";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(180deg, #1a2332, #12171f)", borderRadius: "22px 22px 0 0",
        width: "100%", maxWidth: 480, padding: "26px 22px 34px",
        animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)",
        border: "1px solid rgba(255,255,255,0.05)", borderBottom: "none",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: `${GOLD}0.85)`, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
            {isJ ? "New Journal Entry" : mode === "bridge" ? "Share with Your Church" : "Share a Prayer Need"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(255,255,255,0.25)", cursor: "pointer" }}>×</button>
        </div>

        {mode === "bridge" && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "0 0 14px", fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif" }}>
            Edit this however you'd like before sharing. Your journal entry stays private.
          </p>
        )}

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={isJ ? "What's on your heart today..." : "Share what's on your heart..."}
          style={{
            width: "100%", minHeight: 110, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            padding: 14, fontSize: 15, fontFamily: "'Cormorant Garamond', serif",
            color: "rgba(255,255,255,0.8)", resize: "vertical", outline: "none",
            boxSizing: "border-box", lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = `${GOLD}0.35)`}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
        />

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "14px 0" }}>
          {Object.keys(CC).filter(c => c !== "Other").map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "4px 13px", borderRadius: 18, fontSize: 10, fontWeight: 600,
              border: cat === c ? `1.5px solid ${CC[c]}` : "1px solid rgba(255,255,255,0.08)",
              background: cat === c ? `${CC[c]}18` : "transparent",
              color: cat === c ? CC[c] : "rgba(255,255,255,0.3)",
              cursor: "pointer", letterSpacing: 0.8, textTransform: "uppercase",
            }}>{c}</button>
          ))}
        </div>

        {!isJ && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", marginBottom: 18 }}>
            <input type="checkbox" checked={priv} onChange={() => setPriv(!priv)} style={{ accentColor: "#c8b48c" }} />
            Keep my name private (elders still see you)
          </label>
        )}

        <button onClick={() => { if (text.trim()) onSubmit({ text, cat, priv, isJ }); }} style={{
          width: "100%", padding: "13px", borderRadius: 12,
          background: text.trim() ? `linear-gradient(135deg, ${GOLD}0.25), ${GOLD}0.12))` : "rgba(255,255,255,0.03)",
          color: text.trim() ? `${GOLD}0.9)` : "rgba(255,255,255,0.15)",
          fontSize: 14, fontWeight: 600, cursor: text.trim() ? "pointer" : "default",
          fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.8,
          border: text.trim() ? `1px solid ${GOLD}0.25)` : "1px solid rgba(255,255,255,0.04)",
        }}>
          {isJ ? "Add to Journal" : "Submit Prayer"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function Dashboard({ stats, onClose }) {
  const [period, setPeriod] = useState("week");
  const d = stats[period];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(180deg, #1a2332, #12171f)", borderRadius: 22,
        width: "100%", maxWidth: 400, padding: "28px 24px 24px", margin: "0 16px",
        animation: "fadeIn 0.35s ease", border: "1px solid rgba(255,255,255,0.05)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <h3 style={{ margin: 0, fontSize: 19, color: `${GOLD}0.85)`, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>My Prayer Life</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "rgba(255,255,255,0.25)", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: 1.2, textTransform: "uppercase" }}>Only you can see this</p>

        {/* Period selector */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 3, marginBottom: 22 }}>
          {["day", "week", "year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
              fontFamily: "'Cormorant Garamond', serif",
              background: period === p ? "rgba(255,255,255,0.06)" : "transparent",
              color: period === p ? `${GOLD}0.85)` : "rgba(255,255,255,0.25)",
              transition: "all 0.25s",
            }}>{p}</button>
          ))}
        </div>

        {/* Church + Personal rings side by side */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
          {/* Church rings */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Ring pct={d.churchPrayers / d.churchGoalP} size={100} sw={7} color="#e06060">
              <Ring pct={d.churchMins / d.churchGoalM} size={76} sw={7} color="#5b8db8">
                <Ring pct={d.churchNeeds / d.churchGoalN} size={52} sw={7} color="#5a9e6f">
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>⛪</span>
                </Ring>
              </Ring>
            </Ring>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8 }}>Church</span>
          </div>
          {/* Personal rings */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Ring pct={d.personalPrayers / d.personalGoalP} size={100} sw={7} color="#c9a227">
              <Ring pct={d.personalMins / d.personalGoalM} size={76} sw={7} color="#8b6caf">
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>🙏</span>
              </Ring>
            </Ring>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8 }}>Personal</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 18, padding: "0 8px" }}>
          {[
            ["#e06060", `${d.churchPrayers}`, "church prayers"],
            ["#c9a227", `${d.personalPrayers}`, "personal prayers"],
            ["#5b8db8", fmtTime(d.churchMins), "church time"],
            ["#8b6caf", fmtTime(d.personalMins), "personal time"],
            ["#5a9e6f", `${d.churchNeeds}`, "needs covered"],
          ].map(([c, v, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Cormorant Garamond', serif" }}>
                <b style={{ color: "rgba(255,255,255,0.7)" }}>{v}</b> {l}
              </span>
            </div>
          ))}
        </div>

        {/* Total summary */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>
            TOTAL: {d.churchPrayers + d.personalPrayers} prayers · {fmtTime(d.churchMins + d.personalMins)} in prayer
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function PrayerFeedApp() {
  const [tab, setTab] = useState("feed");
  const [prayers, setPrayers] = useState(PRAYERS);
  const [journal, setJournal] = useState(JOURNAL);
  const [compose, setCompose] = useState(null);
  const [showDash, setShowDash] = useState(false);
  const [notif, setNotif] = useState(null);
  const [bridgeText, setBridgeText] = useState("");
  const [bridgeCat, setBridgeCat] = useState("Other");

  const [stats, setStats] = useState({
    day: { churchPrayers: 3, churchMins: 8, churchNeeds: 3, churchGoalP: 5, churchGoalM: 15, churchGoalN: 5, personalPrayers: 1, personalMins: 4, personalGoalP: 3, personalGoalM: 10 },
    week: { churchPrayers: 12, churchMins: 34, churchNeeds: 8, churchGoalP: 15, churchGoalM: 45, churchGoalN: 10, personalPrayers: 6, personalMins: 18, personalGoalP: 10, personalGoalM: 30 },
    year: { churchPrayers: 412, churchMins: 1840, churchNeeds: 189, churchGoalP: 500, churchGoalM: 2000, churchGoalN: 200, personalPrayers: 280, personalMins: 960, personalGoalP: 365, personalGoalM: 1200 },
  });

  const flash = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 2500); };

  const handleRecord = useCallback((id, secs) => {
    const isJournalPrayer = journal.some(j => j.id === id);
    const minAdd = Math.max(1, Math.round(secs / 60));
    setStats(prev => {
      const updated = { ...prev };
      ["day", "week", "year"].forEach(p => {
        updated[p] = { ...prev[p] };
        if (isJournalPrayer) {
          updated[p].personalPrayers = prev[p].personalPrayers + 1;
          updated[p].personalMins = prev[p].personalMins + minAdd;
        } else {
          updated[p].churchPrayers = prev[p].churchPrayers + 1;
          updated[p].churchMins = prev[p].churchMins + minAdd;
        }
      });
      return updated;
    });
    flash(`Prayer recorded · ${secs}s`);
  }, [journal]);

  const handleSubmit = ({ text, cat, priv, isJ }) => {
    if (isJ) {
      setJournal([{ id: Date.now(), text, cat, created: "Just now", ans: false }, ...journal]);
      flash("Added to your prayer journal");
    } else {
      setPrayers([{ id: Date.now(), author: priv ? "A Church Member" : "You", cat, text, time: "Just now", day: 1, pc: 0, pm: 0, mine: true, ans: false, anon: priv }, ...prayers]);
      flash("Prayer request shared with your church");
    }
    setCompose(null); setBridgeText(""); setBridgeCat("Other");
  };

  const handleShareJournal = (text, cat) => {
    setBridgeText(text);
    setBridgeCat(cat);
    setCompose("bridge");
  };

  const activePrayers = prayers.filter(p => !p.ans);
  const answeredPrayers = prayers.filter(p => p.ans);

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", height: "100vh",
      background: "linear-gradient(160deg, #0b0f14 0%, #111820 40%, #0b0f14 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes bob { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(5px); } }
        @keyframes glowFade { from { opacity:1; } to { opacity:0; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "14px 20px 10px",
        background: "linear-gradient(180deg, rgba(11,15,20,0.97) 0%, rgba(11,15,20,0.7) 60%, transparent 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: `${GOLD}0.8)`, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 }}>
            Grace Community
          </h1>
          <button onClick={() => setShowDash(true)} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18, padding: "5px 12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={`${GOLD}0.5)`} strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 10, color: `${GOLD}0.5)`, letterSpacing: 0.5 }}>My Prayer Life</span>
          </button>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
          {[["feed", "Prayers"], ["journal", "Journal"], ["wall", "Answered"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none", letterSpacing: 1,
              fontFamily: "'Cormorant Garamond', serif",
              color: tab === k ? `${GOLD}0.85)` : "rgba(255,255,255,0.2)",
              borderBottom: tab === k ? `1.5px solid ${GOLD}0.45)` : "1.5px solid transparent",
              transition: "all 0.25s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* NOTIFICATION */}
      {notif && (
        <div style={{
          position: "absolute", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          padding: "9px 22px", borderRadius: 18,
          background: "rgba(90,158,111,0.12)", border: "1px solid rgba(90,158,111,0.25)",
          color: "rgba(90,158,111,0.85)", fontSize: 12, fontWeight: 500,
          animation: "fadeIn 0.3s ease", backdropFilter: "blur(8px)",
          fontFamily: "'Cormorant Garamond', serif", letterSpacing: 0.5,
        }}>{notif}</div>
      )}

      {/* FEED */}
      {tab === "feed" && (
        <div style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {activePrayers.map((p, i) => (
            <div key={p.id} style={{ height: "100vh", scrollSnapAlign: "start" }}>
              <PrayerScreen prayer={p} idx={i} total={activePrayers.length} onRecord={handleRecord} />
            </div>
          ))}
        </div>
      )}

      {/* JOURNAL */}
      {tab === "journal" && (
        <div style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {journal.length === 0 ? (
            <div style={{ height: "100vh", scrollSnapAlign: "start", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.25)", textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                Your prayer journal is empty.<br />Tap + to start.
              </p>
            </div>
          ) : (
            journal.map((j, i) => (
              <div key={j.id} style={{ height: "100vh", scrollSnapAlign: "start" }}>
                <PrayerScreen prayer={j} idx={i} total={journal.length + 1} onRecord={handleRecord} isJournal onShareJournal={handleShareJournal} />
              </div>
            ))
          )}
          {/* Prompts page */}
          <div style={{ height: "100vh", scrollSnapAlign: "start", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 28px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: `${GOLD}0.3)`, letterSpacing: 2, textTransform: "uppercase", marginBottom: 28 }}>
              What should you pray about?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
              {PROMPTS.map((pr, i) => (
                <button key={i} onClick={() => { setBridgeText(pr.q + "\n\n"); setCompose("journal"); }} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14, padding: "14px 16px", cursor: "pointer", textAlign: "left",
                  transition: "all 0.3s", display: "flex", alignItems: "center", gap: 10,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = `${GOLD}0.2)`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  <span style={{ fontSize: 16 }}>{pr.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "'Cormorant Garamond', serif" }}>{pr.q}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANSWERED WALL */}
      {tab === "wall" && (
        <div style={{ height: "100vh", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none" }}>
          {answeredPrayers.length === 0 ? (
            <div style={{ height: "100vh", scrollSnapAlign: "start", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.4 }}>🕊️</div>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.25)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                No answered prayers yet. They're coming.
              </p>
            </div>
          ) : answeredPrayers.map((p, i) => (
            <div key={p.id} style={{ height: "100vh", scrollSnapAlign: "start" }}>
              <PrayerScreen prayer={p} idx={i} total={answeredPrayers.length} onRecord={handleRecord} />
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setCompose(tab === "journal" ? "journal" : "feed")} style={{
        position: "absolute", bottom: 24, right: 24,
        width: 48, height: 48, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}0.2)`,
        color: `${GOLD}0.6)`, fontSize: 22, fontWeight: 300,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 40, backdropFilter: "blur(8px)", transition: "all 0.3s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}0.1)`; e.currentTarget.style.borderColor = `${GOLD}0.35)`; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${GOLD}0.2)`; }}
      >+</button>

      {/* MODALS */}
      {compose && (
        <Compose
          mode={compose}
          initText={compose === "bridge" || compose === "journal" ? bridgeText : ""}
          initCat={compose === "bridge" ? bridgeCat : "Other"}
          onClose={() => { setCompose(null); setBridgeText(""); setBridgeCat("Other"); }}
          onSubmit={handleSubmit}
        />
      )}
      {showDash && <Dashboard stats={stats} onClose={() => setShowDash(false)} />}
    </div>
  );
}
