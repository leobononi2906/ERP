import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Save, Plus, Wallet, X, Trash2, Star, ShieldAlert, Check } from "lucide-react";
import { C, rpc } from "../config";
import { cardStyle, inp, btnPrimary, btnGhost, Campo, Skeleton, Badge } from "../ui";

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };

// Perfis de pagamento: definem quais formas/condições um cliente pode usar.
// Regra de autonomia: perfil só com formas à vista (usa_limite_credito=false) NÃO exige financeiro.
// Se inclui crédito/prazo, exige liberação do financeiro (sino). Cliente novo nasce com o perfil padrão.
export default function ConfigPagamento({ usuario }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [validade, setValidade] = useState(90);
  const [savingVal, setSavingVal] = useState(false);
  const [modal, setModal] = useState(null); // perfil em edição

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await rpc("erp_perfis_pagamento_dados", {});
      setDados(d); setValidade(d?.validade_dias ?? 90);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function salvarValidade() {
    setSavingVal(true);
    try {
      await rpc("erp_config_salvar", { p_chave: "credito_validade_consulta_dias", p_valor: String(Number(validade) || 90), p_id_usuario: usuario?.id });
      notificar("Validade da consulta de crédito salva.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSavingVal(false); }
  }

  async function excluir(p) {
    if (!window.confirm(`Excluir o perfil "${p.nome}"?`)) return;
    try {
      const r = await rpc("erp_perfil_pagamento_excluir", { p_id: p.id });
      if (r?.ok === false) { notificar(r.msg, "erro"); return; }
      notificar("Perfil excluído."); await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  const formas = dados?.formas || [];
  const condicoes = dados?.condicoes || [];
  const perfis = dados?.perfis || [];

  const fMap = useMemo(() => Object.fromEntries(formas.map((f) => [f.id, f])), [formas]);
  const cMap = useMemo(() => Object.fromEntries(condicoes.map((c) => [c.id, c])), [condicoes]);

  if (loading) return <div style={{ padding: 20 }}><Skeleton h={40} /><div style={{ height: 12 }} /><Skeleton h={200} /></div>;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Wallet size={22} style={{ color: C.primary }} />
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800 }}>Perfis de Pagamento</h1>
          <div style={{ fontSize: 12.5, color: C.muted }}>Definem o que cada cliente pode usar. À vista = vendedor fecha sozinho; crédito = passa pelo financeiro.</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
          <button onClick={() => setModal({ nome: "", descricao: "", padrao_novos_clientes: false, ativo: true, formas: [], condicoes: [] })} style={btnPrimary()}><Plus size={14} /> Novo perfil</button>
        </div>
      </div>

      {/* validade de consulta */}
      <div style={{ ...cardStyle(), padding: 16, marginBottom: 16, display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <label style={lbl}>Validade da consulta de crédito (dias)</label>
          <input type="number" min={1} value={validade} onChange={(e) => setValidade(e.target.value)} style={{ ...inp(true), width: 120 }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, flex: 1, minWidth: 200, lineHeight: 1.4 }}>
          Passado esse prazo desde a última consulta, a abertura de venda/OS de cliente <b>de crédito</b> é bloqueada até o financeiro reconsultar. Cliente à vista nunca é bloqueado.
        </div>
        <button onClick={salvarValidade} disabled={savingVal} style={{ ...btnPrimary(), opacity: savingVal ? 0.6 : 1 }}><Save size={14} /> Salvar</button>
      </div>

      {/* perfis */}
      <div style={{ display: "grid", gap: 12 }}>
        {perfis.map((p) => (
          <div key={p.id} style={{ ...cardStyle(), padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{p.nome}</span>
              {p.padrao_novos_clientes && <span style={pill(C.primary, C.bluePale)}><Star size={11} /> Padrão de cliente novo</span>}
              {p.exige_financeiro
                ? <span style={pill(C.warning, C.warningBg)}><ShieldAlert size={11} /> Exige financeiro</span>
                : <span style={pill(C.success, C.successBg)}><Check size={11} /> Autonomia do vendedor</span>}
              {!p.ativo && <Badge texto="Inativo" cor="INATIVO" />}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => setModal({ ...p })} style={btnGhost()}>Editar</button>
                <button onClick={() => excluir(p)} style={{ ...btnGhost(), color: C.destructive }} title="Excluir"><Trash2 size={14} /></button>
              </div>
            </div>
            {p.descricao && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>{p.descricao}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.formas.map((id) => <span key={"f" + id} style={chip(fMap[id]?.usa_limite_credito ? C.warning : C.foreground)}>{fMap[id]?.descricao || "?"}</span>)}
              {p.condicoes.map((id) => <span key={"c" + id} style={chip(cMap[id]?.libera_limite ? C.warning : C.foreground, true)}>{cMap[id]?.descricao || "?"}</span>)}
              {p.formas.length === 0 && p.condicoes.length === 0 && <span style={{ fontSize: 12, color: C.textMuted }}>Nenhuma forma/condição — configure.</span>}
            </div>
          </div>
        ))}
      </div>

      {modal && <ModalPerfil perfil={modal} formas={formas} condicoes={condicoes} onClose={() => setModal(null)}
        onSaved={() => { setModal(null); carregar(); notificar("Perfil salvo."); }} usuario={usuario} notificar={notificar} />}

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, background: toast.t === "erro" ? C.destructive : C.success, color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>{toast.m}</div>}
    </div>
  );
}

function ModalPerfil({ perfil, formas, condicoes, onClose, onSaved, usuario, notificar }) {
  const [f, setF] = useState({ ...perfil });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (campo, id) => setF((s) => {
    const arr = s[campo] || [];
    return { ...s, [campo]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
  });

  // exige financeiro ao vivo conforme seleção
  const exige = useMemo(() => {
    const cred = formas.some((x) => (f.formas || []).includes(x.id) && x.usa_limite_credito)
      || condicoes.some((x) => (f.condicoes || []).includes(x.id) && x.libera_limite);
    return cred;
  }, [f.formas, f.condicoes, formas, condicoes]);

  async function salvar() {
    if (!f.nome?.trim()) { notificar("Informe o nome do perfil.", "erro"); return; }
    setSaving(true);
    try {
      await rpc("erp_perfil_pagamento_salvar", { p: {
        id: f.id || null, nome: f.nome, descricao: f.descricao || null,
        padrao_novos_clientes: !!f.padrao_novos_clientes, ativo: f.ativo !== false,
        formas: f.formas || [], condicoes: f.condicoes || [],
      }});
      onSaved();
    } catch (e) { notificar("Erro: " + e.message, "erro"); setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 22, width: 640, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{f.id ? "Editar perfil" : "Novo perfil"}</h2>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.textMuted }}><X size={18} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Campo label="Nome *"><input value={f.nome || ""} onChange={(e) => set("nome", e.target.value)} style={inp(true)} /></Campo>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={!!f.padrao_novos_clientes} onChange={(e) => set("padrao_novos_clientes", e.target.checked)} /> Padrão de cliente novo
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={f.ativo !== false} onChange={(e) => set("ativo", e.target.checked)} /> Ativo
            </label>
          </div>
        </div>
        <Campo label="Descrição"><input value={f.descricao || ""} onChange={(e) => set("descricao", e.target.value)} style={inp(true)} /></Campo>

        <div style={{ margin: "10px 0", padding: "8px 12px", borderRadius: 8, background: exige ? C.warningBg : C.successBg, color: exige ? C.warning : C.success, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          {exige ? <><ShieldAlert size={14} /> Este perfil inclui crédito/prazo → exige liberação do financeiro.</> : <><Check size={14} /> Só formas à vista → o vendedor cria e fecha sozinho.</>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 6 }}>
          <div>
            <label style={lbl}>Formas de pagamento</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
              {formas.map((x) => (
                <label key={x.id} style={optRow((f.formas || []).includes(x.id))}>
                  <input type="checkbox" checked={(f.formas || []).includes(x.id)} onChange={() => toggle("formas", x.id)} />
                  <span style={{ flex: 1 }}>{x.descricao}</span>
                  {x.usa_limite_credito && <span style={miniTag}>crédito</span>}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Condições de pagamento</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
              {condicoes.map((x) => (
                <label key={x.id} style={optRow((f.condicoes || []).includes(x.id))}>
                  <input type="checkbox" checked={(f.condicoes || []).includes(x.id)} onChange={() => toggle("condicoes", x.id)} />
                  <span style={{ flex: 1 }}>{x.descricao}</span>
                  {x.libera_limite && <span style={miniTag}>prazo</span>}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={btnGhost()}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Save size={14} /> {saving ? "Salvando..." : "Salvar perfil"}</button>
        </div>
      </div>
    </div>
  );
}

const pill = (cor, bg) => ({ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: cor, background: bg, padding: "2px 8px", borderRadius: 20 });
const chip = (cor, cond = false) => ({ fontSize: 11.5, fontWeight: 600, color: cor, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: cond ? 4 : 20, padding: "2px 9px" });
const optRow = (on) => ({ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 8px", borderRadius: 7, cursor: "pointer", background: on ? C.bluePale : C.surface2, border: `1px solid ${on ? C.blueLight : C.border}` });
const miniTag = { fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: C.warning, background: C.warningBg, padding: "1px 5px", borderRadius: 3 };
