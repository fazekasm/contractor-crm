import { useState, useCallback, useRef, useEffect } from "react";
import { onAuthChange, loadFromFirestore, signInWithGoogle, signOutUser, saveToFirestore, auth, storage, storageRef, uploadString, getDownloadURL, deleteObject } from './firebase.js'

// ─── THEME PRESETS ────────────────────────────────────────────────────────────
const THEMES = {
  "Bold Blue":       { accent:"#2563eb", accent2:"#1d4ed8", border:"#1e3a5f", bg:"#0d1520", surface:"#161f2e", surface2:"#0d1520", text:"#f0f6ff", subtext:"#94a3b8", muted:"#334155" },
  "Contractor Orange":{ accent:"#ea580c", accent2:"#c2410c", border:"#431407", bg:"#0f0a05", surface:"#1a0f06", surface2:"#0f0a05", text:"#fff7ed", subtext:"#a8714a", muted:"#3c1f0a" },
  "Forest Green":    { accent:"#16a34a", accent2:"#15803d", border:"#052e16", bg:"#030f07", surface:"#071a0e", surface2:"#030f07", text:"#f0fdf4", subtext:"#6cb88a", muted:"#0f3320" },
  "Slate Gray":      { accent:"#64748b", accent2:"#475569", border:"#1e293b", bg:"#0f172a", surface:"#1e293b", surface2:"#0f172a", text:"#f8fafc", subtext:"#94a3b8", muted:"#334155" },
  "Crimson Red":     { accent:"#dc2626", accent2:"#b91c1c", border:"#450a0a", bg:"#0f0505", surface:"#1a0808", surface2:"#0f0505", text:"#fff1f1", subtext:"#b87070", muted:"#3b0f0f" },
  "Midnight Dark":   { accent:"#7c3aed", accent2:"#6d28d9", border:"#2e1065", bg:"#09050f", surface:"#130a1f", surface2:"#09050f", text:"#faf5ff", subtext:"#a78bfa", muted:"#2e1065" },
  "Custom":          { accent:"#2563eb", accent2:"#1d4ed8", border:"#1e3a5f", bg:"#0d1520", surface:"#161f2e", surface2:"#0d1520", text:"#f0f6ff", subtext:"#94a3b8", muted:"#334155" },
};

// ─── CONTRACTOR AI SYSTEM PROMPT ─────────────────────────────────────────────
const CONTRACTOR_SYSTEM_PROMPT = `You are an expert construction estimator with 20+ years of experience in residential remodeling and renovation. You have deep knowledge of labor rates by trade, material costs, waste factors, permit requirements, and project sequencing.

YOUR JOB: When given a job description, generate a detailed accurate line-item estimate.

OUTPUT FORMAT — Respond with ONLY a valid JSON object, no other text, no markdown fences:
{"scopeSummary":"2-3 sentence professional scope description","lines":[{"description":"Line item","qty":1,"unit":"ls","unitPrice":0,"type":"labor"}],"notes":"Caveats, allowances, exclusions, assumptions","warnings":["Flags for the contractor"]}

UNIT ABBREVIATIONS: ls=lump sum, sf=square feet, lf=linear feet, ea=each, hr=hour, day=day, ton=ton, cy=cubic yard

ESTIMATING RULES:
1. Always include a permit allowance if permits are likely required
2. Always include debris removal / dumpster for remodels
3. Separate labor and materials into distinct line items when possible
4. Use realistic mid-market pricing for the user's region — not low-ball, not premium
5. Add General Conditions / Project Management for jobs over $5,000
6. Include waste factors: flooring +10%, tile +15%, drywall +10%, lumber +8%
7. If user provided labor rates, use those exactly — they override your defaults
8. Flag anything needing field verification with "(allowance)" in description
9. Sequence items in construction order: demo → framing → rough-ins → insulation → drywall → finishes → paint → trim → fixtures
10. For unknown quantities, state assumptions clearly in notes

SCOPE WRITING RULES:
- Professional clear third-person language
- Describe what IS and IS NOT included
- Suitable for a legally binding contract
- Under 150 words

Always apply the user's rates and custom instructions first.`.trim();

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const IC = {
  home:     "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  users:    ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M9 7a4 4 0 100 8 4 4 0 000-8z","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75"],
  file:     ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8","M16 17H8","M10 9H8"],
  dollar:   "M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  plus:     "M12 5v14 M5 12h14",
  edit:     ["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"],
  trash:    ["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"],
  x:        "M18 6L6 18 M6 6l12 12",
  check:    "M20 6L9 17l-5-5",
  cloud:    "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  back:     "M19 12H5 M12 5l-7 7 7 7",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  mail:     ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
  chart:    ["M18 20V10","M12 20V4","M6 20v-6"],
  tag:      "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  link:     ["M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71","M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"],
  pen:      ["M12 20h9","M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"],
  eye:      ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  copy:     ["M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z","M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"],
  contract: ["M9 12h6","M9 16h6","M9 8h6","M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"],
  image:    ["M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z","M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z","M21 15l-5-5L5 21"],
  calendar: ["M3 4h18v18H3z","M16 2v4","M8 2v4","M3 10h18"],
  list:     ["M8 6h13","M8 12h13","M8 18h13","M3 6h.01","M3 12h.01","M3 18h.01"],
  palette:  "M12 2a10 10 0 000 20c1.1 0 2-.9 2-2v-.5c0-.28-.06-.54-.14-.79a2 2 0 011.86-2.71H18a4 4 0 000-8 10 10 0 00-6-6z M7.5 13.5a1 1 0 100-2 1 1 0 000 2z M10.5 8.5a1 1 0 100-2 1 1 0 000 2z M15.5 8.5a1 1 0 100-2 1 1 0 000 2z",
  upload:   ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M17 8l-5-5-5 5","M12 3v12"],
  camera:   ["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z","M12 17a4 4 0 100-8 4 4 0 000 8z"],
  sun:      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 17a5 5 0 100-10 5 5 0 000 10z",
  settings: ["M12 15a3 3 0 100-6 3 3 0 000 6z","M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"],
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUSES = [
  { key:"lead",      label:"Lead",           color:"#64748b", bg:"#1e293b" },
  { key:"estimate",  label:"Estimate Sent",  color:"#f59e0b", bg:"#451a03" },
  { key:"approved",  label:"Approved",       color:"#06b6d4", bg:"#083344" },
  { key:"active",    label:"In Progress",    color:"#8b5cf6", bg:"#2e1065" },
  { key:"complete",  label:"Complete",       color:"#10b981", bg:"#022c22" },
  { key:"invoiced",  label:"Invoiced",       color:"#f97316", bg:"#431407" },
  { key:"paid",      label:"Paid",           color:"#4ade80", bg:"#052e16" },
];
const statusFor = k => STATUSES.find(s => s.key === k) || STATUSES[0];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt$ = n => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => {
  if (!d) return "—";
  try {
    // Handle Firestore Timestamps (have .toDate() or .seconds)
    if (typeof d === "object" && d.toDate) return d.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
};
const STORAGE_KEY = "crm_v3";

const defaultData = () => ({
  company: { name: "", phone: "", email: "", address: "", city: "", state: "OR", zip: "", ccbNumber: "", venmoHandle: "", logo: "", netlifyUrl: "", customContract: "", customContractName: "" },
  theme: { preset: "Bold Blue", custom: { ...THEMES["Bold Blue"] } },
  lightMode: false,
  customers: [], jobs: [], estimates: [], invoices: [],
  credentials: { docs: [] },
  qboConfig: { clientId: "", realmId: "", accessToken: "" },
  openSignConfig: { apiKey: "", proxyUrl: "", backendUrl: "https://contractor-crm-backend-production.up.railway.app" },
  aiConfig: { provider: "claude", apiKey: "", model: "claude-sonnet-4-5", openaiKey: "", openaiModel: "gpt-4o-mini", region: "", markup: "20", customInstructions: "", laborRates: { general:"45", carpenter:"65", electrician:"85", plumber:"85", tile:"55", painter:"45", concrete:"55", hvac:"90", drywall:"50", roofing:"60" } },
});

const loadData = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const base = { ...defaultData(), ...raw };
    if (raw.lightMode === undefined) {
      const themeKey = localStorage.getItem("crm_theme");
      if (themeKey === "light") base.lightMode = true;
    }
    return base;
  } catch { return defaultData(); }
};
let _firestoreTimer = null;
const saveData = (d, uid) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); localStorage.setItem("crm_theme", d.lightMode ? "light" : "dark"); } catch {}
  if (uid) {
    clearTimeout(_firestoreTimer);
    _firestoreTimer = setTimeout(() => {
      saveToFirestore(uid, d).catch(e => console.error("Firestore save error:", e));
    }, 1500);
  }
};

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
const LIGHT_OVERRIDES = {
  bg: "#f8fafc", surface: "#ffffff", surface2: "#f1f5f9",
  text: "#0f172a", subtext: "#64748b", muted: "#e2e8f0", border: "#e2e8f0",
};

const getTheme = (themeData, lightMode = false) => {
  let base;
  if (!themeData) base = THEMES["Bold Blue"];
  else if (themeData.preset === "Custom") base = themeData.custom || THEMES["Bold Blue"];
  else base = THEMES[themeData.preset] || THEMES["Bold Blue"];
  return lightMode ? { ...base, ...LIGHT_OVERRIDES } : base;
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Card = ({ children, style, t, className, ...rest }) => (
  <div className={`card-tap ${className || ""}`} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, ...style }} {...rest}>
    {children}
  </div>
);

const SearchBar = ({ value, onChange, placeholder, t }) => (
  <div className="search-wrapper" style={{ marginBottom: 16 }}>
    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.subtext} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Search..."}
      style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px", paddingLeft: 38, color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
    {value && (
      <button className="search-clear" onClick={() => onChange("")} style={{ color: t.subtext }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    )}
  </div>
);

const PageHeader = ({ title, count, action, t, back }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {back && <Btn t={t} variant="ghost" size="sm" onClick={back}><Icon d={IC.back} size={14} /></Btn>}
      <div>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
        {count !== undefined && <div style={{ color: t.subtext, fontSize: 12, marginTop: 1 }}>{count} total</div>}
      </div>
    </div>
    {action}
  </div>
);

