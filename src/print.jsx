// Impressão de documentos e etiquetas — funções puras (recebem os dados já carregados).
import { fmtBRL } from "./config";

const fmtNum = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtData = (s) => { if (!s) return ""; const p = String(s).slice(0, 10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- janela de impressão genérica ---------- */
export function imprimirDoc(titulo, corpoHTML, rodape) {
  const w = window.open("", "_blank", "width=920,height=720");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:22px;margin:0}
    h1{font-size:16px;margin:0 0 2px}.sub{color:#555;font-size:11px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#eee}td.r,th.r{text-align:right}.tot{margin-top:10px;width:280px;margin-left:auto}
    .foot{margin-top:12px;font-weight:bold;font-size:13px}.assin{margin-top:44px;border-top:1px solid #333;width:300px;text-align:center;padding-top:4px}
    @media print{.noprint{display:none}}</style></head><body>
    <h1>${esc(titulo)}</h1><div class="sub">Grupo Bononi Acessórios — ${new Date().toLocaleString("pt-BR")}</div>
    ${corpoHTML}${rodape ? `<div class="foot">${rodape}</div>` : ""}
    <div class="noprint" style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px">Imprimir</button></div>
    </body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* */ } }, 350);
}

function cab(pares) {
  return `<table style="border:none;margin-bottom:8px"><tr>${pares.map((col) =>
    `<td style="border:none;vertical-align:top">${col.map((p) => `<b>${esc(p[0])}:</b> ${esc(p[1])}`).join("<br>")}</td>`).join("")}</tr></table>`;
}

/* ---------- Venda / Recibo ---------- */
export function imprimirVendaDoc({ venda = {}, itens = [], cliente = "", empresa = "", pagamento = "" }) {
  let b = cab([
    [["Nº", venda.numero], ["Data", fmtData(venda.data_venda || venda.criado_em)], ["Status", venda.status]],
    [["Cliente", cliente], ["Empresa", empresa], ["Pagamento", pagamento || "—"]],
  ]);
  b += `<table><thead><tr><th>Produto</th><th class="r">Qtd</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>${
    itens.length ? itens.map((i) => `<tr><td>${esc(i.descricao || i.produto || "")}</td><td class="r">${fmtNum(i.quantidade)}</td><td class="r">${fmtNum(i.valor_unitario)}</td><td class="r">${fmtNum(i.valor_total)}</td></tr>`).join("")
      : `<tr><td colspan="4">Sem itens.</td></tr>`}</tbody></table>`;
  b += `<table class="tot">${venda.valor_produtos != null ? `<tr><td>Produtos</td><td class="r">${fmtBRL(venda.valor_produtos)}</td></tr>` : ""}<tr style="font-weight:bold"><td>TOTAL</td><td class="r">${fmtBRL(venda.valor_total)}</td></tr></table>`;
  imprimirDoc(`Venda ${venda.numero || ""}`, b, "");
}

/* ---------- Ordem de Serviço ---------- */
export function imprimirOSDoc({ os = {}, pecas = [], servicos = [], cliente = "", empresa = "" }) {
  let b = cab([
    [["Nº", os.numero], ["Entrada", fmtData(os.data_entrada || os.criado_em)], ["Status", os.status]],
    [["Cliente", cliente], ["Empresa", empresa]],
  ]);
  b += `<div style="font-weight:bold;margin:8px 0 2px">Peças</div><table><thead><tr><th>Produto</th><th class="r">Qtd</th><th class="r">Total</th></tr></thead><tbody>${
    pecas.length ? pecas.map((i) => `<tr><td>${esc(i.descricao || i.produto || "")}</td><td class="r">${fmtNum(i.quantidade)}</td><td class="r">${fmtNum(i.valor_total)}</td></tr>`).join("")
      : `<tr><td colspan="3">Sem peças.</td></tr>`}</tbody></table>`;
  b += `<div style="font-weight:bold;margin:10px 0 2px">Serviços</div><table><thead><tr><th>Serviço</th><th class="r">Total</th></tr></thead><tbody>${
    servicos.length ? servicos.map((s) => `<tr><td>${esc(s.descricao || s.servico || "")}</td><td class="r">${fmtNum(s.valor_total != null ? s.valor_total : s.valor)}</td></tr>`).join("")
      : `<tr><td colspan="2">Sem serviços.</td></tr>`}</tbody></table>`;
  b += `<table class="tot">${os.valor_pecas != null ? `<tr><td>Peças</td><td class="r">${fmtBRL(os.valor_pecas)}</td></tr>` : ""}${os.valor_servicos != null ? `<tr><td>Serviços</td><td class="r">${fmtBRL(os.valor_servicos)}</td></tr>` : ""}<tr style="font-weight:bold"><td>TOTAL</td><td class="r">${fmtBRL(os.valor_total)}</td></tr></table>`;
  b += `<div class="assin">Assinatura do cliente</div>`;
  imprimirDoc(`Ordem de Serviço ${os.numero || ""}`, b, "");
}

