import { useState, useEffect, useCallback } from "react";
import { Calculator, RefreshCw, AlertCircle } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, sel, th, td, btnPrimary, Skeleton } from "../ui";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const hoje = new Date();

// Apuração fiscal por período: débitos das saídas por CFOP/CST + ST/DIFAL/PIS/COFINS (base EFD C190/E110).
export default function ApuracaoFiscal({ usuario }) {
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await rpc("grupos_tributarios_dados", {});
        const emps = d?.empresas || [];
        setEmpresas(emps);
        if (emps.length && !idEmpresa) setIdEmpresa(String(emps[0].id));
      } catch { /* noop */ }
    })();
    /* eslint-disable-next-line */
  }, []);

  const apurar = useCallback(async () => {
    if (!idEmpresa) { setErro("Selecione a empresa."); return; }
    setLoading(true); setErro(null);
    try {
      const r = await rpc("erp_apuracao_fiscal", { p_id_empresa: Number(idEmpresa), p_mes: Number(mes), p_ano: Number(ano) });
      setDados(r);
    } catch (e) { setErro(e.message); setDados(null); }
    finally { setLoading(false); }
  }, [idEmpresa, mes, ano]);

  const s = dados?.saidas, r = dados?.resumo, ent = dados?.entradas;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Apuração Fiscal</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Débitos das saídas por CFOP/CST — base do SPED (C190 / E110)</p>
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle(), marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>Empresa</label>
          <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ ...sel(), height: 38, minWidth: 200 }}>
            <option value="">Selecione...</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || `Empresa ${e.id}`}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Mês</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...sel(), height: 38, minWidth: 90 }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Ano</label>
          <select value={ano} onChange={(e) => setAno(e.target.value)} style={{ ...sel(), height: 38, minWidth: 90 }}>
            {[0, 1, 2].map((d) => hoje.getFullYear() - d).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={apurar} disabled={loading} style={{ ...btnPrimary(), height: 38, opacity: loading ? 0.6 : 1 }}><Calculator size={15} /> {loading ? "Apurando..." : "Apurar"}</button>
      </div>

      {erro && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive }}><AlertCircle size={16} /> {erro}</div>}

      {loading ? (
        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
      ) : dados ? (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Débito ICMS (saídas)", r.debito_icms, C.primary],
              ["Crédito ICMS (entradas)", r.credito_icms, C.success],
              ["Saldo ICMS a recolher", r.saldo_icms, C.destructive],
              ["ICMS-ST a recolher", r.icms_st_recolher, C.warning],
              ["DIFAL a recolher", r.difal_recolher, C.warning],
              ["PIS devido", r.pis_devido, C.foreground],
              ["COFINS devido", r.cofins_devido, C.foreground],
            ].map(([l, v, cor], i) => (
              <div key={i} style={cardStyle()}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono, color: cor }}>{fmtBRL(v)}</div>
              </div>
            ))}
          </div>

          {/* Saídas por CFOP/CST */}
          <div style={{ ...cardStyle(), padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Saídas por CFOP / CST</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>{s.n_notas} nota(s) · produtos {fmtBRL(s.valor_produtos)}</div>
            </div>
            {(s.por_cfop || []).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>Nenhuma NF emitida no período.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                  <thead><tr>{["CFOP", "CST/CSOSN", "Itens", "Valor", "Base ICMS", "ICMS", "ST"].map((h, i) => <th key={i} style={th(i >= 2)}>{h}</th>)}</tr></thead>
                  <tbody>
                    {s.por_cfop.map((c, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{c.cfop}</td>
                        <td style={{ ...td(), fontFamily: mono }}>{c.cst || "—"}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{c.n_itens}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(c.valor)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(c.base_icms)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(c.icms)}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(c.st) ? fmtBRL(c.st) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${C.border}`, fontWeight: 700 }}>
                      <td style={td()} colSpan={4}>Total</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(s.base_icms)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(s.debito_icms)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(s.icms_st)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Entradas + avisos */}
          <div style={{ ...cardStyle(), marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Entradas (compras confirmadas)</div>
            <div style={{ fontSize: 13, color: C.muted }}>{ent?.n_notas || 0} nota(s) · produtos {fmtBRL(ent?.valor_produtos)} · IPI {fmtBRL(ent?.valor_ipi)} · ST {fmtBRL(ent?.valor_st)} · <b style={{ color: C.success }}>crédito ICMS {fmtBRL(ent?.credito_icms)}</b></div>
          </div>
          {(dados.avisos || []).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.warning, marginTop: 6 }}><AlertCircle size={14} /> {a}</div>
          ))}
        </>
      ) : (
        <div style={{ ...cardStyle(), textAlign: "center", padding: "48px 0", color: C.textMuted }}>
          <Calculator size={30} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontSize: 13 }}>Selecione empresa e período e clique em Apurar.</div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
