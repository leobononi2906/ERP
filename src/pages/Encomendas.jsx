import { useState, useEffect } from "react";
import {
  Search, Save, X, AlertCircle, CheckCircle2, Package, Truck, ThumbsUp,
  ThumbsDown, RefreshCw, PackageCheck, Ban, Plus, Users,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Campo, Skeleton } from "../ui";

const STATUS_INFO = {
  COTACAO:   { label: "AGUARDANDO COTAÇÃO", bg: C.warningBg, fg: C.warning },
  COTADA:    { label: "COTADA — AGUARDA VENDEDOR", bg: C.bluePale, fg: C.blueMid },
  EM_COMPRA: { label: "EM COMPRA", bg: "#E8E0F8", fg: "#6B3FA0" },
  RECEBIDA:  { label: "RECEBIDA", bg: C.successBg, fg: C.success },
  REPROVADA: { label: "REPROVADA", bg: C.destructiveBg, fg: C.destructive },
  CANCELADA: { label: "CANCELADA", bg: C.surface2, fg: C.muted },
};
function StBadge({ status }) {
  const s = STATUS_INFO[status] || { label: status, bg: C.surface2, fg: C.muted };
  return <span style={{ background: s.bg, color: s.fg, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{s.label}</span>;
}

export default function Encomendas({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.vendas) || {};

  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("encomendas_dados", { p_id_empresa: null, p_status: null });
      setLista(Array.isArray(d.encomendas) ? d.encomendas : []);
      setFornecedores(Array.isArray(d.fornecedores) ? d.fornecedores : []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  /* ─── cotar ─────────────────────────────────────────────────── */
  const [cotarId, setCotarId] = useState(null);
  const [formCot, setFormCot] = useState({ id_fornecedor: "", valor_custo: "", prazo_dias: "", valor_venda: "", observacao: "" });
  async function cotar() {
    if (!formCot.id_fornecedor || !num(formCot.valor_custo)) { notificar("Informe fornecedor e custo.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("encomenda_cotar", {
        p_id: cotarId, p_id_fornecedor: num(formCot.id_fornecedor),
        p_valor_custo: num(formCot.valor_custo), p_prazo_dias: num(formCot.prazo_dias) || null,
        p_valor_venda: num(formCot.valor_venda) || null,
        p_observacao: formCot.observacao || null, p_id_usuario: usuario.id,
      });
      setCotarId(null); setFormCot({ id_fornecedor: "", valor_custo: "", prazo_dias: "", valor_venda: "", observacao: "" });
      await carregar();
      notificar("Cotação registrada — o vendedor já pode aprovar.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── aprovar / reprovar / receber / cancelar ───────────────── */
  async function aprovar(enc) {
    const vv = window.prompt("Preço de venda para o cliente:", enc.valor_venda || enc.valor_custo || "");
    if (vv === null) return;
    setSaving(true);
    try {
      const res = await rpc("encomenda_aprovar", { p_id: enc.id, p_valor_venda: num(vv) || null, p_id_usuario: usuario.id });
      await carregar();
      notificar(`Aprovada — item entrou na ${enc.origem === "VENDA" ? "venda" : "OS"} e pedido de compra ${res.pedido} gerado.`);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }
  async function reprovar(enc) {
    const motivo = window.prompt("Motivo da reprovação:");
    if (motivo === null) return;
    setSaving(true);
    try {
      await rpc("encomenda_reprovar", { p_id: enc.id, p_motivo: motivo || null, p_id_usuario: usuario.id });
      await carregar(); notificar("Encomenda reprovada.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }
  async function receber(enc) {
    const cr = window.prompt("Custo real da mercadoria (deixe como está se igual ao cotado):", enc.valor_custo || "");
    if (cr === null) return;
    setSaving(true);
    try {
      const res = await rpc("encomenda_receber", { p_id: enc.id, p_custo_real: num(cr) || null, p_id_usuario: usuario.id });
      if (res?.ok === false) { notificar(res.msg, "erro"); setSaving(false); return; }
      await carregar();
      notificar("Recebida! Produto entrou no estoque já reservado — a venda pode ser faturada.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }
  async function cancelar(enc) {
    const motivo = window.prompt(enc.status === "RECEBIDA"
      ? "Cliente desistiu? O item sai da venda e o produto fica no estoque normal. Motivo:"
      : "Motivo do cancelamento:");
    if (motivo === null) return;
    setSaving(true);
    try {
      await rpc("encomenda_cancelar", { p_id: enc.id, p_motivo: motivo || "Sem motivo", p_id_usuario: usuario.id });
      await carregar(); notificar("Encomenda cancelada.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  /* ─── fornecedores ──────────────────────────────────────────── */
  const [modalForn, setModalForn] = useState(false);
  const [formForn, setFormForn] = useState({ nome: "", cpf_cnpj: "", telefone: "", email: "", cidade: "", uf: "" });
  async function salvarFornecedor() {
    if (!formForn.nome.trim()) { notificar("Nome do fornecedor é obrigatório.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("fornecedor_salvar", {
        p_nome: formForn.nome, p_cpf_cnpj: formForn.cpf_cnpj || null,
        p_telefone: formForn.telefone || null, p_email: formForn.email || null,
        p_cidade: formForn.cidade || null, p_uf: formForn.uf || null,
      });
      setFormForn({ nome: "", cpf_cnpj: "", telefone: "", email: "", cidade: "", uf: "" });
      await carregar();
      notificar("Fornecedor cadastrado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  const filtrados = lista.filter((x) => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (x.cliente || "").toLowerCase().includes(q) || (x.descricao || "").toLowerCase().includes(q) || (x.numero || "").toLowerCase().includes(q) || (x.produto || "").toLowerCase().includes(q);
    return okB && (!fStatus || x.status === fStatus);
  });
  const pendCot = lista.filter((x) => x.status === "COTACAO").length;
  const pendApr = lista.filter((x) => x.status === "COTADA").length;
  const emCompra = lista.filter((x) => x.status === "EM_COMPRA").length;

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Encomendas</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Item sem estoque: vendedor solicita na Venda/OS → Compras cota → vendedor aprova → chegou, fatura</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModalForn(true)} style={btnGhost()}><Users size={14} /> Fornecedores</button>
          <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Aguardando cotação", v: pendCot, cor: C.warning },
          { label: "Aguardando aprovação do vendedor", v: pendApr, cor: C.blueMid },
          { label: "Em compra (aguardando chegar)", v: emCompra, cor: "#6B3FA0" },
        ].map((k, i) => (
          <div key={i} style={cardStyle()}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: k.cor }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, item ou nº..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos os status</option>
          <option value="COTACAO">Aguardando cotação</option>
          <option value="COTADA">Cotada</option>
          <option value="EM_COMPRA">Em compra</option>
          <option value="RECEBIDA">Recebida</option>
          <option value="REPROVADA">Reprovada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Package size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma encomenda. Elas nascem no botão "Encomendar" dentro da Venda ou da OS.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 950 }}>
              <thead><tr>{["Nº", "Origem", "Cliente", "Item", "Qtd", "Custo", "Venda", "Prazo", "Fornecedor", "Status", "Ações"].map((h, i) => <th key={i} style={th(i >= 4 && i <= 7)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((e) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{e.numero}</span></td>
                  <td style={{ ...td(), fontSize: 12, color: C.muted }}>{e.origem === "VENDA" ? `Venda ${e.venda_numero || ""}` : `OS ${e.os_numero || ""}`}</td>
                  <td style={{ ...td(), fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.cliente || "—"}</td>
                  <td style={{ ...td(), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.produto || e.descricao}</td>
                  <td style={{ ...td(), textAlign: "right" }}>{e.quantidade}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{e.valor_custo ? fmtBRL(e.custo_real || e.valor_custo) : "—"}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{e.valor_venda ? fmtBRL(e.valor_venda) : "—"}</td>
                  <td style={{ ...td(), textAlign: "right" }}>{e.prazo_dias ? `${e.prazo_dias}d` : "—"}</td>
                  <td style={{ ...td(), color: C.muted, fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fornecedor || "—"}</td>
                  <td style={td()}><StBadge status={e.status} /></td>
                  <td style={{ ...td(), whiteSpace: "nowrap" }}>
                    {e.status === "COTACAO" && perms.editar && (
                      <button onClick={() => { setCotarId(e.id); setFormCot({ id_fornecedor: e.id_fornecedor || "", valor_custo: e.valor_custo || "", prazo_dias: e.prazo_dias || "", valor_venda: e.valor_venda || "", observacao: "" }); }} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12 }}>Cotar</button>
                    )}
                    {e.status === "COTADA" && perms.editar && (<>
                      <button onClick={() => aprovar(e)} disabled={saving} style={{ ...btnPrimary(), padding: "6px 10px", fontSize: 12, background: C.success }} title="Aprovar e gerar pedido de compra"><ThumbsUp size={13} /></button>
                      <button onClick={() => reprovar(e)} disabled={saving} style={{ ...btnGhost(), padding: "6px 10px", fontSize: 12, color: C.destructive, marginLeft: 4 }} title="Reprovar"><ThumbsDown size={13} /></button>
                    </>)}
                    {e.status === "EM_COMPRA" && perms.editar && (
                      <button onClick={() => receber(e)} disabled={saving} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12, background: C.success }} title="Mercadoria chegou"><PackageCheck size={13} /> Receber</button>
                    )}
                    {["COTACAO", "COTADA", "EM_COMPRA", "RECEBIDA"].includes(e.status) && perms.aprovar && (
                      <button onClick={() => cancelar(e)} disabled={saving} style={{ ...btnIcon(), color: C.destructive, marginLeft: 4 }} title="Cancelar / cliente desistiu"><Ban size={13} /></button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>

      {/* Modal COTAR */}
      {cotarId && (
        <div onClick={() => setCotarId(null)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Registrar Cotação</span>
              <button onClick={() => setCotarId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <Campo label="Fornecedor *">
                <select value={formCot.id_fornecedor} onChange={(e) => setFormCot((f) => ({ ...f, id_fornecedor: e.target.value }))} style={sel(true)}>
                  <option value="">Selecione...</option>
                  {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </Campo>
              {fornecedores.length === 0 && <p style={{ fontSize: 12, color: C.warning }}>Nenhum fornecedor cadastrado — use o botão "Fornecedores" na tela.</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                <Campo label="Custo unit. *"><input value={formCot.valor_custo} onChange={(e) => setFormCot((f) => ({ ...f, valor_custo: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
                <Campo label="Prazo (dias)"><input value={formCot.prazo_dias} onChange={(e) => setFormCot((f) => ({ ...f, prazo_dias: e.target.value }))} inputMode="numeric" style={inp(true)} /></Campo>
                <Campo label="Venda sugerida"><input value={formCot.valor_venda} onChange={(e) => setFormCot((f) => ({ ...f, valor_venda: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
              </div>
              <Campo label="Observação"><input value={formCot.observacao} onChange={(e) => setFormCot((f) => ({ ...f, observacao: e.target.value }))} style={{ ...inp(true), marginTop: 4 }} /></Campo>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button onClick={() => setCotarId(null)} style={btnGhost()}>Cancelar</button>
                <button onClick={cotar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? "Salvando..." : "Salvar Cotação"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal FORNECEDORES */}
      {modalForn && (
        <div onClick={() => setModalForn(false)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "95%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Fornecedores</span>
              <button onClick={() => setModalForn(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                <Campo label="Nome *"><input value={formForn.nome} onChange={(e) => setFormForn((f) => ({ ...f, nome: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Telefone"><input value={formForn.telefone} onChange={(e) => setFormForn((f) => ({ ...f, telefone: e.target.value }))} style={inp(true)} /></Campo>
                <button onClick={salvarFornecedor} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Plus size={14} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", gap: 8, marginBottom: 14 }}>
                <Campo label="CNPJ/CPF"><input value={formForn.cpf_cnpj} onChange={(e) => setFormForn((f) => ({ ...f, cpf_cnpj: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="Cidade"><input value={formForn.cidade} onChange={(e) => setFormForn((f) => ({ ...f, cidade: e.target.value }))} style={inp(true)} /></Campo>
                <Campo label="UF"><input value={formForn.uf} onChange={(e) => setFormForn((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} maxLength={2} style={inp(true)} /></Campo>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Nome", "Telefone", "Cidade"].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
                <tbody>
                  {fornecedores.map((f) => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontWeight: 500 }}>{f.nome}</td>
                      <td style={{ ...td(), color: C.muted }}>{f.telefone || "—"}</td>
                      <td style={{ ...td(), color: C.muted }}>{f.cidade ? `${f.cidade}${f.uf ? "/" + f.uf : ""}` : "—"}</td>
                    </tr>
                  ))}
                  {fornecedores.length === 0 && <tr><td colSpan={3} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 20 }}>Nenhum fornecedor ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
