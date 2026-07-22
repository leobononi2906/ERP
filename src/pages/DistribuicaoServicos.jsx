import { useState, useEffect, useRef } from "react";
import { Users, Wrench, Clock, Search, RefreshCw, ChevronDown } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Badge, Skeleton } from "../ui";

const STATUS_MAP = { PENDENTE: "PENDENTE", EM_EXECUCAO: "ATIVO", CONCLUIDO: "FATURADA" };

function tempoAberto(dataInicio) {
  if (!dataInicio) return "—";
  const diff = Date.now() - new Date(dataInicio).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

export default function DistribuicaoServicos({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};

  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [fArea, setFArea] = useState("");
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fTecnico, setFTecnico] = useState("");
  const [saving, setSaving] = useState(null); // id do servico sendo salvo
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  async function carregar() {
    try {
      const d = await rpc("os_distribuicao_dados", {});
      setServicos(Array.isArray(d.servicos) ? d.servicos : []);
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

  // Seletor de técnico por serviço
  const [tecSel, setTecSel] = useState({});

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
            {pendentes} pendentes · {emExecucao} em execucao · atualiza a cada 30s
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
          <option value="EM_EXECUCAO">Em Execucao</option>
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
                {["OS", "Cliente", "Area", "Servico", "Status", "Tecnico", "Tempo", "Acao"].map((h, i) => (
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
                    <td style={td()}>{s.area ? <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{s.area_codigo || s.area}</span> : <span style={{ color: C.textMuted }}>—</span>}</td>
                    <td style={{ ...td(), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: s.origem === "PRODUCAO" ? 600 : 400, color: s.origem === "PRODUCAO" ? "#6B3FA0" : C.foreground }}>{s.descricao}</td>
                    <td style={td()}><Badge texto={s.status} cor={STATUS_MAP[s.status]} /></td>
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
                      {s.status === "EM_EXECUCAO" && (
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
    </div>
  );
}
