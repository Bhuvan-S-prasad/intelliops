"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, UserButton } from "@clerk/nextjs";

/* ─── Scroll-reveal hook ─── */
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
};

/* ─── Reveal wrapper ─── */
const Reveal = ({
  children,
  delay = 0,
  style: extraStyle = {},
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) => {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
};

/* ─── Animated metric counter ─── */
const MetricTicker = ({
  label,
  value,
  unit,
  delay = 0,
}: {
  label: string;
  value: number;
  unit: string;
  delay?: number;
}) => {
  const [display, setDisplay] = useState(0);
  const [ref, inView] = useInView();

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.floor(eased * value));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [inView, value, delay]);

  return (
    <div ref={ref} style={{ borderTop: "1px solid #27272a", padding: "24px 0" }}>
      <div
        style={{
          fontSize: 11,
          color: "#52525b",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#f4f4f5",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {display.toLocaleString()}
        </span>
        <span style={{ fontSize: 16, color: "#6366f1" }}>{unit}</span>
      </div>
    </div>
  );
};

/* ─── Terminal command row ─── */
const CommandRow = ({
  cmd,
  result,
  delay,
}: {
  cmd: string;
  result: string | null;
  delay: number;
}) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!show) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#6366f1", fontFamily: "monospace", fontSize: 13 }}>›</span>
        <span style={{ color: "#e4e4e7", fontFamily: "monospace", fontSize: 13 }}>{cmd}</span>
      </div>
      {result && (
        <div
          style={{
            marginLeft: 18,
            marginTop: 4,
            color: "#52525b",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
};

/* ─── Stable bar heights (no Math.random in render) ─── */
const BAR_HEIGHTS = [
  32, 48, 28, 52, 38, 44, 36, 58, 42, 30, 50, 46, 34, 40, 54, 38, 28, 48, 36, 52, 44, 30, 56, 40,
  34, 48, 42, 38, 50, 44, 32, 40, 56, 62, 70, 68, 64, 58, 46, 42, 38, 44, 36, 52, 40, 34, 48, 30,
];

/* ─── Workspace SVG node ─── */
const WorkspaceNode = ({
  label,
  x,
  y,
  type,
}: {
  label: string;
  x: number;
  y: number;
  type: "hub" | "team" | "agent";
}) => {
  const fills = { hub: "#6366f1", team: "#3f3f46", agent: "#18181b" };
  const strokes = { hub: "#818cf8", team: "#3f3f46", agent: "#27272a" };
  const sizes = { hub: 10, team: 7, agent: 5 };
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={sizes[type] ?? 6}
        fill={fills[type] ?? "#27272a"}
        stroke={strokes[type] ?? "#27272a"}
        strokeWidth={type === "hub" ? 1.5 : 0.5}
      />
      {label && (
        <text
          x={x}
          y={y - 14}
          textAnchor="middle"
          fill="#71717a"
          fontSize="9"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function IntelliOpsLanding() {
  const { isSignedIn } = useUser();
  const [scrollY, setScrollY] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [activeTab, setActiveTab] = useState(0);
  const [mounted, setMounted] = useState(false);

  const handleScroll = useCallback(() => setScrollY(window.scrollY), []);
  const handleMouse = useCallback(
    (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY }),
    []
  );

  useEffect(() => {
    setMounted(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [handleScroll, handleMouse]);

  const navScrolled = mounted && scrollY > 40;
  const tabs = ["Orchestration", "Agents", "Intelligence", "Workspaces"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #09090b; }
        ::selection { background: #6366f1; color: #fff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scan    { 0%{transform:translateY(-2px)} 100%{transform:translateY(100vh)} }
        @keyframes pulse   { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .intelliops-nav-link {
          color: #71717a; text-decoration: none; font-size: 14px; transition: color .2s;
        }
        .intelliops-nav-link:hover { color: #f4f4f5; }
        .intelliops-cta-btn {
          background: #6366f1; color: #fff; padding: 8px 18px;
          border-radius: 4px; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: background .2s; display: inline-block;
        }
        .intelliops-cta-btn:hover { background: #818cf8; }
      `}</style>

      <div
        style={{
          background: "#09090b",
          color: "#f4f4f5",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          overflowX: "hidden",
        }}
      >
        {/* Custom cursor — client only */}
        {mounted && (
          <div
            style={{
              position: "fixed",
              pointerEvents: "none",
              zIndex: 9999,
              width: 6,
              height: 6,
              background: "#6366f1",
              borderRadius: "50%",
              left: cursorPos.x,
              top: cursorPos.y,
              transform: "translate(-50%,-50%)",
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* ══ NAV ══ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            height: 60,
            borderBottom: navScrolled ? "1px solid #18181b" : "1px solid transparent",
            background: navScrolled ? "rgba(9,9,11,.9)" : "transparent",
            backdropFilter: navScrolled ? "blur(12px)" : "none",
            transition: "border-color .3s, background .3s",
            padding: "0 48px",
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <div style={{ width: 20, height: 20, position: "relative", flexShrink: 0 }}>
              <div
                style={{ width: 8, height: 8, background: "#6366f1", position: "absolute", top: 0, left: 0 }}
              />
              <div
                style={{ width: 8, height: 8, background: "#3f3f46", position: "absolute", bottom: 0, right: 0 }}
              />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>IntelliOps</span>
          </div>
          {["Platform", "Agents", "Enterprise", "Docs"].map((l) => (
            <Link key={l} href="/" className="intelliops-nav-link">
              {l}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginLeft: "auto" }}>
            {mounted && isSignedIn ? (
              <>
                <Link href="/dashboard" className="intelliops-cta-btn">
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <Link href="/sign-in" className="intelliops-cta-btn">
                Sign in
              </Link>
            )}
          </div>
        </nav>

        {/* ══ HERO ══ */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            padding: "120px 48px 80px",
            overflow: "hidden",
          }}
        >
          {/* Grid background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(#18181b 1px, transparent 1px), linear-gradient(90deg, #18181b 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              opacity: 0.5,
            }}
          />
          {/* Scan line — client only to avoid hydration mismatch */}
          {mounted && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 1,
                background: "linear-gradient(90deg, transparent, #6366f1, transparent)",
                opacity: 0.5,
                animation: "scan 7s linear infinite",
              }}
            />
          )}

          <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 420px",
                gap: 80,
                alignItems: "center",
              }}
            >
              {/* Left — headline */}
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #27272a",
                    borderRadius: 2,
                    padding: "6px 14px",
                    marginBottom: 40,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                      animation: mounted ? "pulse 2s ease infinite" : "none",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#71717a", letterSpacing: "0.06em" }}>
                    OPERATIONAL INTELLIGENCE LAYER
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: "clamp(48px, 6vw, 84px)",
                    fontWeight: 600,
                    lineHeight: 1.0,
                    letterSpacing: "-0.04em",
                    marginBottom: 32,
                    color: "#fafafa",
                  }}
                >
                  The operating
                  <br />
                  <span style={{ color: "#6366f1" }}>system</span> for
                  <br />
                  modern teams.
                </h1>

                <p
                  style={{
                    fontSize: 18,
                    color: "#71717a",
                    lineHeight: 1.7,
                    maxWidth: 480,
                    marginBottom: 48,
                  }}
                >
                  IntelliOps unifies workspaces, projects, knowledge, AI agents, and workflows into
                  a single operational layer — replacing fragmented tooling with cohesive
                  intelligence.
                </p>

                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    style={{
                      background: "#6366f1",
                      color: "#fff",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: 4,
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Request early access
                  </button>
                  <button
                    style={{
                      background: "transparent",
                      color: "#71717a",
                      border: "1px solid #27272a",
                      padding: "14px 28px",
                      borderRadius: 4,
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    See it in action →
                  </button>
                </div>
              </div>

              {/* Right — terminal */}
              <div
                style={{
                  background: "#0c0c0e",
                  border: "1px solid #1c1c1e",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #18181b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {["#3f3f46", "#3f3f46", "#3f3f46"].map((c, i) => (
                    <div
                      key={i}
                      style={{ width: 10, height: 10, borderRadius: "50%", background: c }}
                    />
                  ))}
                  <span
                    style={{
                      fontSize: 12,
                      color: "#52525b",
                      marginLeft: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    intelliops — command center
                  </span>
                </div>
                <div style={{ padding: "20px 20px 20px" }}>
                  <CommandRow
                    cmd="ops init workspace --team=engineering"
                    result="→ Workspace initialized · 4 agents deployed"
                    delay={400}
                  />
                  <CommandRow
                    cmd="ops run agent --task=incident-triage"
                    result="→ Scanning 847 signals · Prioritizing 3 critical"
                    delay={1200}
                  />
                  <CommandRow
                    cmd="ops knowledge index --source=confluence"
                    result="→ 12,400 documents indexed · Embeddings ready"
                    delay={2100}
                  />
                  <CommandRow
                    cmd="ops workflow trigger --id=deploy"
                    result="→ Pipeline started · ETA 4m 30s"
                    delay={3000}
                  />
                  <CommandRow cmd="ops status" result={null} delay={4000} />

                  <div
                    style={{
                      marginTop: 8,
                      padding: "12px 16px",
                      background: "#0f0f12",
                      borderRadius: 4,
                    }}
                  >
                    {[
                      ["Agents active", "12 / 12"],
                      ["Workflows running", "8"],
                      ["Signals processed", "2,847"],
                      ["Uptime", "99.97%"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
                      >
                        <span style={{ color: "#52525b" }}>{k}</span>
                        <span style={{ color: "#a1a1aa" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {mounted && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: 16,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#6366f1", fontFamily: "monospace", fontSize: 13 }}>
                        ›
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 13, color: "#e4e4e7" }}>
                        _
                      </span>
                      <span
                        style={{
                          animation: "blink 1s step-end infinite",
                          color: "#6366f1",
                          fontFamily: "monospace",
                        }}
                      >
                        |
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div
            style={{
              position: "absolute",
              bottom: 48,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#3f3f46", letterSpacing: "0.08em" }}>SCROLL</span>
            <div
              style={{
                width: 1,
                height: 40,
                background: "linear-gradient(to bottom, #6366f1, transparent)",
              }}
            />
          </div>
        </section>

        {/* ══ CHAOS → CLARITY ══ */}
        <section style={{ padding: "120px 48px", borderTop: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <div
                  style={{ background: "#0c0c0e", padding: "48px", borderRadius: "4px 0 0 4px" }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      color: "#3f3f46",
                      marginBottom: 24,
                    }}
                  >
                    BEFORE
                  </div>
                  <h3
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "#52525b",
                      marginBottom: 32,
                      lineHeight: 1.3,
                    }}
                  >
                    Scattered tools.
                    <br />
                    Fractured context.
                  </h3>
                  {[
                    "Slack for comms",
                    "Notion for docs",
                    "Jira for tasks",
                    "Custom automation scripts",
                    "3 different AI tools",
                    "No unified view",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "#111113",
                        border: "1px solid #1c1c1e",
                        borderRadius: 4,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#3f3f46",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, color: "#52525b" }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    background: "#0d0d14",
                    padding: "48px",
                    borderRadius: "0 4px 4px 0",
                    borderLeft: "1px solid #1e1e2e",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      color: "#6366f1",
                      marginBottom: 24,
                    }}
                  >
                    AFTER INTELLIOPS
                  </div>
                  <h3
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "#a5b4fc",
                      marginBottom: 32,
                      lineHeight: 1.3,
                    }}
                  >
                    Unified operations.
                    <br />
                    Ambient intelligence.
                  </h3>
                  {[
                    "Single operational layer",
                    "Context-aware knowledge",
                    "AI-native task orchestration",
                    "Automated workflow intelligence",
                    "Unified AI agent platform",
                    "Real-time operational view",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "#12121a",
                        border: "1px solid #1e1e2e",
                        borderRadius: 4,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#6366f1",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, color: "#a1a1aa" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ METRICS ══ */}
        <section
          style={{
            padding: "80px 48px",
            borderTop: "1px solid #18181b",
            borderBottom: "1px solid #18181b",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 48,
            }}
          >
            <MetricTicker label="Signals processed daily" value={2400000} unit="+" delay={0} />
            <MetricTicker label="Agent tasks automated" value={98} unit="%" delay={200} />
            <MetricTicker label="Avg. context retrieval" value={140} unit="ms" delay={400} />
            <MetricTicker label="Enterprises in beta" value={84} unit="" delay={600} />
          </div>
        </section>

        {/* ══ PLATFORM ARCHITECTURE ══ */}
        <section style={{ padding: "120px 48px", borderBottom: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 64,
                  flexWrap: "wrap",
                  gap: 32,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#52525b",
                      letterSpacing: "0.08em",
                      marginBottom: 16,
                    }}
                  >
                    PLATFORM ARCHITECTURE
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(32px,4vw,52px)",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      color: "#f4f4f5",
                      lineHeight: 1.1,
                    }}
                  >
                    Everything connected.
                    <br />
                    <span style={{ color: "#6366f1" }}>Nothing siloed.</span>
                  </h2>
                </div>
                <p style={{ maxWidth: 320, fontSize: 15, color: "#52525b", lineHeight: 1.7 }}>
                  IntelliOps orchestrates every surface of your organization into a coherent
                  operational fabric — with AI woven throughout.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div
                style={{
                  border: "1px solid #18181b",
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#0a0a0c",
                }}
              >
                <svg viewBox="0 0 900 480" width="100%" style={{ display: "block" }}>
                  <circle cx="450" cy="240" r="48" fill="#0f0f14" stroke="#6366f1" strokeWidth="1.5" />
                  <text
                    x="450"
                    y="236"
                    textAnchor="middle"
                    fill="#818cf8"
                    fontSize="11"
                    fontFamily="ui-sans-serif"
                    fontWeight="600"
                  >
                    IntelliOps
                  </text>
                  <text
                    x="450"
                    y="252"
                    textAnchor="middle"
                    fill="#52525b"
                    fontSize="9"
                    fontFamily="ui-sans-serif"
                  >
                    Core Layer
                  </text>

                  <circle
                    cx="450"
                    cy="240"
                    r="100"
                    fill="none"
                    stroke="#1c1c1e"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />
                  <circle
                    cx="450"
                    cy="240"
                    r="180"
                    fill="none"
                    stroke="#18181b"
                    strokeWidth="1"
                    strokeDasharray="2 12"
                  />

                  {[
                    { angle: 0, label: "Agents", sub: "12 active" },
                    { angle: 72, label: "Workflows", sub: "Automated" },
                    { angle: 144, label: "Knowledge", sub: "Indexed" },
                    { angle: 216, label: "Projects", sub: "Tracked" },
                    { angle: 288, label: "Workspaces", sub: "Unified" },
                  ].map(({ angle, label, sub }) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = 450 + 100 * Math.cos(rad);
                    const y = 240 + 100 * Math.sin(rad);
                    return (
                      <g key={label}>
                        <line
                          x1="450"
                          y1="240"
                          x2={x}
                          y2={y}
                          stroke="#27272a"
                          strokeWidth="1"
                        />
                        <circle r="2.5" fill="#6366f1" opacity="0.9">
                          <animateMotion
                            dur="3s"
                            repeatCount="indefinite"
                            path={`M450,240 L${x.toFixed(1)},${y.toFixed(1)}`}
                          />
                        </circle>
                        <circle
                          cx={x}
                          cy={y}
                          r="28"
                          fill="#0f0f14"
                          stroke="#27272a"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 2}
                          textAnchor="middle"
                          fill="#a1a1aa"
                          fontSize="10"
                          fontFamily="ui-sans-serif"
                          fontWeight="500"
                        >
                          {label}
                        </text>
                        <text
                          x={x}
                          y={y + 12}
                          textAnchor="middle"
                          fill="#3f3f46"
                          fontSize="8"
                          fontFamily="ui-sans-serif"
                        >
                          {sub}
                        </text>
                      </g>
                    );
                  })}

                  {[
                    { angle: 30, label: "GitHub" },
                    { angle: 90, label: "Slack" },
                    { angle: 150, label: "PagerDuty" },
                    { angle: 210, label: "Datadog" },
                    { angle: 270, label: "Linear" },
                    { angle: 330, label: "Confluence" },
                  ].map(({ angle, label }) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = 450 + 180 * Math.cos(rad);
                    const y = 240 + 180 * Math.sin(rad);
                    const mx = 450 + 130 * Math.cos(rad);
                    const my = 240 + 130 * Math.sin(rad);
                    return (
                      <g key={label}>
                        <line
                          x1={mx.toFixed(1)}
                          y1={my.toFixed(1)}
                          x2={x.toFixed(1)}
                          y2={y.toFixed(1)}
                          stroke="#1c1c1e"
                          strokeWidth="1"
                          strokeDasharray="3 6"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="20"
                          fill="#0c0c0e"
                          stroke="#1c1c1e"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y + 4}
                          textAnchor="middle"
                          fill="#3f3f46"
                          fontSize="8"
                          fontFamily="ui-sans-serif"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  <path
                    d="M 450 240 m -48 0 a 48 48 0 0 1 48 -48"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    opacity="0.4"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 450 240"
                      to="360 450 240"
                      dur="8s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ TABBED PRODUCT SHOWCASE ══ */}
        <section style={{ padding: "120px 48px", borderBottom: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div
                style={{
                  fontSize: 11,
                  color: "#52525b",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                }}
              >
                CORE CAPABILITIES
              </div>
              <h2
                style={{
                  fontSize: "clamp(32px,4vw,52px)",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  marginBottom: 48,
                  color: "#f4f4f5",
                  lineHeight: 1.1,
                }}
              >
                Purpose-built for
                <br />
                operational scale.
              </h2>
            </Reveal>

            <div style={{ display: "flex", borderBottom: "1px solid #18181b", marginBottom: 48 }}>
              {tabs.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(i)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === i ? "2px solid #6366f1" : "2px solid transparent",
                    color: activeTab === i ? "#f4f4f5" : "#52525b",
                    padding: "14px 28px",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "color .2s, border-color .2s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  animation: "fadeUp .4s ease",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      marginBottom: 16,
                      color: "#f4f4f5",
                    }}
                  >
                    Workflow orchestration without the glue code.
                  </h3>
                  <p style={{ color: "#71717a", lineHeight: 1.8, marginBottom: 32 }}>
                    Define multi-step workflows in plain language. IntelliOps translates intent into
                    executable pipelines — spanning AI steps, human approvals, and third-party
                    triggers.
                  </p>
                  {[
                    "Conditional branching with natural-language rules",
                    "Human-in-the-loop approvals at any stage",
                    "Real-time observability on every workflow run",
                    "Rollback and recovery built in",
                  ].map((f) => (
                    <div key={f} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "1px solid #6366f1",
                          flexShrink: 0,
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }}
                        />
                      </div>
                      <span style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    background: "#0a0a0c",
                    border: "1px solid #18181b",
                    borderRadius: 6,
                    padding: 32,
                  }}
                >
                  <svg viewBox="0 0 340 280" width="100%" style={{ display: "block" }}>
                    {(
                      [
                        { x: 170, y: 30, label: "Trigger", type: "start" },
                        { x: 170, y: 100, label: "AI Triage", type: "ai" },
                        { x: 90, y: 170, label: "Auto-resolve", type: "auto" },
                        { x: 250, y: 170, label: "Escalate", type: "human" },
                        { x: 170, y: 240, label: "Complete", type: "end" },
                      ] as const
                    ).map(({ x, y, label, type }) => {
                      const fills = {
                        start: "#27272a",
                        ai: "#1e1e3a",
                        auto: "#0f2a1a",
                        human: "#1a1a0f",
                        end: "#27272a",
                      };
                      const strokes = {
                        start: "#3f3f46",
                        ai: "#6366f1",
                        auto: "#22c55e",
                        human: "#f59e0b",
                        end: "#3f3f46",
                      };
                      return (
                        <g key={label}>
                          <rect
                            x={x - 44}
                            y={y - 14}
                            width={88}
                            height={28}
                            rx="4"
                            fill={fills[type]}
                            stroke={strokes[type]}
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={y + 5}
                            textAnchor="middle"
                            fill="#a1a1aa"
                            fontSize="10"
                            fontFamily="ui-sans-serif"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}
                    <line x1="170" y1="44" x2="170" y2="86" stroke="#27272a" strokeWidth="1" />
                    <line
                      x1="170"
                      y1="114"
                      x2="90"
                      y2="156"
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    <line
                      x1="170"
                      y1="114"
                      x2="250"
                      y2="156"
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    <line x1="90" y1="184" x2="170" y2="226" stroke="#27272a" strokeWidth="1" />
                    <line x1="250" y1="184" x2="170" y2="226" stroke="#27272a" strokeWidth="1" />
                    <circle r="3" fill="#6366f1">
                      <animateMotion
                        dur="2.5s"
                        repeatCount="indefinite"
                        path="M170,44 L170,100 L90,170 L170,240"
                      />
                    </circle>
                  </svg>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  animation: "fadeUp .4s ease",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      marginBottom: 16,
                      color: "#f4f4f5",
                    }}
                  >
                    Agents that act, not just assist.
                  </h3>
                  <p style={{ color: "#71717a", lineHeight: 1.8, marginBottom: 32 }}>
                    Deploy specialized AI agents with defined scopes, memory, and tool access. They
                    monitor, decide, and act — while you maintain full governance.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { name: "Incident Agent", status: "Active", tasks: "847 resolved" },
                      { name: "Deploy Agent", status: "Standby", tasks: "230 runs" },
                      { name: "Triage Agent", status: "Active", tasks: "2.1k analyzed" },
                      { name: "Report Agent", status: "Active", tasks: "64 generated" },
                    ].map((a) => (
                      <div
                        key={a.name}
                        style={{
                          padding: 16,
                          background: "#0c0c0e",
                          border: "1px solid #18181b",
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#e4e4e7" }}>
                            {a.name}
                          </span>
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: a.status === "Active" ? "#22c55e" : "#3f3f46",
                              animation:
                                mounted && a.status === "Active"
                                  ? "pulse 2s ease infinite"
                                  : "none",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: "#52525b" }}>{a.tasks}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    background: "#0a0a0c",
                    border: "1px solid #18181b",
                    borderRadius: 6,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#52525b",
                      letterSpacing: "0.06em",
                      marginBottom: 16,
                    }}
                  >
                    AGENT ACTIVITY STREAM
                  </div>
                  {[
                    {
                      time: "00:00:01",
                      agent: "IncidentAgent",
                      action: "Classified P2 incident · notifying on-call",
                    },
                    {
                      time: "00:00:03",
                      agent: "TriageAgent",
                      action: "Root cause identified · similar to INC-2891",
                    },
                    {
                      time: "00:00:07",
                      agent: "IncidentAgent",
                      action: "Rollback triggered · monitoring recovery",
                    },
                    {
                      time: "00:00:14",
                      agent: "ReportAgent",
                      action: "Incident report drafted · awaiting review",
                    },
                    {
                      time: "00:00:22",
                      agent: "IncidentAgent",
                      action: "Services restored · incident closed",
                    },
                  ].map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 100px 1fr",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: "1px solid #111113",
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      <span style={{ color: "#3f3f46" }}>{e.time}</span>
                      <span style={{ color: "#6366f1" }}>{e.agent}</span>
                      <span style={{ color: "#71717a" }}>{e.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  animation: "fadeUp .4s ease",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      marginBottom: 16,
                      color: "#f4f4f5",
                    }}
                  >
                    Knowledge that stays current.
                  </h3>
                  <p style={{ color: "#71717a", lineHeight: 1.8, marginBottom: 32 }}>
                    IntelliOps continuously indexes, links, and surfaces knowledge from every source
                    — making institutional memory queryable rather than buried.
                  </p>
                  <div
                    style={{
                      fontFamily: "monospace",
                      background: "#0a0a0c",
                      border: "1px solid #18181b",
                      borderRadius: 4,
                      padding: 20,
                    }}
                  >
                    <div style={{ color: "#52525b", fontSize: 12, marginBottom: 12 }}>
                      {`// Query your organization's knowledge`}
                    </div>
                    <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 2 }}>
                      <span style={{ color: "#818cf8" }}>ops</span>.knowledge.
                      <span style={{ color: "#34d399" }}>query</span>(
                      <br />
                      &nbsp;&nbsp;&quot;How do we handle on-call handoffs?&quot;,
                      <br />
                      &nbsp;&nbsp;{"{ "}context: workspace{" }"}
                      <br />)
                      <br />
                      <span style={{ color: "#52525b" }}>
                        {`// Returns ranked results with citations`}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    background: "#0a0a0c",
                    border: "1px solid #18181b",
                    borderRadius: 6,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#52525b",
                      letterSpacing: "0.06em",
                      marginBottom: 20,
                    }}
                  >
                    KNOWLEDGE GRAPH COVERAGE
                  </div>
                  {[
                    { source: "Confluence", docs: "12,400", coverage: 94 },
                    { source: "GitHub", docs: "8,200", coverage: 88 },
                    { source: "Slack", docs: "340K", coverage: 76 },
                    { source: "Runbooks", docs: "890", coverage: 99 },
                    { source: "Incidents", docs: "4,100", coverage: 100 },
                  ].map((s) => (
                    <div key={s.source} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "#a1a1aa" }}>{s.source}</span>
                        <span style={{ color: "#52525b" }}>
                          {s.docs} docs · {s.coverage}%
                        </span>
                      </div>
                      <div style={{ height: 3, background: "#18181b", borderRadius: 2 }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${s.coverage}%`,
                            background: "#6366f1",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  animation: "fadeUp .4s ease",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      marginBottom: 16,
                      color: "#f4f4f5",
                    }}
                  >
                    Workspaces built around how teams actually work.
                  </h3>
                  <p style={{ color: "#71717a", lineHeight: 1.8, marginBottom: 32 }}>
                    Each workspace is a complete operational environment — with its own agents,
                    knowledge, access controls, and workflows — while sharing the same organizational
                    intelligence layer.
                  </p>
                  {[
                    { team: "Engineering", members: 24, agents: 5, status: "6 workflows active" },
                    { team: "Product", members: 11, agents: 3, status: "2 workflows active" },
                    {
                      team: "Security",
                      members: 8,
                      agents: 4,
                      status: "Always-on monitoring",
                    },
                  ].map((w) => (
                    <div
                      key={w.team}
                      style={{
                        padding: "16px 20px",
                        background: "#0c0c0e",
                        border: "1px solid #18181b",
                        borderRadius: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#e4e4e7",
                            marginBottom: 4,
                          }}
                        >
                          {w.team}
                        </div>
                        <div style={{ fontSize: 12, color: "#52525b" }}>
                          {w.members} members · {w.agents} agents
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6366f1",
                          background: "#1e1e3a",
                          padding: "4px 10px",
                          borderRadius: 2,
                        }}
                      >
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    background: "#0a0a0c",
                    border: "1px solid #18181b",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <svg viewBox="0 0 340 280" width="100%" style={{ display: "block" }}>
                    <WorkspaceNode label="" x={170} y={140} type="hub" />
                    {[
                      { x: 170, y: 50, label: "Engineering" },
                      { x: 270, y: 110, label: "Product" },
                      { x: 240, y: 220, label: "Security" },
                      { x: 100, y: 220, label: "Customer" },
                      { x: 70, y: 110, label: "Finance" },
                    ].map((n) => (
                      <g key={n.label}>
                        <line
                          x1="170"
                          y1="140"
                          x2={n.x}
                          y2={n.y}
                          stroke="#27272a"
                          strokeWidth="1"
                        />
                        <WorkspaceNode label={n.label} x={n.x} y={n.y} type="team" />
                        {[0, 1].map((i) => {
                          const angle = (i / 2) * Math.PI * 2;
                          const ax = n.x + 36 * Math.cos(angle);
                          const ay = n.y + 36 * Math.sin(angle);
                          return (
                            <g key={i}>
                              <line
                                x1={n.x}
                                y1={n.y}
                                x2={ax.toFixed(1)}
                                y2={ay.toFixed(1)}
                                stroke="#1c1c1e"
                                strokeWidth="0.5"
                              />
                              <WorkspaceNode label="" x={ax} y={ay} type="agent" />
                            </g>
                          );
                        })}
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ EDITORIAL PHILOSOPHY ══ */}
        <section style={{ padding: "120px 48px", borderBottom: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 80 }}>
              <Reveal>
                <div style={{ paddingTop: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#3f3f46",
                      letterSpacing: "0.08em",
                      marginBottom: 24,
                      borderTop: "1px solid #27272a",
                      paddingTop: 24,
                    }}
                  >
                    PHILOSOPHY
                  </div>
                  {[
                    "Unified context",
                    "AI-first design",
                    "Operational clarity",
                    "Enterprise trust",
                  ].map((t, i) => (
                    <div
                      key={t}
                      style={{
                        fontSize: 13,
                        marginBottom: 12,
                        color: i === 0 ? "#a1a1aa" : "#3f3f46",
                        paddingLeft: i === 0 ? 8 : 0,
                        borderLeft:
                          i === 0 ? "2px solid #6366f1" : "2px solid transparent",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </Reveal>
              <div>
                <Reveal>
                  <blockquote
                    style={{
                      fontSize: "clamp(24px,3vw,40px)",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.3,
                      color: "#f4f4f5",
                      marginBottom: 40,
                    }}
                  >
                    &ldquo;Most tools solve for features.
                    <br />
                    <span style={{ color: "#6366f1" }}>We solve for coordination.&rdquo;</span>
                  </blockquote>
                </Reveal>
                <Reveal delay={0.15}>
                  <p
                    style={{
                      fontSize: 17,
                      color: "#71717a",
                      lineHeight: 1.8,
                      maxWidth: 640,
                      marginBottom: 32,
                    }}
                  >
                    Modern organizations don&apos;t fail because they lack capability. They fail
                    because their tools, teams, and intelligence exist in separate universes.
                    IntelliOps is built on the premise that the future of operations is unified —
                    where every action feeds every decision.
                  </p>
                </Reveal>
                <Reveal delay={0.25}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 24,
                      maxWidth: 640,
                    }}
                  >
                    {[
                      {
                        label: "No more context switching",
                        body: "One surface for all operational data, decisions, and execution.",
                      },
                      {
                        label: "AI as a participant, not a tool",
                        body: "Agents collaborate alongside humans at every workflow stage.",
                      },
                      {
                        label: "Institutional memory, made queryable",
                        body: "Every decision, incident, and insight becomes searchable organizational knowledge.",
                      },
                      {
                        label: "Control without complexity",
                        body: "Enterprise governance, role-based access, and full audit trails — without the overhead.",
                      },
                    ].map((c) => (
                      <div
                        key={c.label}
                        style={{ padding: "24px 0", borderTop: "1px solid #18181b" }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#e4e4e7",
                            marginBottom: 10,
                          }}
                        >
                          {c.label}
                        </div>
                        <div style={{ fontSize: 14, color: "#52525b", lineHeight: 1.7 }}>
                          {c.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ══ OPERATIONAL INTELLIGENCE DASHBOARD ══ */}
        <section style={{ padding: "120px 48px", borderBottom: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#52525b",
                    letterSpacing: "0.08em",
                    marginBottom: 16,
                  }}
                >
                  OPERATIONAL INTELLIGENCE
                </div>
                <h2
                  style={{
                    fontSize: "clamp(32px,4vw,52px)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: "#f4f4f5",
                    lineHeight: 1.1,
                  }}
                >
                  See everything.
                  <br />
                  Act on what matters.
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div
                style={{
                  background: "#0a0a0c",
                  border: "1px solid #18181b",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #18181b",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 24 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6366f1",
                        borderBottom: "1px solid #6366f1",
                        paddingBottom: 4,
                      }}
                    >
                      Overview
                    </span>
                    {["Signals", "Agents", "Incidents"].map((t) => (
                      <span key={t} style={{ fontSize: 12, color: "#3f3f46" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                        animation: mounted ? "pulse 2s ease infinite" : "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#52525b" }}>Live · updated 2s ago</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    borderBottom: "1px solid #18181b",
                  }}
                >
                  {[
                    { label: "Active signals", value: "2,847", delta: "+12%", pos: true },
                    { label: "Agents running", value: "12", delta: "100%", pos: null },
                    { label: "MTTR this week", value: "4m 22s", delta: "-18%", pos: false },
                    { label: "Incidents resolved", value: "98", delta: "today", pos: null },
                  ].map((m, i) => (
                    <div
                      key={m.label}
                      style={{
                        padding: 24,
                        borderRight: i < 3 ? "1px solid #18181b" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "#52525b",
                          marginBottom: 8,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 600,
                          color: "#f4f4f5",
                          letterSpacing: "-0.02em",
                          marginBottom: 4,
                        }}
                      >
                        {m.value}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            m.pos === true
                              ? "#22c55e"
                              : m.pos === false
                              ? "#f87171"
                              : "#52525b",
                        }}
                      >
                        {m.delta}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 24 }}>
                  <svg viewBox="0 0 1008 120" width="100%" style={{ display: "block" }}>
                    {BAR_HEIGHTS.map((h, i) => (
                      <rect
                        key={i}
                        x={i * 21}
                        y={100 - h}
                        width={16}
                        height={h}
                        rx="1"
                        fill={i > 32 && i < 38 ? "#6366f1" : "#1c1c1e"}
                        opacity={i > 32 && i < 38 ? 1 : 0.7}
                      />
                    ))}
                  </svg>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      fontSize: 11,
                      color: "#3f3f46",
                    }}
                  >
                    <span>00:00</span>
                    <span>Anomaly detected 14:32</span>
                    <span>now</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ ENTERPRISE TRUST ══ */}
        <section style={{ padding: "120px 48px", borderBottom: "1px solid #18181b" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 80,
                alignItems: "center",
              }}
            >
              <Reveal>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#52525b",
                      letterSpacing: "0.08em",
                      marginBottom: 24,
                    }}
                  >
                    BUILT FOR ENTERPRISE
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(28px,3.5vw,44px)",
                      fontWeight: 600,
                      letterSpacing: "-0.03em",
                      marginBottom: 24,
                      lineHeight: 1.2,
                      color: "#f4f4f5",
                    }}
                  >
                    Security and compliance
                    <br />
                    as a foundation.
                  </h2>
                  <p
                    style={{
                      fontSize: 16,
                      color: "#71717a",
                      lineHeight: 1.8,
                      marginBottom: 40,
                    }}
                  >
                    IntelliOps is designed to operate inside the security perimeter of enterprise
                    organizations — not around it.
                  </p>
                  {[
                    { label: "SOC 2 Type II", detail: "Certified · continuous monitoring" },
                    { label: "SSO & SCIM", detail: "Okta, Azure AD, Google Workspace" },
                    { label: "Audit logs", detail: "Complete action history · immutable" },
                    { label: "Data residency", detail: "US, EU, APAC · configurable" },
                    { label: "Zero-trust network", detail: "Encrypted at rest and in transit" },
                  ].map((c) => (
                    <div
                      key={c.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 0",
                        borderBottom: "1px solid #18181b",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#a1a1aa" }}>
                        {c.label}
                      </span>
                      <span style={{ fontSize: 13, color: "#52525b" }}>{c.detail}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <div
                  style={{
                    background: "#0a0a0c",
                    border: "1px solid #18181b",
                    borderRadius: 6,
                    padding: 40,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#52525b",
                      letterSpacing: "0.06em",
                      marginBottom: 24,
                    }}
                  >
                    DEPLOYMENT OPTIONS
                  </div>
                  {[
                    {
                      name: "Cloud-managed",
                      desc: "Fully managed SaaS. Zero ops burden. Auto-updates.",
                      tag: "Recommended",
                      accent: true,
                    },
                    {
                      name: "Private cloud",
                      desc: "Deploy into your VPC. Your data never leaves your environment.",
                      tag: "Enterprise",
                      accent: false,
                    },
                    {
                      name: "On-premise",
                      desc: "Air-gapped deployment. For the most restricted environments.",
                      tag: "Enterprise+",
                      accent: false,
                    },
                  ].map((d) => (
                    <div
                      key={d.name}
                      style={{
                        padding: 20,
                        background: d.accent ? "#0f0f1a" : "transparent",
                        border: d.accent ? "1px solid #27273a" : "1px solid #111113",
                        borderRadius: 4,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#e4e4e7" }}>
                          {d.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: d.accent ? "#818cf8" : "#3f3f46",
                            background: d.accent ? "#1e1e3a" : "#111113",
                            padding: "3px 8px",
                            borderRadius: 2,
                          }}
                        >
                          {d.tag}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: "#52525b", lineHeight: 1.6 }}>
                        {d.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section style={{ padding: "160px 48px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage:
                      "radial-gradient(ellipse 600px 200px at center, rgba(99,102,241,0.06) 0%, transparent 70%)",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#52525b",
                    letterSpacing: "0.08em",
                    marginBottom: 24,
                  }}
                >
                  PRIVATE BETA · LIMITED ACCESS
                </div>
                <h2
                  style={{
                    fontSize: "clamp(40px,6vw,80px)",
                    fontWeight: 600,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.0,
                    marginBottom: 32,
                    color: "#f4f4f5",
                  }}
                >
                  Operate with
                  <br />
                  <span style={{ color: "#6366f1" }}>intelligence.</span>
                </h2>
                <p
                  style={{
                    fontSize: 18,
                    color: "#52525b",
                    lineHeight: 1.7,
                    maxWidth: 480,
                    margin: "0 auto 48px",
                  }}
                >
                  Join 84 engineering and product teams replacing tool sprawl with a single
                  operational layer.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    style={{
                      background: "#6366f1",
                      color: "#fff",
                      border: "none",
                      padding: "16px 36px",
                      borderRadius: 4,
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Request access
                  </button>
                  <button
                    style={{
                      background: "transparent",
                      color: "#71717a",
                      border: "1px solid #27272a",
                      padding: "16px 36px",
                      borderRadius: 4,
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    Talk to sales
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 48,
                    display: "flex",
                    gap: 32,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {["No credit card required", "Dedicated onboarding", "SOC 2 certified"].map(
                    (t) => (
                      <div key={t} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "#3f3f46",
                          }}
                        />
                        <span style={{ fontSize: 13, color: "#3f3f46" }}>{t}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer
          style={{
            borderTop: "1px solid #18181b",
            padding: "40px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  background: "#6366f1",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              />
              <div
                style={{
                  width: 7,
                  height: 7,
                  background: "#27272a",
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                }}
              />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#52525b" }}>IntelliOps</span>
            <span style={{ fontSize: 13, color: "#27272a", marginLeft: 16 }}>© 2025</span>
          </div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {["Privacy", "Terms", "Security", "Status"].map((l) => (
              <a
                key={l}
                href="#"
                style={{ fontSize: 13, color: "#3f3f46", textDecoration: "none" }}
              >
                {l}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}