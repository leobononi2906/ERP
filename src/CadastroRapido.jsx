import { useState, useEffect, useRef } from "react";
import { X, Search, UserPlus, Loader2, Car } from "lucide-react";
import { C, rpc } from "./config";
import { inp, sel, btnPrimary, btnGhost, Campo } from "./ui";

const soDig = (s) => (s || "").replace(/\D/g, "");

// Cadastro rápido de cliente SEM sair da OS/Venda. Reusa cliente_salvar + busca CNPJ (BrasilAPI).
// Ao salvar, devolve o cliente criado (onCreated) pra tela já selecioná-lo.
export function NovoClienteModal({ aberto, onClose, onCreated, idEmpresa, usuario, empresas = [] }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [erro, setErro] = useState("");
  const primeiroRef = useRef(null);

  useEffect(() => {
    if (aberto) {
      setForm({ tipo_pessoa: "J", tipo: "CLIENTE", nome: "", nome_fantasia: "", cpf_cnpj: "", telefone: "", celular: "", email: "", id_empresa: idEmpresa || "", situacao: "ATIVO" });
      setErro(""); setTimeout(() => primeiroRef.current?.focus(), 40);
    }
  }, [aberto, idEmpresa]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [aberto, onClose]);

  if (!aberto || !form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pj = form.tipo_pessoa === "J";

  async function buscarCnpj() {
    const c = soDig(form.cpf_cnpj);
    if (c.length !== 14) { setErro("Digite o CNPJ completo para buscar."); return; }
    setBuscandoCnpj(true); setErro("");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`);
      if (!r.ok) throw new Error("não encontrado");
      const d = await r.json();
      setForm((f) => ({ ...f, nome: f.nome || d.razao_social || "", nome_fantasia: d.nome_fantasia || f.nome_fantasia, email: f.email || d.email || "", telefone: f.telefone || (d.ddd_telefone_1 || ""), cidade: d.municipio, uf: d.uf, cep: soDig(String(d.cep || "")), endereco: d.logradouro, numero: d.numero, bairro: d.bairro }));
    } catch { setErro("CNPJ não encontrado — preencha manualmente."); }
    finally { setBuscandoCnpj(false); }
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("Informe o nome / razão social."); return; }
    setSaving(true); setErro("");
    try {
      const empNome = empresas.find((e) => String(e.id) === String(form.id_empresa))?.nome_fantasia || null;
      const row = await rpc("cliente_salvar", { p: { ...form, _ator: usuario?.id } });
      onCreated({ ...form, id: row?.id, empresa_nome: empNome });
      onClose();
    } catch (e) { setErro("Erro ao salvar: " + (e.message || e)); setSaving(false); }
  }

  return (
    <div style={ovl} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <UserPlus size={18} style={{ color: C.primary }} />
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Novo cliente</h2>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}><b>Esc</b> volta</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          {["J", "F"].map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="radio" checked={form.tipo_pessoa === t} onChange={() => set("tipo_pessoa", t)} /> {t === "J" ? "Pessoa Jurídica" : "Pessoa Física"}
            </label>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
          <Campo label={pj ? "CNPJ" : "CPF"}><input ref={primeiroRef} value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} style={inp(true)} /></Campo>
          {pj && <button onClick={buscarCnpj} disabled={buscandoCnpj} style={{ ...btnGhost(), height: 40 }}>{buscandoCnpj ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Buscar</button>}
        </div>

        <Campo label="Nome / Razão social *"><input value={form.nome} onChange={(e) => set("nome", e.target.value)} style={inp(true)} /></Campo>
        {pj && <div style={{ marginTop: 10 }}><Campo label="Nome fantasia"><input value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} style={inp(true)} /></Campo></div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <Campo label="Telefone"><input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} style={inp(true)} /></Campo>
          <Campo label="E-mail"><input value={form.email} onChange={(e) => set("email", e.target.value)} style={inp(true)} /></Campo>
        </div>
        <div style={{ marginTop: 10 }}>
          <Campo label="Empresa do grupo">
            <select value={form.id_empresa} onChange={(e) => set("id_empresa", e.target.value)} style={sel(true)}>
              <option value="">Selecione...</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
            </select>
          </Campo>
        </div>

        {erro && <div style={{ marginTop: 10, fontSize: 12.5, color: C.destructive }}>{erro}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={btnGhost()}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar e selecionar"}</button>
        </div>
      </div>
    </div>
  );
}

const ovl = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9991, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "7vh" };
const box = { background: C.card, borderRadius: 14, padding: 22, width: 560, maxWidth: "94vw", maxHeight: "86vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" };

// ─── Veículo ───────────────────────────────────────────────
const RE_PLACA = /^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$/;
const mascaraPlaca = (v) => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
const placaValida = (v) => RE_PLACA.test(mascaraPlaca(v));

// Cadastro rápido de veículo SEM sair da OS. Vinculado ao cliente já selecionado na OS.
export function NovoVeiculoModal({ aberto, onClose, onCreated, idCliente, clienteNome, usuario }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (aberto) { setForm({ placa: "", marca: "", modelo: "", cor: "", ano_modelo: "", id_cliente: idCliente || "" }); setErro(""); setTimeout(() => ref.current?.focus(), 40); }
  }, [aberto, idCliente]);
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [aberto, onClose]);

  if (!aberto || !form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!idCliente) { setErro("Selecione o cliente na OS antes de cadastrar o veículo."); return; }
    if (!placaValida(form.placa)) { setErro("Placa inválida (ABC1234 ou Mercosul ABC1D23)."); return; }
    setSaving(true); setErro("");
    try {
      const saved = await rpc("veiculo_salvar", { p: { ...form, placa: mascaraPlaca(form.placa), id_cliente: Number(idCliente), _ator: usuario?.id } });
      onCreated(saved && saved.id ? saved : { ...form, id: saved?.id, placa: mascaraPlaca(form.placa), id_cliente: Number(idCliente) });
      onClose();
    } catch (e) { setErro("Erro ao salvar: " + (e.message || e)); setSaving(false); }
  }

  return (
    <div style={ovl} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Car size={18} style={{ color: C.primary }} />
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Novo veículo</h2>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}><b>Esc</b> volta</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted }}><X size={18} /></button>
        </div>
        {clienteNome && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Cliente: <b>{clienteNome}</b></div>}

        <Campo label="Placa *"><input ref={ref} value={form.placa} onChange={(e) => set("placa", mascaraPlaca(e.target.value))} maxLength={7} placeholder="ABC1D23" style={{ ...inp(true), fontFamily: "monospace", fontWeight: 700, borderColor: form.placa && !placaValida(form.placa) ? C.destructive : undefined }} /></Campo>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <Campo label="Marca"><input value={form.marca} onChange={(e) => set("marca", e.target.value)} style={inp(true)} /></Campo>
          <Campo label="Modelo"><input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} style={inp(true)} /></Campo>
          <Campo label="Cor"><input value={form.cor} onChange={(e) => set("cor", e.target.value)} style={inp(true)} /></Campo>
          <Campo label="Ano modelo"><input value={form.ano_modelo} onChange={(e) => set("ano_modelo", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" style={inp(true)} /></Campo>
        </div>

        {erro && <div style={{ marginTop: 10, fontSize: 12.5, color: C.destructive }}>{erro}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={btnGhost()}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando..." : "Salvar e selecionar"}</button>
        </div>
      </div>
    </div>
  );
}
