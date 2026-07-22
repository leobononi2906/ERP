import { useState, useEffect } from "react";
import { Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Settings, Star } from "lucide-react";
import { C, mono, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";

const VAZIO = () => ({
  id: null, descricao: "", mov_estoque: true, mov_financeiro: true, gera_nf: true,
  gera_comissao: false, contabiliza_lucro: false, padrao: false, ativo: true,
  id_natureza_dentro: "", id_natureza_fora: "",
  tipo: "SAIDA", atualiza_custo: false, id_centro_custo: "", id_categoria_despesa: "",
});

function Toggle({ label, value, onChange, disabled }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <div onClick={() => !disabled && onChange(!value)} style={{
        width: 36, height: 20, borderRadius: 10, background: value ? C.success : C.border,
        position: "relative", transition: "background 0.2s", cursor: disabled ? "not-allowed" : "pointer",
      }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: value ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <span style={{ fontSize: 13 }}>{label}</span>
    </label>
  );
}

export default function TiposOperacao({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.tipos_operacao) || {};
  const admin = perms.incluir;

  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [naturezas, setNaturezas] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [fTipo, setFTipo] = useState("");
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIO());
  const [saving, setSaving] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("tipos_operacao_dados");
      setLista(d.tipos_saida ?? []);
      setNaturezas(d.naturezas ?? []);
      setCentrosCusto(d.centros_custo ?? []);
      setPlanoContas(d.plano_contas ?? []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.descricao.trim()) { setErroForm("Descrição obrigatória."); return; }
    setErroForm(""); setSaving(true);
    try {
      const res = await rpc("tipos_saida_salvar", { p: { ...form, _ator: usuario.id } });
      if (res?.id) {
        await carregar();
        notificar(form.id ? "Tipo atualizado." : "Tipo criado.");
        setView("lista");
      }
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  /* ═══ FORMULÁRIO ═══ */
  if (view === "form") {
    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const natLabel = (id) => { const n = naturezas.find((x) => x.id === Number(id)); return n ? `${n.cfop} — ${n.descricao}` : ""; };
    return (
      <div>{ToastEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? "Editar Tipo de Operação" : "Novo Tipo de Operação"}</h1>
        </div>
        {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
        <Secao titulo="Dados">
          <Campo label="Tipo *">
            <div style={{ display: "flex", gap: 8 }}>
              {["SAIDA", "ENTRADA"].map(t => (
                <div key={t} onClick={() => setF("tipo", t)} style={{
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: form.tipo === t ? `2px solid ${t === "SAIDA" ? C.success : C.primary}` : `2px solid ${C.border}`,
                  background: form.tipo === t ? (t === "SAIDA" ? C.successBg : "rgba(0,170,238,0.08)") : "#fff",
                  color: form.tipo === t ? (t === "SAIDA" ? C.success : C.primary) : C.foreground,
                }}>
                  {t === "SAIDA" ? "Saída" : "Entrada"}
                </div>
              ))}
            </div>
          </Campo>
          <Campo label="Descrição *" span={1}>
            <input value={form.descricao} onChange={(e) => setF("descricao", e.target.value)} style={inp(true)} placeholder="Ex: Venda Normal" />
          </Campo>
          <Campo label="Status">
            <Toggle label={form.ativo ? "Ativo" : "Inativo"} value={form.ativo} onChange={(v) => setF("ativo", v)} />
          </Campo>
        </Secao>
        <Secao titulo="Comportamento">
          <Campo label=""><Toggle label="Movimenta Estoque" value={form.mov_estoque} onChange={(v) => setF("mov_estoque", v)} /></Campo>
          <Campo label=""><Toggle label="Movimenta Financeiro" value={form.mov_financeiro} onChange={(v) => setF("mov_financeiro", v)} /></Campo>
          <Campo label=""><Toggle label="Gera NF-e" value={form.gera_nf} onChange={(v) => setF("gera_nf", v)} /></Campo>
          <Campo label=""><Toggle label="Gera Comissão" value={form.gera_comissao} onChange={(v) => setF("gera_comissao", v)} /></Campo>
          <Campo label=""><Toggle label="Contabiliza Lucro" value={form.contabiliza_lucro} onChange={(v) => setF("contabiliza_lucro", v)} /></Campo>
          <Campo label=""><Toggle label="Tipo Padrão" value={form.padrao} onChange={(v) => setF("padrao", v)} /></Campo>
          {form.tipo === "ENTRADA" && (
            <Campo label=""><Toggle label="Atualiza Custo" value={form.atualiza_custo} onChange={(v) => setF("atualiza_custo", v)} /></Campo>
          )}
        </Secao>
        <Secao titulo="DRE / Contabilização">
          <Campo label="Centro de Custo">
            <select value={form.id_centro_custo || ""} onChange={(e) => setF("id_centro_custo", e.target.value)} style={sel(true)}>
              <option value="">— Nenhum —</option>
              {centrosCusto.map(cc => <option key={cc.id} value={cc.id}>{cc.codigo ? `${cc.codigo} — ` : ""}{cc.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Categoria de Despesa (Plano de Contas)">
            <select value={form.id_categoria_despesa || ""} onChange={(e) => setF("id_categoria_despesa", e.target.value)} style={sel(true)}>
              <option value="">— Nenhuma —</option>
              {planoContas.map(pc => <option key={pc.id} value={pc.id}>{pc.codigo ? `${pc.codigo} — ` : ""}{pc.descricao}</option>)}
            </select>
          </Campo>
        </Secao>
        <Secao titulo="Naturezas de Operação (CFOP)">
          <Campo label="Dentro do Estado" span={1}>
            <select value={form.id_natureza_dentro || ""} onChange={(e) => setF("id_natureza_dentro", e.target.value)} style={sel(true)}>
              <option value="">— Nenhuma —</option>
              {naturezas.map((n) => <option key={n.id} value={n.id}>{n.cfop} — {n.descricao}</option>)}
            </select>
          </Campo>
          <Campo label="Fora do Estado" span={1}>
            <select value={form.id_natureza_fora || ""} onChange={(e) => setF("id_natureza_fora", e.target.value)} style={sel(true)}>
              <option value="">— Nenhuma —</option>
              {naturezas.map((n) => <option key={n.id} value={n.id}>{n.cfop} — {n.descricao}</option>)}
            </select>
          </Campo>
        </Secao>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setView("lista")} style={btnGhost()}><X size={16} /> Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>
            <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  /* ═══ LISTA ═══ */
  const listaFiltrada = lista.filter(t => !fTipo || t.tipo === fTipo);

  const flagBadge = (val) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: val ? C.successBg : C.surface2, color: val ? C.success : C.textMuted }}>
      {val ? "SIM" : "NÃO"}
    </span>
  );

  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Tipos de Operação</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{listaFiltrada.length} de {lista.length} tipos</p></div>
        {admin && <button onClick={() => { setForm(VAZIO()); setErroForm(""); setView("form"); }} style={btnPrimary()}><Plus size={16} /> Novo Tipo</button>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={sel()}>
          <option value="">Todos</option>
          <option value="SAIDA">Saída</option>
          <option value="ENTRADA">Entrada</option>
        </select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : listaFiltrada.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Settings size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum tipo encontrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 750 }}>
              <thead><tr>{["Tipo", "Descrição", "Estoque", "Financeiro", "NF-e", "Comissão", "Padrão", "Status", ""].map((h) => <th key={h} style={th()}>{h}</th>)}</tr></thead>
              <tbody>{listaFiltrada.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={td()}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: t.tipo === "ENTRADA" ? "rgba(0,170,238,0.1)" : C.successBg, color: t.tipo === "ENTRADA" ? C.primary : C.success }}>
                      {t.tipo === "ENTRADA" ? "ENTRADA" : "SAÍDA"}
                    </span>
                  </td>
                  <td style={{ ...td(), fontWeight: 600 }}>
                    {t.descricao}
                    {t.padrao && <Star size={12} style={{ marginLeft: 6, color: C.warning, fill: C.warning }} />}
                  </td>
                  <td style={td()}>{flagBadge(t.mov_estoque)}</td>
                  <td style={td()}>{flagBadge(t.mov_financeiro)}</td>
                  <td style={td()}>{flagBadge(t.gera_nf)}</td>
                  <td style={td()}>{flagBadge(t.gera_comissao)}</td>
                  <td style={td()}>{t.padrao && <Star size={14} style={{ color: C.warning, fill: C.warning }} />}</td>
                  <td style={td()}><Badge texto={t.ativo ? "ATIVO" : "INATIVO"} /></td>
                  <td style={td()}>{admin && <button onClick={() => { setForm({ ...VAZIO(), ...t, id_centro_custo: t.id_centro_custo || "", id_categoria_despesa: t.id_categoria_despesa || "" }); setErroForm(""); setView("form"); }} style={btnIcon()}><Pencil size={14} /></button>}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>
    </>
  );
}
