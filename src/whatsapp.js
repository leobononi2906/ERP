// Envio por WhatsApp via link wa.me (sem provedor/custo).
// Abre o WhatsApp (Web/app) já com o número do cliente e a mensagem pronta; o usuário só aperta enviar.

// Normaliza número BR: só dígitos; garante DDI 55; aceita já com 55.
export function numeroWhatsApp(numero) {
  let d = String(numero || "").replace(/\D/g, "");
  if (!d) return "";
  // remove zeros à esquerda / DDD-tronco 0
  d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;            // DDD + número (sem DDI)
  else if (d.length === 12 || d.length === 13 && d.startsWith("55")) { /* já tem 55 */ }
  else if (!d.startsWith("55")) d = "55" + d;
  return d;
}

// Melhor telefone do cliente para WhatsApp (whatsapp > celular > telefone).
export function telefoneCliente(c) {
  if (!c) return "";
  return c.whatsapp || c.celular || c.telefone || "";
}

const fmt = (v) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Monta o link wa.me. Se não houver número, abre o WhatsApp só com o texto (o usuário escolhe o contato).
export function linkWhatsApp(numero, texto) {
  const n = numeroWhatsApp(numero);
  const t = encodeURIComponent(texto || "");
  return n ? `https://wa.me/${n}?text=${t}` : `https://wa.me/?text=${t}`;
}

export function abrirWhatsApp(numero, texto) {
  window.open(linkWhatsApp(numero, texto), "_blank", "noopener");
}

// ── Mensagens por tipo de documento ──
function bloco(titulo, numero, cliente, empresa, valor, itens, extra) {
  const linhas = [];
  linhas.push(`Olá${cliente ? " " + cliente : ""}! 👋`);
  linhas.push("");
  linhas.push(`Segue seu(sua) *${titulo} nº ${numero || "—"}*${empresa ? " — " + empresa : ""}.`);
  if (extra) linhas.push(extra);
  linhas.push(`Total: *${fmt(valor)}*`);
  if (Array.isArray(itens) && itens.length) {
    linhas.push("");
    linhas.push("Itens:");
    itens.slice(0, 20).forEach((i) => {
      const q = Number(i.quantidade) || Number(i.qtd) || 1;
      const desc = i.descricao || i.nome || "item";
      linhas.push(`• ${q}x ${desc}${i.valor_total != null ? " — " + fmt(i.valor_total) : ""}`);
    });
    if (itens.length > 20) linhas.push(`… e mais ${itens.length - 20} item(ns)`);
  }
  linhas.push("");
  linhas.push("Qualquer dúvida estou à disposição! 🙂");
  return linhas.join("\n");
}

export function msgVenda({ numero, cliente, empresa, valor, itens }) {
  return bloco("Venda", numero, cliente, empresa, valor, itens);
}
export function msgOrcamento({ numero, cliente, empresa, valor, itens, validade }) {
  return bloco("Orçamento", numero, cliente, empresa, valor, itens, validade ? `Válido até: ${validade}` : null);
}
export function msgOS({ numero, cliente, empresa, valor, itens, status }) {
  return bloco("Ordem de Serviço", numero, cliente, empresa, valor, itens, status ? `Status: ${status}` : null);
}