const EmptyState = ({ icon, title, subtitle, action, t }) => (
  <div className="empty-state">
    <div className="empty-state-icon" style={{ background: `${t.accent}15` }}>
      <Icon d={IC[icon] || IC.file} size={28} color={t.accent} />
    </div>
    <div style={{ color: t.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
    <div style={{ color: t.subtext, fontSize: 13, marginBottom: 16, maxWidth: 280, margin: "0 auto 16px" }}>{subtitle}</div>
    {action}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", style, disabled, t }) => {
  const sz = { sm: { padding: "6px 12px", fontSize: 12 }, md: { padding: "10px 18px", fontSize: 14 }, lg: { padding: "14px 28px", fontSize: 15 } }[size];
  const vr = {
    primary: { background: `linear-gradient(135deg,${t.accent},${t.accent2})`, color: "#fff", border: "none" },
    success: { background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none" },
    danger:  { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: t.subtext, border: `1px solid ${t.border}` },
    amber:   { background: "linear-gradient(135deg,#d97706,#b45309)", color: "#fff", border: "none" },
    venmo:   { background: "linear-gradient(135deg,#008CFF,#0070CC)", color: "#fff", border: "none" },
    sign:    { background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none" },
  }[variant] || {};
  return (
    <button onClick={onClick} disabled={disabled} style={{ border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", ...sz, ...vr, ...style }}>
      {children}
    </button>
  );
};

const Inp = ({ label, value, onChange, type = "text", placeholder, required, rows, t }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>}
    {rows
      ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "11px 14px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", transition: "border-color 0.15s, box-shadow 0.15s" }} />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "11px 14px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
    }
  </div>
);

const Sel = ({ label, value, onChange, options, t }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Badge = ({ status }) => {
  const s = statusFor(status);
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", border: `1px solid ${s.color}33`, whiteSpace: "nowrap" }}>{s.label}</span>;
};

const SectionLabel = ({ children, t }) => (
  <div style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontWeight: 700 }}>{children}</div>
);

// ─── CONTRACT HTML BUILDER ────────────────────────────────────────────────────
function buildContractHTML(inv, cust, co, contractTerms, logo) {
  const lines = Array.isArray(inv?.lines) ? inv.lines : [];
  const subtotal = lines.reduce((s, l) => s + Number(l?.qty || 0) * Number(l?.unitPrice || 0), 0);
  const taxAmt = subtotal * (Number(inv?.taxRate || 0) / 100);
  const total = subtotal + taxAmt;
  const venmoHandle = co?.venmoHandle || "";

  const lineRows = lines.map(l => `
    <tr>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${typeof l?.description === "string" ? l.description : (l?.description ? String(l.description) : "—")}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${l?.qty ?? 0} ${l?.unit || ""}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;font-size:13px">${fmt$(l?.unitPrice)}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827;font-size:13px">${fmt$(Number(l?.qty || 0) * Number(l?.unitPrice || 0))}</td>
    </tr>`).join("");

  const photoSection = (inv.photos && inv.photos.length > 0) ? `
    <div style="margin-top:32px">
      <h2 style="font-size:15px;font-weight:700;color:#1d4ed8;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #dbeafe">Project Photos</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${inv.photos.map(p => `
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <img src="${p.url || p.dataUrl}" style="width:100%;height:140px;object-fit:cover;display:block"/>
            ${p.caption ? `<div style="padding:6px 8px;font-size:11px;color:#6b7280;background:#f9fafb">${p.caption}${p.label ? ` · <strong>${p.label}</strong>` : ""}</div>` : ""}
          </div>`).join("")}
      </div>
    </div>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Contract & Invoice — ${inv.number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#111827;background:#fff;font-size:13px;line-height:1.6}
    .page{max-width:780px;margin:0 auto;padding:40px 32px}
    h2{font-size:15px;font-weight:700;color:#1d4ed8;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #dbeafe}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #1d4ed8}
    .co-name{font-size:22px;font-weight:800;color:#1d4ed8;margin-bottom:4px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
    .party-box{background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:14px}
    .clause{margin-bottom:12px}
    .clause-num{font-weight:700;color:#1d4ed8;margin-right:6px}
    table{width:100%;border-collapse:collapse;margin:12px 0}
    th{background:#1d4ed8;color:#fff;padding:9px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
    .totals-box{margin-left:auto;width:260px;margin-top:8px}
    .t-row{display:flex;justify-content:space-between;padding:5px 0;color:#6b7280;font-size:13px}
    .t-total{display:flex;justify-content:space-between;padding:12px 0;font-size:20px;font-weight:800;color:#1d4ed8;border-top:2px solid #1d4ed8;margin-top:6px}
    .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:16px}
    .sig-box{border-top:2px solid #374151;padding-top:8px}
    .sig-line{height:48px;border-bottom:1px dashed #d1d5db;margin:8px 0}
    .notice{background:#fefce8;border-left:4px solid #ca8a04;padding:12px 16px;margin:16px 0;font-size:12px;color:#713f12;border-radius:0 6px 6px 0}
    .ccb-badge{background:#1d4ed8;color:#fff;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;display:inline-block}
    .venmo-box{margin-top:28px;background:#eff9ff;border:2px solid #008CFF;border-radius:12px;padding:22px;text-align:center}
    .venmo-btn{display:inline-block;background:#008CFF;color:#fff;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;margin-top:10px}
    .sign-box{margin-top:20px;background:#f5f3ff;border:2px solid #7c3aed;border-radius:12px;padding:22px;text-align:center}
    .sign-btn{display:inline-block;background:#7c3aed;color:#fff;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;margin-top:10px}
    @media print{.no-print{display:none}}
  </style></head><body><div class="page">
  <div class="header">
    <div>
      ${logo ? `<img src="${logo}" style="height:60px;max-width:200px;object-fit:contain;display:block;margin-bottom:8px"/>` : ""}
      <div class="co-name">${co.name || "Your Company"}</div>
      <div style="color:#6b7280;font-size:12px;line-height:1.8">
        ${[co.address, co.city, co.state, co.zip].filter(Boolean).join(", ")}<br>
        ${co.phone || ""} ${co.email ? `· ${co.email}` : ""}<br>
        ${co.ccbNumber ? `<span class="ccb-badge">CCB # ${co.ccbNumber}</span>` : ""}
      </div>
    </div>
    <div style="text-align:right">
      <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.08em">Contract & Invoice</div>
      <div style="font-size:28px;font-weight:800">${inv.number}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:6px">Issued: ${fmtDate(inv.date)}</div>
      ${inv.dueDate ? `<div style="color:#dc2626;font-size:12px">Due: ${fmtDate(inv.dueDate)}</div>` : ""}
      ${inv.status === "paid" ? `<div style="margin-top:8px;background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:6px 14px;color:#15803d;font-weight:800;display:inline-block">✓ PAID</div>` : ""}
    </div>
  </div>
  <div class="parties">
    <div class="party-box">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:6px">Contractor</div>
      <div style="font-size:15px;font-weight:700">${co.name || "Your Company"}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px">${[co.address, co.city, co.state, co.zip].filter(Boolean).join(", ")}</div>
      ${co.ccbNumber ? `<div style="margin-top:6px"><span class="ccb-badge">CCB # ${co.ccbNumber}</span></div>` : ""}
    </div>
    <div class="party-box">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:6px">Owner / Customer</div>
      <div style="font-size:15px;font-weight:700">${cust?.name || inv.customerName || "—"}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px">
        ${cust ? [cust.address, cust.city, cust.state, cust.zip].filter(Boolean).join(", ") : ""}
        ${cust?.phone ? `<br>${cust.phone}` : ""}${cust?.email ? `<br>${cust.email}` : ""}
      </div>
    </div>
  </div>
  <h2>Scope of Work & Invoice</h2>
  <table><thead><tr><th>Description</th><th style="text-align:center">Qty/Unit</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${lineRows}</tbody></table>
  <div class="totals-box">
    <div class="t-row"><span>Subtotal</span><span>${fmt$(subtotal)}</span></div>
    ${Number(inv.taxRate) > 0 ? `<div class="t-row"><span>Tax (${inv.taxRate}%)</span><span>${fmt$(taxAmt)}</span></div>` : ""}
    <div class="t-total"><span>Total Due</span><span>${fmt$(total)}</span></div>
  </div>
  ${typeof inv.notes === 'string' && inv.notes ? `<div class="notice"><strong>Scope Notes:</strong> ${inv.notes}</div>` : ""}
  ${photoSection}
  <h2>Oregon Residential Construction Contract — Required Disclosures</h2>
  <div class="notice"><strong>Oregon Law Notice:</strong> Oregon law requires residential contractors to be licensed with the Oregon CCB. Verify at <strong>oregon.gov/ccb</strong> or call 503-378-4621.</div>
  <div class="clause"><span class="clause-num">1.</span><strong>Right to Cancel (ORS 83.820):</strong> For home solicitation contracts, the Owner has three (3) business days to cancel without penalty.</div>
  <div class="clause"><span class="clause-num">2.</span><strong>CCB License:</strong> Contractor holds valid Oregon CCB license #${co.ccbNumber || "__________"} and maintains required insurance.</div>
  <div class="clause"><span class="clause-num">3.</span><strong>Lien Rights (ORS 87.093):</strong> Those who supply labor or materials may file a lien on your property if unpaid.</div>
  <div class="clause"><span class="clause-num">4.</span><strong>Payment Schedule:</strong> ${typeof contractTerms?.paymentSchedule === 'string' ? contractTerms.paymentSchedule || "Payment due upon completion unless otherwise agreed in writing." : "Payment due upon completion unless otherwise agreed in writing."}</div>
  <div class="clause"><span class="clause-num">5.</span><strong>Change Orders:</strong> All scope or cost changes must be agreed to in writing before additional work begins.</div>
  <div class="clause"><span class="clause-num">6.</span><strong>Warranties:</strong> ${typeof contractTerms?.warranty === 'string' ? contractTerms.warranty || "Contractor warrants all labor and materials for one (1) year from substantial completion." : "Contractor warrants all labor and materials for one (1) year from substantial completion."}</div>
  <div class="clause"><span class="clause-num">7.</span><strong>Permits:</strong> ${typeof contractTerms?.permits === 'string' ? contractTerms.permits || "Contractor shall obtain all required permits. Cost included unless noted." : "Contractor shall obtain all required permits. Cost included unless noted."}</div>
  <div class="clause"><span class="clause-num">8.</span><strong>Dispute Resolution:</strong> Parties agree to mediation before arbitration or litigation. Complaints: Oregon CCB 503-378-4621.</div>
  <div class="clause"><span class="clause-num">9.</span><strong>Insurance:</strong> Contractor maintains general liability insurance of not less than $100,000 per occurrence.</div>
  <div class="clause"><span class="clause-num">10.</span><strong>Entire Agreement:</strong> This document constitutes the entire agreement. No oral representations shall modify these terms.</div>
  ${typeof contractTerms?.additional === 'string' && contractTerms.additional ? `<div class="clause"><span class="clause-num">11.</span><strong>Additional Terms:</strong> ${contractTerms.additional}</div>` : ""}
  <h2>Signatures</h2>
  <p style="color:#6b7280;font-size:12px;margin-bottom:16px">By signing below, both parties agree to all terms in this contract.</p>
  <div class="sig-grid">
    <div class="sig-box">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Contractor Signature</div>
      <div class="sig-line"></div>
      <div style="font-size:13px;font-weight:600">${co.name || "Contractor"}</div>
      <div style="color:#6b7280;font-size:11px;margin-top:6px">Date: ____________________</div>
    </div>
    <div class="sig-box">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Owner / Customer Signature</div>
      <div class="sig-line"></div>
      <div style="font-size:13px;font-weight:600">${cust?.name || inv.customerName || "Owner"}</div>
      <div style="color:#6b7280;font-size:11px;margin-top:6px">Date: ____________________</div>
    </div>
  </div>
  ${inv.openSignUrl ? `<div class="sign-box no-print"><div style="font-size:18px;font-weight:700;color:#6d28d9">✍️ Sign This Contract Online</div><div style="color:#6b7280;margin-top:6px;font-size:13px">Click below to sign electronically via OpenSign™</div><a href="${inv.openSignUrl}" target="_blank" class="sign-btn">Sign Contract Now</a></div>` : ""}
  ${inv.status !== "paid" && venmoHandle ? `<div class="venmo-box no-print"><div style="font-size:18px;font-weight:700;color:#1d4ed8">💙 Pay via Venmo</div><div style="color:#6b7280;margin-top:4px;font-size:13px">Send to <strong>${venmoHandle}</strong></div><a href="https://venmo.com/${venmoHandle.replace("@", "")}?txn=pay&note=${encodeURIComponent("Invoice " + inv.number)}&amount=${total.toFixed(2)}" target="_blank" class="venmo-btn">Pay ${fmt$(total)} via Venmo</a></div>` : ""}
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">${co.name || "Your Company"} · CCB # ${co.ccbNumber || "__________"} · ${fmtDate(today())}
  ${co.netlifyUrl ? `<div style="margin-top:8px"><a href="${co.netlifyUrl}/credentials" target="_blank" style="color:#1d4ed8;font-size:11px;font-weight:600">🛡️ View License & Insurance Credentials</a></div>` : ""}
  </div>
  </div></body></html>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, t, setTab, setInvoiceFilter, setJobFilter }) {
  const paid = data.invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = data.invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.total || 0), 0);
  const activeJobs = data.jobs.filter(j => j.status === "active").length;
  const unsigned = data.invoices.filter(i => i.status !== "paid" && !i.signedAt).length;
  const recentJobs = [...data.jobs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 5);
  const statusCounts = {};
  STATUSES.forEach(s => { statusCounts[s.key] = data.jobs.filter(j => j.status === s.key).length; });

  const goInvoices = (filter) => { setTab("invoices", filter); };
  const goJobs = (filter) => { setTab("jobs", filter); };

  const statCards = [
    { label: "Collected",    value: fmt$(paid),        color: "#4ade80", sub: "Tap to view paid invoices",       onClick: () => goInvoices("paid") },
    { label: "Outstanding",  value: fmt$(outstanding), color: "#f97316", sub: "Tap to view unpaid invoices",     onClick: () => goInvoices("unpaid") },
    { label: "Active Jobs",  value: activeJobs,        color: t.accent,  sub: "Tap to view in-progress jobs",   onClick: () => goJobs("active") },
    { label: "Awaiting Sig", value: unsigned,          color: "#a78bfa", sub: "Tap to view unsigned invoices",  onClick: () => goInvoices("unsigned") },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: t.subtext, fontSize: 13, marginBottom: 2 }}>{greeting}</div>
        <h2 style={{ color: t.text, fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Dashboard</h2>
        <div style={{ color: t.subtext, fontSize: 13 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <button key={s.label} onClick={s.onClick} className="card-tap"
            style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = t.border}>
            <div className="stat-value" style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: t.text, fontSize: 12, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ color: t.subtext, fontSize: 10, marginTop: 2 }}>{s.sub}</div>
          </button>
        ))}
      </div>

      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Pipeline — Tap any stage to filter jobs</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => goJobs(s.key)}
              style={{ background: s.bg, border: `1px solid ${s.color}44`, borderRadius: 8, padding: "8px 10px", textAlign: "center", flex: "1 1 60px", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{statusCounts[s.key] || 0}</div>
              <div style={{ color: "#64748b", fontSize: 10 }}>{s.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "New Client",    icon: "users",    tab: "customers" },
          { label: "New Job",       icon: "tag",      tab: "jobs" },
          { label: "New Estimate",  icon: "file",     tab: "estimates" },
          { label: "New Invoice",   icon: "contract", tab: "invoices" },
        ].map(a => (
          <button key={a.label} onClick={() => setTab(a.tab)}
            style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 4px", textAlign: "center", cursor: "pointer", fontFamily: "inherit" }}>
            <Icon d={IC[a.icon]} size={18} color={t.accent} />
            <div style={{ color: t.text, fontSize: 11, fontWeight: 600, marginTop: 4 }}>+ {a.label.split(" ")[1]}</div>
          </button>
        ))}
      </div>

      <Card t={t}>
        <SectionLabel t={t}>Recent Jobs — Tap to view</SectionLabel>
        {recentJobs.length === 0
          ? <div style={{ color: t.muted, textAlign: "center", padding: 20 }}>No jobs yet</div>
          : recentJobs.map(job => (
            <button key={job.id} onClick={() => goJobs(job.status || "all")}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", background: "none", border: "none", borderBottom: `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                <div style={{ color: t.subtext, fontSize: 12 }}>{job.customerName}</div>
              </div>
              <Badge status={job.status} />
            </button>
          ))}
      </Card>
    </div>
  );
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
function Customers({ data, setData, t }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "OR", zip: "", notes: "" });
  const [search, setSearch] = useState("");

  const open = c => { setSelected(c); setForm(c ? { ...c } : { name: "", phone: "", email: "", address: "", city: "", state: "OR", zip: "", notes: "" }); setView("form"); };
  const save = () => {
    if (!form.name.trim()) return;
    const now = today();
    if (selected) setData(d => ({ ...d, customers: d.customers.map(c => c.id === selected.id ? { ...form, id: selected.id, updatedAt: now } : c) }));
    else setData(d => ({ ...d, customers: [...d.customers, { ...form, id: uid(), createdAt: now, updatedAt: now }] }));
    setView("list");
  };
  const del = id => {
    const linked = [
      ...data.jobs.filter(j => j.customerId === id).map(j => `Job: ${j.title}`),
      ...data.estimates.filter(e => e.customerId === id).map(e => `Estimate: ${e.number}`),
      ...data.invoices.filter(i => i.customerId === id).map(i => `Invoice: ${i.number}`),
    ];
    const msg = linked.length > 0
      ? `This client has ${linked.length} linked record${linked.length > 1 ? "s" : ""} (${linked.slice(0, 3).join(", ")}${linked.length > 3 ? "…" : ""}). Those records will keep the client name but lose the link. Delete anyway?`
      : "Delete customer?";
    if (window.confirm(msg)) setData(d => ({ ...d, customers: d.customers.filter(c => c.id !== id) }));
  };
  const filtered = data.customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()));

  if (view === "form") return (
    <div className="page-enter">
      <PageHeader title={selected ? "Edit Client" : "New Client"} t={t} back={() => setView("list")} />
      <Card t={t}>
        <Inp t={t} label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
        <Inp t={t} label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} type="tel" />
        <Inp t={t} label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
        <Inp t={t} label="Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
          <Inp t={t} label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          <Inp t={t} label="State" value={form.state} onChange={v => setForm(f => ({ ...f, state: v }))} />
          <Inp t={t} label="ZIP" value={form.zip} onChange={v => setForm(f => ({ ...f, zip: v }))} />
        </div>
        <Inp t={t} label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} rows={3} />
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn t={t} onClick={save} style={{ flex: 1, justifyContent: "center" }}><Icon d={IC.check} size={14} /> Save Client</Btn>
          <Btn t={t} variant="ghost" onClick={() => setView("list")}>Cancel</Btn>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader title="Clients" count={data.customers.length} t={t}
        action={<Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> Add</Btn>} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search clients..." t={t} />
      {filtered.length === 0
        ? <Card t={t}><EmptyState icon="users" title={search ? "No matches" : "No clients yet"} subtitle={search ? "Try a different search term" : "Add your first client to get started"} t={t} action={!search && <Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={13} /> Add First Client</Btn>} /></Card>
        : filtered.map(c => (
          <Card key={c.id} t={t} style={{ marginBottom: 10, padding: "14px 16px", cursor: "pointer" }} onClick={() => open(c)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: t.accent, fontSize: 16, fontWeight: 700 }}>{c.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: t.subtext, fontSize: 12, marginTop: 2 }}>{[c.phone, c.email, c.city].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              <Icon d={IC.edit} size={16} color={t.muted} />
            </div>
          </Card>
        ))}
      {/* FAB for adding */}
      {data.customers.length > 3 && (
        <button className="fab" onClick={() => open(null)} style={{ background: `linear-gradient(135deg,${t.accent},${t.accent2})` }}>
          <Icon d={IC.plus} size={22} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ─── JOBS ─────────────────────────────────────────────────────────────────────
function Jobs({ data, setData, t, initialFilter }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", customerId: "", customerName: "", address: "", status: "lead", date: today(), value: "", notes: "", checklist: [] });
  const [filter, setFilter] = useState(initialFilter || "all");
  const [newItem, setNewItem] = useState("");

  const open = j => { setSelected(j); setForm(j ? { ...j, checklist: j.checklist || [] } : { title: "", customerId: "", customerName: "", address: "", status: "lead", date: today(), value: "", notes: "", checklist: [] }); setView("form"); };
  const save = () => {
    if (!form.title.trim()) return;
    const cust = data.customers.find(c => c.id === form.customerId);
    const now = today();
    const payload = { ...form, customerName: cust ? cust.name : form.customerName, updatedAt: now };
    if (selected) setData(d => ({ ...d, jobs: d.jobs.map(j => j.id === selected.id ? { ...payload, id: selected.id } : j) }));
    else setData(d => ({ ...d, jobs: [...d.jobs, { ...payload, id: uid(), createdAt: now }] }));
    setView("list");
  };
  const del = id => { if (window.confirm("Delete job?")) setData(d => ({ ...d, jobs: d.jobs.filter(j => j.id !== id) })); };
  const updateStatus = (id, status) => setData(d => ({ ...d, jobs: d.jobs.map(j => j.id === id ? { ...j, status, updatedAt: today() } : j) }));
  const addCheckItem = () => { if (!newItem.trim()) return; setForm(f => ({ ...f, checklist: [...f.checklist, { id: uid(), text: newItem.trim(), done: false }] })); setNewItem(""); };
  const toggleCheck = id => setForm(f => ({ ...f, checklist: f.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }));
  const removeCheck = id => setForm(f => ({ ...f, checklist: f.checklist.filter(c => c.id !== id) }));
  const filtered = filter === "all" ? data.jobs : data.jobs.filter(j => j.status === filter);
  const checkPct = f => f.checklist?.length ? Math.round(f.checklist.filter(c => c.done).length / f.checklist.length * 100) : 0;

  if (view === "form") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn t={t} variant="ghost" size="sm" onClick={() => setView("list")}><Icon d={IC.back} size={14} /> Back</Btn>
        <h2 style={{ color: t.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected ? "Edit" : "New"} Job</h2>
      </div>
      <Card t={t} style={{ marginBottom: 14 }}>
        <Inp t={t} label="Job Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Kitchen Remodel" required />
        <Sel t={t} label="Customer" value={form.customerId} onChange={v => setForm(f => ({ ...f, customerId: v }))} options={[{ value: "", label: "— Select —" }, ...data.customers.map(c => ({ value: c.id, label: c.name }))]} />
        <Inp t={t} label="Job Address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
        <Sel t={t} label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES.map(s => ({ value: s.key, label: s.label }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp t={t} label="Start Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date" />
          <Inp t={t} label="Value ($)" value={form.value} onChange={v => setForm(f => ({ ...f, value: v }))} type="number" />
        </div>
        <Inp t={t} label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} rows={3} />
      </Card>

      {/* Checklist */}
      <Card t={t} style={{ marginBottom: 14 }}>
        <SectionLabel t={t}>Job Checklist</SectionLabel>
        {form.checklist.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: t.subtext, fontSize: 12 }}>{form.checklist.filter(c => c.done).length}/{form.checklist.length} complete</span>
              <span style={{ color: t.accent, fontSize: 12, fontWeight: 700 }}>{checkPct(form)}%</span>
            </div>
            <div style={{ background: t.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${checkPct(form)}%`, background: `linear-gradient(90deg,${t.accent},${t.accent2})`, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
        {form.checklist.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => toggleCheck(item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? t.accent : t.border}`, background: item.done ? t.accent : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {item.done && <Icon d={IC.check} size={12} color="#fff" />}
            </button>
            <span style={{ flex: 1, color: item.done ? t.subtext : t.text, fontSize: 14, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
            <button onClick={() => removeCheck(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}><Icon d={IC.x} size={14} color="#ef4444" /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheckItem()} placeholder="Add checklist item..." style={{ flex: 1, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
          <Btn t={t} size="sm" onClick={addCheckItem}><Icon d={IC.plus} size={13} /></Btn>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 10 }}><Btn t={t} onClick={save}><Icon d={IC.check} size={14} /> Save</Btn><Btn t={t} variant="ghost" onClick={() => setView("list")}>Cancel</Btn></div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader title="Jobs" count={data.jobs.length} t={t}
        action={<Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> New</Btn>} />
      <div className="filter-pills" style={{ marginBottom: 16 }}>
        {[{ value: "all", label: "All" }, ...STATUSES].map(s => {
          const key = s.value || s.key;
          const active = filter === key;
          return (
            <button key={key} className="filter-pill" onClick={() => setFilter(key)}
              style={{ background: active ? `${s.color || t.accent}22` : t.surface, border: `1px solid ${active ? (s.color || t.accent) : t.border}`, color: active ? (s.color || t.accent) : t.subtext }}>
              {s.label}
            </button>
          );
        })}
      </div>
      {filtered.length === 0
        ? <Card t={t}><EmptyState icon="tag" title={filter !== "all" ? `No ${statusFor(filter).label} jobs` : "No jobs yet"} subtitle={filter !== "all" ? "Try a different filter" : "Create your first job to track progress"} t={t} action={filter === "all" && <Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={13} /> Create Job</Btn>} /></Card>
        : filtered.map(job => {
          const cl = job.checklist || [];
          const pct = cl.length ? Math.round(cl.filter(c => c.done).length / cl.length * 100) : null;
          return (
            <Card key={job.id} t={t} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{job.title}</div>
                  <div style={{ color: t.subtext, fontSize: 12, marginTop: 2 }}>{job.customerName} · {fmtDate(job.date)}</div>
                  {job.value && <div style={{ color: t.accent, fontSize: 13, marginTop: 4 }}>{fmt$(job.value)}</div>}
                  {pct !== null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: t.subtext, fontSize: 10 }}>Checklist</span>
                        <span style={{ color: t.accent, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ background: t.border, borderRadius: 3, height: 5 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: t.accent, borderRadius: 3 }} />
                      </div>
                    </div>
                  )}
                </div>
                <Badge status={job.status} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <select value={job.status} onChange={e => updateStatus(job.id, e.target.value)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 10px", color: t.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <Btn t={t} size="sm" variant="ghost" onClick={() => open(job)}><Icon d={IC.edit} size={12} /> Edit</Btn>
                <Btn t={t} size="sm" variant="danger" onClick={() => del(job.id)}><Icon d={IC.trash} size={12} /></Btn>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

// ─── AI SETTINGS COMPONENT ───────────────────────────────────────────────────
function AISettings({ data, setData, t }) {
  const [ai, setAi] = useState(() => data.aiConfig || {});
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const save = () => {
    const provider = ai.provider || "claude";
    // When saving, ensure the active provider's model is always a valid string default
    // so provider and model never mismatch in stored config
    const normalized = {
      ...ai,
      provider,
      model:       provider === "claude"  ? (ai.model       || "claude-sonnet-4-5") : "claude-sonnet-4-5",
      openaiModel: provider === "openai"  ? (ai.openaiModel || "gpt-4o-mini")        : "gpt-4o-mini",
    };
    setData(d => ({ ...d, aiConfig: normalized }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    if (!auth.currentUser) { setTestResult({ ok: false, msg: "Sign in first to test the connection." }); return; }
    const provider = ai.provider || "claude";
    setTesting(true); setTestResult(null);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const endpoint = provider === "openai"
        ? "https://contractor-crm-backend-production.up.railway.app/api/ai/openai"
        : "https://contractor-crm-backend-production.up.railway.app/api/ai/claude";
      const model = provider === "openai" ? (ai.openaiModel || "gpt-4o-mini") : (ai.model || "claude-sonnet-4-5");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ prompt: "Reply only: API_OK", systemPrompt: "You are a helpful assistant.", model })
      });
      const d = await res.json();
      if (d.error) setTestResult({ ok: false, msg: `❌ ${d.error}` });
      else setTestResult({ ok: true, msg: `✅ Connected! ${provider === "openai" ? "OpenAI" : "Claude"} is working.` });
    } catch (e) { setTestResult({ ok: false, msg: `❌ ${e.message}` }); }
    setTesting(false);
  };

  const trades = [["general","General Labor"],["carpenter","Carpenter"],["electrician","Electrician"],["plumber","Plumber"],["tile","Tile Setter"],["painter","Painter"],["concrete","Concrete"],["hvac","HVAC Tech"],["drywall","Drywall"],["roofing","Roofer"]];

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${t.accent}22,${t.accent}08)`, border: `1px solid ${t.accent}44`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div><div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>AI Estimator</div><div style={{ color: t.subtext, fontSize: 11 }}>Choose your AI provider below</div></div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>AI Provider</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["claude","🟣 Claude (Anthropic)"],["openai","🟢 ChatGPT (OpenAI)"]].map(([val, label]) => (
              <button key={val} onClick={() => setAi(a => ({ ...a, provider: val, model: val === "claude" ? (a.model || "claude-sonnet-4-5") : "claude-sonnet-4-5", openaiModel: val === "openai" ? (a.openaiModel || "gpt-4o-mini") : "gpt-4o-mini" }))}
                style={{ flex: 1, background: (ai.provider || "claude") === val ? `linear-gradient(135deg,${t.accent},${t.accent2})` : t.surface2, border: `1px solid ${(ai.provider || "claude") === val ? t.accent : t.border}`, borderRadius: 8, padding: "9px 10px", color: (ai.provider || "claude") === val ? "#fff" : t.subtext, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {(ai.provider || "claude") === "claude" ? (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Model</label>
            <select value={ai.model || "claude-sonnet-4-5"} onChange={e => setAi(a => ({ ...a, model: e.target.value }))} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              <option value="claude-sonnet-4-5">Claude Sonnet 4.5 — Fast & affordable ★ Recommended</option>
              <option value="claude-opus-4-5">Claude Opus 4.5 — Most powerful, slower & costlier</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Fastest, lowest cost</option>
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Model</label>
            <select value={ai.openaiModel || "gpt-4o-mini"} onChange={e => setAi(a => ({ ...a, openaiModel: e.target.value }))} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              <option value="gpt-4o-mini">GPT-4o mini — Fast & affordable ★ Recommended</option>
              <option value="gpt-4o">GPT-4o — Most capable, higher cost</option>
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={testConnection} disabled={testing} style={{ background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: testing ? "not-allowed" : "pointer" }}>{testing ? "Testing..." : "Test Connection"}</button>
          {testResult && <span style={{ color: testResult.ok ? "#4ade80" : "#f87171", fontSize: 12 }}>{testResult.msg}</span>}
        </div>
      </div>

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 700 }}>Your Market & Labor Rates ($/hr)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><label style={{ display: "block", color: t.subtext, fontSize: 11, marginBottom: 4 }}>Region / City</label><input value={ai.region || ""} onChange={e => setAi(a => ({ ...a, region: e.target.value }))} placeholder="e.g. Portland, OR" style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} /></div>
          <div><label style={{ display: "block", color: t.subtext, fontSize: 11, marginBottom: 4 }}>Default Markup %</label><input type="number" value={ai.markup || "20"} onChange={e => setAi(a => ({ ...a, markup: e.target.value }))} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {trades.map(([key, label]) => (
            <div key={key}>
              <label style={{ display: "block", color: t.subtext, fontSize: 10, marginBottom: 3 }}>{label}</label>
              <input type="number" value={ai.laborRates?.[key] || ""} onChange={e => setAi(a => ({ ...a, laborRates: { ...a.laborRates, [key]: e.target.value } }))} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 10px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>Custom AI Instructions</div>
        <div style={{ color: t.subtext, fontSize: 11, marginBottom: 8, lineHeight: 1.6 }}>Tell the AI your preferences. E.g. "Always add 15% contingency on bath remodels." or "Never include electrical — I sub that out."</div>
        <textarea value={ai.customInstructions || ""} onChange={e => setAi(a => ({ ...a, customInstructions: e.target.value }))} rows={4} placeholder="Enter your personal estimating rules..." style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
      </div>

      <button onClick={save} style={{ width: "100%", background: saved ? "linear-gradient(135deg,#059669,#047857)" : `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 8, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {saved ? "✅ AI Settings Saved!" : "Save AI Settings"}
      </button>
    </div>
  );
}

// ─── AI ESTIMATE PANEL ────────────────────────────────────────────────────────
function AIEstimatePanel({ aiConfig, onApply, t }) {
  const [open, setOpen] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("idle");

  const provider = aiConfig?.provider || "claude";
  const hasKey = !!auth.currentUser;

  const generate = async () => {
    if (!jobDesc.trim()) return;
    if (!auth.currentUser) { setError("Sign in to use AI Estimator."); return; }
    setLoading(true); setPhase("generating"); setResult(null); setError(null);
    const rates = aiConfig?.laborRates || {};
    const rateStr = Object.entries(rates).map(([k, v]) => `${k}: $${v}/hr`).join(", ");
    const userMsg = `MARKET: ${aiConfig?.region || "Not specified"}\nMARKUP: ${aiConfig?.markup || 20}%\nLABOR RATES: ${rateStr}\nCUSTOM INSTRUCTIONS: ${aiConfig?.customInstructions || "None"}\n\nJOB:\n${jobDesc}\n\nReturn ONLY the JSON object.`;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const endpoint = provider === "openai"
        ? "https://contractor-crm-backend-production.up.railway.app/api/ai/openai"
        : "https://contractor-crm-backend-production.up.railway.app/api/ai/claude";
      const model = provider === "openai" ? (aiConfig?.openaiModel || "gpt-4o-mini") : (aiConfig?.model || "claude-sonnet-4-5");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ prompt: userMsg, systemPrompt: CONTRACTOR_SYSTEM_PROMPT, model })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      const text = d.text || d.content || "";
      const clean = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed); setPhase("done");
    } catch(e) {
      setError(e.message.includes("JSON") ? "Unexpected response — try rephrasing your description." : e.message);
      setPhase("error");
    }
    setLoading(false);
  };

  const applyEstimate = () => {
    if (!result) return;
    const lines = (result.lines || []).map(l => ({ id: Math.random().toString(36).slice(2), description: l.description || "", qty: Number(l.qty) || 1, unit: l.unit || "ls", unitPrice: Number(l.unitPrice) || 0, type: l.type || "labor" }));
    onApply({ lines, scopeSummary: typeof result.scopeSummary === 'string' ? result.scopeSummary : "", notes: typeof result.notes === 'string' ? result.notes : "" });
    setOpen(false); setPhase("idle"); setJobDesc(""); setResult(null);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>✨</span> AI Generate Estimate
      {!hasKey && <span style={{ background: "#fbbf24", color: "#000", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>SIGN IN REQUIRED</span>}
    </button>
  );

  return (
    <div style={{ background: "#130520", border: "2px solid #7c3aed", borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <div><div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>AI Estimate Generator</div><div style={{ color: "#a78bfa", fontSize: 10 }}>{provider === "openai" ? "🟢 ChatGPT" : "🟣 Claude"} · {aiConfig?.region || "Your market"}</div></div>
        </div>
        <button onClick={() => { setOpen(false); setPhase("idle"); setResult(null); setError(null); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {(phase === "idle" || phase === "error") && (
        <>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>Describe the job — the more detail the better:</div>
          <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={5} placeholder={"Examples:\n\"750 sq ft master bath gut remodel — demo tile, 24x24 porcelain floors, tile shower, double vanity, toilet, paint\"\n\n\"Replace 200 lf cedar fence, 6ft dog-ear, remove old, new concrete footings\""} style={{ width: "100%", background: "#0d1520", border: "1px solid #4c1d95", borderRadius: 10, padding: "12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
          {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8, padding: "8px 12px", background: "#450a0a", borderRadius: 8 }}>⚠️ {error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={generate} disabled={!jobDesc.trim()} style={{ flex: 1, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: !jobDesc.trim() ? "not-allowed" : "pointer", opacity: !jobDesc.trim() ? 0.5 : 1 }}>Generate Estimate →</button>
          </div>
        </>
      )}

      {phase === "generating" && (
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
          <div style={{ color: "#a78bfa", fontSize: 14, fontWeight: 600 }}>{provider === "openai" ? "ChatGPT" : "Claude"} is building your estimate...</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>Analyzing scope and pricing line items</div>
        </div>
      )}

      {phase === "done" && result && (
        <>
          {result.scopeSummary && <div style={{ background: "#052e16", border: "1px solid #16a34a", borderRadius: 10, padding: 12, marginBottom: 12 }}><div style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Scope Summary</div><div style={{ color: "#d1fae5", fontSize: 12, lineHeight: 1.7 }}>{result.scopeSummary}</div></div>}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Line Items ({result.lines?.length || 0})</div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {(result.lines || []).map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 10px", background: "#0d1520", borderRadius: 7, marginBottom: 3, gap: 8 }}>
                  <div style={{ flex: 1 }}><div style={{ color: "#e2e8f0", fontSize: 12 }}>{l.description}</div><div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>{l.qty} {l.unit} · <span style={{ color: l.type === "labor" ? "#60a5fa" : l.type === "material" ? "#f59e0b" : "#a78bfa" }}>{l.type}</span></div></div>
                  <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>${(Number(l.qty)*Number(l.unitPrice)).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 10px 0", borderTop: "1px solid #1e2d40", marginTop: 6 }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Estimated Total</span>
              <span style={{ color: "#4ade80", fontSize: 18, fontWeight: 800 }}>${(result.lines||[]).reduce((s,l)=>s+Number(l.qty)*Number(l.unitPrice),0).toLocaleString()}</span>
            </div>
          </div>
          {result.warnings?.length > 0 && <div style={{ background: "#451a03", border: "1px solid #f59e0b", borderRadius: 8, padding: 10, marginBottom: 10 }}><div style={{ color: "#fcd34d", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>⚠️ REVIEW BEFORE SENDING</div>{result.warnings.map((w,i) => <div key={i} style={{ color: "#fde68a", fontSize: 11, marginBottom: 2 }}>• {w}</div>)}</div>}
          {result.notes && <div style={{ background: "#0f172a", border: "1px solid #1e2d40", borderRadius: 8, padding: 10, marginBottom: 10 }}><div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, marginBottom: 3 }}>ASSUMPTIONS & EXCLUSIONS</div><div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.6 }}>{typeof result.notes === 'string' ? result.notes : JSON.stringify(result.notes)}</div></div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={applyEstimate} style={{ flex: 1, background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, padding: "12px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✅ Apply to Estimate</button>
            <button onClick={() => { setPhase("idle"); setResult(null); }} style={{ background: "#1e2d40", border: "1px solid #334155", borderRadius: 8, padding: "12px 14px", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↺ Redo</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI SCOPE WRITER ──────────────────────────────────────────────────────────
function AIScopeWriter({ aiConfig, lines, jobTitle, onApply, t }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const provider = aiConfig?.provider || "claude";
  const hasKey = !!auth.currentUser;
  const scopeSystem = "You are an expert construction contract writer. Write professional scope of work language. Clear, specific, third-person present tense. Include what IS and IS NOT included. No bullet points — flowing professional prose suitable for a legal contract. Under 150 words.";

  const generateScope = async () => {
    if (!auth.currentUser) { setError("Sign in to use AI features."); return; }
    setLoading(true); setError(null);
    const linesSummary = (lines || []).filter(l => l.description).map(l => `- ${l.description}: ${l.qty} ${l.unit} @ $${l.unitPrice}`).join("\n");
    const userContent = `Write scope of work for:\nJob: ${jobTitle || "Remodeling Project"}\nMarket: ${aiConfig?.region || "US"}\nInstructions: ${aiConfig?.customInstructions || "None"}\nLine Items:\n${linesSummary || "General remodeling work"}`;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const endpoint = provider === "openai"
        ? "https://contractor-crm-backend-production.up.railway.app/api/ai/openai"
        : "https://contractor-crm-backend-production.up.railway.app/api/ai/claude";
      const model = provider === "openai" ? (aiConfig?.openaiModel || "gpt-4o-mini") : (aiConfig?.model || "claude-sonnet-4-5");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ prompt: userContent, systemPrompt: scopeSystem, model })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      const text = d.text || d.content || "";
      onApply(text);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Notes / Scope of Work</label>
        <button onClick={generateScope} disabled={loading} title={!hasKey ? `Add ${provider === "openai" ? "OpenAI" : "Anthropic"} key in Settings` : "Generate professional scope with AI"}
          style={{ background: loading ? t.muted : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          {loading ? "Writing..." : <><span style={{ fontSize: 12 }}>✨</span> AI Write Scope</>}
        </button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 11, marginBottom: 4 }}>⚠️ {error}</div>}
    </div>
  );
}

// ─── ESTIMATES ────────────────────────────────────────────────────────────────
function Estimates({ data, setData, t }) {
  const [view, setView] = useState("list");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);

  const nextEstNum = () => { const nums = data.estimates.map(e => parseInt((e.number || "").replace("EST-","")) || 0); return Math.max(0, ...nums) + 1; };
  const blank = () => ({ id: uid(), number: `EST-${String(nextEstNum()).padStart(4, "0")}`, customerId: "", customerName: "", jobTitle: "", date: today(), lines: [{ id: uid(), description: "", qty: 1, unit: "ea", unitPrice: 0, type: "labor" }], taxRate: 0, notes: "", status: "draft" });
  const open = e => { setSelected(e || null); setForm(e ? JSON.parse(JSON.stringify(e)) : blank()); setView("form"); };
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { id: uid(), description: "", qty: 1, unit: "ea", unitPrice: 0, type: "material" }] }));
  const removeLine = id => setForm(f => ({ ...f, lines: f.lines.filter(l => l.id !== id) }));
  const updLine = (id, k, v) => setForm(f => ({ ...f, lines: f.lines.map(l => l.id === id ? { ...l, [k]: v } : l) }));
  const subtotal = f => (f?.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
  const tax = f => subtotal(f) * (Number(f?.taxRate || 0) / 100);
  const total = f => subtotal(f) + tax(f);
  const save = () => {
    if (!form) return;
    const cust = data.customers.find(c => c.id === form.customerId);
    const payload = { ...form, customerName: cust ? cust.name : form.customerName, total: total(form), updatedAt: today() };
    if (selected) setData(d => ({ ...d, estimates: d.estimates.map(e => e.id === selected.id ? payload : e) }));
    else setData(d => ({ ...d, estimates: [...d.estimates, payload] }));
    setView("list");
  };
  const convert = est => {
    const nextInvNum = () => { const nums = data.invoices.map(i => parseInt((i.number || "").replace("INV-","")) || 0); return Math.max(0, ...nums) + 1; };
    const inv = { id: uid(), number: `INV-${String(nextInvNum()).padStart(4, "0")}`, customerId: est.customerId, customerName: est.customerName, estimateId: est.id, date: today(), dueDate: "", jobTitle: est.jobTitle, lines: JSON.parse(JSON.stringify(est.lines)), taxRate: est.taxRate, total: est.total, status: "unpaid", notes: est.notes, openSignUrl: "", openSignDocId: "", openSignSentTo: "", openSignSentAt: "", signedAt: "", contractTerms: { paymentSchedule: "", warranty: "", permits: "", additional: "" }, jobStartDate: "", jobEndDate: "", jobAddress: "", photos: [] };
    setData(d => ({ ...d, invoices: [...d.invoices, inv], estimates: d.estimates.map(e => e.id === est.id ? { ...e, status: "approved" } : e) }));
    alert(`Invoice ${inv.number} created!`);
  };
  const del = id => { if (window.confirm("Delete?")) setData(d => ({ ...d, estimates: d.estimates.filter(e => e.id !== id) })); };

  if (view === "form" && form) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn t={t} variant="ghost" size="sm" onClick={() => setView("list")}><Icon d={IC.back} size={14} /> Back</Btn>
        <h2 style={{ color: t.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected ? form.number : "New Estimate"}</h2>
      </div>
      <AIEstimatePanel
        aiConfig={data.aiConfig}
        onApply={({ lines, scopeSummary, notes }) => setForm(f => ({ ...f, lines: lines.length > 0 ? lines : f.lines, jobTitle: f.jobTitle || scopeSummary.slice(0,60), notes: notes || f.notes }))}
        t={t}
      />
      <Card t={t} style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Sel t={t} label="Customer" value={form.customerId} onChange={v => { const c = data.customers.find(x => x.id === v); setForm(f => ({ ...f, customerId: v, customerName: c?.name || "" })); }} options={[{ value: "", label: "— Select —" }, ...data.customers.map(c => ({ value: c.id, label: c.name }))]} />
          <Inp t={t} label="Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date" />
        </div>
        <Inp t={t} label="Job Description" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))} placeholder="e.g. Master Bath Remodel" />
      </Card>
      <Card t={t} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionLabel t={t}>Line Items</SectionLabel>
          <Btn t={t} size="sm" onClick={addLine}><Icon d={IC.plus} size={12} /> Add</Btn>
        </div>
        {form.lines.map((line, idx) => (
          <div key={line.id} style={{ background: t.surface2, borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <select value={line.type} onChange={e => updLine(line.id, "type", e.target.value)} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 8px", color: line.type === "labor" ? "#60a5fa" : "#f59e0b", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                <option value="labor">Labor</option><option value="material">Material</option><option value="subcontractor">Sub</option><option value="other">Other</option>
              </select>
              <span style={{ color: t.muted, fontSize: 12 }}>#{idx + 1}</span>
              <button onClick={() => removeLine(line.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Icon d={IC.x} size={14} color="#ef4444" /></button>
            </div>
            <input value={line.description} onChange={e => updLine(line.id, "description", e.target.value)} placeholder="Description" style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14, padding: "4px 0", marginBottom: 8, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 8 }}>
              {[["QTY", "qty", "number"], ["UNIT", "unit", "text"], ["UNIT PRICE", "unitPrice", "number"]].map(([lbl, key, typ]) => (
                <div key={key}><div style={{ color: t.subtext, fontSize: 10, marginBottom: 3 }}>{lbl}</div><input type={typ} value={line[key]} onChange={e => updLine(line.id, key, e.target.value)} style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 8px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} /></div>
              ))}
            </div>
            <div style={{ textAlign: "right", color: t.accent, fontSize: 13, marginTop: 8, fontWeight: 600 }}>{fmt$(Number(line.qty) * Number(line.unitPrice))}</div>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: t.subtext, fontSize: 14, marginBottom: 6 }}><span>Subtotal</span><span>{fmt$(subtotal(form))}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: t.subtext, fontSize: 14 }}>Tax (%)</span>
            <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} style={{ width: 70, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 8px", color: t.text, fontSize: 14, textAlign: "right", fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: t.text, fontSize: 18, fontWeight: 800, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}` }}><span>Total</span><span style={{ color: "#4ade80" }}>{fmt$(total(form))}</span></div>
        </div>
      </Card>
      <Card t={t} style={{ marginBottom: 16 }}>
        <AIScopeWriter aiConfig={data.aiConfig} lines={form.lines} jobTitle={form.jobTitle} onApply={scope => setForm(f => ({ ...f, notes: scope }))} t={t} />
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} placeholder="Scope details, exclusions, terms..."
          style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
      </Card>
      <div style={{ display: "flex", gap: 10 }}><Btn t={t} onClick={save}><Icon d={IC.check} size={14} /> Save</Btn><Btn t={t} variant="ghost" onClick={() => setView("list")}>Cancel</Btn></div>
    </div>
  );

  return (
    <div className="page-enter">
      <PageHeader title="Estimates" count={data.estimates.length} t={t}
        action={<Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> New</Btn>} />
      {data.estimates.length === 0
        ? <Card t={t}><EmptyState icon="file" title="No estimates yet" subtitle="Create an estimate and convert it to an invoice when approved" t={t} action={<Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={13} /> Create First</Btn>} /></Card>
        : [...data.estimates].reverse().map(est => (
          <Card key={est.id} t={t} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div><div style={{ color: t.accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>{est.number}</div><div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{est.customerName || "No customer"}</div><div style={{ color: t.subtext, fontSize: 12 }}>{est.jobTitle} · {fmtDate(est.date)}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ color: "#4ade80", fontSize: 18, fontWeight: 800 }}>{fmt$(est.total)}</div><span style={{ background: est.status === "approved" ? "#052e16" : t.muted, color: est.status === "approved" ? "#4ade80" : t.subtext, borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{est.status}</span></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn t={t} size="sm" variant="ghost" onClick={() => open(est)}><Icon d={IC.edit} size={12} /> Edit</Btn>
              {est.status !== "approved" && <Btn t={t} size="sm" variant="success" onClick={() => convert(est)}><Icon d={IC.contract} size={12} /> → Invoice+Contract</Btn>}
              <Btn t={t} size="sm" variant="danger" onClick={() => del(est.id)}><Icon d={IC.trash} size={12} /></Btn>
            </div>
          </Card>
        ))}
    </div>
  );
}

// ─── CREDENTIALS MANAGER (paste before Settings function) ─────────────────────

function CredentialsManager({ data, setData, t }) {
  const [uploading, setUploading] = useState(null);
  const [expandDoc, setExpandDoc] = useState(null);

  const creds = data.credentials || { docs: [] };

  const DOC_TYPES = [
    { key: "coi",     label: "Certificate of Insurance", icon: "🛡️", required: false },
    { key: "license", label: "CCB Contractor License",   icon: "📋", required: false },
    { key: "bond",    label: "Surety Bond",               icon: "🔒", required: false },
    { key: "workers", label: "Workers Comp Certificate",  icon: "👷", required: false },
    { key: "other",   label: "Other Document",            icon: "📄", required: false },
  ];

  const getDaysUntilExpiry = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr + "T00:00:00") - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const expiryStatus = (dateStr) => {
    const days = getDaysUntilExpiry(dateStr);
    if (days === null) return null;
    if (days < 0)   return { color: "#ef4444", bg: "#450a0a", label: "EXPIRED",          icon: "❌" };
    if (days <= 30) return { color: "#f59e0b", bg: "#451a03", label: `Expires in ${days}d`, icon: "⚠️" };
    if (days <= 90) return { color: "#fbbf24", bg: "#422006", label: `Expires in ${days}d`, icon: "⏰" };
    return           { color: "#4ade80", bg: "#052e16", label: `Valid — ${days}d left`,   icon: "✅" };
  };

  const handleUpload = (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(docType);
    const reader = new FileReader();
    reader.onload = ev => {
      const existing = (creds.docs || []).find(d => d.type === docType);
      const newDoc = {
        id:       existing?.id || Math.random().toString(36).slice(2),
        type:     docType,
        label:    DOC_TYPES.find(d => d.key === docType)?.label || docType,
        fileName: file.name,
        mimeType: file.type,
        dataUrl:  ev.target.result,
        uploadedAt: new Date().toISOString().split("T")[0],
        expiresAt:  existing?.expiresAt || "",
        notes:      existing?.notes || "",
      };
      const filtered = (creds.docs || []).filter(d => d.type !== docType);
      setData(d => ({ ...d, credentials: { ...creds, docs: [...filtered, newDoc] } }));
      setUploading(null);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (docId) => {
    if (!window.confirm("Remove this document?")) return;
    setData(d => ({ ...d, credentials: { ...creds, docs: (creds.docs || []).filter(x => x.id !== docId) } }));
  };

  const updateDoc = (docId, patch) => {
    setData(d => ({
      ...d,
      credentials: {
        ...creds,
        docs: (creds.docs || []).map(x => x.id === docId ? { ...x, ...patch } : x)
      }
    }));
  };

  const openDoc = (doc) => {
    const win = window.open("", "_blank");
    if (doc.mimeType === "application/pdf") {
      win.document.write(`<html><body style="margin:0"><embed src="${doc.dataUrl}" type="application/pdf" width="100%" height="100%"/></body></html>`);
    } else {
      win.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${doc.dataUrl}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`);
    }
  };

  // Generate shareable credential page HTML
  const generateCredentialPage = () => {
    const co = data.company || {};
    const validDocs = (creds.docs || []).filter(d => d.dataUrl);
    const docCards = validDocs.map(doc => {
      const status = expiryStatus(doc.expiresAt);
      const isImage = doc.mimeType?.startsWith("image/");
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px">
          ${isImage ? `<img src="${doc.dataUrl}" style="width:100%;max-height:300px;object-fit:contain;background:#f9fafb;padding:12px;box-sizing:border-box"/>` : `<div style="background:#f3f4f6;padding:20px;text-align:center"><a href="${doc.dataUrl}" target="_blank" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">📄 View / Download PDF</a></div>`}
          <div style="padding:14px">
            <div style="font-size:15px;font-weight:700;color:#111827">${doc.label}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Uploaded: ${doc.uploadedAt}</div>
            ${doc.expiresAt && status ? `<div style="margin-top:8px;background:${status.bg};border:1px solid ${status.color};border-radius:20px;padding:3px 10px;display:inline-block;font-size:11px;font-weight:700;color:${status.color}">${status.icon} ${status.label}</div>` : ""}
            ${doc.notes ? `<div style="margin-top:8px;font-size:12px;color:#6b7280">${doc.notes}</div>` : ""}
          </div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${co.name || "Contractor"} — Credentials</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f8fafc;color:#111827;padding:20px}
    .header{background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border-radius:16px;padding:28px;margin-bottom:24px;text-align:center}
    .badge{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 12px;font-size:12px;display:inline-block;margin-top:8px}
    </style></head><body>
    <div style="max-width:600px;margin:0 auto">
      <div class="header">
        <div style="font-size:28px;font-weight:800">${co.name || "Your Contractor"}</div>
        ${co.ccbNumber ? `<div class="badge">CCB License #${co.ccbNumber}</div>` : ""}
        <div style="margin-top:12px;font-size:13px;opacity:0.85">${[co.phone, co.email].filter(Boolean).join(" · ")}</div>
      </div>
      ${validDocs.length === 0 ? '<div style="text-align:center;padding:40px;color:#6b7280">No credentials uploaded yet.</div>' : docCards}
      <div style="text-align:center;color:#9ca3af;font-size:11px;margin-top:24px">Generated by Contractor CRM · ${new Date().toLocaleDateString()}</div>
    </div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(co.name || "contractor").replace(/\s+/g,"-").toLowerCase()}-credentials.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header + share button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>Insurance & License Docs</div>
          <div style={{ color: t.subtext, fontSize: 11, marginTop: 2 }}>Stored locally · Shown on invoices · Shareable link</div>
        </div>
        <button onClick={generateCredentialPage} style={{ background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          🔗 Download Credential Page
        </button>
      </div>

      {/* Expiry alerts */}
      {(creds.docs || []).filter(d => {
        const days = getDaysUntilExpiry(d.expiresAt);
        return days !== null && days <= 30;
      }).map(doc => {
        const st = expiryStatus(doc.expiresAt);
        return (
          <div key={doc.id} style={{ background: st.bg, border: `1px solid ${st.color}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{st.icon}</span>
            <div>
              <div style={{ color: st.color, fontSize: 13, fontWeight: 700 }}>{doc.label} — {st.label}</div>
              <div style={{ color: t.subtext, fontSize: 11 }}>Update this document soon to stay compliant</div>
            </div>
          </div>
        );
      })}

      {/* Doc slots */}
      {DOC_TYPES.map(docType => {
        const uploaded = (creds.docs || []).find(d => d.type === docType.key);
        const status = uploaded ? expiryStatus(uploaded.expiresAt) : null;
        const isExpanded = expandDoc === docType.key;

        return (
          <div key={docType.key} style={{ background: t.surface, border: `1px solid ${uploaded && status ? status.color + "44" : t.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            {/* Doc header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{docType.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{docType.label}</span>
                  {docType.required && <span style={{ background: t.muted, color: t.subtext, borderRadius: 20, padding: "1px 7px", fontSize: 10 }}>Required</span>}
                </div>
                {uploaded ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ color: t.subtext, fontSize: 11 }}>{uploaded.fileName}</span>
                    {status && <span style={{ background: status.bg, color: status.color, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{status.icon} {status.label}</span>}
                  </div>
                ) : (
                  <div style={{ color: t.muted, fontSize: 11, marginTop: 2 }}>Not uploaded</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {uploaded && (
                  <>
                    <button onClick={() => openDoc(uploaded)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", color: t.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>View</button>
                    <button onClick={() => setExpandDoc(isExpanded ? null : docType.key)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "5px 10px", color: t.subtext, fontSize: 11, cursor: "pointer" }}>{isExpanded ? "▲" : "▼"}</button>
                  </>
                )}
                <label style={{ background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {uploading === docType.key ? "..." : uploaded ? "Replace" : "Upload"}
                  <input type="file" accept=".pdf,image/*" onChange={e => handleUpload(docType.key, e)} style={{ display: "none" }} />
                </label>
              </div>
            </div>

            {/* Expanded details */}
            {uploaded && isExpanded && (
              <div style={{ borderTop: `1px solid ${t.border}`, padding: "14px 16px", background: t.surface2 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Expiration Date</label>
                    <input type="date" value={uploaded.expiresAt || ""} onChange={e => updateDoc(uploaded.id, { expiresAt: e.target.value })}
                      style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "7px 10px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Uploaded On</label>
                    <div style={{ color: t.text, fontSize: 13, padding: "7px 0" }}>{uploaded.uploadedAt}</div>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Notes (policy #, agent, etc.)</label>
                  <input value={uploaded.notes || ""} onChange={e => updateDoc(uploaded.id, { notes: e.target.value })} placeholder="e.g. Policy #ABC-123456 · Agent: John Smith"
                    style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "7px 10px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={() => removeDoc(uploaded.id)} style={{ marginTop: 10, background: "none", border: "1px solid #ef4444", borderRadius: 6, padding: "5px 12px", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Remove Document</button>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ color: t.subtext, fontSize: 11, marginTop: 8, lineHeight: 1.7 }}>
        💡 <strong style={{ color: t.text }}>How customers view your credentials:</strong>
        <ol style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.9 }}>
          <li>Download the credential page HTML file above</li>
          <li>In Netlify → drag the file into your site's <code style={{ background: t.surface, padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>public</code> folder and name it <code style={{ background: t.surface, padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>credentials.html</code></li>
          <li>Add your Netlify URL in Settings → Company Info</li>
          <li>Customers see a "🛡️ View Credentials" link at the bottom of every invoice — nothing is shown until they click it</li>
        </ol>
      </div>
    </div>
  );
}


// ─── ACCOUNTING EXPORTS (paste before Invoices function) ──────────────────────

function AccountingExports({ data, t }) {
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [exporting, setExporting]   = useState(null);
  const [qboConfig, setQboConfig]   = useState(data.qboConfig || { clientId: "", realmId: "", accessToken: "" });
  const [showQBO, setShowQBO]       = useState(false);
  const [qboStatus, setQboStatus]   = useState(null);

  const co = data.company || {};

  const filteredInvoices = data.invoices.filter(inv => {
    if (dateFrom && inv.date < dateFrom) return false;
    if (dateTo   && inv.date > dateTo)   return false;
    return true;
  });

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    setExporting("csv");
    const headers = ["Invoice #","Date","Due Date","Customer","Job Title","Status","Line Description","Type","Qty","Unit","Unit Price","Line Total","Subtotal","Tax Rate","Tax Amount","Invoice Total"];
    const rows = [];

    filteredInvoices.forEach(inv => {
      const sub  = (inv.lines||[]).reduce((s,l) => s + Number(l.qty)*Number(l.unitPrice), 0);
      const tax  = sub * (Number(inv.taxRate||0)/100);
      const tot  = sub + tax;
      if ((inv.lines||[]).length === 0) {
        rows.push([inv.number, inv.date, inv.dueDate||"", inv.customerName, inv.jobTitle||"", inv.status, "", "", "", "", "", "", sub.toFixed(2), inv.taxRate||0, tax.toFixed(2), tot.toFixed(2)]);
      } else {
        inv.lines.forEach((line, i) => {
          const lineTotal = Number(line.qty)*Number(line.unitPrice);
          rows.push([
            inv.number, inv.date, inv.dueDate||"", inv.customerName, inv.jobTitle||"", inv.status,
            line.description, line.type, line.qty, line.unit, Number(line.unitPrice||0).toFixed(2), lineTotal.toFixed(2),
            i === 0 ? sub.toFixed(2) : "",
            i === 0 ? (inv.taxRate||0) : "",
            i === 0 ? tax.toFixed(2) : "",
            i === 0 ? tot.toFixed(2) : ""
          ]);
        });
      }
    });

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    download(`invoices-export-${today()}.csv`, csvContent, "text/csv");
    setExporting(null);
  };

  // ── IIF Export (QuickBooks Desktop) ────────────────────────────────────────
  const exportIIF = () => {
    setExporting("iif");
    let iif = `!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\n`;
    iif    += `!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n`;
    iif    += `!ENDTRNS\n`;

    filteredInvoices.forEach(inv => {
      const sub = (inv.lines||[]).reduce((s,l) => s + Number(l.qty)*Number(l.unitPrice), 0);
      const tax = sub * (Number(inv.taxRate||0)/100);
      const tot = sub + tax;
      const dateStr = inv.date ? inv.date.replace(/-/g,"/") : today().replace(/-/g,"/");

      iif += `TRNS\tINVOICE\t${dateStr}\tAccounts Receivable\t${inv.customerName}\t${tot.toFixed(2)}\t${inv.number}\t${inv.jobTitle||""}\n`;
      (inv.lines||[]).forEach(line => {
        const lineTotal = Number(line.qty)*Number(line.unitPrice);
        const acct = line.type === "labor" ? "Labor Income" : line.type === "material" ? "Materials Income" : "Services Income";
        iif += `SPL\tINVOICE\t${dateStr}\t${acct}\t${inv.customerName}\t-${lineTotal.toFixed(2)}\t${line.description}\n`;
      });
      if (tax > 0) iif += `SPL\tINVOICE\t${dateStr}\tSales Tax Payable\t${inv.customerName}\t-${tax.toFixed(2)}\tSales Tax\n`;
      iif += `ENDTRNS\n`;
    });

    download(`invoices-qb-desktop-${today()}.iif`, iif, "text/plain");
    setExporting(null);
  };

  // ── Single invoice CSV ──────────────────────────────────────────────────────
  const exportSingleInvoiceCSV = (inv) => {
    const sub = (inv.lines||[]).reduce((s,l) => s + Number(l.qty)*Number(l.unitPrice), 0);
    const tax = sub * (Number(inv.taxRate||0)/100);
    const tot = sub + tax;
    const headers = ["Description","Type","Qty","Unit","Unit Price","Total"];
    const rows = (inv.lines||[]).map(l => [l.description, l.type, l.qty, l.unit, l.unitPrice, (Number(l.qty)*Number(l.unitPrice)).toFixed(2)]);
    rows.push(["","","","","Subtotal",sub.toFixed(2)]);
    if (tax > 0) rows.push(["","","","",`Tax (${inv.taxRate}%)`,tax.toFixed(2)]);
    rows.push(["","","","","TOTAL DUE",tot.toFixed(2)]);
    const csv = [headers,...rows].map(r => r.map(c => `"${String(c||"")}"`).join(",")).join("\n");
    download(`${inv.number}-${inv.customerName.replace(/\s+/g,"-")}.csv`, csv, "text/csv");
  };

  // ── QBO Push (simulated — requires OAuth setup) ────────────────────────────
  const pushToQBO = async (inv) => {
    if (!qboConfig.accessToken || !qboConfig.realmId) {
      alert("Configure QuickBooks Online connection first — click 'Setup QBO' below.");
      return;
    }
    setExporting(`qbo-${inv.id}`);
    // In a full implementation this would call the QBO API
    // For now we show the QBO invoice payload and instructions
    const sub = (inv.lines||[]).reduce((s,l) => s + Number(l.qty)*Number(l.unitPrice), 0);
    const tax = sub * (Number(inv.taxRate||0)/100);
    const payload = {
      DocNumber: inv.number,
      TxnDate: inv.date,
      CustomerRef: { name: inv.customerName },
      Line: (inv.lines||[]).map((l,i) => ({
        Id: String(i+1),
        LineNum: i+1,
        Description: l.description,
        Amount: Number(l.qty)*Number(l.unitPrice),
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: { Qty: Number(l.qty), UnitPrice: Number(l.unitPrice) }
      })),
      TxnTaxDetail: tax > 0 ? { TotalTax: tax } : undefined,
    };
    alert(`QBO Invoice Payload Ready:\n\n${JSON.stringify(payload, null, 2).slice(0, 500)}...\n\nFull OAuth integration requires a backend proxy. Export CSV for now and import into QBO, or use the QBO CSV import feature.`);
    setExporting(null);
  };

  const download = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = filteredInvoices.reduce((s, inv) => {
    const sub = (inv.lines||[]).reduce((ss,l) => ss + Number(l.qty)*Number(l.unitPrice), 0);
    return s + sub + sub*(Number(inv.taxRate||0)/100);
  }, 0);

  const paidRevenue = filteredInvoices.filter(i => i.status === "paid").reduce((s, inv) => {
    const sub = (inv.lines||[]).reduce((ss,l) => ss + Number(l.qty)*Number(l.unitPrice), 0);
    return s + sub + sub*(Number(inv.taxRate||0)/100);
  }, 0);

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Total Invoiced", value: fmt$(totalRevenue), color: t.accent },
          { label: "Collected",      value: fmt$(paidRevenue),  color: "#4ade80" },
          { label: "Outstanding",    value: fmt$(totalRevenue - paidRevenue), color: "#f97316" },
        ].map(s => (
          <div key={s.label} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: s.color, fontSize: 16, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: t.subtext, fontSize: 10, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ color: t.subtext, fontSize: 12, marginBottom: 14 }}>{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} in range</div>

      {/* Export buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <button onClick={exportCSV} disabled={exporting === "csv" || filteredInvoices.length === 0}
          style={{ background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 10, padding: "13px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: filteredInvoices.length === 0 ? 0.5 : 1 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <div style={{ textAlign: "left" }}>
            <div>Export CSV — All Platforms</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>QuickBooks, Wave, FreshBooks, Xero, Excel, Google Sheets</div>
          </div>
        </button>

        <button onClick={exportIIF} disabled={exporting === "iif" || filteredInvoices.length === 0}
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", borderRadius: 10, padding: "13px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: filteredInvoices.length === 0 ? 0.5 : 1 }}>
          <span style={{ fontSize: 18 }}>🖥️</span>
          <div style={{ textAlign: "left" }}>
            <div>Export IIF — QuickBooks Desktop</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>Direct import into QuickBooks Pro, Premier, Enterprise</div>
          </div>
        </button>

        <button onClick={() => setShowQBO(s => !s)}
          style={{ background: showQBO ? t.muted : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 10, padding: "13px 18px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div style={{ textAlign: "left" }}>
            <div>QuickBooks Online — Direct Sync</div>
            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>{showQBO ? "Click to collapse" : "Configure API connection"}</div>
          </div>
        </button>
      </div>

      {/* QBO Setup Panel */}
      {showQBO && (
        <div style={{ background: t.surface2, border: `1px solid #7c3aed`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>QuickBooks Online Setup</div>
          <div style={{ color: t.subtext, fontSize: 12, marginBottom: 12, lineHeight: 1.7 }}>
            <strong style={{ color: t.text }}>How to get your QBO credentials:</strong><br/>
            1. Go to <a href="https://developer.intuit.com" target="_blank" style={{ color: "#a78bfa" }}>developer.intuit.com</a> → Create App<br/>
            2. Select "QuickBooks Online" → get your Client ID & Secret<br/>
            3. Add OAuth redirect: <code style={{ background: t.surface, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>https://yourapp.netlify.app/qbo-callback</code><br/>
            4. Complete OAuth flow to get your Access Token & Realm ID
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["Realm ID (Company ID)", "realmId", "1234567890"],["Access Token", "accessToken", "eyJ..."]].map(([lbl, key, ph]) => (
              <div key={key}>
                <label style={{ display: "block", color: t.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{lbl}</label>
                <input value={qboConfig[key] || ""} onChange={e => setQboConfig(c => ({ ...c, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "7px 10px", color: t.text, fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ background: "#1a0a2e", border: "1px solid #4c1d95", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ Note on QBO Direct Sync</div>
            <div style={{ color: t.subtext, fontSize: 11, lineHeight: 1.6 }}>Full OAuth requires a backend server to handle token refresh. For now, use <strong style={{ color: t.text }}>CSV Export</strong> and import into QBO (File → Utilities → Import → IIF Files). This covers 95% of use cases. A full backend sync is on the premium roadmap.</div>
          </div>
          <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 600 }}>✅ CSV import into QBO works perfectly and takes under 2 minutes.</div>
        </div>
      )}

      {/* Per-invoice exports */}
      {filteredInvoices.length > 0 && (
        <div>
          <div style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>Per-Invoice Export</div>
          {filteredInvoices.slice().reverse().map(inv => {
            const sub = (inv.lines||[]).reduce((s,l) => s + Number(l.qty)*Number(l.unitPrice), 0);
            const tot = sub + sub*(Number(inv.taxRate||0)/100);
            return (
              <div key={inv.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: t.accent, fontSize: 11, fontWeight: 700 }}>{inv.number}</div>
                  <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{inv.customerName}</div>
                  <div style={{ color: t.subtext, fontSize: 11 }}>{fmtDate(inv.date)} · {fmt$(tot)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => exportSingleInvoiceCSV(inv)} style={{ background: "#059669", border: "none", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>CSV</button>
                  <button onClick={() => pushToQBO(inv)} disabled={exporting === `qbo-${inv.id}`} style={{ background: "#7c3aed", border: "none", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>QBO</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



// ─── OPENSIGN COMPONENTS ───────────────────────────────────────────────────────
function OpenSignSend({ inv, data, upd, t }) {
  const [phase, setPhase]         = useState("idle"); // idle|sending|sent|error
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName]   = useState(inv.customerName || "");
  const [errorMsg, setErrorMsg]   = useState("");
  const [showForm, setShowForm]   = useState(false);

  const aiCfg    = data.aiConfig   || {};
  const openCfg   = data.openSignConfig || {};
  const backendUrl = (openCfg.backendUrl || "").replace(/\/$/, "");
  const cust      = data.customers.find(c => c.id === inv.customerId);

  // Pre-fill email from customer record
  useEffect(() => {
    if (cust?.email && !signerEmail) setSignerEmail(cust.email);
  }, [cust, signerEmail]);

  const isConfigured = !!backendUrl;
  const isSent       = !!inv.openSignUrl;
  const isSigned     = !!inv.signedAt;

  // Convert HTML string to base64
  const htmlToBase64 = (html) => {
    const bytes = new TextEncoder().encode(html);
    let binary  = "";
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  };

  const sendForSignature = async () => {
    if (!signerEmail.trim()) { setErrorMsg("Enter the customer's email address."); return; }
    if (!isConfigured)       { setErrorMsg("OpenSign backend not connected. Check Settings → OpenSign™."); return; }

    setPhase("sending"); setErrorMsg("");

    try {
      // Build the invoice+contract HTML
      const co   = data.company || {};
      const html = buildContractHTML(inv, cust, co, inv.contractTerms || {}, co.logo || "");

      // Convert to base64
      const base64File = htmlToBase64(html);

      // Calculate total for the document title
      const sub   = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
      const total = sub + sub * (Number(inv.taxRate || 0) / 100);
      const docTitle = `${inv.number} — ${inv.customerName} — $${total.toFixed(2)}`;

      // OpenSign Create Document payload
      // Signature widget placed at bottom of last page (page 2 for typical contract)
      // These coordinates work with our HTML-rendered PDF layout
      const payload = {
        title:    docTitle,
        filebase64: `data:text/html;base64,${base64File}`,
        note:     `Please review and sign the contract and invoice for ${docTitle}. Contact ${co.name || "your contractor"} with any questions.`,
        signers: [
          {
            name:  signerName || inv.customerName,
            email: signerEmail.trim(),
            phone: cust?.phone || "",
          }
        ],
        signerdetails: [
          {
            name:  signerName || inv.customerName,
            email: signerEmail.trim(),
            widgets: [
              {
                type: "signature",
                page: 1,
                x:    310,
                y:    680,
                w:    180,
                h:    40,
                options: { hint: "Sign here to approve the contract and invoice" }
              },
              {
                type: "date",
                page: 1,
                x:    310,
                y:    730,
                w:    120,
                h:    20,
                options: {
                  required:     true,
                  name:         "signed_date",
                  signing_date: true,
                  format:       "mm/dd/yyyy",
                  hint:         "Date"
                }
              },
              {
                type: "name",
                page: 1,
                x:    310,
                y:    760,
                w:    180,
                h:    20,
                options: {
                  required: true,
                  name:     "signer_name",
                  hint:     "Print name"
                }
              }
            ]
          }
        ],
        sendmail: true,
        expiredate: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString().split("T")[0];
        })()
      };

      let signingUrl = "";
      let opensignDocId = "";
      let backendDocId = "";

      // ── Call contractor-crm-backend ──────────────────
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in — please refresh and sign in again.");

      const res = await fetch(`${backendUrl}/api/opensign/send`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentType: "invoice",
          title:        docTitle,
          note:         payload.note,
          pdfBase64:    base64File,
          signers: [{
            name:  signerName || inv.customerName,
            email: signerEmail.trim(),
            phone: cust?.phone || "",
            role:  "customer",
          }],
          expiresInDays: 30,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || json.message || `Backend error: ${res.status}`);
      }

      signingUrl   = json.signingUrl || "";
      opensignDocId = json.opensignDocId || "";
      backendDocId  = json.documentId   || "";

      // Save to invoice
      upd(inv.id, {
        openSignUrl:         signingUrl,
        openSignDocId:       opensignDocId,
        openSignBackendDocId: backendDocId,
        openSignSentTo:      signerEmail.trim(),
        openSignSentAt:      today(),
      });

      setPhase("sent");
      setShowForm(false);

    } catch (err) {
      setErrorMsg(err.message || "Failed to send. Please try again.");
      setPhase("error");
    }
  };

  const resendReminder = async () => {
    if (!inv.openSignDocId || !isConfigured) return;
    setPhase("sending");
    try {
      if (backendUrl) {
        const token = await auth.currentUser?.getIdToken();
        const docId = inv.openSignBackendDocId || inv.openSignDocId;
        await fetch(`${backendUrl}/api/opensign/resend`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body:    JSON.stringify({ documentId: docId }),
        });
      } else {
        const pUrl = (openCfg.proxyUrl || "").replace(/\/$/, "");
        const aKey = openCfg.apiKey || "";
        await fetch(`${pUrl}/opensign/resendrequestmail`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-api-token": aKey },
          body:    JSON.stringify({ documentId: inv.openSignDocId }),
        });
      }
      setPhase("sent");
      alert("Reminder sent to " + inv.openSignSentTo);
    } catch {
      setPhase("idle");
      alert("Failed to resend reminder. Try again.");
    }
  };
  // ── Render ──────────────────────────────────────────────────────────────────

  // Not yet configured
  if (!isConfigured) return (
    <div style={{ background: "#1a0a2e", border: "1px solid #4c1d95", borderRadius: 10, padding: 14 }}>
      <div style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>✍️ E-Signature via OpenSign™</div>
      <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>
        To enable one-tap signature sending, sign in and check
        <strong style={{ color: "#a78bfa" }}> Settings → OpenSign™</strong>.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {isSent
          ? <div style={{ color: "#4ade80", fontSize: 12 }}>🔗 Manual link saved — customer can still sign</div>
          : <div style={{ color: "#334155", fontSize: 12 }}>Manual: paste a signing link below</div>
        }
      </div>
      {/* Manual link fallback always available */}
      <input value={inv.openSignUrl || ""} onChange={e => upd(inv.id, { openSignUrl: e.target.value })}
        placeholder="Or paste an OpenSign link manually..."
        style={{ width: "100%", marginTop: 8, background: "#0d1520", border: "1px solid #4c1d95", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  // Already signed
  if (isSigned) return (
    <div style={{ background: "#052e16", border: "1px solid #16a34a", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 700 }}>Contract Signed</div>
          <div style={{ color: "#6b7280", fontSize: 11 }}>Signed {fmtDate(inv.signedAt)} · {inv.openSignSentTo || ""}</div>
        </div>
      </div>
    </div>
  );

  // Sent, awaiting signature
  if (isSent && !showForm) return (
    <div style={{ background: "#1a0a2e", border: "1px solid #7c3aed", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>📧</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700 }}>Sent for Signature</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
            Sent to <strong style={{ color: "#e2e8f0" }}>{inv.openSignSentTo}</strong>
            {inv.openSignSentAt ? ` on ${fmtDate(inv.openSignSentAt)}` : ""}
          </div>
        </div>
        <button onClick={() => { upd(inv.id, { signedAt: today() }); }} style={{ background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          ✅ Mark Signed
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {inv.openSignUrl && (
          <button onClick={() => { navigator.clipboard.writeText(inv.openSignUrl); alert("Signing link copied!"); }}
            style={{ background: "#0d1520", border: "1px solid #4c1d95", borderRadius: 6, padding: "6px 12px", color: "#a78bfa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            📋 Copy Signing Link
          </button>
        )}
        <button onClick={resendReminder} disabled={phase === "sending"}
          style={{ background: "#0d1520", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          {phase === "sending" ? "Sending..." : "🔔 Resend Reminder Email"}
        </button>
        <button onClick={() => setShowForm(true)}
          style={{ background: "#0d1520", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          ✉️ Resend to Different Email
        </button>
      </div>
    </div>
  );

  // Send form
  return (
    <div style={{ background: "#1a0a2e", border: "2px solid #7c3aed", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700 }}>✍️ Send for Signature via OpenSign™</div>
        {isSent && <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>✕</button>}
      </div>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
        OpenSign will email the customer a signing link. They sign in their browser — no account needed. Both parties get a completion certificate automatically.
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Customer Name</label>
        <input value={signerName} onChange={e => setSignerName(e.target.value)}
          placeholder="Customer full name"
          style={{ width: "100%", background: "#0d1520", border: "1px solid #4c1d95", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Customer Email <span style={{ color: "#ef4444" }}>*</span></label>
        <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)}
          placeholder="customer@email.com"
          style={{ width: "100%", background: "#0d1520", border: "1px solid #4c1d95", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
      </div>
      {errorMsg && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 12px", marginBottom: 10, color: "#f87171", fontSize: 12 }}>
          ⚠️ {errorMsg}
        </div>
      )}
      <button onClick={sendForSignature} disabled={phase === "sending" || !signerEmail.trim()}
        style={{ width: "100%", background: phase === "sending" ? "#4c1d95" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 8, padding: "12px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: phase === "sending" || !signerEmail.trim() ? "not-allowed" : "pointer", opacity: !signerEmail.trim() ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {phase === "sending"
          ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span> Sending to OpenSign...</>
          : <>✍️ Send Contract for Signature</>
        }
      </button>
      <div style={{ color: "#334155", fontSize: 10, marginTop: 8, textAlign: "center" }}>
        Customer will receive an email from OpenSign with a secure signing link. No OpenSign account required for them.
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// FILE 4: OpenSign Settings section for App.jsx
// Paste inside the Settings component return, after the AI Estimator card
// ═══════════════════════════════════════════════════════════════════════════════

function OpenSignSettings({ data, setData, t }) {
  const BACKEND_URL = "https://contractor-crm-backend-production.up.railway.app";
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Auto-set backend URL if not already configured
  useEffect(() => {
    const cfg = data.openSignConfig || {};
    if (!cfg.backendUrl || cfg.backendUrl !== BACKEND_URL) {
      setData(d => ({ ...d, openSignConfig: { ...d.openSignConfig, backendUrl: BACKEND_URL } }));
    }
  }, []);

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      if (res.ok) {
        setTestResult({ ok: true, msg: "✅ Connected — ready to send documents." });
      } else {
        setTestResult({ ok: false, msg: `❌ Backend returned ${res.status}. Try again later.` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ ${e.message}` });
    }
    setTesting(false);
  };

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.accent}05)`, border: `1px solid #7c3aed44`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ color: "#a78bfa", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>✍️ One-Tap E-Signature via OpenSign™</div>
        <div style={{ color: t.subtext, fontSize: 12, lineHeight: 1.7 }}>
          Send contracts and invoices for e-signature directly from the app. Customer receives an email, signs in their browser, and both parties get a signed PDF automatically.
        </div>
      </div>

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          <div style={{ color: t.text, fontSize: 12, fontWeight: 700 }}>Backend Connected</div>
        </div>
        <div style={{ color: t.subtext, fontSize: 11, lineHeight: 1.7 }}>
          All document signing requests are routed securely through your backend with Firebase authentication.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={testConnection} disabled={testing}
          style={{ background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: testing ? "not-allowed" : "pointer" }}>
          {testing ? "Testing..." : "Test Connection"}
        </button>
        {testResult && <div style={{ color: testResult.ok ? "#4ade80" : "#f87171", fontSize: 12 }}>{testResult.msg}</div>}
      </div>
    </div>
  );
}
// ─── INVOICES ─────────────────────────────────────────────────────────────────
function Invoices({ data, setData, t, initialFilter }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [editingContract, setEditingContract] = useState(false);
  const [copied, setCopied] = useState(false);
  const photoRef = useRef();

  const upd = (id, patch) => setData(d => ({ ...d, invoices: d.invoices.map(i => i.id === id ? { ...i, ...patch } : i) }));
  const markPaid = id => upd(id, { status: "paid", paidAt: today() });
  const markSigned = id => upd(id, { signedAt: today() });
  const del = id => { if (window.confirm("Delete invoice?")) setData(d => ({ ...d, invoices: d.invoices.filter(i => i.id !== id) })); };

  const openVenmo = inv => {
    const h = data.company.venmoHandle || "";
    const sub = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
    const total = sub + sub * (Number(inv.taxRate || 0) / 100);
    if (!h) { alert("Add your Venmo handle in Settings → Company Info first."); return; }
    const url = `https://venmo.com/${h.replace("@", "")}?txn=pay&note=${encodeURIComponent("Invoice " + inv.number + " — " + inv.customerName)}&amount=${total.toFixed(2)}`;
    // Try window.open first (works on desktop + most mobile), fall back to location.href for deep-link
    const w = window.open(url, "_blank");
    if (!w || w.closed) window.location.href = url;
  };

  // Helper to trigger a file download from a blob URL
  const triggerDownload = (url, filename) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // Download invoice HTML (line items, photos, terms) — always available
  const downloadInvoiceHTML = inv => {
    const cust = data.customers.find(c => c.id === inv.customerId);
    const html = buildContractHTML(inv, cust, data.company, inv.contractTerms || {}, data.company.logo || "");
    const blob = new Blob([html], { type: "text/html" });
    triggerDownload(URL.createObjectURL(blob), `${inv.number}-${(inv.customerName || "invoice").replace(/\s+/g, "-")}.html`);
  };

  // Download custom contract PDF if uploaded
  const downloadCustomContract = () => {
    const a = document.createElement("a");
    a.href = data.company.customContract;
    a.download = data.company.customContractName || "contract.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Main download — if custom contract exists, downloads both; otherwise just HTML
  const downloadPDF = inv => {
    downloadInvoiceHTML(inv);
    if (data.company.customContract) {
      // Small delay so browser doesn't block the second download
      setTimeout(() => downloadCustomContract(), 500);
    }
  };

  // Open PDF in new tab for printing (desktop fallback)
  const printPDF = inv => {
    const cust = data.customers.find(c => c.id === inv.customerId);
    const html = buildContractHTML(inv, cust, data.company, inv.contractTerms || {}, data.company.logo || "");
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
    else downloadPDF(inv); // fallback if popup blocked
  };

  // Copy invoice share text to clipboard
  const copyShareText = inv => {
    const sub = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
    const total = sub + sub * (Number(inv.taxRate || 0) / 100);
    const co = data.company;
    const venmo = co.venmoHandle ? `\n💙 Pay via Venmo: venmo.com/${co.venmoHandle.replace("@","")}?txn=pay&amount=${total.toFixed(2)}&note=${encodeURIComponent(inv.number)}` : "";
    const sign = inv.openSignUrl ? `\n✍️ Sign contract: ${inv.openSignUrl}` : "";
    const creds = co.netlifyUrl ? `\n🛡️ Our credentials: ${co.netlifyUrl}/credentials` : "";
    const text = `Hi ${inv.customerName},\n\nPlease find your invoice ${inv.number} for ${fmt$(total)} attached.\n${venmo}${sign}${creds}\n\nThank you,\n${co.name || "Your Contractor"}`;
    navigator.clipboard.writeText(text).then(() => alert("Invoice message copied to clipboard! Paste it into a text or email.")).catch(() => alert(text));
  };

  const addPhoto = async (inv, e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
      const currentUser = auth.currentUser;
      if (currentUser) {
        const path = `photos/${currentUser.uid}/${Date.now()}_${file.name}`;
        const photoRef = storageRef(storage, path);
        await uploadString(photoRef, dataUrl, 'data_url');
        const url = await getDownloadURL(photoRef);
        const photo = { id: uid(), url, storagePath: path, caption: "", label: "Before" };
        upd(inv.id, { photos: [...(inv.photos || []), photo] });
      } else {
        const photo = { id: uid(), dataUrl, caption: "", label: "Before" };
        upd(inv.id, { photos: [...(inv.photos || []), photo] });
      }
    }
  };

  const updPhoto = (inv, photoId, patch) => upd(inv.id, { photos: (inv.photos || []).map(p => p.id === photoId ? { ...p, ...patch } : p) });
  const delPhoto = async (inv, photoId) => {
    const photo = (inv.photos || []).find(p => p.id === photoId);
    if (photo?.storagePath) {
      try { await deleteObject(storageRef(storage, photo.storagePath)); } catch (e) { console.error("Storage delete error:", e); }
    }
    upd(inv.id, { photos: (inv.photos || []).filter(p => p.id !== photoId) });
  };

  if (view === "detail" && selected) {
    const inv = data.invoices.find(i => i.id === selected.id);
    if (!inv) { setView("list"); return null; }
    const sub = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
    const taxAmt = sub * (Number(inv.taxRate || 0) / 100);
    const total = sub + taxAmt;
    const ct = inv.contractTerms || {};

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Btn t={t} variant="ghost" size="sm" onClick={() => setView("list")}><Icon d={IC.back} size={14} /> Back</Btn>
          <div>
            <div style={{ color: t.accent, fontSize: 12, fontWeight: 700 }}>{String(inv.number || "")}</div>
            <h2 style={{ color: t.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{typeof inv.customerName === "string" ? inv.customerName : String(inv.customerName || "")}</h2>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ color: inv.status === "paid" ? "#4ade80" : "#f97316", fontSize: 22, fontWeight: 800 }}>{fmt$(total)}</div>
            <span style={{ background: inv.status === "paid" ? "#052e16" : "#431407", color: inv.status === "paid" ? "#4ade80" : "#f97316", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{inv.status === "paid" ? "✓ PAID" : "UNPAID"}</span>
          </div>
        </div>

        {/* Status badges */}
        <Card t={t} style={{ marginBottom: 14, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: inv.signedAt ? "#052e16" : "#1a1a2e", border: `1px solid ${inv.signedAt ? "#16a34a" : "#4c1d95"}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{inv.signedAt ? "✅" : "✍️"}</div>
              <div style={{ color: inv.signedAt ? "#4ade80" : "#a78bfa", fontSize: 13, fontWeight: 700, marginTop: 4 }}>{inv.signedAt ? `Signed ${fmtDate(inv.signedAt)}` : "Awaiting Signature"}</div>
            </div>
            <div style={{ background: inv.status === "paid" ? "#052e16" : "#1a0f00", border: `1px solid ${inv.status === "paid" ? "#16a34a" : "#f97316"}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{inv.status === "paid" ? "💚" : "💳"}</div>
              <div style={{ color: inv.status === "paid" ? "#4ade80" : "#f97316", fontSize: 13, fontWeight: 700, marginTop: 4 }}>{inv.status === "paid" ? `Paid` : `${fmt$(total)} Due`}</div>
            </div>
          </div>
        </Card>

        {/* ── PROMINENT: Download PDF ──────────────────────────────── */}
        <Card t={t} style={{ marginBottom: 14, border: `2px solid ${t.accent}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Icon d={IC.upload} size={20} color={t.accent} />
            <div>
              <div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>Download Invoice{data.company.customContract ? " + Custom Contract" : " + Contract"}</div>
              <div style={{ color: t.subtext, fontSize: 11 }}>{data.company.customContract ? `Includes ${data.company.customContractName || "contract.pdf"}` : "Save to phone — share via text, email, or AirDrop"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => downloadPDF(inv)} style={{ flex: 1, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: "none", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon d={IC.upload} size={16} color="#fff" /> Download {data.company.customContract ? "Both Files" : "PDF"}
            </button>
            <button onClick={() => printPDF(inv)} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", color: t.subtext, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🖨️
            </button>
          </div>
          {data.company.customContract && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={() => downloadInvoiceHTML(inv)} style={{ flex: 1, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px", color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Invoice Only
              </button>
              <button onClick={downloadCustomContract} style={{ flex: 1, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px", color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Contract Only
              </button>
            </div>
          )}
        </Card>

        {/* ── PROMINENT: Send via OpenSign ─────────────────────────── */}
        <Card t={t} style={{ marginBottom: 14, background: "linear-gradient(135deg,#130a1f,#1a0a2e)", border: "2px solid #7c3aed" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>✍️</span>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>Send via OpenSign™</div>
              <div style={{ color: "#a78bfa", fontSize: 11 }}>Customer signs in their browser — no account needed</div>
            </div>
          </div>
          <OpenSignSend inv={inv} data={data} upd={upd} t={t} />
        </Card>

        {/* ── SEND INVOICE ACTION CENTER ─────────────────────────── */}
        <Card t={t} style={{ marginBottom: 14, border: `1px solid ${t.border}` }}>
          <SectionLabel t={t}>📤 More Actions</SectionLabel>

          {/* Copy share message */}
          <div style={{ background: t.surface2, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#059669,#047857)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>1</div>
              <div><div style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>Copy Message to Send Customer</div><div style={{ color: t.subtext, fontSize: 11 }}>Includes invoice #, total, Venmo link, and signing link</div></div>
            </div>
            <button onClick={() => copyShareText(inv)} style={{ width: "100%", background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon d={IC.copy} size={14} color="#fff" /> Copy Invoice Message
            </button>
          </div>

          {/* Get paid */}
          <div style={{ background: t.surface2, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: inv.status === "paid" ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#008CFF,#0070CC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>2</div>
              <div>
                <div style={{ color: t.text, fontSize: 13, fontWeight: 700 }}>Payment</div>
                <div style={{ color: t.subtext, fontSize: 11 }}>{inv.status === "paid" ? `✅ Paid ${inv.paidAt ? fmtDate(inv.paidAt) : ""}` : `${fmt$(total)} due`}</div>
              </div>
              {inv.status === "paid" && <span style={{ marginLeft: "auto", background: "#052e16", color: "#4ade80", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>PAID ✓</span>}
            </div>
            {inv.status !== "paid" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openVenmo(inv)} style={{ flex: 1, background: "linear-gradient(135deg,#008CFF,#0070CC)", border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  💙 Open Venmo — {fmt$(total)}
                </button>
                <button onClick={() => markPaid(inv.id)} style={{ background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ✅ Paid
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Photos */}
        <Card t={t} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel t={t}>Job Site Photos (PDF)</SectionLabel>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Icon d={IC.camera} size={13} color="#fff" /> Add Photos
              <input type="file" accept="image/*" multiple onChange={e => addPhoto(inv, e)} style={{ display: "none" }} />
            </label>
          </div>
          {(!inv.photos || inv.photos.length === 0) ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: t.subtext, fontSize: 13 }}>No photos yet — photos will appear in the PDF</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {inv.photos.map(photo => (
                <div key={photo.id} style={{ background: t.surface2, borderRadius: 10, overflow: "hidden", border: `1px solid ${t.border}` }}>
                  <div style={{ position: "relative" }}>
                    <img src={photo.url || photo.dataUrl} alt={photo.caption || photo.label || "Job photo"} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                    <button onClick={() => delPhoto(inv, photo.id)} style={{ position: "absolute", top: 4, right: 4, background: "#dc2626", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon d={IC.x} size={12} color="#fff" /></button>
                    <select value={photo.label} onChange={e => updPhoto(inv, photo.id, { label: e.target.value })} style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontFamily: "inherit" }}>
                      <option>Before</option><option>After</option><option>During</option><option>Detail</option>
                    </select>
                  </div>
                  <input value={photo.caption} onChange={e => updPhoto(inv, photo.id, { caption: e.target.value })} placeholder="Caption (optional)" style={{ width: "100%", background: "transparent", border: "none", borderTop: `1px solid ${t.border}`, padding: "6px 8px", color: t.text, fontSize: 11, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Contract terms */}
        <Card t={t} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel t={t}>Contract Terms</SectionLabel>
            <Btn t={t} size="sm" variant="ghost" onClick={() => setEditingContract(e => !e)}><Icon d={IC.edit} size={12} /> {editingContract ? "Done" : "Edit"}</Btn>
          </div>
          {editingContract ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp t={t} label="Start Date" value={inv.jobStartDate || ""} onChange={v => upd(inv.id, { jobStartDate: v })} type="date" />
                <Inp t={t} label="End Date" value={inv.jobEndDate || ""} onChange={v => upd(inv.id, { jobEndDate: v })} type="date" />
              </div>
              <Inp t={t} label="Job Address" value={inv.jobAddress || ""} onChange={v => upd(inv.id, { jobAddress: v })} />
              <Inp t={t} label="Payment Schedule" value={ct.paymentSchedule || ""} onChange={v => upd(inv.id, { contractTerms: { ...ct, paymentSchedule: v } })} rows={2} placeholder="e.g. 50% deposit, 50% on completion" />
              <Inp t={t} label="Warranty" value={ct.warranty || ""} onChange={v => upd(inv.id, { contractTerms: { ...ct, warranty: v } })} rows={2} />
              <Inp t={t} label="Permits" value={ct.permits || ""} onChange={v => upd(inv.id, { contractTerms: { ...ct, permits: v } })} rows={2} />
              <Inp t={t} label="Additional Terms" value={ct.additional || ""} onChange={v => upd(inv.id, { contractTerms: { ...ct, additional: v } })} rows={3} />
            </>
          ) : (
            <div>{[["Payment", ct.paymentSchedule], ["Warranty", ct.warranty], ["Permits", ct.permits], ["Additional", ct.additional]].map(([k, v]) => v && typeof v !== "object" ? <div key={k} style={{ marginBottom: 8, padding: "8px 10px", background: t.surface2, borderRadius: 6 }}><span style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase" }}>{k}: </span><span style={{ color: t.text, fontSize: 13 }}>{String(v)}</span></div> : null)}{!ct.paymentSchedule && <div style={{ color: t.muted, fontSize: 13 }}>Oregon CCB defaults apply</div>}</div>
          )}
        </Card>

        <Btn t={t} variant="danger" size="sm" onClick={() => { del(inv.id); setView("list"); }}><Icon d={IC.trash} size={12} /> Delete Invoice</Btn>
      </div>
    );
  }

  // Apply filter from dashboard navigation or local filter buttons
  const [localFilter, setLocalFilter] = useState(initialFilter || "all");

  const filterInvoices = (invList, f) => {
    if (f === "unpaid")   return invList.filter(i => i.status !== "paid");
    if (f === "paid")     return invList.filter(i => i.status === "paid");
    if (f === "unsigned") return invList.filter(i => i.status !== "paid" && !i.signedAt);
    return invList;
  };

  const displayedInvoices = filterInvoices([...data.invoices].reverse(), localFilter);

  const INVOICE_FILTERS = [
    { key: "all",      label: "All",         count: data.invoices.length },
    { key: "unpaid",   label: "Unpaid",      count: data.invoices.filter(i => i.status !== "paid").length },
    { key: "unsigned", label: "Needs Sig",   count: data.invoices.filter(i => i.status !== "paid" && !i.signedAt).length },
    { key: "paid",     label: "Paid",        count: data.invoices.filter(i => i.status === "paid").length },
  ];

  return (
    <div className="page-enter">
      <PageHeader title="Invoices" count={data.invoices.length} t={t} />

      {/* Filter tabs */}
      <div className="filter-pills" style={{ marginBottom: 16 }}>
        {INVOICE_FILTERS.map(f => (
          <button key={f.key} className="filter-pill" onClick={() => setLocalFilter(f.key)}
            style={{ background: localFilter === f.key ? t.muted : t.surface, border: `1px solid ${localFilter === f.key ? t.accent : t.border}`, borderRadius: 20, padding: "6px 14px", color: localFilter === f.key ? t.accent : t.subtext, fontSize: 12, fontWeight: localFilter === f.key ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            {f.label}
            <span style={{ background: localFilter === f.key ? t.accent : t.border, color: localFilter === f.key ? "#fff" : t.subtext, borderRadius: 20, padding: "0px 6px", fontSize: 10, fontWeight: 700 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Workflow — each step is a real action button */}
      <Card t={t} style={{ marginBottom: 16, border: `1px solid #4c1d95` }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>✍️ Quick Steps</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {[
            { n: "1", label: "New Estimate", sub: "Build scope & price", color: "#2563eb", action: null, hint: "→ Go to Estimates tab" },
            { n: "2", label: "→ Invoice",    sub: "Convert estimate",    color: "#059669", action: null, hint: "Open estimate → Convert" },
            { n: "3", label: "Download PDF", sub: "Save & share file",   color: "#7c3aed", action: () => { if (data.invoices.length > 0) { downloadPDF(data.invoices[data.invoices.length - 1]); } else alert("Create an invoice first."); }, hint: "Downloads latest invoice as PDF" },
            { n: "4", label: "Get Paid",     sub: "Venmo or mark paid",  color: "#f97316", action: () => setLocalFilter("unpaid"), hint: "View unpaid invoices" },
          ].map(step => (
            <button key={step.n} onClick={step.action || undefined} title={step.hint}
              style={{ background: "#1a0a2e", border: `1px solid ${step.action ? step.color + "88" : "#4c1d95"}`, borderRadius: 8, padding: "10px 4px", textAlign: "center", cursor: step.action ? "pointer" : "default", fontFamily: "inherit", transition: "border-color 0.15s" }}
              onMouseEnter={e => step.action && (e.currentTarget.style.borderColor = step.color)}
              onMouseLeave={e => step.action && (e.currentTarget.style.borderColor = step.color + "88")}>
              <div style={{ color: step.color, fontSize: 16, fontWeight: 800 }}>{step.n}</div>
              <div style={{ color: t.text, fontSize: 11, fontWeight: 600, marginTop: 2 }}>{step.label}</div>
              <div style={{ color: t.subtext, fontSize: 9, marginTop: 1 }}>{step.sub}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Accounting Exports */}
      <Card t={t} style={{ marginBottom: 16, border: `1px solid ${t.accent}44` }}>
        <SectionLabel t={t}>📊 Accounting Exports</SectionLabel>
        <AccountingExports data={data} t={t} />
      </Card>

      {displayedInvoices.length === 0 ? (
        <Card t={t} style={{ textAlign: "center", padding: 40 }}>
          <div style={{ color: t.subtext, marginBottom: 8 }}>
            {data.invoices.length === 0 ? "No invoices yet — convert an estimate to create one" : `No ${localFilter === "all" ? "" : localFilter} invoices`}
          </div>
          {localFilter !== "all" && (
            <button onClick={() => setLocalFilter("all")} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 16px", color: t.subtext, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Show All Invoices</button>
          )}
        </Card>
      ) : displayedInvoices.map(inv => {
          const sub = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
          const total = sub + sub * (Number(inv.taxRate || 0) / 100);
          return (
            <Card key={inv.id} t={t} style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => { setSelected(inv); setEditingContract(false); setView("detail"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ color: t.accent, fontSize: 12, fontWeight: 700 }}>{String(inv.number || "")}</div>
                  <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{typeof inv.customerName === "string" ? inv.customerName : String(inv.customerName || "")}</div>
                  <div style={{ color: t.subtext, fontSize: 12 }}>{typeof inv.jobTitle === "string" ? inv.jobTitle : String(inv.jobTitle || "")} · {fmtDate(inv.date)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: inv.status === "paid" ? "#4ade80" : "#f97316", fontSize: 18, fontWeight: 800 }}>{fmt$(total)}</div>
                  <span style={{ background: inv.status === "paid" ? "#052e16" : "#431407", color: inv.status === "paid" ? "#4ade80" : "#f97316", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                    {inv.status === "paid" ? "✓ PAID" : "UNPAID"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <div style={{ background: inv.signedAt ? "#052e16" : "#1a1a2e", border: `1px solid ${inv.signedAt ? "#16a34a" : "#4c1d95"}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: inv.signedAt ? "#4ade80" : "#a78bfa" }}>
                  {inv.signedAt ? "✅ Signed" : inv.openSignUrl ? "🔗 Link Ready" : "✍️ Needs Signature"}
                </div>
                {(inv.photos || []).length > 0 && (
                  <div style={{ background: t.muted, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: t.subtext }}>📷 {inv.photos.length} photo{inv.photos.length !== 1 ? "s" : ""}</div>
                )}
                <div style={{ marginLeft: "auto", color: t.subtext, fontSize: 11, alignSelf: "center" }}>Tap to open →</div>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

function Calendar({ data, setData, t, setTab }) {
  const [cur, setCur] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = cur.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const jobsByDay = {};
  data.jobs.forEach(job => {
    if (!job.date) return;
    const d = new Date(job.date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!jobsByDay[day]) jobsByDay[day] = [];
      jobsByDay[day].push(job);
    }
  });

  const dayJobs = selectedDay ? (jobsByDay[selectedDay] || []) : [];

  return (
    <div className="page-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 24, fontWeight: 800, margin: 0 }}>Calendar</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn t={t} variant="ghost" size="sm" onClick={() => setCur(new Date(year, month - 1, 1))}>‹</Btn>
          <span style={{ color: t.text, fontSize: 14, fontWeight: 600, minWidth: 140, textAlign: "center" }}>{monthName}</span>
          <Btn t={t} variant="ghost" size="sm" onClick={() => setCur(new Date(year, month + 1, 1))}>›</Btn>
        </div>
      </div>

      <Card t={t} style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
            <div key={d} style={{ textAlign: "center", color: t.subtext, fontSize: 11, fontWeight: 700, padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const jobs = jobsByDay[day] || [];
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedDay === day;
            return (
              <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{ background: isSelected ? t.accent : isToday ? `${t.accent}33` : "transparent", border: `1px solid ${isSelected ? t.accent : isToday ? t.accent : t.border}`, borderRadius: 8, padding: "6px 2px", cursor: "pointer", minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: isSelected ? "#fff" : isToday ? t.accent : t.text, fontSize: 13, fontWeight: isToday ? 800 : 500 }}>{day}</span>
                {jobs.slice(0, 2).map(j => {
                  const s = statusFor(j.status);
                  return <div key={j.id} style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />;
                })}
                {jobs.length > 2 && <div style={{ color: t.subtext, fontSize: 9 }}>+{jobs.length - 2}</div>}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card t={t}>
          <SectionLabel t={t}>{monthName.split(" ")[0]} {selectedDay} — {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</SectionLabel>
          {dayJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: t.subtext }}>No jobs on this day</div>
          ) : dayJobs.map(job => (
            <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
              <div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                <div style={{ color: t.subtext, fontSize: 12 }}>{job.customerName}</div>
                {job.value && <div style={{ color: t.accent, fontSize: 12 }}>{fmt$(job.value)}</div>}
              </div>
              <Badge status={job.status} />
            </div>
          ))}
        </Card>
      )}

      {!selectedDay && (
        <Card t={t}>
          <SectionLabel t={t}>This Month</SectionLabel>
          {data.jobs.filter(j => { if (!j.date) return false; const d = new Date(j.date + "T00:00:00"); return d.getFullYear() === year && d.getMonth() === month; }).length === 0
            ? <div style={{ color: t.subtext, textAlign: "center", padding: 20 }}>No jobs scheduled this month</div>
            : data.jobs.filter(j => { if (!j.date) return false; const d = new Date(j.date + "T00:00:00"); return d.getFullYear() === year && d.getMonth() === month; })
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(job => (
                <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                    <div style={{ color: t.subtext, fontSize: 12 }}>{job.customerName} · {fmtDate(job.date)}</div>
                  </div>
                  <Badge status={job.status} />
                </div>
              ))}
        </Card>
      )}
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ data, setData, t }) {
  const [co, setCo] = useState({ ...data.company });
  const [themeData, setThemeData] = useState({ ...data.theme });
  const [saved, setSaved] = useState(false);
  const [previewTheme, setPreviewTheme] = useState(null);
  const logoRef = useRef();

  const liveTheme = previewTheme || getTheme(themeData);

  const save = () => {
    setData(d => ({ ...d, company: co, theme: themeData }));
    setPreviewTheme(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogo = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCo(c => ({ ...c, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const selectPreset = name => {
    const newTheme = { preset: name, custom: name === "Custom" ? themeData.custom : { ...THEMES[name] } };
    setThemeData(newTheme);
    setPreviewTheme(THEMES[name] || THEMES["Bold Blue"]);
  };

  const updateCustomColor = (key, val) => {
    const newCustom = { ...themeData.custom, [key]: val };
    const newTheme = { preset: "Custom", custom: newCustom };
    setThemeData(newTheme);
    setPreviewTheme(newCustom);
  };

  const exportBackup = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `crm-backup-${today()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { try { const p = JSON.parse(ev.target.result); if (window.confirm("Replace all data?")) { setData(p); setCo(p.company || {}); setThemeData(p.theme || { preset: "Bold Blue", custom: { ...THEMES["Bold Blue"] } }); } } catch { alert("Invalid backup."); } };
    r.readAsText(file);
  };

  const colorFields = [
    { key: "accent", label: "Accent / Buttons" },
    { key: "accent2", label: "Accent Dark" },
    { key: "border", label: "Borders" },
    { key: "bg", label: "Background" },
    { key: "surface", label: "Card Surface" },
    { key: "surface2", label: "Input Surface" },
  ];

  return (
    <div className="page-enter">
      <h2 style={{ color: t.text, fontSize: 24, fontWeight: 800, margin: "0 0 20px" }}>Settings</h2>

      {/* Company Info */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Company Info</SectionLabel>
        <Inp t={t} label="Company Name" value={co.name || ""} onChange={v => setCo(c => ({ ...c, name: v }))} />
        <Inp t={t} label="CCB License #" value={co.ccbNumber || ""} onChange={v => setCo(c => ({ ...c, ccbNumber: v }))} placeholder="e.g. 123456" />
        <Inp t={t} label="Phone" value={co.phone || ""} onChange={v => setCo(c => ({ ...c, phone: v }))} type="tel" />
        <Inp t={t} label="Email" value={co.email || ""} onChange={v => setCo(c => ({ ...c, email: v }))} type="email" />
        <Inp t={t} label="Address" value={co.address || ""} onChange={v => setCo(c => ({ ...c, address: v }))} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
          <Inp t={t} label="City" value={co.city || ""} onChange={v => setCo(c => ({ ...c, city: v }))} />
          <Inp t={t} label="State" value={co.state || "OR"} onChange={v => setCo(c => ({ ...c, state: v }))} />
          <Inp t={t} label="ZIP" value={co.zip || ""} onChange={v => setCo(c => ({ ...c, zip: v }))} />
        </div>
        <Inp t={t} label="Venmo Handle" value={co.venmoHandle || ""} onChange={v => setCo(c => ({ ...c, venmoHandle: v }))} placeholder="@YourVenmo" />
        <Inp t={t} label="Your App URL (Netlify)" value={co.netlifyUrl || ""} onChange={v => setCo(c => ({ ...c, netlifyUrl: v }))} placeholder="https://your-crm.netlify.app" />
      </Card>

      {/* Logo Upload */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Company Logo</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ width: 80, height: 80, background: t.surface2, border: `2px dashed ${t.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {co.logo ? <img src={co.logo} alt="Company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Icon d={IC.image} size={28} color={t.subtext} />}
          </div>
          <div>
            <div style={{ color: t.text, fontSize: 13, marginBottom: 8 }}>Upload your logo — appears in the app header and on all PDFs</div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Icon d={IC.upload} size={14} color="#fff" /> Upload Logo
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
              </label>
              {co.logo && <Btn t={t} size="sm" variant="danger" onClick={() => setCo(c => ({ ...c, logo: "" }))}><Icon d={IC.x} size={12} /> Remove</Btn>}
            </div>
          </div>
        </div>
      </Card>

      {/* Custom Contract Upload */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>📄 Custom Contract Template</SectionLabel>
        <div style={{ color: t.subtext, fontSize: 12, marginBottom: 12 }}>Upload a PDF contract to attach to all Invoices, Estimates, and Proposals. This replaces the default generated contract.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ width: 60, height: 72, background: t.surface2, border: `2px dashed ${t.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {co.customContract ? <span style={{ fontSize: 28 }}>📄</span> : <Icon d={IC.upload} size={24} color={t.subtext} />}
          </div>
          <div style={{ flex: 1 }}>
            {co.customContract ? (
              <>
                <div style={{ color: t.text, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{co.customContractName || "contract.pdf"}</div>
                <div style={{ color: t.subtext, fontSize: 11, marginBottom: 8 }}>Uploaded — will be used on all documents</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.surface2, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Icon d={IC.upload} size={12} color={t.subtext} /> Replace
                    <input type="file" accept=".pdf" onChange={e => {
                      const f = e.target.files[0]; if (!f) return;
                      const r = new FileReader(); r.onload = ev => setCo(c => ({ ...c, customContract: ev.target.result, customContractName: f.name })); r.readAsDataURL(f);
                    }} style={{ display: "none" }} />
                  </label>
                  <Btn t={t} size="sm" variant="danger" onClick={() => setCo(c => ({ ...c, customContract: "", customContractName: "" }))}><Icon d={IC.x} size={12} /> Remove</Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{ color: t.text, fontSize: 13, marginBottom: 8 }}>No contract uploaded yet</div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Icon d={IC.upload} size={14} color="#fff" /> Upload Contract PDF
                  <input type="file" accept=".pdf" onChange={e => {
                    const f = e.target.files[0]; if (!f) return;
                    const r = new FileReader(); r.onload = ev => setCo(c => ({ ...c, customContract: ev.target.result, customContractName: f.name })); r.readAsDataURL(f);
                  }} style={{ display: "none" }} />
                </label>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Appearance — Light/Dark Mode */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Appearance</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>Dark Mode</div>
            <div style={{ color: t.subtext, fontSize: 12, marginTop: 2 }}>Switch between dark and light interface</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: t.subtext, fontSize: 12, fontWeight: 600 }}>Light</span>
            <label className="theme-toggle">
              <input
                type="checkbox"
                checked={!data.lightMode}
                onChange={e => setData(d => ({ ...d, lightMode: !e.target.checked }))}
              />
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb" />
              </span>
            </label>
            <span style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>Dark</span>
          </div>
        </div>
      </Card>

      {/* Theme Picker */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Color Theme</SectionLabel>

        {/* Preset swatches */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
          {Object.entries(THEMES).filter(([k]) => k !== "Custom").map(([name, theme]) => (
            <button key={name} onClick={() => selectPreset(name)}
              style={{ background: theme.surface, border: `2px solid ${themeData.preset === name ? theme.accent : theme.border}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: theme.accent }} />
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: theme.bg }} />
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: theme.border }} />
              </div>
              <div style={{ color: theme.text, fontSize: 11, fontWeight: 600 }}>{name}</div>
              {themeData.preset === name && <div style={{ color: theme.accent, fontSize: 10, marginTop: 2 }}>✓ Active</div>}
            </button>
          ))}
          <button onClick={() => selectPreset("Custom")}
            style={{ background: t.surface, border: `2px solid ${themeData.preset === "Custom" ? t.accent : t.border}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🎨</div>
            <div style={{ color: t.text, fontSize: 11, fontWeight: 600 }}>Custom</div>
            {themeData.preset === "Custom" && <div style={{ color: t.accent, fontSize: 10, marginTop: 2 }}>✓ Active</div>}
          </button>
        </div>

        {/* Custom color pickers */}
        {themeData.preset === "Custom" && (
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
            <div style={{ color: t.subtext, fontSize: 11, marginBottom: 12 }}>Customize individual colors:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {colorFields.map(({ key, label }) => (
                <div key={key}>
                  <div style={{ color: t.subtext, fontSize: 11, marginBottom: 4 }}>{label}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={themeData.custom?.[key] || "#000000"} onChange={e => updateCustomColor(key, e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer", background: "none", padding: 2 }} />
                    <input value={themeData.custom?.[key] || ""} onChange={e => updateCustomColor(key, e.target.value)}
                      style={{ flex: 1, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px 8px", color: t.text, fontSize: 12, fontFamily: "monospace", outline: "none" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live preview */}
        <div style={{ marginTop: 16, padding: 14, background: liveTheme.surface, border: `1px solid ${liveTheme.border}`, borderRadius: 10 }}>
          <div style={{ color: liveTheme.subtext, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Preview</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ background: `linear-gradient(135deg,${liveTheme.accent},${liveTheme.accent2})`, borderRadius: 6, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600 }}>Button</div>
            <div style={{ background: liveTheme.surface2, border: `1px solid ${liveTheme.border}`, borderRadius: 6, padding: "6px 12px", color: liveTheme.text, fontSize: 12 }}>Input Field</div>
          </div>
          <div style={{ color: liveTheme.text, fontSize: 13, fontWeight: 600 }}>Sample Card Text</div>
          <div style={{ color: liveTheme.subtext, fontSize: 11 }}>Secondary text color</div>
        </div>
      </Card>

      <Btn t={t} onClick={save} variant={saved ? "success" : "primary"} style={{ marginBottom: 16, width: "100%", justifyContent: "center" }}>
        {saved ? <><Icon d={IC.check} size={14} /> Saved!</> : "Save All Settings"}
      </Btn>

      {/* AI Estimator Settings */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>🤖 AI Estimator</SectionLabel>
        <AISettings data={data} setData={setData} t={t} />
      </Card>

      {/* Credentials */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>🛡️ Insurance & License Documents</SectionLabel>
        <CredentialsManager data={data} setData={setData} t={t} />
      </Card>

      {/* OpenSign — Full Integration */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>✍️ OpenSign™ E-Signature</SectionLabel>
        <OpenSignSettings data={data} setData={setData} t={t} />
      </Card>

      {/* Backup */}
      <Card t={t}>
        <SectionLabel t={t}>Backup & Restore</SectionLabel>
        <div style={{ color: t.subtext, fontSize: 13, marginBottom: 14 }}>Export your full database as JSON. Save to Google Drive for cloud backup.</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <Btn t={t} variant="amber" onClick={exportBackup}><Icon d={IC.cloud} size={14} /> Export JSON</Btn>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.surface2, border: `1px solid ${t.border}`, color: t.subtext, borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Icon d={IC.back} size={14} /> Import <input type="file" accept=".json" onChange={importBackup} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ padding: 14, background: t.surface2, borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📱 Install on Phone</div>
          <div style={{ color: t.subtext, fontSize: 12, lineHeight: 1.8 }}>iPhone: Safari → Share → "Add to Home Screen"<br />Android: Chrome → Menu → "Install App"</div>
        </div>
      </Card>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setDataRaw] = useState(loadData);
  const [tab, setTab] = useState("dashboard");
  const [jobFilter, setJobFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    return onAuthChange(async (u) => {
      userRef.current = u;
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setSyncing(true);
        try {
          const cloudData = await loadFromFirestore(u.uid);
          if (cloudData) {
            const merged = { ...defaultData(), ...cloudData };
            setDataRaw(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        } catch(e) { console.error("Firestore load error:", e); }
        setSyncing(false);
      }
    });
  }, []);

  const setData = useCallback(u => {
    setDataRaw(p => {
      const n = typeof u === "function" ? u(p) : u;
      saveData(n, userRef.current?.uid);
      return n;
    });
  }, []);

  // Navigate to a tab with an optional filter — resets filter when switching tabs manually
  const goTo = useCallback((tabId, filter = "all") => {
    if (tabId === "jobs")     setJobFilter(filter);
    if (tabId === "invoices") setInvoiceFilter(filter);
    setTab(tabId);
  }, []);

  const t = getTheme(data.theme, data.lightMode);

  const tabs = [
    { id: "dashboard", label: "Home",      icon: "home" },
    { id: "customers", label: "Clients",   icon: "users" },
    { id: "jobs",      label: "Jobs",      icon: "tag" },
    { id: "estimates", label: "Estimates", icon: "file" },
    { id: "invoices",  label: "Invoices",  icon: "contract" },
    { id: "calendar",  label: "Calendar",  icon: "calendar" },
    { id: "settings",  label: "Settings",  icon: "settings" },
  ];

  const unpaid = data.invoices.filter(i => i.status !== "paid").length;
  const unsigned = data.invoices.filter(i => i.status !== "paid" && !i.signedAt).length;

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0d1520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#94a3b8', fontSize: 16 }}>Loading…</div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0d1520', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>C</span>
        </div>
        <div style={{ color: '#2563eb', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Contractor CRM</div>
        <div style={{ color: '#f0f6ff', fontSize: 26, fontWeight: 800, marginTop: 6 }}>Sign in to continue</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>Your data syncs across all devices automatically</div>
      </div>
      <button onClick={signInWithGoogle} style={{ background: '#fff', color: '#1f2937', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <svg width='20' height='20' viewBox='0 0 48 48'>
          <path fill='#4285F4' d='M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-21 0-1.3-.2-2.7-.5-4z'/>
          <path fill='#34A853' d='M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 6.4 6.3 14.7z'/>
          <path fill='#FBBC05' d='M24 46c5.8 0 10.8-1.9 14.8-5.2l-6.8-5.6C29.9 37 27.1 38 24 38c-5.8 0-10.6-3-13.2-7.5l-7 5.4C7.4 41.8 15.2 46 24 46z'/>
          <path fill='#EA4335' d='M44.5 20H24v8.5h11.8C34.1 32.7 29.5 35.5 24 35.5c-5.7 0-10.6-3.5-12.9-8.5l-7 5.4C7.3 40.3 15.1 45 24 45c6 0 11.4-2.2 15.4-5.9l.1-.1C43.5 35 46 29.9 46 24c0-1.4-.2-2.8-.5-4z'/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );

  return (
    <div data-theme={data.lightMode ? "light" : "dark"} style={{ minHeight: '100vh', background: t.bg, color: t.text, colorScheme: data.lightMode ? "light" : "dark", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${t.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: `${t.surface}ee` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {data.company.logo
            ? <img src={data.company.logo} alt="Logo" style={{ height: 36, maxWidth: 100, objectFit: "contain" }} />
            : <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>C</span></div>
          }
          <div>
            <div style={{ color: t.accent, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>Contractor CRM</div>
            <div style={{ color: t.text, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{data.company.name || "My Business"}</div>
          </div>
        </div>
        {/* Clickable badge shortcuts */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {syncing && <div style={{ background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#60a5fa", fontWeight: 700 }}>syncing…</div>}
          <div onClick={signOutUser} title='Sign out' style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>{user?.displayName?.split(' ')[0] || 'Me'} ↗</div>
          {unsigned > 0 && (
            <button onClick={() => goTo("invoices", "unsigned")}
              style={{ background: "#2e1065", border: "1px solid #7c3aed", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#a78bfa", fontWeight: 700, cursor: "pointer" }}>
              {unsigned} unsigned
            </button>
          )}
          {unpaid > 0 && (
            <button onClick={() => goTo("invoices", "unpaid")}
              style={{ background: "#431407", border: "1px solid #f97316", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#f97316", fontWeight: 700, cursor: "pointer" }}>
              {unpaid} unpaid
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 100px" }}>
        {tab === "dashboard" && <Dashboard data={data} t={t} setTab={goTo} setInvoiceFilter={f => setInvoiceFilter(f)} setJobFilter={f => setJobFilter(f)} />}
        {tab === "customers" && <Customers data={data} setData={setData} t={t} />}
        {tab === "jobs"      && <Jobs data={data} setData={setData} t={t} initialFilter={jobFilter} />}
        {tab === "estimates" && <Estimates data={data} setData={setData} t={t} />}
        {tab === "invoices"  && <Invoices data={data} setData={setData} t={t} initialFilter={invoiceFilter} />}
        {tab === "calendar"  && <Calendar data={data} setData={setData} t={t} setTab={id => goTo(id)} />}
        {tab === "settings"  && <Settings data={data} setData={setData} t={t} />}
      </div>

      {/* Bottom nav */}
      <div className="bottom-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.surface, borderTop: `1px solid ${t.border}`, display: "flex", zIndex: 20, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: `${t.surface}ee` }}>
        {tabs.map(tb => {
          const isActive = tab === tb.id;
          const badgeCount = tb.id === "invoices" ? unpaid : 0;
          return (
            <button key={tb.id} onClick={() => goTo(tb.id)} className="nav-item"
              style={{ flex: 1, background: "none", border: "none", padding: "10px 2px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: isActive ? t.accent : t.muted, fontFamily: "inherit", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <Icon d={IC[tb.icon]} size={20} color={isActive ? t.accent : t.muted} />
                {badgeCount > 0 && (
                  <div style={{ position: "absolute", top: -4, right: -8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 8, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{badgeCount}</div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, letterSpacing: "0.02em" }}>{tb.label}</span>
              <div className="nav-indicator" style={{ width: isActive ? 20 : 0, height: 2.5, background: t.accent, borderRadius: 2, opacity: isActive ? 1 : 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
