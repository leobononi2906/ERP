import { useState, useEffect } from "react";
import { Undo2, Plus, Search, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Ban, Eye } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton, SelectBusca } from "../ui";
import { consumirCtx } from "../nav";

const statusCor = (s) => ({ DIGITACAO: "ABERTA", CONFIRMADA: "FATURADA", CANCELADA: "CANCELADA" }[s] || "muted");
const VAZIA = () => ({ id: null, id_empresa: "", origem: "VENDA", id_origem: "", numero_origem: "", id_cliente: "", cliente_nome: "", id_centro_estoque: "", motivo: "", observacao: "", numero_nf: "", serie_nf: "", chave_nfe: "", itens: [] });

export default function Devolucoes({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.vendas) || {};
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [fEmpresa, setFEmpresa] = useState("");
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIA());
  const [atual, setAtual] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function carregar() {
    setLoading(true);
    try { const d = await rpc("erp_devolucao_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d); }
    catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [fEmpresa]);

  // handoff: "Devolver" a partir da Venda/OS
  useEffect(() => {
    const ctx = consumirCtx();
    if (ctx && ctx.origem && ctx.id) { novaDe(ctx.origem, ctx.id, ctx.numero); }
    /* eslint-disable-next-line */
  }, []);

  const L = dados || {};
  const empresas = L.empresas || [], centros = L.centros_estoque || [], vendas = L.vendas || [], ordens = L.ordens || [];
  const docs = form.origem === "OS" ? ordens : vendas;

  async function novaDe(origem, idOrigem, numero) {
    setErroForm(""); setView("form");
    setForm({ ...VAZIA(), origem, id_origem: String(idOrigem), numero_origem: numero || "" });
    try {
      const r = await rpc("erp_devolucao_origem", { p_origem: origem, p_id_origem: Number(idOrigem) });
      if (r && r.ok === false) { setErroForm(r.erro || "Não foi possível carregar o documento."); return; }
      setForm((f) => ({
        ...f, origem, id_origem: String(idOrigem), numero_origem: numero || r.numero || "",
        id_empresa: r.id_empresa ? String(r.id_empresa) : "", id_cliente: r.id_cliente ? String(r.id_cliente) : "",
        itens: (r.itens || []).map((i) => ({ id_item_origem: i.id_item_origem, id_produto: i.id_produto, descricao: i.descricao, valor_unitario: num(i.valor_unitario), max: num(i.quantidade), quantidade: num(i.quantidade) })),
      }));
    } catch (e) { setErroForm("Erro: " + (e.message || e)); }
  }
  const abrirNova = () => { setForm(VAZIA()); setErroForm(""); setView("form"); };
  const abrirDetalhe = (d) => { setAtual(d); setView("detalhe"); };

  const setQtd = (idx, v) => setForm((f) => ({ ...f, itens: f.itens.map((x, i) => i === idx ? { ...x, quantidade: Math.min(num(v), x.max) } : x) }));
  const total = form.itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unitario), 0);

  async function salvar(confirmar) {
    if (!form.id_origem) { setErroForm("Selecione o documento de origem."); return; }
    const itens = form.itens.filter((i) => num(i.quantidade) > 0);
    if (itens.length === 0) { setErroForm("Informe a quantidade a devolver em ao menos um item."); return; }
    setErroForm(""); setSaving(true);
    try {
      const r = await rpc("erp_devolucao_salvar", {
        p_cab: { id: form.id || null, id_empresa: form.id_empresa || null, origem: form.origem, id_origem: form.id_origem, numero_origem: form.numero_origem,
          id_cliente: form.id_cliente || null, id_centro_estoque: form.id_centro_estoque || null, motivo: form.motivo || null, observacao: form.observacao || null,
          numero_nf: form.numero_nf || null, serie_nf: form.serie_nf || null, chave_nfe: form.chave_nfe || null, id_usuario: usuario.id },
        p_itens: itens.map((i) => ({ id_produto: i.id_produto, descricao: i.descricao, quantidade: num(i.quantidade), valor_unitario: num(i.valor_unitario), id_item_origem: i.id_item_origem })),
      });
      if (r && r.ok === false) { setErroForm(r.erro || "Falha ao salvar."); setSaving(false); return; }
      let idSalvo = r.id;
      if (confirmar) {
        const rc = await rpc("erp_devolucao_confirmar", { p_id: idSalvo, p_id_usuario: usuario.id });
        if (rc && rc.ok === false) { notificar(rc.erro || "Falha ao confirmar.", "erro"); }
        else notificar(`Devolução confirmada — crédito de ${fmtBRL(rc.credito || total)} para o cliente.`);
      } else notificar("Devolução salva (em digitação).");
      const d = await rpc("erp_devolucao_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d);
      const nova = (d.devolucoes || []).find((x) => x.id === idSalvo);
      if (nova) abrirDetalhe(nova); else setView("lista");
    } catch (e) { setErroForm("Erro: " + (e.message || e)); }
    finally { setSaving(false); }
  }

  async function cancelar() {
    if (!window.confirm("Cancelar esta devolução em digitação?")) return;
    try { await rpc("erp_devolucao_cancelar", { p_id: atual.id, p_id_usuario: usuario.id }); notificar("Devolução cancelada.");
      const d = await rpc("erp_devolucao_dados", { p_id_empresa: fEmpresa ? Number(fEmpresa) : null }); setDados(d); setView("lista");
    } catch (e) { notificar("Erro: " + (e.message || e), "erro"); }
  }

  /* ---- FORM ---- */
  if (view === "form") return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Nova devolução</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{form.numero_origem ? `${form.origem} ${form.numero_origem}` : "Selecione o documento de origem"}</p></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={() => salvar(false)} disabled={saving} style={btnGhost()}><Save size={16} /> Salvar rascunho</button>
          {perms.aprovar && <button onClick={() => salvar(true)} disabled={saving} style={btnPrimary()}><CheckCircle2 size={16} /> {saving ? "..." : "Confirmar devolução"}</button>}
        </div>
      </div>
      {erroForm && <Aviso cor="destructive"><AlertCircle size={15} /> {erroForm}</Aviso>}

      <Secao titulo="Origem">
        <Campo label="Tipo"><select value={form.origem} onChange={(e) => setForm((f) => ({ ...VAZIA(), origem: e.target.value }))} style={sel(true)} disabled={!!form.id_origem && form.itens.length > 0}><option value="VENDA">Venda</option><option value="OS">Ordem de Serviço</option></select></Campo>
        <Campo label="Documento" span={2}>
          <SelectBusca full opcoes={docs.map((d) => ({ id: d.id, label: `${d.numero} · ${d.cliente_nome}`, sub: fmtBRL(d.valor) }))} value={form.id_origem}
            onChange={(v) => { if (v) novaDe(form.origem, v); else setForm((f) => ({ ...f, id_origem: "", itens: [] })); }} placeholder="Buscar venda/OS por número ou cliente..." />
        </Campo>
        <Campo label="Cliente"><input value={(docs.find((d) => String(d.id) === String(form.id_origem)) || {}).cliente_nome || (form.id_cliente ? "Cliente #" + form.id_cliente : "—")} disabled style={inp(true, true)} /></Campo>
        <Campo label="Centro de estoque (retorno)"><select value={form.id_centro_estoque} onChange={(e) => setF("id_centro_estoque", e.target.value)} style={sel(true)}><option value="">Padrão da empresa</option>{centros.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}</select></Campo>
        <Campo label="Motivo"><input value={form.motivo} onChange={(e) => setF("motivo", e.target.value)} placeholder="Ex.: produto com defeito" style={inp(true)} /></Campo>
      </Secao>

      <div style={{ ...cardStyle(), marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 6 }}>Itens a devolver</div>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>Ajuste a quantidade (devolução total ou parcial). "Máx." é o saldo ainda não devolvido.</p>
        {form.itens.length === 0 ? <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "16px 0" }}>Selecione um documento de origem para listar os itens.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Produto", "Vlr unit.", "Máx.", "Devolver", "Total"].map((h, i) => <th key={i} style={th(i >= 1)}>{h}</th>)}</tr></thead>
            <tbody>{form.itens.map((i, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 500 }}>{i.descricao}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_unitario)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted }}>{num(i.max)}</td>
                <td style={{ ...td(), textAlign: "right" }}><input value={i.quantidade} onChange={(e) => setQtd(idx, e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" style={{ ...inp(true), fontFamily: mono, textAlign: "right", width: 90 }} /></td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(num(i.quantidade) * num(i.valor_unitario))}</td>
              </tr>))}
            </tbody>
          </table>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontWeight: 700 }}>Crédito ao cliente: <span style={{ fontFamily: mono, marginLeft: 8 }}>{fmtBRL(total)}</span></div>
      </div>

      <Secao titulo="NF-e de devolução (gancho — não emite agora)">
        <Campo label="Nº da NF"><input value={form.numero_nf} onChange={(e) => setF("numero_nf", e.target.value)} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Série"><input value={form.serie_nf} onChange={(e) => setF("serie_nf", e.target.value)} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Chave NF-e"><input value={form.chave_nfe} onChange={(e) => setF("chave_nfe", e.target.value)} style={{ ...inp(true), fontFamily: mono }} /></Campo>
        <Campo label="Observação" span={3}><textarea value={form.observacao} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
      </Secao>
    </>
  );

  /* ---- DETALHE ---- */
  if (view === "detalhe" && atual) {
    const dig = atual.status === "DIGITACAO";
    return (
      <>
        {toast && <Toast toast={toast} />}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={18} /></button>
          <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Devolução {atual.numero} <Badge texto={atual.status} cor={statusCor(atual.status)} /></h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{atual.cliente_nome} · {atual.origem} {atual.numero_origem || ""}</p></div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {dig && perms.excluir && <button onClick={cancelar} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Ban size={14} /> Cancelar</button>}
          </div>
        </div>
        {atual.status === "CONFIRMADA" && <Aviso cor="success"><CheckCircle2 size={15} /> Confirmada — itens retornados ao estoque e crédito de {fmtBRL(atual.valor_total)} lançado para o cliente.</Aviso>}
        <div style={{ ...cardStyle(), padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Produto", "Qtd", "Vlr unit.", "Total"].map((h, i) => <th key={i} style={th(i >= 1)}>{h}</th>)}</tr></thead>
            <tbody>{(atual.itens || []).map((i) => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 500 }}>{i.descricao}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.quantidade)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.valor_unitario)}</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(i.valor_total)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontWeight: 700, fontSize: 15 }}>Total / crédito: <span style={{ fontFamily: mono, marginLeft: 8 }}>{fmtBRL(atual.valor_total)}</span></div>
      </>
    );
  }

  /* ---- LISTA ---- */
  const lista = (L.devolucoes || []).filter((d) => { const q = busca.trim().toLowerCase(); return !q || (d.numero || "").toLowerCase().includes(q) || (d.cliente_nome || "").toLowerCase().includes(q) || (d.numero_origem || "").toLowerCase().includes(q); });
  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Devoluções</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Devolução de venda/OS — gera crédito ao cliente</p></div>
        {perms.incluir && <button onClick={abrirNova} style={btnPrimary()}><Plus size={16} /> Nova devolução</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº, cliente ou documento..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas as empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}</select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={28} />)}</div>
          : lista.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Undo2 size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma devolução.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead><tr>{["Nº", "Cliente", "Origem", "Crédito", "Status", ""].map((h, i) => <th key={i} style={th(i === 3)}>{h}</th>)}</tr></thead>
              <tbody>{lista.map((d) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirDetalhe(d)} onMouseEnter={(e) => e.currentTarget.style.background = C.surface2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...td(), fontFamily: mono, fontWeight: 600 }}>{d.numero}</td>
                  <td style={td()}>{d.cliente_nome}</td>
                  <td style={{ ...td(), color: C.muted }}>{d.origem} {d.numero_origem || ""}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(d.valor_total)}</td>
                  <td style={td()}><Badge texto={d.status} cor={statusCor(d.status)} /></td>
                  <td style={{ ...td(), textAlign: "right" }}><button style={btnIcon()}><Eye size={15} /></button></td>
                </tr>))}
              </tbody>
            </table></div>}
      </div>
    </>
  );
}

function Toast({ toast }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "erro" ? C.destructiveBg : C.successBg, color: toast.tipo === "erro" ? C.destructive : C.success }}>{toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>;
}
