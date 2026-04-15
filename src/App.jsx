import { useState, useCallback, useRef, useEffect } from "react";
import { signInWithGoogle, signOutUser, onAuthChange, loadFromFirestore, saveToFirestore } from './firebase.js';

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
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const STORAGE_KEY = "crm_v3";

const defaultData = () => ({
  company: { name: "", phone: "", email: "", address: "", city: "", state: "OR", zip: "", ccbNumber: "", venmoHandle: "", logo: "" },
  theme: { preset: "Bold Blue", custom: { ...THEMES["Bold Blue"] } },
  customers: [], jobs: [], estimates: [], invoices: [],
});

const loadData = () => { try { return { ...defaultData(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return defaultData(); } };
const saveData = (d, uid) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
  if (uid) saveToFirestore(uid, d).catch(console.error);
};

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
const getTheme = (themeData) => {
  if (!themeData) return THEMES["Bold Blue"];
  if (themeData.preset === "Custom") return themeData.custom || THEMES["Bold Blue"];
  return THEMES[themeData.preset] || THEMES["Bold Blue"];
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Card = ({ children, style, t }) => (
  <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 20, ...style }}>
    {children}
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
    {label && <label style={{ display: "block", color: t.subtext, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}{required && <span style={{ color: "#ef4444" }}> *</span>}</label>}
    {rows
      ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
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
  const subtotal = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
  const taxAmt = subtotal * (Number(inv.taxRate || 0) / 100);
  const total = subtotal + taxAmt;
  const venmoHandle = co.venmoHandle || "";

  const lineRows = (inv.lines || []).map(l => `
    <tr>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${l.description || "—"}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${l.qty} ${l.unit}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;font-size:13px">${fmt$(l.unitPrice)}</td>
      <td style="padding:9px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827;font-size:13px">${fmt$(Number(l.qty) * Number(l.unitPrice))}</td>
    </tr>`).join("");

  const photoSection = (inv.photos && inv.photos.length > 0) ? `
    <div style="margin-top:32px">
      <h2 style="font-size:15px;font-weight:700;color:#1d4ed8;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #dbeafe">Project Photos</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${inv.photos.map(p => `
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <img src="${p.dataUrl}" style="width:100%;height:140px;object-fit:cover;display:block"/>
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
  ${inv.notes ? `<div class="notice"><strong>Scope Notes:</strong> ${inv.notes}</div>` : ""}
  ${photoSection}
  <h2>Oregon Residential Construction Contract — Required Disclosures</h2>
  <div class="notice"><strong>Oregon Law Notice:</strong> Oregon law requires residential contractors to be licensed with the Oregon CCB. Verify at <strong>oregon.gov/ccb</strong> or call 503-378-4621.</div>
  <div class="clause"><span class="clause-num">1.</span><strong>Right to Cancel (ORS 83.820):</strong> For home solicitation contracts, the Owner has three (3) business days to cancel without penalty.</div>
  <div class="clause"><span class="clause-num">2.</span><strong>CCB License:</strong> Contractor holds valid Oregon CCB license #${co.ccbNumber || "__________"} and maintains required insurance.</div>
  <div class="clause"><span class="clause-num">3.</span><strong>Lien Rights (ORS 87.093):</strong> Those who supply labor or materials may file a lien on your property if unpaid.</div>
  <div class="clause"><span class="clause-num">4.</span><strong>Payment Schedule:</strong> ${contractTerms?.paymentSchedule || "Payment due upon completion unless otherwise agreed in writing."}</div>
  <div class="clause"><span class="clause-num">5.</span><strong>Change Orders:</strong> All scope or cost changes must be agreed to in writing before additional work begins.</div>
  <div class="clause"><span class="clause-num">6.</span><strong>Warranties:</strong> ${contractTerms?.warranty || "Contractor warrants all labor and materials for one (1) year from substantial completion."}</div>
  <div class="clause"><span class="clause-num">7.</span><strong>Permits:</strong> ${contractTerms?.permits || "Contractor shall obtain all required permits. Cost included unless noted."}</div>
  <div class="clause"><span class="clause-num">8.</span><strong>Dispute Resolution:</strong> Parties agree to mediation before arbitration or litigation. Complaints: Oregon CCB 503-378-4621.</div>
  <div class="clause"><span class="clause-num">9.</span><strong>Insurance:</strong> Contractor maintains general liability insurance of not less than $100,000 per occurrence.</div>
  <div class="clause"><span class="clause-num">10.</span><strong>Entire Agreement:</strong> This document constitutes the entire agreement. No oral representations shall modify these terms.</div>
  ${contractTerms?.additional ? `<div class="clause"><span class="clause-num">11.</span><strong>Additional Terms:</strong> ${contractTerms.additional}</div>` : ""}
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
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">${co.name || "Your Company"} · CCB # ${co.ccbNumber || "__________"} · ${fmtDate(today())}</div>
  </div></body></html>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, t }) {
  const paid = data.invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = data.invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.total || 0), 0);
  const activeJobs = data.jobs.filter(j => j.status === "active").length;
  const unsigned = data.invoices.filter(i => i.status !== "paid" && !i.signedAt).length;
  const recentJobs = [...data.jobs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 5);
  const statusCounts = {};
  STATUSES.forEach(s => { statusCounts[s.key] = data.jobs.filter(j => j.status === s.key).length; });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Dashboard</h2>
        <div style={{ color: t.subtext, fontSize: 13 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Collected", value: fmt$(paid), color: "#4ade80" },
          { label: "Outstanding", value: fmt$(outstanding), color: "#f97316" },
          { label: "Active Jobs", value: activeJobs, color: t.accent },
          { label: "Awaiting Sig", value: unsigned, color: "#a78bfa" },
        ].map(s => (
          <Card key={s.label} t={t} style={{ padding: 16 }}>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: t.subtext, fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Pipeline</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.color}44`, borderRadius: 8, padding: "8px 10px", textAlign: "center", flex: "1 1 60px" }}>
              <div style={{ color: s.color, fontSize: 20, fontWeight: 800 }}>{statusCounts[s.key] || 0}</div>
              <div style={{ color: "#64748b", fontSize: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card t={t}>
        <SectionLabel t={t}>Recent Jobs</SectionLabel>
        {recentJobs.length === 0 ? <div style={{ color: t.muted, textAlign: "center", padding: 20 }}>No jobs yet</div> : recentJobs.map(job => (
          <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
            <div>
              <div style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{job.title}</div>
              <div style={{ color: t.subtext, fontSize: 12 }}>{job.customerName}</div>
            </div>
            <Badge status={job.status} />
          </div>
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
  const del = id => { if (window.confirm("Delete customer?")) setData(d => ({ ...d, customers: d.customers.filter(c => c.id !== id) })); };
  const filtered = data.customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()));

  if (view === "form") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn t={t} variant="ghost" size="sm" onClick={() => setView("list")}><Icon d={IC.back} size={14} /> Back</Btn>
        <h2 style={{ color: t.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{selected ? "Edit" : "New"} Customer</h2>
      </div>
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
        <div style={{ display: "flex", gap: 10 }}><Btn t={t} onClick={save}><Icon d={IC.check} size={14} /> Save</Btn><Btn t={t} variant="ghost" onClick={() => setView("list")}>Cancel</Btn></div>
      </Card>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Customers ({data.customers.length})</h2>
        <Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> Add</Btn>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
      {filtered.length === 0 ? <Card t={t} style={{ textAlign: "center", padding: 40 }}><div style={{ color: t.subtext, marginBottom: 14 }}>No customers</div><Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={13} /> Add First</Btn></Card>
        : filtered.map(c => (
          <Card key={c.id} t={t} style={{ marginBottom: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{c.name}</div><div style={{ color: t.subtext, fontSize: 12, marginTop: 2 }}>{[c.phone, c.city].filter(Boolean).join(" · ")}</div></div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn t={t} size="sm" variant="ghost" onClick={() => open(c)}><Icon d={IC.edit} size={13} /></Btn>
                <Btn t={t} size="sm" variant="danger" onClick={() => del(c.id)}><Icon d={IC.trash} size={13} /></Btn>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}

// ─── JOBS ─────────────────────────────────────────────────────────────────────
function Jobs({ data, setData, t }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", customerId: "", customerName: "", address: "", status: "lead", date: today(), value: "", notes: "", checklist: [] });
  const [filter, setFilter] = useState("all");
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Jobs</h2>
        <Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> New</Btn>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {[{ value: "all", label: "All" }, ...STATUSES].map(s => (
          <button key={s.value || s.key} onClick={() => setFilter(s.value || s.key)} style={{ background: filter === (s.value || s.key) ? t.muted : t.surface, border: `1px solid ${filter === (s.value || s.key) ? t.accent : t.border}`, color: filter === (s.value || s.key) ? t.accent : t.subtext, borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{s.label}</button>
        ))}
      </div>
      {filtered.length === 0 ? <Card t={t} style={{ textAlign: "center", padding: 40 }}><div style={{ color: t.subtext }}>No jobs</div></Card>
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

// ─── ESTIMATES ────────────────────────────────────────────────────────────────
function Estimates({ data, setData, t }) {
  const [view, setView] = useState("list");
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(null);

  const blank = () => ({ id: uid(), number: `EST-${String(data.estimates.length + 1).padStart(4, "0")}`, customerId: "", customerName: "", jobTitle: "", date: today(), lines: [{ id: uid(), description: "", qty: 1, unit: "ea", unitPrice: 0, type: "labor" }], taxRate: 0, notes: "", status: "draft" });
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
    const inv = { id: uid(), number: `INV-${String(data.invoices.length + 1).padStart(4, "0")}`, customerId: est.customerId, customerName: est.customerName, estimateId: est.id, date: today(), dueDate: "", jobTitle: est.jobTitle, lines: JSON.parse(JSON.stringify(est.lines)), taxRate: est.taxRate, total: est.total, status: "unpaid", notes: est.notes, openSignUrl: "", signedAt: "", contractTerms: { paymentSchedule: "", warranty: "", permits: "", additional: "" }, jobStartDate: "", jobEndDate: "", jobAddress: "", photos: [] };
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
      <Card t={t} style={{ marginBottom: 16 }}><Inp t={t} label="Notes / Scope" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} rows={4} placeholder="Scope details, exclusions..." /></Card>
      <div style={{ display: "flex", gap: 10 }}><Btn t={t} onClick={save}><Icon d={IC.check} size={14} /> Save</Btn><Btn t={t} variant="ghost" onClick={() => setView("list")}>Cancel</Btn></div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Estimates</h2>
        <Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={14} /> New</Btn>
      </div>
      {data.estimates.length === 0 ? <Card t={t} style={{ textAlign: "center", padding: 40 }}><div style={{ color: t.subtext, marginBottom: 14 }}>No estimates</div><Btn t={t} size="sm" onClick={() => open(null)}><Icon d={IC.plus} size={13} /> Create First</Btn></Card>
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

// ─── INVOICES ─────────────────────────────────────────────────────────────────
function Invoices({ data, setData, t }) {
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
    if (h) window.open(`https://venmo.com/${h.replace("@", "")}?txn=pay&note=${encodeURIComponent("Invoice " + inv.number)}&amount=${total.toFixed(2)}`, "_blank");
    else alert("Add Venmo handle in Settings.");
  };

  const printPDF = inv => {
    const cust = data.customers.find(c => c.id === inv.customerId);
    const html = buildContractHTML(inv, cust, data.company, inv.contractTerms || {}, data.company.logo || "");
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const addPhoto = (inv, e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const photo = { id: uid(), dataUrl: ev.target.result, caption: "", label: "Before" };
        upd(inv.id, { photos: [...(inv.photos || []), photo] });
      };
      reader.readAsDataURL(file);
    });
  };

  const updPhoto = (inv, photoId, patch) => upd(inv.id, { photos: (inv.photos || []).map(p => p.id === photoId ? { ...p, ...patch } : p) });
  const delPhoto = (inv, photoId) => upd(inv.id, { photos: (inv.photos || []).filter(p => p.id !== photoId) });

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
            <div style={{ color: t.accent, fontSize: 12, fontWeight: 700 }}>{inv.number}</div>
            <h2 style={{ color: t.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{inv.customerName}</h2>
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

        {/* Actions */}
        <Card t={t} style={{ marginBottom: 14 }}>
          <SectionLabel t={t}>Send to Customer</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn t={t} variant="primary" onClick={() => printPDF(inv)} style={{ width: "100%", justifyContent: "center" }}><Icon d={IC.file} size={15} /> Print / Download Contract + Invoice PDF</Btn>
            <Btn t={t} variant="sign" onClick={() => { window.open(inv.openSignUrl || "https://app.opensignlabs.com", "_blank"); }} style={{ width: "100%", justifyContent: "center" }}><Icon d={IC.pen} size={15} /> Open OpenSign™</Btn>
          </div>
        </Card>

        {/* OpenSign link */}
        <Card t={t} style={{ marginBottom: 14 }}>
          <SectionLabel t={t}>OpenSign™ Signing Link</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={inv.openSignUrl || ""} onChange={e => upd(inv.id, { openSignUrl: e.target.value })} placeholder="https://app.opensignlabs.com/signrequest/..." style={{ flex: 1, background: t.surface2, border: `1px solid #7c3aed`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            <Btn t={t} size="sm" variant="ghost" onClick={() => { if (inv.openSignUrl) { navigator.clipboard.writeText(inv.openSignUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } }}>{copied ? "✓" : <Icon d={IC.copy} size={12} />}</Btn>
          </div>
          {inv.openSignUrl && !inv.signedAt && <Btn t={t} size="sm" variant="success" style={{ marginTop: 10 }} onClick={() => markSigned(inv.id)}><Icon d={IC.check} size={12} /> Mark as Signed</Btn>}
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
                    <img src={photo.dataUrl} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
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

        {/* Payment */}
        {inv.status !== "paid" && (
          <Card t={t} style={{ marginBottom: 14 }}>
            <SectionLabel t={t}>Payment</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn t={t} variant="venmo" onClick={() => openVenmo(inv)}>💙 Venmo ({fmt$(total)})</Btn>
              <Btn t={t} variant="success" onClick={() => markPaid(inv.id)}><Icon d={IC.check} size={13} /> Mark Paid</Btn>
            </div>
          </Card>
        )}

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
            <div>{[["Payment", ct.paymentSchedule], ["Warranty", ct.warranty], ["Permits", ct.permits], ["Additional", ct.additional]].map(([k, v]) => v ? <div key={k} style={{ marginBottom: 8, padding: "8px 10px", background: t.surface2, borderRadius: 6 }}><span style={{ color: t.subtext, fontSize: 11, textTransform: "uppercase" }}>{k}: </span><span style={{ color: t.text, fontSize: 13 }}>{v}</span></div> : null)}{!ct.paymentSchedule && <div style={{ color: t.muted, fontSize: 13 }}>Oregon CCB defaults apply</div>}</div>
          )}
        </Card>

        <Btn t={t} variant="danger" size="sm" onClick={() => { del(inv.id); setView("list"); }}><Icon d={IC.trash} size={12} /> Delete Invoice</Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Invoices + Contracts</h2>
      </div>
      <Card t={t} style={{ marginBottom: 16, border: `1px solid #4c1d95` }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>✍️ Workflow</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, textAlign: "center" }}>
          {[["1", "Estimate", "Estimates tab"], ["2", "→ Invoice", "Convert"], ["3", "PDF + Sign", "OpenSign link"], ["4", "Send", "Customer pays"]].map(([n, tt, s]) => (
            <div key={n} style={{ background: "#1a0a2e", border: "1px solid #4c1d95", borderRadius: 8, padding: "8px 4px" }}>
              <div style={{ color: "#7c3aed", fontSize: 16, fontWeight: 800 }}>{n}</div>
              <div style={{ color: t.text, fontSize: 11, fontWeight: 600 }}>{tt}</div>
              <div style={{ color: t.subtext, fontSize: 10 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>
      {data.invoices.length === 0 ? <Card t={t} style={{ textAlign: "center", padding: 40 }}><div style={{ color: t.subtext }}>No invoices — convert an estimate first</div></Card>
        : [...data.invoices].reverse().map(inv => {
          const sub = (inv.lines || []).reduce((s, l) => s + Number(l.qty) * Number(l.unitPrice), 0);
          const total = sub + sub * (Number(inv.taxRate || 0) / 100);
          return (
            <Card key={inv.id} t={t} style={{ marginBottom: 12, cursor: "pointer" }} onClick={() => { setSelected(inv); setEditingContract(false); setView("detail"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div><div style={{ color: t.accent, fontSize: 12, fontWeight: 700 }}>{inv.number}</div><div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>{inv.customerName}</div><div style={{ color: t.subtext, fontSize: 12 }}>{inv.jobTitle} · {fmtDate(inv.date)}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ color: inv.status === "paid" ? "#4ade80" : "#f97316", fontSize: 18, fontWeight: 800 }}>{fmt$(total)}</div><span style={{ background: inv.status === "paid" ? "#052e16" : "#431407", color: inv.status === "paid" ? "#4ade80" : "#f97316", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{inv.status === "paid" ? "✓ PAID" : "UNPAID"}</span></div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: inv.signedAt ? "#052e16" : "#1a1a2e", border: `1px solid ${inv.signedAt ? "#16a34a" : "#4c1d95"}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: inv.signedAt ? "#4ade80" : "#a78bfa" }}>{inv.signedAt ? "✅ Signed" : inv.openSignUrl ? "🔗 Link Ready" : "✍️ Needs Sig"}</div>
                {(inv.photos || []).length > 0 && <div style={{ background: t.muted, border: `1px solid ${t.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: t.subtext }}>📷 {inv.photos.length} photos</div>}
              </div>
            </Card>
          );
        })}
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Calendar</h2>
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
    <div>
      <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>Settings</h2>

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
      </Card>

      {/* Logo Upload */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>Company Logo</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ width: 80, height: 80, background: t.surface2, border: `2px dashed ${t.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {co.logo ? <img src={co.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Icon d={IC.image} size={28} color={t.subtext} />}
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

      {/* OpenSign */}
      <Card t={t} style={{ marginBottom: 16 }}>
        <SectionLabel t={t}>OpenSign™ Setup</SectionLabel>
        <div style={{ color: t.subtext, fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}>
          Free e-signature platform — no credit card needed.<br />
          <strong style={{ color: "#a78bfa" }}>1.</strong> Sign up at <a href="https://app.opensignlabs.com" target="_blank" style={{ color: t.accent }}>app.opensignlabs.com</a><br />
          <strong style={{ color: "#a78bfa" }}>2.</strong> Upload your Contract+Invoice PDF → add signature fields<br />
          <strong style={{ color: "#a78bfa" }}>3.</strong> Copy signing link → paste into the invoice
        </div>
        <Btn t={t} variant="sign" onClick={() => window.open("https://app.opensignlabs.com", "_blank")}><Icon d={IC.link} size={13} /> Open OpenSign™</Btn>
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

  const t = getTheme(data.theme);

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
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {data.company.logo
            ? <img src={data.company.logo} style={{ height: 36, maxWidth: 100, objectFit: "contain" }} />
            : <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>C</span></div>
          }
          <div>
            <div style={{ color: t.accent, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>Contractor CRM</div>
            <div style={{ color: t.text, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{data.company.name || "My Business"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {syncing && <div style={{ background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#60a5fa", fontWeight: 700 }}>syncing…</div>}
          <div onClick={signOutUser} title='Sign out' style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>{user?.displayName?.split(' ')[0] || 'Me'} ↗</div>
          {unsigned > 0 && <div style={{ background: "#2e1065", border: "1px solid #7c3aed", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>{unsigned} sig</div>}
          {unpaid > 0 && <div style={{ background: "#431407", border: "1px solid #f97316", borderRadius: 20, padding: "3px 8px", fontSize: 10, color: "#f97316", fontWeight: 700 }}>{unpaid} unpaid</div>}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 110px" }}>
        {tab === "dashboard" && <Dashboard data={data} t={t} />}
        {tab === "customers" && <Customers data={data} setData={setData} t={t} />}
        {tab === "jobs"      && <Jobs data={data} setData={setData} t={t} />}
        {tab === "estimates" && <Estimates data={data} setData={setData} t={t} />}
        {tab === "invoices"  && <Invoices data={data} setData={setData} t={t} />}
        {tab === "calendar"  && <Calendar data={data} setData={setData} t={t} setTab={setTab} />}
        {tab === "settings"  && <Settings data={data} setData={setData} t={t} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.surface, borderTop: `1px solid ${t.border}`, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ flex: 1, background: "none", border: "none", padding: "8px 2px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === tb.id ? t.accent : t.muted, transition: "color 0.15s", fontFamily: "inherit" }}>
            <Icon d={IC[tb.icon]} size={18} color={tab === tb.id ? t.accent : t.muted} />
            <span style={{ fontSize: 9, fontWeight: tab === tb.id ? 700 : 500, letterSpacing: "0.02em" }}>{tb.label}</span>
            {tab === tb.id && <div style={{ width: 16, height: 2, background: t.accent, borderRadius: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
