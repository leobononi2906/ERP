import { useState, useEffect } from "react";
import {
  Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle,
  Tag, Trash2, Eye, Calendar, Package, Percent,
} from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import {
  cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo,
  Aviso, Badge,
} from "../ui";

function fmtData(d) { return d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—"; }

function StatusPromo({ promo }) {
  if (!promo.ativo) return <Badge texto="INATIVA" cor="INATIVO" />;
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje < promo.data_inicio) return <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>AGENDADA</span>;
  if (hoje > promo.data_fim) return <Badge texto="ENCERRADA" cor="CANCELADA" />;
  // Alerta se falta <= 3 dias
  const diff = Math.ceil((new Date(promo.data_fim + "T23:59:59") - new Date()) / 86400000);
  if (diff <= 3) return <span style={{ background: C.warningBg, color: C.warning, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>ATIVA (encerra em {diff}d)</span>;
  return <Badge texto="ATIVA" cor="ATIVO" />;
}

export default function Promocoes({ usuario }) {
  const perms = (usuario && usuario.permissoes && (usuario.permissoes.vendas || usuario.permissoes.produtos)) || {};

  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [view, setView] = useState("lista");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const [fAtivo, setFAtivo] = useState("");

  // Detalhe
  const [promoAtual, setPromoAtual] = useState(null);
  const [itens, setItens] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [formItem, setFormItem] = useState({ id_produto: "", tipo: "PERCENTUAL", valor: "" });

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("erp_promocoes_dados");
      setLista(d.promocoes ?? []);
      setProdutos(d.produtos ?? []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.nome?.trim()) { setErroForm("Nome da promoção é obrigatório."); return; }
    if (!form.data_inicio || !form.data_fim) { setErroForm("Datas de início e fim são obrigatórias."); return; }
    if (form.data_fim < form.data_inicio) { setErroForm("Data fim não pode ser anterior à data início."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("erp_promocao_salvar", { p: { ...form, _ator: usuario.id } });
      if (res?.id) {
        await carregar();
        const promo = { ...form, id: res.id };
        notificar(form.id ? "Promoção atualizada." : "Promoção criada.");
        abrirDetalhe(promo);
      }
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function abrirDetalhe(promo) {
    setPromoAtual(promo); setView("detalhe"); setAddItem(false);
    try {
      const it = await rpc("erp_promocao_itens_listar", { p_id_promocao: promo.id });
      setItens(Array.isArray(it) ? it : []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  async function adicionarItem() {
    if (!formItem.id_produto) { notificar("Selecione o produto.", "erro"); return; }
    if (!num(formItem.valor)) { notificar("Informe o valor.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("erp_promocao_item_salvar", { p: {
        id_promocao: promoAtual.id,
        id_produto: Number(formItem.id_produto),
        tipo: formItem.tipo,
        valor: num(formItem.valor),
      }});
      setFormItem({ id_produto: "", tipo: "PERCENTUAL", valor: "" }); setAddItem(false);
      const it = await rpc("erp_promocao_itens_listar", { p_id_promocao: promoAtual.id });
      setItens(Array.isArray(it) ? it : []);
      notificar("Item adicionado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function removerItem(id) {
    try {
      await rpc("erp_promocao_item_excluir", { p_id: id });
      const it = await rpc("erp_promocao_itens_listar", { p_id_promocao: promoAtual.id });
      setItens(Array.isArray(it) ? it : []);
      notificar("Item removido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  async function excluirPromo() {
    if (!confirm("Excluir esta promoção e todos os seus itens?")) return;
    try {
      await rpc("erp_promocao_excluir", { p_id: promoAtual.id });
      setView("lista"); await carregar();
      notificar("Promoção excluída.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  const filtrados = lista.filter((p) => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (p.nome || "").toLowerCase().includes(q);
    if (fAtivo === "ativa") {
      const h = new Date().toISOString().slice(0, 10);
      return okB && p.ativo && h >= p.data_inicio && h <= p.data_fim;
    }
    if (fAtivo === "inativa") return okB && !p.ativo;
    return okB;
  });

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ═══ FORMULÁRIO ═══ */
  if (view === "form") {
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? "Editar Promoção" : "Nova Promoção"}</h1>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        <Secao titulo="Dados da Promoção">
          <Campo label="Nome *" span={2}>
            <input value={form.nome || ""} onChange={(e) => setF("nome", e.target.value)} style={inp(true)} placeholder="Ex: Black Friday 2026" />
          </Campo>
          <Campo label="Status">
            <select value={form.ativo ? "true" : "false"} onChange={(e) => setF("ativo", e.target.value === "true")} style={sel(true)}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </Campo>
          <Campo label="Data Início *">
            <input type="date" value={form.data_inicio || ""} onChange={(e) => setF("data_inicio", e.target.value)} style={inp(true)} />
          </Campo>
          <Campo label="Data Fim *">
            <input type="date" value={form.data_fim || ""} onChange={(e) => setF("data_fim", e.target.value)} style={inp(true)} />
          </Campo>
          <Campo label="Desc. adicional máx. %">
            <input type="number" step="0.01" value={form.desconto_adicional_maximo || 0} onChange={(e) => setF("desconto_adicional_maximo", Number(e.target.value))} style={inp(true)} />
          </Campo>
          <Campo label="Observação" span={3}>
            <textarea value={form.observacao || ""} onChange={(e) => setF("observacao", e.target.value)} rows={2} style={{ ...inp(true), height: "auto", resize: "vertical" }} />
          </Campo>
        </Secao>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : form.id ? "Salvar" : "Criar Promoção"}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ DETALHE ═══ */
  if (view === "detalhe" && promoAtual) {
    const podeEditar = perms.editar || perms.aprovar;
    const prodJaAdd = new Set(itens.map((i) => i.id_produto));
    const prodsDisp = produtos.filter((p) => !prodJaAdd.has(p.id));

    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <button onClick={() => { setView("lista"); carregar(); }} style={btnIcon()}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{promoAtual.nome}</h1>
              <StatusPromo promo={promoAtual} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
              {fmtData(promoAtual.data_inicio)} a {fmtData(promoAtual.data_fim)}
              {num(promoAtual.desconto_adicional_maximo) > 0 ? ` · Desc. adicional: até ${promoAtual.desconto_adicional_maximo}%` : " · Sem desconto adicional"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {podeEditar && <button onClick={() => { setForm({ ...promoAtual }); setErroForm(""); setView("form"); }} style={btnGhost()}><Pencil size={14} /> Editar</button>}
            {podeEditar && <button onClick={excluirPromo} style={{ ...btnGhost(), color: C.destructive, borderColor: C.destructive }}><Trash2 size={14} /> Excluir</button>}
          </div>
        </div>

        {promoAtual.observacao && <div style={{ fontSize: 13, color: C.muted, margin: "8px 0 16px", padding: "8px 12px", background: C.surface2, borderRadius: 8 }}>{promoAtual.observacao}</div>}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "16px 0" }}>
          <div style={cardStyle()}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Package size={13} /> Itens</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono }}>{itens.length}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} /> Vigência</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtData(promoAtual.data_inicio)} — {fmtData(promoAtual.data_fim)}</div>
          </div>
          <div style={cardStyle()}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Percent size={13} /> Desc. Adicional</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono }}>{promoAtual.desconto_adicional_maximo || 0}%</div>
          </div>
        </div>

        {/* Itens da promoção */}
        <div style={cardStyle()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Produtos em promoção ({itens.length})</span>
            {podeEditar && <button onClick={() => setAddItem(!addItem)} style={btnPrimary()}><Plus size={14} /> Adicionar produto</button>}
          </div>

          {addItem && (
            <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 150px 150px auto", gap: 10, alignItems: "end" }}>
                <Campo label="Produto">
                  <select value={formItem.id_produto} onChange={(e) => {
                    const p = produtos.find((x) => x.id === Number(e.target.value));
                    setFormItem((f) => ({ ...f, id_produto: e.target.value, valor: f.tipo === "PRECO_FIXO" && p ? p.preco_venda : f.valor }));
                  }} style={sel(true)}>
                    <option value="">Selecione...</option>
                    {prodsDisp.map((p) => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome} ({fmtBRL(p.preco_venda)})</option>)}
                  </select>
                </Campo>
                <Campo label="Tipo">
                  <select value={formItem.tipo} onChange={(e) => setFormItem((f) => ({ ...f, tipo: e.target.value }))} style={sel(true)}>
                    <option value="PERCENTUAL">% Desconto</option>
                    <option value="PRECO_FIXO">Preço fixo</option>
                  </select>
                </Campo>
                <Campo label={formItem.tipo === "PRECO_FIXO" ? "Preço promo (R$)" : "Desconto %"}>
                  <input type="number" step="0.01" value={formItem.valor} onChange={(e) => setFormItem((f) => ({ ...f, valor: e.target.value }))} style={{ ...inp(true), fontFamily: mono }} />
                </Campo>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={adicionarItem} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
                  <button onClick={() => setAddItem(false)} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
                </div>
              </div>
            </div>
          )}

          {itens.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
              <Tag size={28} style={{ opacity: 0.3 }} />
              <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum produto adicionado.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                {["Produto", "Tipo", "Valor Promo", "Preço Original", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 3)}>{h}</th>)}
              </tr></thead>
              <tbody>{itens.map((it) => (
                <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ ...td(), fontWeight: 500 }}>
                    {it.produto_nome}
                    {it.produto_referencia && <span style={{ color: C.muted, fontSize: 11, fontFamily: mono, marginLeft: 6 }}>{it.produto_referencia}</span>}
                  </td>
                  <td style={td()}>
                    <Badge texto={it.tipo === "PRECO_FIXO" ? "PREÇO FIXO" : "% DESCONTO"} cor={it.tipo === "PRECO_FIXO" ? "ABERTA" : "ATIVO"} />
                  </td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600, color: C.success }}>
                    {it.tipo === "PRECO_FIXO" ? fmtBRL(it.valor) : `${it.valor}%`}
                  </td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted, textDecoration: "line-through" }}>
                    {fmtBRL(it.preco_original)}
                  </td>
                  <td style={td()}>
                    {podeEditar && <button onClick={() => removerItem(it.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><Trash2 size={13} /></button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ═══ LISTA ═══ */
  const hoje = new Date().toISOString().slice(0, 10);
  const ativas = lista.filter((p) => p.ativo && hoje >= p.data_inicio && hoje <= p.data_fim).length;
  const proxVencer = lista.filter((p) => {
    if (!p.ativo || hoje > p.data_fim) return false;
    const diff = Math.ceil((new Date(p.data_fim + "T23:59:59") - new Date()) / 86400000);
    return diff <= 3 && diff >= 0;
  });

  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Promoções</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{ativas} ativa{ativas !== 1 ? "s" : ""} · {lista.length} total</p>
        </div>
        {(perms.incluir || perms.editar) && <button onClick={() => {
          setForm({ id: null, nome: "", data_inicio: hoje, data_fim: "", ativo: true, desconto_adicional_maximo: 0, observacao: "" });
          setErroForm(""); setView("form");
        }} style={btnPrimary()}><Plus size={16} /> Nova Promoção</button>}
      </div>

      {proxVencer.length > 0 && (
        <Aviso cor="warning">
          <AlertCircle size={16} /> {proxVencer.length} promoção(ões) encerram nos próximos 3 dias: {proxVencer.map((p) => p.nome).join(", ")}
        </Aviso>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar promoção..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fAtivo} onChange={(e) => setFAtivo(e.target.value)} style={sel()}>
          <option value="">Todas</option>
          <option value="ativa">Ativas agora</option>
          <option value="inativa">Inativas</option>
        </select>
      </div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 28, background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Tag size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma promoção encontrada.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
              <thead><tr>{["Nome", "Início", "Fim", "Desc. Adic.", "Status", ""].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((p) => (
                <tr key={p.id} onClick={() => abrirDetalhe(p)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <td style={{ ...td(), fontWeight: 600 }}>{p.nome}</td>
                  <td style={{ ...td(), color: C.muted }}>{fmtData(p.data_inicio)}</td>
                  <td style={{ ...td(), color: C.muted }}>{fmtData(p.data_fim)}</td>
                  <td style={{ ...td(), fontFamily: mono }}>{p.desconto_adicional_maximo || 0}%</td>
                  <td style={td()}><StatusPromo promo={p} /></td>
                  <td style={td()}><button onClick={(e) => { e.stopPropagation(); abrirDetalhe(p); }} style={btnIcon()}><Eye size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>
    </>
  );
}