/* ---------- Código de barras Code128-B (SVG, sem lib) ---------- */
const _C128 = ["212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112"];
export function barcode128(texto, opts = {}) {
  const mod = opts.mod || 1.5, h = opts.h || 44;
  const s = String(texto || "").replace(/[^\x20-\x7E]/g, ""); if (!s) return "";
  const codes = [104]; let sum = 104;
  for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 32; codes.push(v); sum += v * (i + 1); }
  codes.push(sum % 103); codes.push(106);
  let pat = ""; codes.forEach((c) => { pat += _C128[c]; });
  let x = 0, rects = "";
  for (let i = 0; i < pat.length; i++) { const w = parseInt(pat[i], 10) * mod; if (i % 2 === 0) rects += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${h}"/>`; x += w; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x.toFixed(2)}" height="${h}" viewBox="0 0 ${x.toFixed(2)} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px">${rects}</svg>`;
}

/* ---------- Etiqueta de produto (térmica 50x30mm) ---------- */
export function imprimirEtiquetaProduto(produto = {}, qtd = 1) {
  const n = Math.max(1, Number(qtd) || 1);
  const cod = String(produto.codigo_barras || produto.referencia || produto.id || "");
  const nome = esc(String(produto.nome || "").slice(0, 42));
  const preco = produto.preco_venda != null ? fmtBRL(produto.preco_venda) : "";
  const bc = barcode128(cod, { mod: 1.3, h: 40 });
  const uma = `<div class="etq"><div class="nome">${nome}</div><div class="ref">Ref: ${esc(produto.referencia || "—")}</div><div class="bc">${bc}</div><div class="cod">${esc(cod)}</div>${preco ? `<div class="preco">${preco}</div>` : ""}</div>`;
  let et = ""; for (let i = 0; i < n; i++) et += uma;
  const w = window.open("", "_blank", "width=420,height=520"); if (!w) { alert("Permita pop-ups para imprimir."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>
    @page{size:50mm 30mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}
    .etq{width:50mm;height:30mm;padding:1.5mm 2mm;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between}
    .nome{font-size:8pt;font-weight:bold;line-height:1.05;max-height:2.4em;overflow:hidden}.ref{font-size:7pt}.bc{margin:.5mm 0}.bc svg{display:block}
    .cod{font-size:7pt;text-align:center;letter-spacing:1px;margin-top:-.5mm}.preco{font-size:12pt;font-weight:bold;text-align:right}
    @media screen{body{background:#eee;padding:10px}.etq{background:#fff;border:1px solid #ccc;margin:0 auto 8px}}@media print{.noprint{display:none}}
    </style></head><body>${et}<div class="noprint" style="text-align:center;margin:10px 0"><button onclick="window.print()" style="padding:8px 16px">Imprimir</button></div></body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* */ } }, 350);
}

/* ---------- Etiqueta de expedição (100x60mm) ---------- */
export function imprimirEtiquetaExpedicao({ venda = {}, cliente = {}, empresa = "" }) {
  const end = [cliente.endereco, cliente.numero].filter(Boolean).join(", ") + (cliente.complemento ? " - " + cliente.complemento : "");
  const cid = [cliente.cidade, cliente.uf].filter(Boolean).join(" / ");
  const bc = barcode128(String(venda.numero || venda.id || ""), { mod: 1.2, h: 36 });
  const body = `<div class="exp"><div class="rem">REMETENTE: ${esc(empresa)}</div><div class="dl">DESTINATÁRIO</div>
    <div class="nm">${esc(cliente.nome || "")}</div>${end.trim() ? `<div class="l">${esc(end)}</div>` : ""}${cliente.bairro ? `<div class="l">${esc(cliente.bairro)}</div>` : ""}${cid ? `<div class="l">${esc(cid)}</div>` : ""}${cliente.cep ? `<div class="l">CEP: ${esc(cliente.cep)}</div>` : ""}<div class="bc">${bc}</div><div class="pd">Venda ${esc(venda.numero || "")}</div></div>`;
  const w = window.open("", "_blank", "width=520,height=420"); if (!w) { alert("Permita pop-ups para imprimir."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta de expedição</title><style>
    @page{size:100mm 60mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}
    .exp{width:100mm;height:60mm;padding:4mm 5mm;page-break-after:always;display:flex;flex-direction:column}
    .rem{font-size:8pt;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm}.dl{font-size:8pt;font-weight:bold;letter-spacing:1px}
    .nm{font-size:14pt;font-weight:bold;margin:.5mm 0}.l{font-size:10pt;line-height:1.25}.bc{margin-top:auto}.bc svg{display:block}.pd{font-size:9pt;text-align:center}
    @media screen{body{background:#eee;padding:10px}.exp{background:#fff;border:1px solid #ccc;margin:0 auto}}@media print{.noprint{display:none}}
    </style></head><body>${body}<div class="noprint" style="text-align:center;margin:10px 0"><button onclick="window.print()" style="padding:8px 16px">Imprimir</button></div></body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* */ } }, 350);
}
