import { useState, useEffect } from "react";
import { BarChart3, Printer, Download, Play } from "lucide-react";
import { C, rpc, fmtBRL, num } from "../config";
import { cardStyle, Campo, SelectBusca, btnPrimary, btnGhost, th, td, Skeleton, Aviso } from "../ui";

const fmtNum = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtData = (s) => { if (!s) return ""; const p = String(s).slice(0, 10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s; };
const fmtVal = (v, tipo) => {
  if (v == null || v === "") return "";
  if (tipo === "money") return fmtBRL(v);
  if (tipo === "num") return fmtNum(v);
  if (tipo === "data") return fmtData(v);
  return String(v);
};

const AREAS = {
  vendas: {
    rpcName: "erp_rel_vendas", label: "Vendas",
    modelos: [["analitico", "Analítico (por venda)"], ["produto", "Por produto"], ["cliente", "Por cliente"], ["vendedor", "Por vendedor"], ["dia", "Por dia"], ["mes", "Por mês"]],
    filtros: ["empresa", "periodo", "cliente", "produto", "status"],
    status: ["ABERTA", "FATURADA", "ENTREGUE", "CANCELADA", "DEVOLVIDA"],
  },
  compras: {
    rpcName: "erp_rel_compras", label: "Compras",
    modelos: [["analitico", "Analítico (por pedido)"], ["produto", "Por produto"], ["fornecedor", "Por fornecedor"], ["mes", "Por mês"]],
    filtros: ["empresa", "periodo", "fornecedor", "produto", "status"],
    status: ["ABERTO", "PARCIAL", "RECEBIDO", "CANCELADO"],
  },
  produtos: {
    rpcName: "erp_rel_produtos", label: "Produtos",
    modelos: [["posicao", "Posição de estoque"], ["mais_vendidos", "Mais vendidos"], ["sem_giro", "Sem giro"], ["grupo", "Por grupo"]],
    filtros: ["empresa", "periodo", "grupo", "situacao"],
  },
  clientes: {
    rpcName: "erp_rel_clientes", label: "Clientes",
    modelos: [["ranking", "Ranking de compras"], ["inativos", "Inativos"], ["novos", "Novos no período"], ["uf", "Por UF"]],
    filtros: ["empresa", "periodo", "uf", "situacao"],
  },
};
const ABAS = [["vendas", "Vendas"], ["compras", "Compras"], ["produtos", "Produtos"], ["clientes", "Clientes"], ["dre", "DRE"]];

const hojeISO = () => new Date().toISOString().slice(0, 10);
const primeiroDiaMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

/* ─── impressão genérica (nova janela) ─── */
function imprimirDoc(titulo, corpoHTML, rodape) {
  const w = window.open("", "_blank", "width=920,height=720");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title>
    <style>*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:22px;margin:0}
    h1{font-size:16px;margin:0 0 2px}.sub{color:#666;font-size:11px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
    th{background:#eee}td.r,th.r{text-align:right}.foot{margin-top:12px;font-weight:bold;font-size:13px}
    @media print{.noprint{display:none}}</style></head><body>
    <h1>${titulo}</h1><div class="sub">Grupo Bononi Acessórios — ${new Date().toLocaleString("pt-BR")}</div>
    ${corpoHTML}${rodape ? `<div class="foot">${rodape}</div>` : ""}
    <div class="noprint" style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px">Imprimir</button></div>
    </body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch { /* */ } }, 350);
}

