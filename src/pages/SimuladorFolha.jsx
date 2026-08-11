import { useState, useEffect, useCallback } from "react";
import { Calculator, AlertCircle, Users } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, th, td, btnPrimary, Skeleton } from "../ui";

// Simulador de folha — prova o motor fn_folha_calcular (INSS progressivo, IRRF c/ redutor 2026, FGTS).
export default function SimuladorFolha({ usuario }) {
  const [f, setF] = useState({ salario: "3000", num_dep: "0", filhos_sf: "0", pensao: "0", outros_prov: "0", outros_desc: "0", aprendiz: false });
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [rubricas, setRubricas] = useState([]);

  useEffect(() => {
    (async () => { try { setRubricas(await rpc("erp_rh_rubricas", {}) || []); } catch { /* noop */ } })();
  }, []);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const calcular = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const r = await rpc("erp_folha_calcular", {
        p_salario: Number(f.salario) || 0, p_comp: "2026-01-01",
        p_num_dep: Number(f.num_dep) || 0, p_num_filhos_sf: Number(f.filhos_sf) || 0,
        p_pensao: Number(f.pensao) || 0, p_aprendiz: f.aprendiz,
        p_outros_proventos: Number(f.outros_prov) || 0, p_outros_descontos: Number(f.outros_desc) || 0,
      });
      setRes(r);
    } catch (e) { setErro(e.message); setRes(null); }
    finally { setLoading(false); }
  }, [f]);

  const prov = res?.proventos, desc = res?.descontos, irrfDet = res?.irrf_detalhe;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Folha — Simulador</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Motor de cálculo (competência 2026): INSS progressivo, IRRF com redutor da Lei 15.270/2025, FGTS. Tabelas versionadas por competência.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: 16, alignItems: "start" }}>
        {/* Entrada */}
        <div style={cardStyle()}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Dados do cálculo</div>
          {[
            ["salario", "Salário base (R$)", "number"],
            ["num_dep", "Dependentes (IRRF)", "number"],
            ["filhos_sf", "Filhos p/ salário-família", "number"],
            ["pensao", "Pensão alimentícia (R$)", "number"],
            ["outros_prov", "Outros proventos (R$)", "number"],
            ["outros_desc", "Outros descontos (R$)", "number"],
          ].map(([k, l, t]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label style={lbl}>{l}</label>
              <input type={t} value={f[k]} onChange={set(k)} style={{ ...inp(), width: "100%" }} />
            </div>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "6px 0 14px", cursor: "pointer" }}>
            <input type="checkbox" checked={f.aprendiz} onChange={set("aprendiz")} /> Aprendiz (FGTS 2%)
          </label>
          <button onClick={calcular} disabled={loading} style={{ ...btnPrimary(), width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}><Calculator size={15} /> {loading ? "Calculando..." : "Calcular"}</button>
        </div>

        {/* Resultado */}
        <div>
          {erro && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive }}><AlertCircle size={16} /> {erro}</div>}
          {loading ? (
            <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
          ) : res ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  ["Base de cálculo", res.base, C.foreground],
                  ["INSS", desc.inss, C.destructive],
                  ["IRRF", desc.irrf, C.destructive],
                  ["FGTS (patronal)", res.fgts_patronal, C.muted],
                  ["Líquido a receber", res.liquido, C.success],
                ].map(([l, v, cor], i) => (
                  <div key={i} style={cardStyle()}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 19, fontWeight: 700, fontFamily: mono, color: cor }}>{fmtBRL(v)}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle(), marginBottom: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>Demonstrativo</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {[
                      ["Salário base", prov.salario, "+"],
                      ["Outros proventos", prov.outros, "+"],
                      ["Salário-família", prov.salario_familia, "+"],
                      ["INSS", desc.inss, "−"],
                      ["IRRF", desc.irrf, "−"],
                      ["Pensão alimentícia", desc.pensao, "−"],
                      ["Outros descontos", desc.outros, "−"],
                    ].filter(([, v]) => Number(v) !== 0).map(([l, v, sinal], i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={td()}>{l}</td>
                        <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: sinal === "−" ? C.destructive : C.foreground }}>{sinal} {fmtBRL(v)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${C.border}`, fontWeight: 700 }}>
                      <td style={td()}>Líquido</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.success }}>{fmtBRL(res.liquido)}</td>
                    </tr>
                  </tbody>
                </table>
                {irrfDet && (
                  <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
                    IRRF: método <b>{irrfDet.metodo}</b> · imposto da tabela {fmtBRL(irrfDet.imposto_tabela)}
                    {Number(irrfDet.redutor) > 0 && <> · redutor 2026 <b style={{ color: C.success }}>−{fmtBRL(irrfDet.redutor)}</b></>}
                    {Number(irrfDet.imposto) === 0 && <> · <b style={{ color: C.success }}>isento após redutor</b></>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ ...cardStyle(), textAlign: "center", padding: "44px 0", color: C.textMuted }}>
              <Calculator size={30} style={{ opacity: 0.4 }} />
              <div style={{ marginTop: 10, fontSize: 13 }}>Preencha os dados e clique em Calcular.</div>
            </div>
          )}

          {/* Rubricas cadastradas */}
          <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} /> <span style={{ fontSize: 13.5, fontWeight: 700 }}>Rubricas ({rubricas.length}) — incidências</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
                <thead><tr>{["Cód.", "Descrição", "Tipo", "INSS", "IRRF", "FGTS"].map((h, i) => <th key={i} style={th(i >= 3)}>{h}</th>)}</tr></thead>
                <tbody>
                  {rubricas.map((r) => (
                    <tr key={r.codigo} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontFamily: mono }}>{r.codigo}</td>
                      <td style={td()}>{r.descricao}</td>
                      <td style={{ ...td(), color: C.muted }}>{r.tipo}</td>
                      {["incide_inss", "incide_irrf", "incide_fgts"].map((k) => (
                        <td key={k} style={{ ...td(), textAlign: "center", color: r[k] ? C.success : C.textMuted }}>{r[k] ? "✓" : "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
