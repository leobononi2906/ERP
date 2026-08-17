import { useState, useEffect } from "react";
import { X, Boxes, Building2, History, ArrowDownCircle, ArrowUpCircle, Package } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "./config";

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 970, display: "flex", justifyContent: "flex-end" };
const painel = { width: 560, maxWidth: "96vw", background: C.background, height: "100%", overflowY: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,0.18)", padding: 20 };
const secTit = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted, margin: "18px 0 8px" };
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };
const thx = { padding: "7px 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, background: C.surface2, textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
const tdx = { padding: "7px 10px", borderBottom: `1px solid ${C.border}` };
const fmtDT = (d) => d ? new Date(d).toLocaleString("pt-BR") : "—";
const fmtD = (d) => d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—";

function Header({ icon: Icon, titulo, sub, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <Icon size={20} style={{ color: C.primary }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</div>
        {sub && <div style={{ fontSize: 12.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
    </div>
  );
}

/* ═══ DRAWER DE ESTOQUE DO PRODUTO ═══ */
export function DrawerEstoque({ idProduto, idEmpresa = null, onClose }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    setLoading(true);
    rpc("erp_produto_estoque_detalhe", { p_id_produto: idProduto, p_id_empresa: idEmpresa || null })
      .then((r) => { if (a) { setD(r); setLoading(false); } })
      .catch(() => { if (a) { setD(null); setLoading(false); } });
    return () => { a = false; };
  }, [idProduto, idEmpresa]);

  const p = d?.produto || {};
  const total = d?.total || {};
  const centros = Array.isArray(d?.por_centro) ? d.por_centro : [];
  const hist = Array.isArray(d?.historico) ? d.historico : [];

  return (
    <div style={overlay} onClick={onClose}>
      <div style={painel} onClick={(e) => e.stopPropagation()}>
        <Header icon={Boxes} titulo={p.nome || "Produto"} sub={[p.referencia, idEmpresa ? "empresa selecionada" : "todas as empresas"].filter(Boolean).join(" · ")} onClose={onClose} />

        {loading ? <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div> : (
          <>
            {/* Totais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              {[
                { l: "Disponível", v: num(total.disponivel), c: C.success },
                { l: "Em estoque", v: num(total.estoque_atual), c: C.foreground },
                { l: "Reservado", v: num(total.reservado), c: C.warning },
                { l: "Comprando", v: num(d?.comprado), c: C.blueMid },
              ].map((k, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted }}>{k.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: k.c }}>{k.v.toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12.5, color: C.muted }}>
              <span>Venda: <b style={{ color: C.foreground, fontFamily: mono }}>{fmtBRL(p.preco_venda)}</b></span>
              <span>Custo: <b style={{ color: C.foreground, fontFamily: mono }}>{fmtBRL(p.preco_custo)}</b></span>
            </div>

            {/* Por empresa / centro */}
            <div style={secTit}><Building2 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Estoque por empresa / centro</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={tbl}>
                <thead><tr><th style={thx}>Empresa</th><th style={thx}>Centro</th><th style={{ ...thx, textAlign: "right" }}>Disp.</th><th style={{ ...thx, textAlign: "right" }}>Atual</th><th style={{ ...thx, textAlign: "right" }}>Custo méd.</th></tr></thead>
                <tbody>
                  {centros.map((c, i) => (
                    <tr key={i}>
                      <td style={tdx}>{c.empresa || "—"}</td>
                      <td style={tdx}>{c.centro}</td>
                      <td style={{ ...tdx, textAlign: "right", fontFamily: mono, fontWeight: 600, color: num(c.disponivel) > 0 ? C.success : C.textMuted }}>{num(c.disponivel).toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdx, textAlign: "right", fontFamily: mono }}>{num(c.estoque_atual).toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdx, textAlign: "right", fontFamily: mono, color: C.muted }}>{fmtBRL(c.custo_medio)}</td>
                    </tr>
                  ))}
                  {centros.length === 0 && <tr><td colSpan={5} style={{ ...tdx, textAlign: "center", color: C.textMuted, padding: 20 }}>Sem saldo em estoque.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Histórico de movimentos */}
            <div style={secTit}><History size={12} style={{ verticalAlign: "middle", marginRight: 4 }} /> Histórico (entradas e saídas)</div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={tbl}>
                <thead><tr><th style={thx}>Data</th><th style={thx}>Mov.</th><th style={{ ...thx, textAlign: "right" }}>Qtd</th><th style={thx}>Origem</th><th style={thx}>Quem</th></tr></thead>
                <tbody>
                  {hist.map((h, i) => {
                    const ent = num(h.quantidade) >= 0 && !/SAIDA|SAÍDA|BAIXA/i.test(h.tipo || "");
                    return (
                      <tr key={i}>
                        <td style={{ ...tdx, whiteSpace: "nowrap", color: C.muted }}>{fmtDT(h.data)}</td>
                        <td style={tdx}>{ent ? <ArrowDownCircle size={14} style={{ color: C.success, verticalAlign: "middle" }} /> : <ArrowUpCircle size={14} style={{ color: C.destructive, verticalAlign: "middle" }} />} <span style={{ marginLeft: 4 }}>{h.tipo}</span></td>
                        <td style={{ ...tdx, textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{num(h.quantidade).toLocaleString("pt-BR")}</td>
                        <td style={tdx}>{[h.origem, h.numero].filter(Boolean).join(" ") || "—"}</td>
                        <td style={{ ...tdx, color: C.muted }}>{h.usuario || "—"}</td>
                      </tr>
                    );
                  })}
                  {hist.length === 0 && <tr><td colSpan={5} style={{ ...tdx, textAlign: "center", color: C.textMuted, padding: 20 }}>Sem movimentos.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ DRAWER DE HISTÓRICO / AUDITORIA ═══ */
function diffCampos(ant, novo) {
  const a = ant || {}, n = novo || {};
  const chaves = [...new Set([...Object.keys(a), ...Object.keys(n)])].filter((k) => !["criado_em", "atualizado_em"].includes(k));
  return chaves.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(n[k])).map((k) => ({ campo: k, de: a[k], para: n[k] }));
}
const valTxt = (v) => v === null || v === undefined || v === "" ? "—" : (typeof v === "object" ? JSON.stringify(v) : String(v));

export function DrawerHistorico({ tabela, registro, titulo = "Histórico", sub, onClose }) {
  const [linhas, setLinhas] = useState(null);
  useEffect(() => {
    let a = true;
    rpc("erp_historico", { p_tabela: tabela, p_registro: registro, p_limit: 80 })
      .then((r) => { if (a) setLinhas(Array.isArray(r) ? r : []); })
      .catch(() => { if (a) setLinhas([]); });
    return () => { a = false; };
  }, [tabela, registro]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={painel} onClick={(e) => e.stopPropagation()}>
        <Header icon={History} titulo={titulo} sub={sub} onClose={onClose} />
        {linhas === null ? <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div>
          : linhas.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Nenhuma alteração registrada.</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {linhas.map((l, i) => {
                  const difs = l.novos ? diffCampos(l.anteriores, l.novos) : [];
                  return (
                    <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: difs.length ? 8 : 0 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", background: C.bluePale, color: C.blueMid, padding: "2px 8px", borderRadius: 4 }}>{l.acao || "—"}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{l.quem}</span>
                        <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{fmtDT(l.data)}</span>
                      </div>
                      {l.mensagem && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: difs.length ? 8 : 0 }}>{l.mensagem}</div>}
                      {difs.length > 0 && (
                        <table style={tbl}>
                          <thead><tr><th style={thx}>Campo</th><th style={thx}>De</th><th style={thx}>Para</th></tr></thead>
                          <tbody>
                            {difs.map((d, j) => (
                              <tr key={j}>
                                <td style={{ ...tdx, fontWeight: 600 }}>{d.campo}</td>
                                <td style={{ ...tdx, color: C.destructive }}>{valTxt(d.de)}</td>
                                <td style={{ ...tdx, color: C.success }}>{valTxt(d.para)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {!l.novos && !l.mensagem && <div style={{ fontSize: 12, color: C.textMuted }}>Sem detalhe de campos.</div>}
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}

/* ═══ DRAWER DE FOLLOW-UP (OS / CLIENTE) ═══ */
export function DrawerFollowup({ tipo = "os", idRegistro, titulo, sub, onClose }) {
  const [followup, setFollowup] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let a = true;
    setLoading(true);
    const rpcName = tipo === "cliente" ? "erp_cliente_followup_listar" : "erp_os_followup_listar";
    const param = tipo === "cliente" ? { p_id_cliente: idRegistro } : { p_id_os: idRegistro };

    rpc(rpcName, param)
      .then((r) => { if (a) { setFollowup(Array.isArray(r) ? r : []); setLoading(false); } })
      .catch(() => { if (a) { setFollowup([]); setLoading(false); } });
    return () => { a = false; };
  }, [idRegistro, tipo]);

  const getTipoCor = (tipo) => {
    const cores = {
      "PARADO": { bg: "#FEE2E2", fg: "#DC2626" },
      "RETOMADO": { bg: "#DBEAFE", fg: "#0284C7" },
      "CANCELADO": { bg: "#FCA5A5", fg: "#7F1D1D" },
      "FINALIZADO": { bg: "#DCFCE7", fg: "#16A34A" },
      "EM_EXECUCAO": { bg: "#FEF08A", fg: "#A16207" },
      "EM_ANDAMENTO": { bg: "#FEF08A", fg: "#A16207" },
    };
    return cores[tipo] || { bg: "#F3F4F6", fg: "#6B7280" };
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={painel} onClick={(e) => e.stopPropagation()}>
        <Header icon={History} titulo={titulo || "Follow-up"} sub={sub} onClose={onClose} />

        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div>
        ) : followup.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Nenhum evento registrado.</div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {followup.map((item, i) => {
              const cor = getTipoCor(item.tipo);
              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, borderLeft: `4px solid ${cor.fg}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ background: cor.bg, color: cor.fg, padding: "4px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {item.tipo}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {tipo === "cliente" && item.numero_os && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 2 }}>OS {item.numero_os}</div>
                      )}
                      {item.descricao && <div style={{ fontSize: 13, marginBottom: 4 }}>{item.descricao}</div>}
                      {item.motivo && <div style={{ fontSize: 12, color: C.destructive, fontStyle: "italic", marginBottom: 4 }}>Motivo: {item.motivo}</div>}
                      <div style={{ fontSize: 11, color: C.textMuted, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {item.usuario_nome && <span>{item.usuario_nome}</span>}
                        {item.origem && <span>·  {item.origem}</span>}
                        <span>· {fmtDT(item.criado_em)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
