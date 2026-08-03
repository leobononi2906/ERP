// Navegação entre páginas com contexto (ex.: "Devolver" a partir da Venda/OS).
export const navHandoff = { pagina: null, ctx: null };
export function irPara(pagina, ctx) {
  navHandoff.pagina = pagina;
  navHandoff.ctx = ctx || null;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("erp-nav"));
}
export function consumirCtx() { const c = navHandoff.ctx; navHandoff.ctx = null; return c; }
