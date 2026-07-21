// Conexão Supabase (chave pública — segura para o navegador)
export const SUPA_URL = "https://vishxwdxqiygbxmtpfoy.supabase.co";
export const SUPA_KEY = "sb_publishable_nEfc7eXcI1zcai3WcRo84g_ZTg9ArSO";

export async function rpc(fn, body = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export const C = {
  background: "#F0F3F8", foreground: "#0F1D35", card: "#FFFFFF", surface2: "#F7F9FC",
  primary: "#1A3A8F", blueMid: "#0077CC", blueLight: "#00AAEE", bluePale: "#E8F4FD",
  muted: "#5A6A85", textMuted: "#9AA5B8", border: "#E2E8F2",
  success: "#0F9D6E", successBg: "#E8F8F3", warning: "#E07B00", warningBg: "#FEF5E7",
  destructive: "#D93025", destructiveBg: "#FEF0EF", sidebar: "#1A3A8F",
};
export const mono = "'DM Mono', ui-monospace, monospace";
export const num = (v) => Number(String(v).replace(",", ".")) || 0;
export const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
// ATOR removido — usar usuario.id do login