export default function Relatorios() {
  const [aba, setAba] = useState("vendas");
  const [lookups, setLookups] = useState({ empresas: [], clientes: [], produtos: [], fornecedores: [], grupos: [] });

  useEffect(() => {
    (async () => {
      try {
        const [empresas, clientes, produtos, fornecedores, grupos] = await Promise.all([
          rpc("erp_list", { p_tabela: "empresas", p_limit: 9999 }),
          rpc("erp_list", { p_tabela: "clientes", p_limit: 9999 }),
          rpc("erp_list", { p_tabela: "produtos", p_limit: 9999 }),
          rpc("erp_list", { p_tabela: "fornecedores", p_limit: 9999 }),
          rpc("erp_list", { p_tabela: "grupos_produto", p_limit: 9999 }),
        ]);
        setLookups({
          empresas: empresas || [], clientes: clientes || [], produtos: produtos || [],
          fornecedores: fornecedores || [], grupos: grupos || [],
        });
      } catch { /* silencioso */ }
    })();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <BarChart3 size={22} style={{ color: C.primary }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Relatórios</h1>
      </div>

      {/* abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {ABAS.map(([k, lbl]) => (
          <div key={k} onClick={() => setAba(k)} style={{
            padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: aba === k ? 700 : 500,
            color: aba === k ? C.primary : C.muted, borderBottom: aba === k ? `2px solid ${C.primary}` : "2px solid transparent", marginBottom: -1,
          }}>{lbl}</div>
        ))}
      </div>

      {aba === "dre" ? <DRE lookups={lookups} /> : <RelatorioArea key={aba} area={aba} lookups={lookups} />}
    </div>
  );
}

/* ═══════════ Relatórios unificados (Vendas/Compras/Produtos/Clientes) ═══════════ */
function RelatorioArea({ area, lookups }) {
  const cfg = AREAS[area];
  const [f, setF] = useState({
    agrupamento: cfg.modelos[0][0], id_empresa: "", data_de: primeiroDiaMes(), data_ate: hojeISO(),
    id_cliente: "", id_produto: "", id_fornecedor: "", id_grupo: "", uf: "", situacao: "", status: "",
  });
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const tem = (x) => cfg.filtros.includes(x);

  async function gerar() {
    setLoading(true); setErro("");
    const p = { agrupamento: f.agrupamento };
    if (tem("empresa")) p.id_empresa = f.id_empresa || null;
    if (tem("periodo")) { p.data_de = f.data_de || null; p.data_ate = f.data_ate || null; }
    if (tem("cliente")) p.id_cliente = f.id_cliente || null;
    if (tem("produto")) p.id_produto = f.id_produto || null;
    if (tem("fornecedor")) p.id_fornecedor = f.id_fornecedor || null;
    if (tem("grupo")) p.id_grupo = f.id_grupo || null;
    if (tem("uf")) p.uf = (f.uf || "").toUpperCase() || null;
    if (tem("situacao")) p.situacao = f.situacao || null;
    if (tem("status")) p.status = f.status || null;
    try {
      const data = await rpc(cfg.rpcName, { p });
      setRes({ ...data, filtroTxt: filtroTxt(p) });
    } catch (e) { setErro(e.message || String(e)); setRes(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { gerar(); /* eslint-disable-next-line */ }, [area]);

  const filtroTxt = (p) => {
    const t = [];
    if (p.data_de || p.data_ate) t.push(`Período: ${p.data_de ? fmtData(p.data_de) : "…"} a ${p.data_ate ? fmtData(p.data_ate) : "…"}`);
    if (p.status) t.push(`Status: ${p.status}`);
    if (p.uf) t.push(`UF: ${p.uf}`);
    if (p.situacao) t.push(`Situação: ${p.situacao}`);
    return t.join("  ·  ");
  };

  const cols = res?.colunas || [];
  const rows = res?.linhas || [];
  const tot = res?.totais || {};
  const temMoney = cols.some((c) => c.tipo === "money");

  const selStyle = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, height: 40, width: "100%", boxSizing: "border-box", color: C.foreground };

  return (
    <div>
      <div style={{ ...cardStyle(), marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
          <Campo label="Modelo">
            <select value={f.agrupamento} onChange={(e) => set("agrupamento", e.target.value)} style={selStyle}>
              {cfg.modelos.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Campo>
          {tem("empresa") && (
            <Campo label="Empresa">
              <select value={f.id_empresa} onChange={(e) => set("id_empresa", e.target.value)} style={selStyle}>
                <option value="">Todas</option>
                {lookups.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Campo>
          )}
          {tem("periodo") && <>
            <Campo label="De"><input type="date" value={f.data_de} onChange={(e) => set("data_de", e.target.value)} style={selStyle} /></Campo>
            <Campo label="Até"><input type="date" value={f.data_ate} onChange={(e) => set("data_ate", e.target.value)} style={selStyle} /></Campo>
          </>}
          {tem("cliente") && (
            <Campo label="Cliente">
              <SelectBusca full opcoes={lookups.clientes.map((c) => ({ id: c.id, label: c.nome || `#${c.id}`, sub: c.cpf_cnpj || "" }))}
                value={f.id_cliente} onChange={(v) => set("id_cliente", v)} placeholder="Todos" />
            </Campo>
          )}
          {tem("fornecedor") && (
            <Campo label="Fornecedor">
              <select value={f.id_fornecedor} onChange={(e) => set("id_fornecedor", e.target.value)} style={selStyle}>
                <option value="">Todos</option>
                {lookups.fornecedores.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </Campo>
          )}
          {tem("produto") && (
            <Campo label="Produto">
              <SelectBusca full opcoes={lookups.produtos.map((p) => ({ id: p.id, label: p.nome || `#${p.id}`, sub: p.referencia || "" }))}
                value={f.id_produto} onChange={(v) => set("id_produto", v)} placeholder="Todos" />
            </Campo>
          )}
          {tem("grupo") && (
            <Campo label="Grupo">
              <select value={f.id_grupo} onChange={(e) => set("id_grupo", e.target.value)} style={selStyle}>
                <option value="">Todos</option>
                {lookups.grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}
              </select>
            </Campo>
          )}
          {tem("uf") && <Campo label="UF"><input maxLength={2} value={f.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} placeholder="Todas" style={selStyle} /></Campo>}
          {tem("situacao") && (
            <Campo label="Situação">
              <select value={f.situacao} onChange={(e) => set("situacao", e.target.value)} style={selStyle}>
                <option value="">Todas</option><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option>
              </select>
            </Campo>
          )}
          {tem("status") && (
            <Campo label="Status">
              <select value={f.status} onChange={(e) => set("status", e.target.value)} style={selStyle}>
                <option value="">Todos (menos cancelado)</option>
                {cfg.status.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
          )}
          <div><button onClick={gerar} style={btnPrimary()}><Play size={15} /> Gerar</button></div>
        </div>
      </div>

      {erro && <Aviso cor="destructive">Erro ao gerar: {erro}</Aviso>}
      {loading ? (
        <div style={cardStyle()}><Skeleton h={20} w="30%" /><div style={{ height: 10 }} />{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={28} /></div>)}</div>
      ) : res && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <KPI label="Registros" valor={tot.qtd || 0} />
            {temMoney && <KPI label="Valor total" valor={fmtBRL(tot.valor)} />}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
            <button onClick={() => exportCSV(cols, rows, cfg.label)} style={btnGhost()}><Download size={15} /> Exportar CSV</button>
            <button onClick={() => imprimirTabela(`Relatório de ${cfg.label}`, cols, rows, tot, temMoney, res.filtroTxt)} style={btnGhost()}><Printer size={15} /> Imprimir</button>
          </div>
          <div style={{ ...cardStyle(), padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{cols.map((c) => <th key={c.key} style={th(c.tipo === "money" || c.tipo === "num")}>{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={cols.length || 1} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 30 }}>Nada encontrado para os filtros.</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    {cols.map((c) => (
                      <td key={c.key} style={{ ...td(), textAlign: c.tipo === "money" || c.tipo === "num" ? "right" : "left", fontFamily: c.tipo === "money" || c.tipo === "num" ? mono2 : "inherit", fontSize: 13 }}>
                        {fmtVal(r[c.key], c.tipo)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const mono2 = "'DM Mono', ui-monospace, monospace";

function KPI({ label, valor }) {
  return (
    <div style={{ ...cardStyle(), flex: "1 1 180px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{valor}</div>
    </div>
  );
}

function exportCSV(cols, rows, nome) {
  const sep = ";";
  let csv = cols.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(sep) + "\n";
  rows.forEach((r) => {
    csv += cols.map((c) => {
      let v = r[c.key]; if (v == null) v = "";
      if (c.tipo === "money" || c.tipo === "num") v = String(v).replace(".", ",");
      else if (c.tipo === "data") v = fmtData(v);
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(sep) + "\n";
  });
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `relatorio_${nome.toLowerCase()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function imprimirTabela(titulo, cols, rows, tot, temMoney, filtroTxt) {
  let t = filtroTxt ? `<div class="sub">${filtroTxt}</div>` : "";
  t += "<table><thead><tr>" + cols.map((c) => `<th class="${c.tipo === "money" || c.tipo === "num" ? "r" : ""}">${c.label}</th>`).join("") + "</tr></thead><tbody>" +
    rows.map((r) => "<tr>" + cols.map((c) => `<td class="${c.tipo === "money" || c.tipo === "num" ? "r" : ""}">${fmtVal(r[c.key], c.tipo)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
  const rod = `${tot.qtd || 0} registro(s)` + (temMoney ? `  ·  Total: ${fmtBRL(tot.valor)}` : "");
  imprimirDoc(titulo, t, rod);
}

/* ═══════════ DRE ═══════════ */
function DRE({ lookups }) {
  const [f, setF] = useState({ id_empresa: "", id_centro_custo: "", data_de: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), data_ate: hojeISO() });
  const [res, setRes] = useState(null);
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    let a = true;
    rpc("erp_centros_custo_listar", {}).then((d) => { if (a) setCentros(Array.isArray(d) ? d : (d?.centros || [])); }).catch(() => {});
    return () => { a = false; };
  }, []);

  async function gerar() {
    setLoading(true); setErro("");
    try {
      const data = await rpc("erp_dre", { p: { id_empresa: f.id_empresa || null, id_centro_custo: f.id_centro_custo || null, data_de: f.data_de || null, data_ate: f.data_ate || null } });
      setRes(data);
    } catch (e) { setErro(e.message || String(e)); setRes(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { gerar(); /* eslint-disable-next-line */ }, []);

  const selStyle = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, height: 40, width: "100%", boxSizing: "border-box", color: C.foreground };
  const ind = res?.indicadores || {};
  const lin = res?.linhas || [];

  const rowStyle = (classe) => {
    if (classe === "resultado") return { fontWeight: 700, fontSize: 15, borderTop: `2px solid ${C.border}` };
    if (classe === "total") return { fontWeight: 700, borderTop: `1px solid ${C.border}` };
    if (classe === "grupo") return { fontWeight: 600 };
    return { color: C.muted, paddingLeft: 18 };
  };

  function imprimir() {
    let t = `<div class="sub">Período: ${fmtData(f.data_de)} a ${fmtData(f.data_ate)}</div><table><tbody>` +
      lin.map((l) => {
        const b = l.classe === "total" || l.classe === "resultado" || l.classe === "grupo";
        return `<tr${b ? ' style="font-weight:bold"' : ""}><td${l.classe === "item" ? ' style="padding-left:22px"' : ""}>${l.label}${l.obs ? ` (${l.obs})` : ""}</td><td class="r">${fmtBRL(l.valor)}</td></tr>`;
      }).join("") + "</tbody></table>";
    imprimirDoc("DRE — Demonstração do Resultado", t, "");
  }

  return (
    <div>
      <div style={{ ...cardStyle(), marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
          <Campo label="Empresa">
            <select value={f.id_empresa} onChange={(e) => set("id_empresa", e.target.value)} style={selStyle}>
              <option value="">Todas</option>
              {lookups.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Centro de custo">
            <select value={f.id_centro_custo} onChange={(e) => set("id_centro_custo", e.target.value)} style={selStyle}>
              <option value="">Todos</option>
              {centros.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="De"><input type="date" value={f.data_de} onChange={(e) => set("data_de", e.target.value)} style={selStyle} /></Campo>
          <Campo label="Até"><input type="date" value={f.data_ate} onChange={(e) => set("data_ate", e.target.value)} style={selStyle} /></Campo>
          <div><button onClick={gerar} style={btnPrimary()}><Play size={15} /> Gerar DRE</button></div>
        </div>
      </div>

      {erro && <Aviso cor="destructive">Erro ao gerar: {erro}</Aviso>}
      {loading ? (
        <div style={cardStyle()}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton h={26} /></div>)}</div>
      ) : res && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <KPI label="Receita líquida" valor={fmtBRL(ind.receita_liquida)} />
            <div style={{ ...cardStyle(), flex: "1 1 180px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted }}>Lucro bruto</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{fmtBRL(ind.lucro_bruto)}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Margem {fmtNum(ind.margem_bruta)}%</div>
            </div>
            <div style={{ ...cardStyle(), flex: "1 1 180px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted }}>Resultado líquido</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: (ind.resultado || 0) >= 0 ? C.success : C.destructive }}>{fmtBRL(ind.resultado)}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button onClick={imprimir} style={btnGhost()}><Printer size={15} /> Imprimir</button>
          </div>
          <div style={{ ...cardStyle(), padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {lin.map((l, i) => {
                  const neg = (l.valor || 0) < 0;
                  return (
                    <tr key={i} style={{ ...rowStyle(l.classe) }}>
                      <td style={{ padding: "9px 14px" }}>{l.label}{l.obs && <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}> ({l.obs})</span>}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: mono2, color: neg ? C.destructive : "inherit" }}>{fmtBRL(l.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {Array.isArray(res.por_centro) && res.por_centro.length > 0 && (
            <div style={{ ...cardStyle(), padding: 0, overflowX: "auto", marginTop: 16 }}>
              <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13, borderBottom: `1px solid ${C.border}` }}>Resultado por centro de custo</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: C.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <td style={{ padding: "8px 14px" }}>Centro</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>Receita líq.</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>CMV</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>Despesas</td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>Resultado</td>
                  </tr>
                </thead>
                <tbody>
                  {res.por_centro.map((c, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "9px 14px", fontWeight: 600 }}>{c.centro}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: mono2 }}>{fmtBRL(c.receita_liquida)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: mono2, color: C.textMuted }}>{fmtBRL(c.cmv)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: mono2, color: C.textMuted }}>{fmtBRL(c.despesas)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontFamily: mono2, fontWeight: 700, color: (c.resultado || 0) >= 0 ? C.success : C.destructive }}>{fmtBRL(c.resultado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
