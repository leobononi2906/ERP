import { C, mono } from "./config";

export function cardStyle() { return { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(15,29,53,0.04)", minWidth: 0 }; }
export function inp(full, ro) { return { background: ro ? "#EEF1F6" : C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: ro ? C.muted : C.foreground, outline: "none", height: 40, width: full ? "100%" : "auto", boxSizing: "border-box", cursor: ro ? "not-allowed" : "text" }; }
export function sel(full, ro) { return { ...inp(full, ro), cursor: ro ? "not-allowed" : "pointer", appearance: "auto" }; }
export function th(right) { return { padding: "10px 14px", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, background: C.surface2, textAlign: right ? "right" : "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }; }
export function td() { return { padding: "10px 14px", verticalAlign: "middle" }; }
export function btnPrimary() { return { display: "inline-flex", alignItems: "center", gap: 7, background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }; }
export function btnGhost() { return { display: "inline-flex", alignItems: "center", gap: 7, background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }; }
export function btnIcon() { return { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer" }; }

export function Card({ title, children }) {
  return (<div style={cardStyle()}>{title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>}{children}</div>);
}
export function Secao({ titulo, children }) {
  return (<div style={{ ...cardStyle(), marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 14 }}>{titulo}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>{children}</div>
  </div>);
}
export function Campo({ label, children, span }) {
  return (<label style={{ display: "block", gridColumn: span ? `span ${span}` : "auto", minWidth: 0 }}>
    <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 5 }}>{label}</span>{children}</label>);
}
export function Aviso({ children, cor }) {
  const map = { warning: [C.warningBg, C.warning], destructive: [C.destructiveBg, C.destructive], muted: [C.surface2, C.muted], success: [C.successBg, C.success] };
  const [bg, fg] = map[cor] || map.muted;
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: bg, color: fg, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>{children}</div>;
}
export function Skeleton({ h, w }) {
  return <div style={{ height: h, width: w || "100%", background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />;
}
export function Badge({ texto, cor }) {
  const map = { ATIVO: [C.successBg, C.success], INATIVO: [C.surface2, C.muted], BLOQUEADO: [C.destructiveBg, C.destructive], FATURADA: [C.successBg, C.success], ABERTA: [C.bluePale, C.blueMid], CANCELADA: [C.destructiveBg, C.destructive] };
  const [bg, fg] = map[cor || texto] || [C.surface2, C.muted];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4 }}>{texto}</span>;
}
