import { useState, useEffect, useCallback } from "react";
import { Play, AlertCircle, X, FileText } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, sel, th, td, btnPrimary, Skeleton } from "../ui";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const hoje = new Date();

export default function Folha({ usuario }) {
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => { (async () => {
    try { const d = await rpc("erp_rh_dominios", {}); const e = d?.empresas || []; setEmpresas(e); if (e.length) setIdEmpresa(String(e[0].id)); } catch { /* noop */ }
  })(); }, []);

  const carregar = useCallback(async () => {
    if (!idEmpresa) return;
    setLoading(true); setErro(null);
    try { setDados(await rpc("erp_folha_obter", { p_id_empresa: Number(idEmpresa), p_mes: Number(mes), p_ano: Number(ano) })); }
    catch (e) { setErro(e.message); } finally { setLoading(false); }
  }, [idEmpresa, mes, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const gerar = async () => {
    if (!idEmpresa) { setErro("Selecione a empresa."); return; }
    setGerando(true); setErro(null);
    try { await rpc("erp_folha_gerar", { p_id_empresa: Number(idEmpresa), p_mes: Number(mes), p_ano: Number(ano) }); await carregar(); }
    catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setGerando(false); }
  };

  const abrirDetalhe = async (id) => { try { setDetalhe(await rpc("erp_holerite_detalhe", { p_id_holerite: id })); } catch (e) { setErro(e.message); } };

  const f = dados?.folha, hol = dados?.holerites || [];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Folha de Pagamento</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Geração por competência — puxa salário e dependentes do cadastro, aplica o motor (INSS/IRRF/FGTS) e os encargos patronais por regime.</p>
      </div>

      <div style={{ ...cardStyle(), marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>Empresa</label>
          <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ ...sel(), height: 38, minWidth: 190 }}>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Mês</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...sel(), height: 38, minWidth: 90 }}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div><label style={lbl}>Ano</label>
          <select value={ano} onChange={(e) => setAno(e.target.value)} style={{ ...sel(), height: 38, minWidth: 90 }}>{[0, 1, 2].map((d) => hoje.getFullYear() - d).map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
        <button onClick={gerar} disabled={gerando} style={{ ...btnPrimary(), height: 38, opacity: gerando ? 0.6 : 1 }}><Play size={15} /> {gerando ? "Gerando..." : "Gerar / Recalcular folha"}</button>
      </div>

      {erro && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive }}><AlertCircle size={16} /> {erro}</div>}

      {loading ? (
        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
      ) : f ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Colaboradores", f.qtd_colaboradores, C.foreground, true],
              ["Líquido a pagar", f.total_liquido, C.success],
              ["INSS patronal (CPP)", f.cpp_patronal, C.warning],
              ["RAT × FAP", f.rat_fap, C.warning],
              ["Terceiros (Sistema S)", f.terceiros, C.warning],
              ["FGTS do mês", f.fgts_total, C.primary],
              ["Custo total empresa", f.custo_total_empresa, C.destructive],
            ].map(([l, v, cor, inteiro], i) => (
              <div key={i} style={cardStyle()}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 19, fontWeight: 700, fontFamily: mono, color: cor }}>{inteiro ? v : fmtBRL(v)}</div>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Holerites</div>
              <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: (f.status === "FECHADA" ? C.success : C.warning) + "22", color: f.status === "FECHADA" ? C.success : C.warning }}>{f.status}</span>
            </div>
            {hol.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>Nenhum holerite. Cadastre colaboradores e clique em Gerar.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
                  <thead><tr>{["Colaborador", "Salário", "INSS", "IRRF", "Sal-família", "FGTS", "Líquido", ""].map((h, i) => <th key={i} style={th(i >= 1 && i <= 6)}>{h}</th>)}</tr></thead>
                  <tbody>
                    {hol.map((h) => (
                      <tr key={h.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirDetalhe(h.id)}>
                        <td style={td()}><div style={{ fontWeight: 600 }}>{h.nome}</div><div style={{ fontSize: 11, color: C.muted }}>{h.matricula || "—"}</div></td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(h.salario_base)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.destructive }}>{fmtBRL(h.inss)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.destructive }}>{fmtBRL(h.irrf)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{Number(h.salario_familia) ? fmtBRL(h.salario_familia) : "—"}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted }}>{fmtBRL(h.fgts)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: C.success }}>{fmtBRL(h.liquido)}</td>
                        <td style={{ ...td(), textAlign: "right", color: C.primary, fontSize: 12 }}>ver</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ ...cardStyle(), textAlign: "center", padding: "48px 0", color: C.textMuted }}><FileText size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Selecione a competência e clique em Gerar folha.</div></div>
      )}

      {detalhe && (
        <div style={overlay} onClick={() => setDetalhe(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{detalhe.holerite?.nome}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{[detalhe.holerite?.cargo, `eSocial ${detalhe.holerite?.categoria_esocial}`].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Cód.", "Descrição", "Ref.", "Valor"].map((h, i) => <th key={i} style={th(i === 3)}>{h}</th>)}</tr></thead>
              <tbody>
                {(detalhe.itens || []).map((it) => (
                  <tr key={it.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontFamily: mono }}>{it.codigo}</td>
                    <td style={td()}>{it.descricao} {it.tipo === "INFORMATIVO" && <span style={{ fontSize: 10.5, color: C.muted }}>(inform.)</span>}</td>
                    <td style={{ ...td(), color: C.muted, fontSize: 12 }}>{it.referencia || "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: it.tipo === "DESCONTO" ? C.destructive : it.tipo === "INFORMATIVO" ? C.muted : C.foreground }}>{it.tipo === "DESCONTO" ? "−" : ""}{fmtBRL(it.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ borderTop: `2px solid ${C.border}`, fontWeight: 700 }}><td style={td()} colSpan={3}>Líquido</td><td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.success }}>{fmtBRL(detalhe.holerite?.liquido)}</td></tr></tfoot>
            </table>
            {Number(detalhe.holerite?.redutor_irrf) > 0 && <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>IRRF método {detalhe.holerite?.metodo_irrf} · redutor 2026 aplicado {fmtBRL(detalhe.holerite?.redutor_irrf)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 50, overflowY: "auto" };
const modal = { ...cardStyle(), width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" };
