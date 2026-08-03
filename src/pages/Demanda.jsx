import { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, CheckCircle2, RefreshCw, ShoppingCart } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Campo, Skeleton, SelectBusca } from "../ui";
import { irPara } from "../nav";

const URG = {
  CRITICO: ["Crítico", C.destructiveBg, C.destructive],
  ALERTA: ["Alerta", C.warningBg, C.warning],
  OK: ["OK", C.successBg, C.success],
};
function UrgBadge({ u }) {
  const [txt, bg, fg] = URG[u] || [u || "—", C.surface2, C.muted];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{txt}</span>;
}

export default function Demanda({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.compras) || {};
  const [filtros, setFiltros] = useState({ grupos: [], subgrupos: [] });
  const [empresas, setEmpresas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [rows, setRows] = useState([]);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [analisando, setAnalisando] = useState(false);
  const [toast, setToast] = useState(null);
  const [gerando, setGerando] = useState(false);

  // filtros
  const [fEmpresa, setFEmpresa] = useState("");
  const [modo, setModo] = useState("ambos");
  const [fGrupo, setFGrupo] = useState("");
  const [fSubgrupo, setFSubgrupo] = useState("");
  const [fForn, setFForn] = useState("");
  const [fUrg, setFUrg] = useState("");
  const [busca, setBusca] = useState("");
  const [somenteDemanda, setSomenteDemanda] = useState(true);
  const [dias, setDias] = useState(90);
  const [lead, setLead] = useState(15);
  const [alvo, setAlvo] = useState(30);

  // seleção / overrides
  const [sel_, setSel] = useState(() => new Set());
  const [qtd, setQtd] = useState({});   // override de quantidade por id_produto
  const [forn, setForn] = useState({}); // override de fornecedor por id_produto

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      setCarregandoBase(true);
      try {
        const [f, d] = await Promise.all([rpc("erp_demanda_filtros", {}), rpc("erp_pedido_compra_dados", { p_id_empresa: null })]);
        setFiltros(f || { grupos: [], subgrupos: [] });
        setEmpresas(d.empresas || []);
        setFornecedores(d.fornecedores || []);
      } catch (e) { notificar("Erro ao carregar filtros: " + e.message, "erro"); }
      finally { setCarregandoBase(false); }
      analisar();
    })();
    /* eslint-disable-next-line */
  }, []);

  async function analisar() {
    setAnalisando(true);
    try {
      const p = {
        p_id_empresa: fEmpresa ? Number(fEmpresa) : null, p_dias: Number(dias) || 90, p_modo: modo,
        p_id_grupo: fGrupo ? Number(fGrupo) : null, p_id_subgrupo: fSubgrupo ? Number(fSubgrupo) : null,
        p_id_fornecedor: fForn ? Number(fForn) : null, p_busca: busca.trim() || null,
        p_urgencia: fUrg || null, p_cobertura_alvo: Number(alvo) || 30, p_lead_time: Number(lead) || 15,
        p_somente_demanda: somenteDemanda,
      };
      const d = await rpc("erp_demanda_listar", p);
      setRows(Array.isArray(d) ? d : []);
    } catch (e) { notificar("Falha ao analisar: " + e.message, "erro"); setRows([]); }
    finally { setAnalisando(false); }
  }

  const effQtd = (r) => (qtd[r.id_produto] == null ? num(r.sugestao_qtd) : num(qtd[r.id_produto]));
  const effForn = (r) => (forn[r.id_produto] != null ? forn[r.id_produto] : (r.id_fornecedor || ""));

  function toggle(id, ch) { setSel((s) => { const n = new Set(s); if (ch) n.add(id); else n.delete(id); return n; }); }
  function toggleAll(ch) { setSel(ch ? new Set(rows.map((r) => r.id_produto)) : new Set()); }

  async function salvarLimite(id, campo, valor) {
    try {
      const v = valor === "" || valor == null ? null : Number(valor);
      await rpc("erp_produto_estoque_limites", { p_id: id, p_min: campo === "min" ? v : null, p_max: campo === "max" ? v : null, p_id_usuario: usuario.id });
      notificar("Limite atualizado.");
      analisar();
    } catch (e) { notificar("Erro ao salvar limite: " + (e.message || e), "erro"); }
  }

  const subgruposFiltrados = (filtros.subgrupos || []).filter((s) => !fGrupo || String(s.id_grupo) === String(fGrupo));
  const selecionados = rows.filter((r) => sel_.has(r.id_produto) && effQtd(r) > 0);
  const totalCompra = selecionados.reduce((s, r) => s + effQtd(r) * num(r.preco_custo), 0);
  const semForn = selecionados.filter((r) => !effForn(r));
  const fornSet = new Set(selecionados.map((r) => String(effForn(r))).filter(Boolean));

  async function gerarPedidos() {
    if (selecionados.length === 0) { notificar("Marque itens e informe a quantidade.", "erro"); return; }
    if (!fEmpresa) { notificar("Selecione a empresa para gerar o pedido.", "erro"); return; }
    if (semForn.length) { notificar(`${semForn.length} item(ns) sem fornecedor. Defina na linha.`, "erro"); return; }
    if (!window.confirm(`Gerar pedido(s) de compra com ${selecionados.length} item(ns)? Um pedido por fornecedor (status Pendente).`)) return;
    setGerando(true);
    try {
      const itens = selecionados.map((r) => ({ id_produto: r.id_produto, id_fornecedor: Number(effForn(r)), descricao: r.nome, referencia_fornecedor: r.referencia_fornecedor || null, quantidade: effQtd(r), valor_unitario: num(r.preco_custo) }));
      const d = await rpc("erp_demanda_gerar_pedidos", { p_itens: itens, p_id_empresa: Number(fEmpresa), p_id_usuario: usuario.id });
      const peds = (d && d.pedidos) || [];
      notificar(`${peds.length} pedido(s) gerado(s): ${peds.map((p) => p.numero).join(", ")}`);
      setSel(new Set()); setQtd({}); setForn({});
      setTimeout(() => irPara("pedidos_compra"), 900);
    } catch (e) { notificar("Erro ao gerar pedidos: " + (e.message || e), "erro"); }
    finally { setGerando(false); }
  }

  const nCrit = rows.filter((r) => r.urgencia === "CRITICO").length;
  const nAlert = rows.filter((r) => r.urgencia === "ALERTA").length;
  const totalSugerido = rows.reduce((s, r) => s + num(r.sugestao_qtd) * num(r.preco_custo), 0);
  const colSug = modo === "giro" ? "Sug. giro" : modo === "reposicao" ? "Sug. repo" : "Sugestão";
  const sugCol = (r) => modo === "giro" ? r.sugestao_giro : modo === "reposicao" ? r.sugestao_reposicao : r.sugestao_qtd;

  return (
    <>
      {toast && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "erro" ? C.destructiveBg : C.successBg, color: toast.tipo === "erro" ? C.destructive : C.success }}>{toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>}

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Demanda / Sugestão de Compra</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Analise reposição (mín/máx) e giro (consumo), ajuste e forme os pedidos — um por fornecedor</p>
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle(), marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Campo label="Empresa"><select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel(true)}><option value="">Todas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></Campo>
          <Campo label="Modo de análise"><select value={modo} onChange={(e) => setModo(e.target.value)} style={sel(true)}><option value="ambos">Reposição + Giro</option><option value="reposicao">Reposição (mín/máx)</option><option value="giro">Giro (consumo)</option></select></Campo>
          <Campo label="Grupo"><select value={fGrupo} onChange={(e) => { setFGrupo(e.target.value); setFSubgrupo(""); }} style={sel(true)}><option value="">Todos</option>{(filtros.grupos || []).map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select></Campo>
          <Campo label="Subgrupo"><select value={fSubgrupo} onChange={(e) => setFSubgrupo(e.target.value)} style={sel(true)}><option value="">Todos</option>{subgruposFiltrados.map((s) => <option key={s.id} value={s.id}>{s.descricao}</option>)}</select></Campo>
          <Campo label="Fornecedor"><SelectBusca full opcoes={[{ id: "", label: "Todos" }, ...fornecedores.map((f) => ({ id: f.id, label: f.nome }))]} value={fForn} onChange={setFForn} placeholder="Todos" /></Campo>
          <Campo label="Urgência"><select value={fUrg} onChange={(e) => setFUrg(e.target.value)} style={sel(true)}><option value="">Todas</option><option value="CRITICO">Crítico</option><option value="ALERTA">Alerta</option><option value="OK">OK</option></select></Campo>
          <Campo label="Buscar produto"><input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") analisar(); }} placeholder="nome ou referência" style={inp(true)} /></Campo>
          <Campo label="&nbsp;"><label style={{ display: "flex", alignItems: "center", gap: 8, height: 40, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={somenteDemanda} onChange={(e) => setSomenteDemanda(e.target.checked)} /> Só itens em demanda</label></Campo>
          <Campo label="Janela de consumo (dias)"><input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="numeric" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <Campo label="Lead time (dias)"><input value={lead} onChange={(e) => setLead(e.target.value)} inputMode="numeric" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <Campo label="Estoque desejado (dias)"><input value={alvo} onChange={(e) => setAlvo(e.target.value)} inputMode="numeric" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <Campo label="&nbsp;"><button onClick={analisar} disabled={analisando} style={{ ...btnPrimary(), width: "100%", justifyContent: "center" }}><RefreshCw size={15} /> {analisando ? "Analisando..." : "Analisar demanda"}</button></Campo>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
        <Kpi lbl="Itens na análise" val={rows.length} />
        <Kpi lbl="Críticos" val={nCrit} cor={C.destructive} />
        <Kpi lbl="Alertas" val={nAlert} cor={C.warning} />
        <Kpi lbl="Compra sugerida (custo)" val={fmtBRL(totalSugerido)} />
      </div>

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {carregandoBase || analisando ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={28} />)}</div>
          : rows.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><TrendingUp size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum item para os filtros escolhidos.</div><div style={{ fontSize: 12, marginTop: 4 }}>Ajuste os filtros ou desmarque "Só itens em demanda".</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1050 }}>
              <thead><tr>
                <th style={{ ...th(), width: 32 }}><input type="checkbox" checked={sel_.size > 0 && sel_.size === rows.length} onChange={(e) => toggleAll(e.target.checked)} /></th>
                {["Ref.", "Produto", "Fornecedor", "Estoque", "Mín.", "Máx.", "Cons./dia", "Cobert.", colSug, "Comprar", "Custo un.", "Urgência"].map((h, i) => <th key={i} style={th(i >= 3 && i !== 2)}>{h}</th>)}
              </tr></thead>
              <tbody>{rows.map((r) => {
                const id = r.id_produto, marcado = sel_.has(id);
                const cob = num(r.cobertura_dias) >= 999 ? "—" : num(r.cobertura_dias).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
                return (
                  <tr key={id} style={{ borderTop: `1px solid ${C.border}`, background: marcado ? C.bluePale : "transparent" }}>
                    <td style={td()}><input type="checkbox" checked={marcado} onChange={(e) => toggle(id, e.target.checked)} /></td>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{r.referencia || "—"}</td>
                    <td style={td()}><div style={{ fontWeight: 500 }}>{r.nome}</div><div style={{ fontSize: 11, color: C.textMuted }}>{r.grupo || "—"}{r.subgrupo ? " · " + r.subgrupo : ""}</div></td>
                    <td style={{ ...td(), minWidth: 150 }}>{r.id_fornecedor ? (r.fornecedor || "#" + r.id_fornecedor) : (
                      <select value={effForn(r) || ""} onChange={(e) => setForn((x) => ({ ...x, [id]: e.target.value ? Number(e.target.value) : null }))} style={{ ...sel(true), height: 34, maxWidth: 160 }}><option value="">— definir —</option>{fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
                    )}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(r.estoque_atual)}</td>
                    <td style={{ ...td(), textAlign: "right" }}><input defaultValue={r.estoque_minimo ?? ""} onBlur={(e) => { if (String(e.target.value) !== String(r.estoque_minimo ?? "")) salvarLimite(id, "min", e.target.value); }} inputMode="decimal" style={{ ...inp(), width: 66, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                    <td style={{ ...td(), textAlign: "right" }}><input defaultValue={r.estoque_maximo ?? ""} onBlur={(e) => { if (String(e.target.value) !== String(r.estoque_maximo ?? "")) salvarLimite(id, "max", e.target.value); }} inputMode="decimal" style={{ ...inp(), width: 66, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(r.consumo_dia).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{cob}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(sugCol(r))}</td>
                    <td style={{ ...td(), textAlign: "right" }}><input value={effQtd(r)} onChange={(e) => setQtd((x) => ({ ...x, [id]: e.target.value }))} inputMode="decimal" style={{ ...inp(), width: 76, textAlign: "right", fontFamily: mono, height: 34 }} /></td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(r.preco_custo)}</td>
                    <td style={td()}><UrgBadge u={r.urgencia} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>}
      </div>

      {/* Rodapé de ação */}
      {rows.length > 0 && (
        <div style={{ ...cardStyle(), marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            <b>{selecionados.length}</b> item(ns) marcado(s) · <b style={{ fontFamily: mono }}>{fmtBRL(totalCompra)}</b>
            {fornSet.size > 0 && <span style={{ color: C.muted }}> · {fornSet.size} fornecedor(es) → {fornSet.size} pedido(s)</span>}
            {semForn.length > 0 && <span style={{ color: C.destructive }}> · {semForn.length} sem fornecedor</span>}
          </div>
          <div style={{ flex: 1 }} />
          {perms.incluir
            ? <button onClick={gerarPedidos} disabled={gerando || selecionados.length === 0} style={{ ...btnPrimary(), background: C.success, opacity: (gerando || selecionados.length === 0) ? 0.5 : 1 }}><ShoppingCart size={15} /> {gerando ? "Gerando..." : "Gerar pedido(s) de compra"}</button>
            : <span style={{ fontSize: 12, color: C.textMuted }}>Sem permissão para incluir compras</span>}
        </div>
      )}
    </>
  );
}

function Kpi({ lbl, val, cor }) {
  return (
    <div style={cardStyle()}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6 }}>{lbl}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: cor || C.foreground }}>{val}</div>
    </div>
  );
}
