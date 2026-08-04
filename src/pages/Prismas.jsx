import { useState, useEffect, useCallback } from "react";
import { Hash, Plus, Trash2, RefreshCw, Check, X } from "lucide-react";
import { C, mono, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton } from "../ui";

// Cadastro de Prismas — pool de números por vendedor (só o vendedor usa os dele).
export default function Prismas({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};
  const podeEditar = perms.incluir || perms.editar || usuario?.admin;

  const [vendedores, setVendedores] = useState([]);
  const [prismas, setPrismas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fVend, setFVend] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ id: null, numero: "", id_vendedor: "", ativo: true });

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  const carregar = useCallback(async () => {
    try {
      const d = await rpc("os_prismas_dados", { p_id_vendedor: null });
      setVendedores(Array.isArray(d?.vendedores) ? d.vendedores : []);
      setPrismas(Array.isArray(d?.prismas) ? d.prismas : []);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const limpar = () => setForm({ id: null, numero: "", id_vendedor: form.id_vendedor, ativo: true });

  async function salvar() {
    if (!podeEditar) return;
    if (!form.numero.trim()) { notificar("Informe o número.", "erro"); return; }
    if (!form.id_vendedor) { notificar("Selecione o vendedor.", "erro"); return; }
    setSaving(true);
    try {
      const r = await rpc("os_prisma_salvar", { p_id: form.id, p_numero: form.numero.trim(), p_id_vendedor: parseInt(form.id_vendedor), p_ativo: form.ativo });
      if (r && r.ok === false) { notificar(r.erro || "Não foi possível salvar.", "erro"); return; }
      notificar(form.id ? "Prisma atualizado." : "Prisma cadastrado.");
      limpar(); await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  async function excluir(p) {
    try {
      const r = await rpc("os_prisma_excluir", { p_id: p.id });
      if (r && r.ok === false) { notificar(r.erro || "Não foi possível excluir.", "erro"); return; }
      notificar("Prisma excluído.");
      if (form.id === p.id) limpar();
      await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  const filtrados = prismas.filter((p) => !fVend || String(p.id_vendedor) === fVend);

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.t === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{toast.m}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Prismas</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Números de prisma por vendedor — usados na abertura da OS e no pátio</p>
        </div>
        <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        {/* form */}
        {podeEditar && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: C.primary }}>
              <Hash size={16} /> <b style={{ fontSize: 14 }}>{form.id ? "Editar prisma" : "Novo prisma"}</b>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={lbl}>Vendedor</label>
                <select value={form.id_vendedor} onChange={(e) => setForm((f) => ({ ...f, id_vendedor: e.target.value }))} style={{ ...sel(), width: "100%" }}>
                  <option value="">Selecione...</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Número do prisma</label>
                <input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && salvar()} placeholder="Ex.: 15" style={{ ...inp(), width: "100%", fontFamily: mono, fontSize: 16 }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.foreground, cursor: "pointer" }}>
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} /> Ativo
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), flex: 1, justifyContent: "center", opacity: saving ? 0.6 : 1 }}><Plus size={14} /> {form.id ? "Salvar" : "Cadastrar"}</button>
                {form.id && <button onClick={limpar} style={btnGhost()}>Cancelar</button>}
              </div>
            </div>
          </div>
        )}

        {/* lista */}
        <div>
          <div style={{ marginBottom: 10 }}>
            <select value={fVend} onChange={(e) => setFVend(e.target.value)} style={sel()}>
              <option value="">Todos os vendedores</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={32} />)}</div>
            ) : filtrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted }}>
                <Hash size={28} style={{ opacity: 0.4 }} />
                <div style={{ marginTop: 8, fontSize: 13 }}>Nenhum prisma cadastrado.</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                  <thead><tr>{["Prisma", "Vendedor", "Ativo", "Em uso", "Ações"].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: p.em_uso ? "rgba(0,170,238,0.05)" : "transparent" }}>
                        <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, fontSize: 15, color: C.primary }}>{p.numero}</span></td>
                        <td style={td()}>{p.vendedor}</td>
                        <td style={td()}>{p.ativo ? <Check size={16} style={{ color: C.success }} /> : <X size={16} style={{ color: C.textMuted }} />}</td>
                        <td style={td()}>{p.em_uso ? <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>OS {p.os_numero}</span> : <span style={{ color: C.textMuted, fontSize: 12 }}>livre</span>}</td>
                        <td style={td()}>
                          {podeEditar && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => setForm({ id: p.id, numero: p.numero, id_vendedor: String(p.id_vendedor), ativo: p.ativo })} style={{ ...btnGhost(), padding: "5px 10px", fontSize: 12 }}>Editar</button>
                              {!p.em_uso && <button onClick={() => excluir(p)} title="Excluir" style={{ background: "none", border: "none", cursor: "pointer", color: C.destructive, padding: 4 }}><Trash2 size={15} /></button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
