import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Save, X, AlertCircle, CheckCircle2, Trash2, Tag } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Campo, Badge, Skeleton } from "../ui";

const VAZIO = { id: null, id_cliente: "", id_produto: "", preco: "", observacao: "" };

export default function PrecosEspeciais({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.produtos) || {};

  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...VAZIO });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  async function carregar() {
    setLoading(true);
    try {
      const [precos, aux] = await Promise.all([
        rpc("erp_preco_cliente_listar", {}),
        rpc("precos_especiais_dados"),
      ]);
      setLista(Array.isArray(precos) ? precos : []);
      setClientes(aux.clientes ?? []);
      setProdutos(aux.produtos ?? []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.id && (!form.id_cliente || !form.id_produto)) { notificar("Selecione cliente e produto.", "erro"); return; }
    if (!num(form.preco)) { notificar("Informe o preço.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("erp_preco_cliente_salvar", {
        p_id: form.id || null,
        p_id_cliente: num(form.id_cliente) || null,
        p_id_produto: num(form.id_produto) || null,
        p_preco: num(form.preco),
        p_observacao: form.observacao || null,
        p_id_usuario: usuario.id,
      });
      setForm({ ...VAZIO }); setAddOpen(false);
      await carregar();
      notificar("Preço especial salvo.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function excluir(id) {
    if (!window.confirm("Remover este preço especial? O cliente volta ao preço da tabela/geral.")) return;
    try {
      await rpc("erp_preco_cliente_excluir", { p_id: id, p_id_usuario: usuario.id });
      setLista((l) => l.filter((x) => x.id !== id));
      notificar("Preço especial removido.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  const filtrados = lista.filter((x) => {
    const q = busca.trim().toLowerCase();
    return !q || (x.cliente || "").toLowerCase().includes(q) || (x.produto || "").toLowerCase().includes(q) || (x.referencia || "").toLowerCase().includes(q);
  });

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  return (
    <>{ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Preços Especiais</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Preço fixo por cliente + produto — vale acima da tabela de preço</p>
        </div>
        {perms.editar && <button onClick={() => { setForm({ ...VAZIO }); setAddOpen(!addOpen); }} style={btnPrimary()}><Plus size={16} /> Novo Preço Especial</button>}
      </div>

      {addOpen && (
        <div style={{ ...cardStyle(), marginBottom: 14, background: C.surface2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr auto", gap: 10, alignItems: "end" }}>
            <Campo label="Cliente *">
              <select value={form.id_cliente} onChange={(e) => setForm((f) => ({ ...f, id_cliente: e.target.value }))} disabled={!!form.id} style={sel(true, !!form.id)}>
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Produto *">
              <select value={form.id_produto} onChange={(e) => {
                const p = produtos.find((x) => x.id === Number(e.target.value));
                setForm((f) => ({ ...f, id_produto: e.target.value, preco: f.preco || (p ? p.preco_venda : "") }));
              }} disabled={!!form.id} style={sel(true, !!form.id)}>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Preço *"><input value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} inputMode="decimal" style={inp(true)} /></Campo>
            <Campo label="Observação"><input value={form.observacao || ""} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} style={inp(true)} /></Campo>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), padding: "10px 12px" }}><Save size={14} /></button>
              <button onClick={() => { setAddOpen(false); setForm({ ...VAZIO }); }} style={{ ...btnGhost(), padding: "10px 12px" }}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, produto ou referência..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
      </div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Tag size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum preço especial cadastrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead><tr>{["Cliente", "Produto", "Preço Especial", "Preço Geral", "Diferença", "Situação", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 4)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((x) => {
                const dif = num(x.preco) - num(x.preco_geral);
                return (
                  <tr key={x.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.cliente}</td>
                    <td style={{ ...td(), maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.referencia ? <span style={{ fontFamily: mono, color: C.muted, marginRight: 6 }}>{x.referencia}</span> : null}{x.produto}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: C.primary }}>{fmtBRL(x.preco)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted }}>{fmtBRL(x.preco_geral)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: dif < 0 ? C.destructive : C.success }}>{dif === 0 ? "—" : (dif > 0 ? "+" : "") + fmtBRL(dif)}</td>
                    <td style={td()}><Badge texto={x.ativo === false ? "INATIVO" : "ATIVO"} /></td>
                    <td style={{ ...td(), whiteSpace: "nowrap" }}>
                      {perms.editar && <>
                        <button onClick={() => { setForm({ id: x.id, id_cliente: x.id_cliente, id_produto: x.id_produto, preco: x.preco, observacao: x.observacao || "" }); setAddOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={btnIcon()} title="Editar"><Pencil size={13} /></button>
                        <button onClick={() => excluir(x.id)} style={{ ...btnIcon(), color: C.destructive, marginLeft: 4 }} title="Remover"><Trash2 size={13} /></button>
                      </>}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table></div>}
      </div>
    </>
  );
}
