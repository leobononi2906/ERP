import { useState, useEffect } from "react";
import { Search, Plus, Pencil, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Lock, ShieldCheck, Eye, Users } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge } from "../ui";
const TIPOS = ["CLIENTE", "FORNECEDOR", "AMBOS", "FUNCIONARIO", "TRANSPORTADORA"];
const SITUACOES = ["ATIVO", "INATIVO", "BLOQUEADO"];
const IND_IE = [{ v: 1, t: "1 - Contribuinte ICMS" }, { v: 2, t: "2 - Contribuinte isento" }, { v: 9, t: "9 - Não contribuinte" }];

function mascaraDoc(v, pessoa) {
  const d = (v || "").replace(/\D/g, "");
  if (pessoa === "F") return d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
const vazio = () => ({ id: null, tipo_pessoa: "J", tipo: "CLIENTE", nome: "", nome_fantasia: "", cpf_cnpj: "", rg_ie: "", inscricao_municipal: "", email: "", telefone: "", celular: "", whatsapp: "", cep: "", endereco: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", limite_credito: "", situacao: "ATIVO", id_empresa: "", observacao: "", indicador_ie: 9, inscricao_suframa: "", iss_retido: false, email_nfe: "" });

export default function Clientes({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.clientes) || {};
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [view, setView] = useState("lista");
  const [form, setForm] = useState(vazio());
  const [fisc, setFisc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [erroForm, setErroForm] = useState("");
  const [busca, setBusca] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");

  useEffect(() => {
    let a = true;
    rpc("clientes_dados").then((j) => { if (a && j && j.clientes) { setClientes(j.clientes); setEmpresas(j.empresas || []); setLive(true); } }).catch(() => { }).finally(() => a && setLoading(false));
    return () => { a = false; };
  }, []);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };
  const abrirNovo = () => { setForm(vazio()); setFisc(false); setErroForm(""); setView("form"); };
  const abrirEditar = (c) => { setForm({ ...vazio(), ...c }); setFisc(false); setErroForm(""); setView("form"); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function buscarCep() {
    const cep = (form.cep || "").replace(/\D/g, ""); if (cep.length !== 8) return;
    try { const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json(); if (!d.erro) setForm((f) => ({ ...f, endereco: d.logradouro || f.endereco, bairro: d.bairro || f.bairro, cidade: d.localidade || f.cidade, uf: d.uf || f.uf })); } catch (e) { }
  }
  async function salvar() {
    if (!form.nome.trim()) { setErroForm("O nome / razão social é obrigatório."); return; }
    setErroForm(""); setSaving(true);
    const empNome = empresas.find((e) => String(e.id) === String(form.id_empresa))?.nome_fantasia || null;
    const salvo = { ...form, empresa_nome: empNome };
    try {
      const row = await rpc("cliente_salvar", { p: { ...form, _ator: usuario.id } });
      salvo.id = row.id || form.id; aplicar(salvo);
      notificar(form.id ? "Cliente atualizado — registrado na auditoria." : "Cliente cadastrado.");
    } catch (e) { if (!salvo.id) salvo.id = Math.max(0, ...clientes.map((c) => c.id)) + 1; aplicar(salvo); notificar("Salvo localmente (demo — sem conexão).", "warn"); }
    finally { setSaving(false); setView("lista"); }
  }
  const aplicar = (c) => setClientes((l) => l.some((x) => x.id === c.id) ? l.map((x) => x.id === c.id ? c : x) : [...l, c]);

  const filtrados = clientes.filter((c) => { const q = busca.trim().toLowerCase(); const okB = !q || (c.nome || "").toLowerCase().includes(q) || (c.nome_fantasia || "").toLowerCase().includes(q) || (c.cpf_cnpj || "").includes(q); return okB && (!fEmpresa || String(c.id_empresa) === fEmpresa); });

  if (view === "form") return <FormCliente form={form} setF={setF} empresas={empresas} salvar={salvar} saving={saving} voltar={() => setView("lista")} erro={erroForm} buscarCep={buscarCep} perms={perms} fisc={fisc} destravar={() => setFisc(true)} toast={toast} />;

  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Clientes</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} de {clientes.length} · {usuario.nome} · {live ? "ao vivo" : "demo"}</p></div>
        {perms.incluir ? <button onClick={abrirNovo} style={btnPrimary()}><Plus size={16} /> Novo cliente</button> : <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Sem permissão para incluir</span>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas as empresas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ height: 28, background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Users size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum cliente encontrado.</div></div>
            : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead><tr>{["Cliente", "CNPJ / CPF", "Cidade", "Empresa", "Limite", "Situação", ""].map((h, i) => <th key={i} style={th(i === 4)}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((c) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }} onMouseEnter={(e) => e.currentTarget.style.background = C.surface2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={td()}><div style={{ fontWeight: 500 }}>{c.nome_fantasia || c.nome}</div><div style={{ fontSize: 11, color: C.textMuted }}>{c.nome}</div></td>
                  <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{c.cpf_cnpj || "—"}</td>
                  <td style={td()}>{c.cidade || "—"}{c.uf ? "/" + c.uf : ""}</td>
                  <td style={td()}><span style={{ fontSize: 11, background: C.bluePale, color: C.blueMid, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{c.empresa_nome || "—"}</span></td>
                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(c.limite_credito)}</td>
                  <td style={td()}><Badge texto={c.situacao} /></td>
                  <td style={{ ...td(), textAlign: "right" }}><button onClick={() => abrirEditar(c)} style={btnIcon()}>{(perms.editar || perms.aprovar) ? <Pencil size={15} /> : <Eye size={15} />}</button></td>
                </tr>))}</tbody>
            </table></div>}
      </div>
    </>
  );
}

function Toast({ toast }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "warn" ? C.warningBg : C.successBg, color: toast.tipo === "warn" ? C.warning : C.success }}>{toast.tipo === "warn" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{toast.msg}</div>;
}

function FormCliente({ form, setF, empresas, salvar, saving, voltar, erro, buscarCep, perms, fisc, destravar, toast }) {
  const pf = form.tipo_pessoa === "F"; const novo = !form.id;
  const cadOk = novo ? perms.incluir : perms.editar;
  const fiscOk = novo ? perms.incluir : (fisc && perms.aprovar);
  const podeSalvar = cadOk || fiscOk;
  return (
    <>
      {toast && <Toast toast={toast} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={voltar} style={btnIcon()}><ArrowLeft size={18} /></button>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{novo ? "Novo cliente" : "Editar cliente"}</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{novo ? "Preencha os dados" : form.nome}</p></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><button onClick={voltar} style={btnGhost()}><X size={16} /> {podeSalvar ? "Cancelar" : "Voltar"}</button>{podeSalvar && <button onClick={salvar} disabled={saving} style={btnPrimary()}><Save size={16} /> {saving ? "Salvando..." : "Salvar"}</button>}</div>
      </div>
      {erro && <Aviso cor="destructive">{erro}</Aviso>}
      {!novo && !cadOk && !fiscOk && <Aviso cor="muted"><Eye size={15} /> Modo leitura. Seu grupo não tem permissão para alterar este cliente.</Aviso>}

      <Secao titulo="Dados cadastrais">
        <Campo label="Nome fantasia"><input value={form.nome_fantasia} onChange={(e) => setF("nome_fantasia", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="E-mail"><input value={form.email} onChange={(e) => setF("email", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Telefone"><input value={form.telefone} onChange={(e) => setF("telefone", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Celular"><input value={form.celular} onChange={(e) => setF("celular", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="WhatsApp"><input value={form.whatsapp} onChange={(e) => setF("whatsapp", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="CEP"><input value={form.cep} onChange={(e) => setF("cep", e.target.value)} onBlur={buscarCep} disabled={!cadOk} placeholder="00000-000" style={{ ...inp(true, !cadOk), fontFamily: mono }} /></Campo>
        <Campo label="Endereço" span={2}><input value={form.endereco} onChange={(e) => setF("endereco", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Número"><input value={form.numero} onChange={(e) => setF("numero", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Bairro"><input value={form.bairro} onChange={(e) => setF("bairro", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Cidade"><input value={form.cidade} onChange={(e) => setF("cidade", e.target.value)} disabled={!cadOk} style={inp(true, !cadOk)} /></Campo>
        <Campo label="UF"><input value={form.uf} onChange={(e) => setF("uf", e.target.value.toUpperCase().slice(0, 2))} disabled={!cadOk} maxLength={2} style={inp(true, !cadOk)} /></Campo>
        <Campo label="Observações" span={3}><textarea value={form.observacao} onChange={(e) => setF("observacao", e.target.value)} disabled={!cadOk} rows={2} style={{ ...inp(true, !cadOk), resize: "vertical", height: "auto", paddingTop: 10 }} /></Campo>
      </Secao>

      <div style={{ ...cardStyle(), marginBottom: 16, borderLeft: `3px solid ${fiscOk ? C.blueMid : C.warning}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: fiscOk ? C.blueMid : C.warning, display: "flex", alignItems: "center", gap: 6 }}>{fiscOk ? <ShieldCheck size={14} /> : <Lock size={14} />} Dados fiscais e financeiros</div>
          {!novo && !fiscOk && (perms.aprovar ? <button onClick={destravar} style={{ ...btnGhost(), color: C.blueMid, borderColor: C.blueMid }}><Lock size={14} /> Editar dados fiscais</button> : <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Lock size={14} /> Requer permissão de aprovação</span>)}
        </div>
        {!novo && fiscOk && <Aviso cor="warning"><AlertCircle size={15} /> Alterações aqui serão registradas na auditoria (quem, quando, de/para).</Aviso>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <Campo label="Tipo de pessoa"><select value={form.tipo_pessoa} onChange={(e) => setF("tipo_pessoa", e.target.value)} disabled={!fiscOk} style={sel(true, !fiscOk)}><option value="J">Jurídica</option><option value="F">Física</option></select></Campo>
          <Campo label={pf ? "Nome completo *" : "Razão social *"} span={2}><input value={form.nome} onChange={(e) => setF("nome", e.target.value)} disabled={!fiscOk} style={inp(true, !fiscOk)} /></Campo>
          <Campo label={pf ? "CPF" : "CNPJ"}><input value={form.cpf_cnpj} onChange={(e) => setF("cpf_cnpj", mascaraDoc(e.target.value, form.tipo_pessoa))} disabled={!fiscOk} style={{ ...inp(true, !fiscOk), fontFamily: mono }} /></Campo>
          <Campo label={pf ? "RG" : "Inscrição estadual"}><input value={form.rg_ie} onChange={(e) => setF("rg_ie", e.target.value)} disabled={!fiscOk} style={inp(true, !fiscOk)} /></Campo>
          <Campo label="Inscrição municipal"><input value={form.inscricao_municipal} onChange={(e) => setF("inscricao_municipal", e.target.value)} disabled={!fiscOk} style={inp(true, !fiscOk)} /></Campo>
          <Campo label="Indicador de IE" span={2}><select value={form.indicador_ie} onChange={(e) => setF("indicador_ie", Number(e.target.value))} disabled={!fiscOk} style={sel(true, !fiscOk)}>{IND_IE.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select></Campo>
          <Campo label="Inscrição SUFRAMA"><input value={form.inscricao_suframa} onChange={(e) => setF("inscricao_suframa", e.target.value)} disabled={!fiscOk} style={inp(true, !fiscOk)} /></Campo>
          <Campo label="E-mail para NF-e"><input value={form.email_nfe} onChange={(e) => setF("email_nfe", e.target.value)} disabled={!fiscOk} style={inp(true, !fiscOk)} /></Campo>
          <Campo label="ISS retido"><label style={{ display: "flex", alignItems: "center", gap: 8, height: 40, opacity: fiscOk ? 1 : 0.6 }}><input type="checkbox" checked={!!form.iss_retido} onChange={(e) => setF("iss_retido", e.target.checked)} disabled={!fiscOk} style={{ width: 16, height: 16, accentColor: C.primary }} /><span style={{ fontSize: 13, color: C.muted }}>Retém ISS</span></label></Campo>
          <Campo label="Empresa do grupo"><select value={form.id_empresa} onChange={(e) => setF("id_empresa", e.target.value)} disabled={!fiscOk} style={sel(true, !fiscOk)}><option value="">Selecione...</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select></Campo>
          <Campo label="Limite de crédito (R$)"><input value={form.limite_credito} onChange={(e) => setF("limite_credito", e.target.value.replace(/[^\d.,]/g, ""))} disabled={!fiscOk} style={{ ...inp(true, !fiscOk), fontFamily: mono }} /></Campo>
          <Campo label="Situação"><select value={form.situacao} onChange={(e) => setF("situacao", e.target.value)} disabled={!fiscOk} style={sel(true, !fiscOk)}>{SITUACOES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Campo>
        </div>
      </div>
    </>
  );
}
