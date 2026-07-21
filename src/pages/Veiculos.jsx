import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Lock, Truck } from "lucide-react";
import { C, mono, SUPA_URL, SUPA_KEY } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge, Skeleton } from "../ui";

const hdrs = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
const schemaHdr = { ...hdrs, "Accept-Profile": "Teste ERP", "Content-Profile": "Teste ERP" };

async function sbQ(t, q = "") { const r = await fetch(`${SUPA_URL}/rest/v1/${t}?${q}`, { headers: { ...schemaHdr, Range: "0-9999" } }); if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.json(); }
async function sbInsert(t, row) { const r = await fetch(`${SUPA_URL}/rest/v1/${t}`, { method: "POST", headers: schemaHdr, body: JSON.stringify(row) }); if (!r.ok) { const x = await r.text(); throw new Error(x); } return r.json(); }
async function sbUpdate(t, id, row) { const r = await fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`, { method: "PATCH", headers: schemaHdr, body: JSON.stringify(row) }); if (!r.ok) { const x = await r.text(); throw new Error(x); } return r.json(); }

const PERMS = {
  Administrador: { incluir: true, editar: true }, Gestor: { incluir: true, editar: true },
  "Vendedor Loja": { incluir: true, editar: true }, Estoque: { incluir: false, editar: false },
  Financeiro: { incluir: false, editar: false },
};

const VAZIO = () => ({ id: null, placa: "", marca: "", modelo: "", cor: "", ano_fabricacao: "", ano_modelo: "", chassi: "", renavam: "", km_atual: "", combustivel: "", id_cliente: "", observacao: "", ativo: true });

export default function Veiculos({ simGrupo }) {
  const perms = PERMS[simGrupo] || PERMS.Administrador;
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(VAZIO());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [busca, setBusca] = useState("");

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    let ok = true;
    Promise.all([
      sbQ("veiculos", "order=placa"),
      sbQ("clientes", "select=id,nome&order=nome"),
    ]).then(([v, c]) => { if (ok) { setLista(Array.isArray(v) ? v : []); setClientes(Array.isArray(c) ? c : []); } })
      .catch(() => {}).finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  const nomeCliente = (id) => (clientes.find((c) => c.id === id) || {}).nome || "—";
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.placa.trim()) { setErroForm("A placa é obrigatória."); return; }
    setErroForm(""); setSaving(true);
    const payload = {
      placa: form.placa.toUpperCase().trim(),
      marca: form.marca || null, modelo: form.modelo || null, cor: form.cor || null,
      ano_fabricacao: Number(form.ano_fabricacao) || null, ano_modelo: Number(form.ano_modelo) || null,
      chassi: form.chassi || null, renavam: form.renavam || null,
      km_atual: Number(form.km_atual) || 0, combustivel: form.combustivel || null,
      id_cliente: Number(form.id_cliente) || null, observacao: form.observacao || null,
      ativo: form.ativo !== false,
    };
    try {
      let res;
      if (form.id) { res = await sbUpdate("veiculos", form.id, payload); }
      else { res = await sbInsert("veiculos", payload); }
      const saved = Array.isArray(res) ? res[0] : res;
      setLista((l) => { const sem = l.filter((x) => x.id !== saved.id); return [...sem, saved].sort((a, b) => (a.placa || "").localeCompare(b.placa || "")); });
      notificar(form.id ? "Veículo atualizado." : "Veículo cadastrado.");
      setView("lista");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  const filtrados = lista.filter((v) => {
    const q = busca.trim().toLowerCase();
    return !q || (v.placa || "").toLowerCase().includes(q) || (v.marca || "").toLowerCase().includes(q) || (v.modelo || "").toLowerCase().includes(q) || nomeCliente(v.id_cliente).toLowerCase().includes(q);
  });

  const ToastEl = toast && (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {toast.tipo === "erro" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
    </div>
  );

  if (view === "form") return (
    <div>
      {ToastEl}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("lista")} style={btnIcon()}><ArrowLeft size={16} /></button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.id ? "Editar Veículo" : "Novo Veículo"}</h1>
      </div>
      {erroForm && <Aviso cor="destructive"><AlertCircle size={16} /> {erroForm}</Aviso>}
      <Secao titulo="Dados do Veículo">
        <Campo label="Placa *"><input value={form.placa} onChange={(e) => setF("placa", e.target.value.toUpperCase())} maxLength={8} style={inp(true)} /></Campo>
        <Campo label="Renavam"><input value={form.renavam} onChange={(e) => setF("renavam", e.target.value)} style={inp(true)} /></Campo>
        <Campo label="Marca"><input value={form.marca} onChange={(e) => setF("marca", e.target.value)} placeholder="Ex: Mercedes-Benz" style={inp(true)} /></Campo>
        <Campo label="Modelo"><input value={form.modelo} onChange={(e) => setF("modelo", e.target.value)} placeholder="Ex: Actros 2651" style={inp(true)} /></Campo>
        <Campo label="Cor"><input value={form.cor} onChange={(e) => setF("cor", e.target.value)} style={inp(true)} /></Campo>
        <Campo label="Ano Fab."><input value={form.ano_fabricacao} onChange={(e) => setF("ano_fabricacao", e.target.value)} inputMode="numeric" maxLength={4} style={inp(true)} /></Campo>
        <Campo label="Ano Mod."><input value={form.ano_modelo} onChange={(e) => setF("ano_modelo", e.target.value)} inputMode="numeric" maxLength={4} style={inp(true)} /></Campo>
        <Campo label="Chassi"><input value={form.chassi} onChange={(e) => setF("chassi", e.target.value)} style={inp(true)} /></Campo>
        <Campo label="KM Atual"><input value={form.km_atual} onChange={(e) => setF("km_atual", e.target.value)} inputMode="numeric" style={inp(true)} /></Campo>
      </Secao>
      <Secao titulo="Vínculo">
        <Campo label="Cliente" span={2}>
          <select value={form.id_cliente} onChange={(e) => setF("id_cliente", e.target.value)} style={sel(true)}>
            <option value="">Nenhum</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Combustível">
          <select value={form.combustivel} onChange={(e) => setF("combustivel", e.target.value)} style={sel(true)}>
            <option value="">—</option>
            {["DIESEL", "GASOLINA", "ETANOL", "FLEX", "GNV", "ELETRICO"].map((c) => <option key={c} value={c}>{c}</option>)}
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

  return (
    <>
      {ToastEl}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Veículos</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} registros</p></div>
        {perms.incluir && <button onClick={() => { setForm(VAZIO()); setErroForm(""); setView("form"); }} style={btnPrimary()}><Plus size={16} /> Novo veículo</button>}
      </div>
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 400 }}>
        <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar placa, marca, modelo ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={28} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Truck size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum veículo encontrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead><tr>{["Placa", "Marca", "Modelo", "Cor", "Ano", "Cliente", "KM", ""].map((h, i) => <th key={i} style={th(i === 6)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((v) => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, fontSize: 14, color: C.primary }}>{v.placa || "—"}</span></td>
                  <td style={{ ...td(), fontWeight: 500 }}>{v.marca || "—"}</td>
                  <td style={td()}>{v.modelo || "—"}</td>
                  <td style={td()}>{v.cor || "—"}</td>
                  <td style={td()}>{v.ano_fabricacao || "—"}{v.ano_modelo ? `/${v.ano_modelo}` : ""}</td>
                  <td style={{ ...td(), color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeCliente(v.id_cliente)}</td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{v.km_atual ? Number(v.km_atual).toLocaleString("pt-BR") : "—"}</td>
                  <td style={td()}>{perms.editar && <button onClick={() => { setForm({ ...VAZIO(), ...v }); setErroForm(""); setView("form"); }} style={btnIcon()}><Pencil size={14} /></button>}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </div>
    </>
  );
}
