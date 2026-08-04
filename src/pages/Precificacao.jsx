import { useState, useEffect } from "react";
import { RefreshCw, ChevronDown, ChevronRight, Layers, Wrench, DollarSign, Check, X, Search } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton, Badge, SelectBusca } from "../ui";

const fmtData = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");
const fmtH = (h) => (Number(h) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "h";

// Tela do "boca" (Precificador): pega os apontamentos soltos por área (blocos),
// escolhe o que é faturável e transforma o bloco em SERVIÇO com valor.
export default function Precificacao({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};
  const podeFechar = perms.aprovar || perms.editar || usuario?.admin;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [catServicos, setCatServicos] = useState([]); // cadastro de serviços (os_dados)
  const [expandido, setExpandido] = useState({});
  const [soComBloco, setSoComBloco] = useState(true);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({});   // `${idOs}:${idArea}` -> { descricao, valor }
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  async function carregar(silencioso) {
    if (!silencioso) setErro(null);
    try {
      const d = await rpc("os_precificacao_dados", {});
      setOrdens(Array.isArray(d?.ordens) ? d.ordens : []);
    } catch (e) {
      if (!silencioso) setErro(e.message || "Falha ao carregar dados de precificação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Catálogo de serviços (mesma fonte da OS): {id, nome, codigo, preco}
  useEffect(() => {
    rpc("os_dados")
      .then((d) => setCatServicos(Array.isArray(d?.servicos) ? d.servicos : []))
      .catch(() => {});
  }, []);

  const keyBloco = (idOs, idArea) => `${idOs}:${idArea}`;
  const setFormBloco = (k, patch) => setForm((o) => ({ ...o, [k]: { ...(o[k] || {}), ...patch } }));

  async function toggleFaturavel(apt) {
    try {
      await rpc("os_apontamento_faturavel", { p_id: apt.id, p_faturavel: !apt.faturavel });
      await carregar(true);
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  async function criarServico(os, bloco) {
    const k = keyBloco(os.id_os, bloco.id_area);
    const dados = form[k] || {};
    const descricao = (dados.descricao || "").trim() || `Serviço — ${bloco.area}`;
    const valor = num(dados.valor);
    if (!(valor > 0)) { notificar("Informe o valor do serviço.", "erro"); return; }
    const ids = (bloco.apontamentos || []).map((a) => a.id);
    if (ids.length === 0) { notificar("Bloco sem apontamentos.", "erro"); return; }

    setSaving(k);
    try {
      const res = await rpc("os_servico_criar_de_apontamentos", {
        p_id_os: os.id_os,
        p_descricao: descricao,
        p_valor_total: valor,
        p_apontamentos: ids,
        p_id_area: bloco.id_area,
        p_id_servico: num(dados.id_servico) || null,
        p_id_usuario: usuario?.id || null,
      });
      if (res && res.ok === false) { notificar(res.erro || "Não foi possível criar o serviço.", "erro"); return; }
      notificar(`Serviço criado — ${fmtBRL(valor)}`);
      setForm((o) => { const n = { ...o }; delete n[k]; return n; });
      await carregar(true);
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally {
      setSaving(null);
    }
  }

  // filtro
  const q = busca.trim().toLowerCase();
  const ordensFiltradas = ordens.filter((o) => {
    const temBloco = Array.isArray(o.blocos) && o.blocos.length > 0;
    if (soComBloco && !temBloco) return false;
    if (!q) return true;
    return (o.numero || "").toLowerCase().includes(q) || (o.cliente || "").toLowerCase().includes(q);
  });

  const totalBlocos = ordens.reduce((acc, o) => acc + ((o.blocos && o.blocos.length) || 0), 0);
  const horasFaturaveisBlocos = ordens.reduce((acc, o) =>
    acc + (o.blocos || []).reduce((a, b) => a + (Number(b.horas_faturaveis) || 0), 0), 0);

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
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Precificação de Serviços</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
            Fechamento — transforme os apontamentos por área em serviços faturáveis
          </p>
        </div>
        <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={cardStyle()}>
          <div style={kpiLbl}>Blocos a precificar</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: "#B45309" }}>{totalBlocos}</div>
        </div>
        <div style={cardStyle()}>
          <div style={kpiLbl}>Horas faturáveis (blocos)</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.primary }}>{fmtH(horasFaturaveisBlocos)}</div>
        </div>
        <div style={cardStyle()}>
          <div style={kpiLbl}>OS na fila</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono }}>{ordensFiltradas.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar OS ou cliente..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.muted, cursor: "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={soComBloco} onChange={(e) => setSoComBloco(e.target.checked)} />
          Só OS com blocos pendentes
        </label>
      </div>

      {erro && (
        <div style={{ background: C.destructiveBg, border: `1px solid ${C.destructive}33`, borderRadius: 10, padding: 14, marginBottom: 16, color: C.destructive, fontSize: 13 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={64} />)}
        </div>
      ) : ordensFiltradas.length === 0 ? (
        <div style={{ ...cardStyle(), textAlign: "center", padding: "48px 0", color: C.textMuted }}>
          <Layers size={30} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma OS com apontamentos a precificar.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ordensFiltradas.map((os) => {
            const aberto = expandido[os.id_os];
            const blocos = Array.isArray(os.blocos) ? os.blocos : [];
            const servicos = Array.isArray(os.servicos) ? os.servicos : [];
            return (
              <div key={os.id_os} style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
                {/* Cabeçalho da OS */}
                <div onClick={() => setExpandido((x) => ({ ...x, [os.id_os]: !x[os.id_os] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer", background: blocos.length ? "rgba(180,83,9,0.05)" : "transparent" }}>
                  {aberto ? <ChevronDown size={18} style={{ color: C.muted }} /> : <ChevronRight size={18} style={{ color: C.muted }} />}
                  <span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{os.numero}</span>
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{os.cliente}</span>
                  {blocos.length > 0 && (
                    <span style={{ background: C.warningBg, color: C.warning, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, textTransform: "uppercase" }}>
                      {blocos.length} bloco{blocos.length > 1 ? "s" : ""} a precificar
                    </span>
                  )}
                  <span style={{ fontFamily: mono, fontWeight: 700, color: C.foreground }}>{fmtBRL(os.valor_servicos)}</span>
                </div>

                {aberto && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
                    {os.defeito && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}><b style={{ color: C.foreground }}>Defeito/pedido:</b> {os.defeito}</div>}

                    {/* BLOCOS a precificar */}
                    {blocos.length > 0 && (
                      <div style={{ marginBottom: servicos.length ? 20 : 0 }}>
                        <div style={secTit}><Layers size={14} style={{ color: C.warning }} /> Apontamentos por área (a virar serviço)</div>
                        {blocos.map((b) => {
                          const k = keyBloco(os.id_os, b.id_area);
                          const dados = form[k] || {};
                          return (
                            <div key={k} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10, background: C.surface2 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 4, textTransform: "uppercase" }}>{b.area || "Sem área"}</span>
                                <span style={{ fontSize: 12, color: C.muted }}>total <b style={{ fontFamily: mono, color: C.foreground }}>{fmtH(b.horas_total)}</b> · faturáveis <b style={{ fontFamily: mono, color: C.success }}>{fmtH(b.horas_faturaveis)}</b></span>
                              </div>

                              {/* apontamentos do bloco */}
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
                                  <thead><tr>
                                    {["Colaborador", "Data", "Horas", "Observação", "Faturar"].map((h, i) => <th key={i} style={{ ...th(i === 2), padding: "7px 10px", background: "transparent" }}>{h}</th>)}
                                  </tr></thead>
                                  <tbody>
                                    {(b.apontamentos || []).map((a) => (
                                      <tr key={a.id} style={{ borderTop: `1px solid ${C.border}`, opacity: a.faturavel ? 1 : 0.5 }}>
                                        <td style={{ padding: "7px 10px" }}>{a.colaborador}</td>
                                        <td style={{ padding: "7px 10px", fontFamily: mono, fontSize: 11.5 }}>{fmtData(a.data)}</td>
                                        <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtH(a.horas)}</td>
                                        <td style={{ padding: "7px 10px", color: C.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.observacao || "—"}</td>
                                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                                          <button onClick={() => toggleFaturavel(a)} title={a.faturavel ? "Faturável (clique p/ excluir)" : "Não faturável (clique p/ incluir)"} style={{ ...togBtn, background: a.faturavel ? C.successBg : "#fff", color: a.faturavel ? C.success : C.textMuted, borderColor: a.faturavel ? `${C.success}55` : C.border }}>
                                            {a.faturavel ? <Check size={14} /> : <X size={14} />}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* form criar serviço — puxa do cadastro de serviços */}
                              {podeFechar && (
                                <div style={{ marginTop: 12, borderTop: `1px dashed ${C.border}`, paddingTop: 12 }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <label style={lbl}>Serviço (do cadastro)</label>
                                    <SelectBusca
                                      opcoes={catServicos.map((sv) => ({ id: sv.id, label: sv.nome, sub: (sv.codigo ? sv.codigo + " · " : "") + fmtBRL(sv.preco) }))}
                                      value={dados.id_servico || ""}
                                      onChange={(id) => {
                                        const sv = catServicos.find((x) => String(x.id) === String(id)) || {};
                                        setFormBloco(k, { id_servico: id, descricao: sv.nome ?? (dados.descricao ?? ""), valor: sv.preco != null ? String(sv.preco) : (dados.valor ?? "") });
                                      }}
                                      placeholder="Buscar serviço no cadastro..."
                                      full
                                    />
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                                    <div style={{ flex: 2, minWidth: 200 }}>
                                      <label style={lbl}>Descrição {dados.id_servico ? "" : "(ou digite)"}</label>
                                      <input value={dados.descricao ?? ""} onChange={(e) => setFormBloco(k, { descricao: e.target.value })} placeholder={`Serviço — ${b.area || ""}`} style={{ ...inp(), width: "100%" }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                      <label style={lbl}>Valor (R$)</label>
                                      <input type="number" step="0.01" min="0" value={dados.valor ?? ""} onChange={(e) => setFormBloco(k, { valor: e.target.value })} placeholder="0,00" style={{ ...inp(), width: "100%", fontFamily: mono }} />
                                    </div>
                                    <button onClick={() => criarServico(os, b)} disabled={saving === k} style={{ ...btnPrimary(), opacity: saving === k ? 0.6 : 1 }}>
                                      <DollarSign size={15} /> {saving === k ? "Criando..." : "Criar serviço"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SERVIÇOS já existentes */}
                    {servicos.length > 0 && (
                      <div>
                        <div style={secTit}><Wrench size={14} style={{ color: C.primary }} /> Serviços da OS</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
                            <thead><tr>
                              {["Serviço", "Área", "Técnico", "H. fat.", "Status", "Valor"].map((h, i) => <th key={i} style={th(i === 3 || i === 5)}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                              {servicos.map((sv) => (
                                <tr key={sv.id} style={{ borderTop: `1px solid ${C.border}` }}>
                                  <td style={{ ...td(), maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sv.descricao}</td>
                                  <td style={td()}>{sv.area ? <span style={{ fontSize: 11, color: C.blueMid }}>{sv.area}</span> : <span style={{ color: C.textMuted }}>—</span>}</td>
                                  <td style={{ ...td(), color: sv.tecnico ? C.foreground : C.muted }}>{sv.tecnico || "—"}</td>
                                  <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtH(sv.horas_faturaveis)}</td>
                                  <td style={td()}><Badge texto={sv.status} cor={sv.status === "CONCLUIDO" ? "FATURADA" : sv.status === "PENDENTE" ? "PENDENTE" : "ATIVO"} /></td>
                                  <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700 }}>{fmtBRL(sv.valor_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {blocos.length === 0 && servicos.length === 0 && (
                      <div style={{ color: C.textMuted, fontSize: 13, padding: "8px 0" }}>Sem apontamentos nem serviços nesta OS.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const kpiLbl = { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 };
const secTit = { display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.muted, marginBottom: 10 };
const lbl = { display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 4 };
const togBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 26, border: "1px solid", borderRadius: 6, cursor: "pointer" };
