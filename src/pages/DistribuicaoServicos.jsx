import { useState, useEffect, useRef } from "react";
import { Users, Wrench, Clock, Search, RefreshCw, ChevronDown, Pause, Play, X } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Badge, Skeleton } from "../ui";

const STATUS_MAP = { PENDENTE: "PENDENTE", EM_EXECUCAO: "ATIVO", EM_ANDAMENTO: "ATIVO", PARADO: "BLOQUEADO", CONCLUIDO: "FATURADA", CANCELADO: "CANCELADA" };
// EM_EXECUCAO e EM_ANDAMENTO são o mesmo estado visual ("Em andamento")
const STATUS_LABEL = { PENDENTE: "Pendente", EM_EXECUCAO: "Em andamento", EM_ANDAMENTO: "Em andamento", PARADO: "Parado", CONCLUIDO: "Concluído", CANCELADO: "Cancelado" };
const emAndamento = (st) => st === "EM_EXECUCAO" || st === "EM_ANDAMENTO";

function tempoAberto(dataInicio) {
  if (!dataInicio) return "—";
  const diff = Date.now() - new Date(dataInicio).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

// Horário de lançamento (dd/mm HH:MM) — dado imutável usado para a sequência
function fmtLancado(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

export default function DistribuicaoServicos({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};

  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState([]);
  const [servSolic, setServSolic] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fArea, setFArea] = useState("");
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fTecnico, setFTecnico] = useState("");
  const [saving, setSaving] = useState(null); // id do servico sendo salvo
  const [pararSvc, setPararSvc] = useState(null); // servico sendo marcado como PARADO
  const [motivoParar, setMotivoParar] = useState("");
  const [cancelarSvc, setCancelarSvc] = useState(null); // serviço sendo cancelado
  const [motivoCancelar, setMotivoCancelar] = useState("");
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  async function carregar() {
    try {
      const d = await rpc("os_distribuicao_dados", {});
      setServicos(Array.isArray(d.servicos) ? d.servicos : []);
      setServSolic(Array.isArray(d.servicos_solicitados) ? d.servicos_solicitados : []);
      setTecnicos(Array.isArray(d.tecnicos) ? d.tecnicos : []);
      setAreas(Array.isArray(d.areas) ? d.areas : []);
    } catch (e) {
      /* silencioso no refresh */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ok = true;
    carregar();
    timerRef.current = setInterval(() => { if (ok) carregar(); }, 30000);
    return () => { ok = false; clearInterval(timerRef.current); };
  }, []);

  async function distribuir(item, idTecnico) {
    if (!idTecnico) { notificar("Selecione um técnico.", "erro"); return; }
    setSaving(item.origem + item.id);
    try {
      if (item.origem === "PRODUCAO") {
        await rpc("os_distribuir_producao", {
          p_id_os_peca: item.id, p_id_tecnico: parseInt(idTecnico), p_id_usuario: usuario.id,
        });
      } else {
        await rpc("os_distribuir_servico", {
          p_id_servico_os: item.id, p_id_tecnico: parseInt(idTecnico), p_id_usuario: usuario.id,
        });
      }
      notificar(item.origem === "PRODUCAO" ? "Produção distribuída!" : "Serviço distribuído!");
      await carregar();
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally { setSaving(null); }
  }

  async function mudarStatus(s, status, motivo) {
    setSaving(s.origem + s.id);
    try {
      const r = await rpc("erp_os_servico_status", { p_id: s.id, p_status: status, p_motivo: motivo || null, p_ator: usuario.id });
      if (r && r.ok === false) { notificar(r.erro || r.msg || "Erro", "erro"); return; }
      notificar(status === "PARADO" ? "Serviço marcado como parado." : "Serviço retomado.");
      setPararSvc(null); setMotivoParar("");
      await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(null); }
  }
  function confirmarParar() {
    if (!motivoParar.trim()) { notificar("Informe o motivo da parada.", "erro"); return; }
    mudarStatus(pararSvc, "PARADO", motivoParar.trim());
  }

  function confirmarCancelar() {
    if (!motivoCancelar.trim()) { notificar("Informe o motivo do cancelamento.", "erro"); return; }
    mudarStatus(cancelarSvc, "CANCELADO", motivoCancelar.trim());
  }

  async function distribuirDefeito(d, idArea, idTecnico) {
    if (!idArea) { notificar("Selecione a área.", "erro"); return; }
    setSaving("D" + d.id);
    try {
      const r = await rpc("os_defeito_distribuir", { p_id_defeito: d.id, p_id_area: parseInt(idArea), p_id_tecnico: idTecnico ? parseInt(idTecnico) : null, p_ator: usuario.id });
      if (r && r.ok === false) notificar(r.erro || "Erro", "erro");
      else { notificar("Serviço solicitado distribuído!"); await carregar(); }
    } catch (e) { notificar("Erro: " + e.message, "erro"); } finally { setSaving(null); }
  }

  async function duplicarDefeito(d, idArea) {
    setSaving("D" + d.id);
    try {
      const r = await rpc("os_defeito_duplicar", { p_id_defeito: d.id, p_id_area: idArea ? parseInt(idArea) : null, p_ator: usuario.id });
      if (r && r.ok === false) notificar(r.erro || "Erro", "erro");
      else { notificar("Duplicado " + (r.codigo || "") + "."); await carregar(); }
    } catch (e) { notificar("Erro: " + e.message, "erro"); } finally { setSaving(null); }
  }

  // Filtros
  const filtrados = servicos.filter(s => {
    const q = busca.trim().toLowerCase();
    const okBusca = !q || (s.descricao || "").toLowerCase().includes(q) || (s.cliente || "").toLowerCase().includes(q) || (s.numero_os || "").toLowerCase().includes(q);
    const okStatus = !fStatus || s.status === fStatus;
    const okTecnico = !fTecnico || String(s.id_tecnico) === fTecnico || (fTecnico === "none" && !s.id_tecnico);
    const okArea = !fArea || String(s.id_area) === fArea || (fArea === "none" && !s.id_area);
    return okBusca && okStatus && okTecnico && okArea;
  });

  const pendentes = filtrados.filter(s => s.status === "PENDENTE").length;
  const emExecucao = filtrados.filter(s => s.status === "EM_EXECUCAO").length;
  const parados = filtrados.filter(s => s.status === "PARADO").length;
  const servicosParados = filtrados.filter(s => s.status === "PARADO");

  // Seletor de técnico por serviço
  const [tecSel, setTecSel] = useState({});
  const [areaSel, setAreaSel] = useState({}); // por defeito: área escolhida
  const [tecSol, setTecSol] = useState({});   // por defeito: técnico opcional

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Distribuicao de Servicos</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
            {pendentes} pendentes · {emExecucao} em execucao {parados > 0 && `· ${parados} parados`} · atualiza a cada 30s
          </p>
        </div>
        <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={cardStyle()}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>Pendentes</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: "#B45309" }}>{pendentes}</div>
        </div>
        <div style={cardStyle()}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>Em Execucao</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.primary }}>{emExecucao}</div>
        </div>
        <div style={cardStyle()}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono }}>{filtrados.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar OS, cliente ou servico..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={sel()}>
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_EXECUCAO">Em andamento</option>
          <option value="PARADO">Parado</option>
          <option value="CONCLUIDO">Concluído</option>
        </select>
        <select value={fArea} onChange={e => setFArea(e.target.value)} style={sel()}>
          <option value="">Todas as areas</option>
          <option value="none">Sem area</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.descricao}</option>)}
        </select>
        <select value={fTecnico} onChange={e => setFTecnico(e.target.value)} style={sel()}>
          <option value="">Todos os tecnicos</option>
          <option value="none">Nao atribuido</option>
          {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {/* Serviços Solicitados (defeitos) — distribuir por área (pool) + técnico opcional */}
      {servSolic.length > 0 && (
        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Wrench size={16} color={C.primary} /> Serviços Solicitados (defeitos)
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· atribua uma área (e opcionalmente um técnico) · duplique para outra especialidade</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
              <thead><tr>{["OS", "Cliente", "Lançado", "Defeito", "Área", "Técnico (opcional)", "Apont.", "Ação"].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
              <tbody>
                {servSolic.map(d => {
                  const k = "D" + d.id;
                  const areaVal = areaSel[k] ?? (d.id_area ? String(d.id_area) : "");
                  return (
                    <tr key={k} style={{ borderBottom: `1px solid ${C.border}`, background: d.distribuido ? "transparent" : "rgba(180,83,9,0.05)" }}>
                      <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{d.numero_os}</span></td>
                      <td style={{ ...td(), maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.cliente}</td>
                      <td style={{ ...td(), fontFamily: mono, fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>{fmtLancado(d.criado_em)}</td>
                      <td style={{ ...td(), maxWidth: 260 }}><span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{d.codigo}</span> {d.descricao}{d.id_defeito_origem && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, background: C.bluePale, color: C.blueMid, padding: "1px 6px", borderRadius: 4 }}>CÓPIA</span>}</td>
                      <td style={td()}>
                        <select value={areaVal} onChange={e => setAreaSel(a => ({ ...a, [k]: e.target.value }))} style={{ ...sel(), minWidth: 130, fontSize: 12 }}>
                          <option value="">Área...</option>
                          {areas.map(a => <option key={a.id} value={a.id}>{a.descricao}</option>)}
                        </select>
                      </td>
                      <td style={td()}>
                        <select value={tecSol[k] ?? (d.id_tecnico ? String(d.id_tecnico) : "")} onChange={e => setTecSol(t => ({ ...t, [k]: e.target.value }))} style={{ ...sel(), minWidth: 120, fontSize: 12 }}>
                          <option value="">Pool da área</option>
                          {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </td>
                      <td style={{ ...td(), textAlign: "center", fontFamily: mono }}>{d.qtd_apontamentos || 0}</td>
                      <td style={td()}>
                        {perms.aprovar && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => distribuirDefeito(d, areaVal, tecSol[k])} disabled={saving === k} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12 }}>{d.distribuido ? "Reatribuir" : "Distribuir"}</button>
                            <button onClick={() => duplicarDefeito(d, areaVal)} disabled={saving === k} style={{ ...btnGhost(), padding: "6px 10px", fontSize: 12 }} title="Duplicar para outra especialidade">Duplicar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Serviços Parados */}
      {servicosParados.length > 0 && (
        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 16, borderLeft: `4px solid ${C.destructive}` }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: `rgba(${C.destructive === '#EF4444' ? '239,68,68' : '255,0,0'}, 0.02)` }}>
            <Pause size={16} color={C.destructive} /> Serviços Parados
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>· retome a execução ou cancele o serviço</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 750 }}>
              <thead><tr>{["OS", "Cliente", "Serviço", "Motivo", "Técnico", "Ação"].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
              <tbody>
                {servicosParados.map(s => (
                  <tr key={(s.origem || "S") + s.id} style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(239,68,68,0.03)" }}>
                    <td style={td()}>
                      <span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{s.numero_os}</span>
                    </td>
                    <td style={{ ...td(), fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente}</td>
                    <td style={{ ...td(), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{s.descricao}</td>
                    <td style={{ ...td(), maxWidth: 220, color: C.destructive, fontSize: 12, fontWeight: 500 }}>
                      {s.motivo_parado || "—"}
                    </td>
                    <td style={{ ...td(), color: s.id_tecnico ? C.foreground : C.muted }}>{s.tecnico_nome || "—"}</td>
                    <td style={td()}>
                      {perms.aprovar && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => mudarStatus(s, "EM_ANDAMENTO", null)} disabled={saving === (s.origem + s.id)} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12, opacity: saving === (s.origem + s.id) ? 0.6 : 1 }}><Play size={13} /> Retomar</button>
                          <button onClick={() => { setCancelarSvc(s); setMotivoCancelar(""); }} disabled={saving === (s.origem + s.id)} style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, color: C.destructive, borderColor: C.destructive }}><X size={13} /> Cancelar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} h={32} />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <Users size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhum servico pendente de distribuicao.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
              <thead><tr>
                {["OS", "Cliente", "Lançado", "Area", "Servico", "Status", "Tecnico", "Tempo", "Acao"].map((h, i) => (
                  <th key={i} style={th()}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map(s => (
                  <tr key={(s.origem || "S") + s.id} style={{ borderBottom: `1px solid ${C.border}`, background: s.status === "PENDENTE" && !s.id_tecnico ? "rgba(180,83,9,0.04)" : "transparent" }}>
                    <td style={td()}>
                      <span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{s.numero_os}</span>
                    </td>
                    <td style={{ ...td(), fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente}</td>
                    <td style={{ ...td(), fontFamily: mono, fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>{fmtLancado(s.criado_em)}</td>
                    <td style={td()}>{s.area ? <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{s.area_codigo || s.area}</span> : <span style={{ color: C.textMuted }}>—</span>}</td>
                    <td style={{ ...td(), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: s.origem === "PRODUCAO" ? 600 : 400, color: s.origem === "PRODUCAO" ? "#6B3FA0" : C.foreground }}>{s.descricao}</td>
                    <td style={td()}>
                      <Badge texto={STATUS_LABEL[s.status] || s.status} cor={STATUS_MAP[s.status]} />
                      {s.status === "PARADO" && s.motivo_parado && <div style={{ fontSize: 11, color: C.destructive, marginTop: 3, maxWidth: 160 }} title={s.motivo_parado}>⛔ {s.motivo_parado}</div>}
                    </td>
                    <td style={{ ...td(), color: s.id_tecnico ? C.foreground : C.muted, fontWeight: s.id_tecnico ? 500 : 400 }}>
                      {s.tecnico_nome || "Nao atribuido"}
                    </td>
                    <td style={{ ...td(), fontFamily: mono, fontSize: 12 }}>{tempoAberto(s.data_inicio)}</td>
                    <td style={td()}>
                      {perms.aprovar && s.status === "PENDENTE" && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select value={tecSel[(s.origem || "S") + s.id] || ""} onChange={e => setTecSel(t => ({ ...t, [(s.origem || "S") + s.id]: e.target.value }))} style={{ ...sel(), minWidth: 120, fontSize: 12 }}>
                            <option value="">Tecnico...</option>
                            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                          <button onClick={() => distribuir(s, tecSel[(s.origem || "S") + s.id])} disabled={saving === (s.origem + s.id)} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12, opacity: saving === (s.origem + s.id) ? 0.6 : 1 }}>
                            {saving === (s.origem + s.id) ? "..." : "Distribuir"}
                          </button>
                        </div>
                      )}
                      {s.origem !== "PRODUCAO" && emAndamento(s.status) && perms.aprovar && (
                        <button onClick={() => { setPararSvc(s); setMotivoParar(""); }} disabled={saving === (s.origem + s.id)} style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, color: C.destructive, borderColor: C.destructive }}><Pause size={13} /> Marcar parado</button>
                      )}
                      {s.origem !== "PRODUCAO" && s.status === "PARADO" && perms.aprovar && (
                        <button onClick={() => mudarStatus(s, "EM_ANDAMENTO", null)} disabled={saving === (s.origem + s.id)} style={{ ...btnPrimary(), padding: "6px 12px", fontSize: 12, opacity: saving === (s.origem + s.id) ? 0.6 : 1 }}><Play size={13} /> Retomar</button>
                      )}
                      {s.origem !== "PRODUCAO" && s.status !== "CONCLUIDO" && s.status !== "CANCELADO" && perms.aprovar && (
                        <button onClick={() => { setCancelarSvc(s); setMotivoCancelar(""); }} disabled={saving === (s.origem + s.id)} style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, color: C.destructive, borderColor: C.destructive }}><X size={13} /> Cancelar</button>
                      )}
                      {s.origem === "PRODUCAO" && emAndamento(s.status) && (
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>Em andamento</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pararSvc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPararSvc(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle(), width: 440, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <b style={{ fontSize: 15 }}>Marcar serviço como parado</b>
              <button onClick={() => setPararSvc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{pararSvc.numero_os} · {pararSvc.descricao}. O motivo fica visível na lista pra todos saberem por que parou.</div>
            <textarea autoFocus value={motivoParar} onChange={(e) => setMotivoParar(e.target.value)} rows={3} placeholder="Ex.: faltou peça, aguardando aprovação do cliente..." style={{ ...inp(), width: "100%", height: "auto", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setPararSvc(null)} style={btnGhost()}>Cancelar</button>
              <button onClick={confirmarParar} disabled={saving === (pararSvc.origem + pararSvc.id)} style={{ ...btnPrimary(), background: C.destructive }}><Pause size={13} /> Confirmar parada</button>
            </div>
          </div>
        </div>
      )}

      {cancelarSvc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setCancelarSvc(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle(), width: 440, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <b style={{ fontSize: 15, color: C.destructive }}>Cancelar serviço</b>
              <button onClick={() => setCancelarSvc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{cancelarSvc.numero_os} · {cancelarSvc.descricao}. Informe o motivo do cancelamento.</div>
            <textarea autoFocus value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} rows={3} placeholder="Ex.: cliente desistiu, obra pausada, serviço desnecessário..." style={{ ...inp(), width: "100%", height: "auto", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setCancelarSvc(null)} style={btnGhost()}>Fechar</button>
              <button onClick={confirmarCancelar} disabled={saving === (cancelarSvc.origem + cancelarSvc.id)} style={{ ...btnPrimary(), background: C.destructive }}><X size={13} /> Cancelar serviço</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
