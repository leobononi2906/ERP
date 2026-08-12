import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Save, Plus, Landmark, Percent, X } from "lucide-react";
import { C, mono, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Campo, Skeleton } from "../ui";

const REGIMES = ["", "SIMPLES", "PRESUMIDO", "REAL"];
const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };

// Configuração fiscal: regime tributário POR EMPRESA (o grupo tem os 3) + grupos tributários (com flag monofásico).
// É o que o motor erp_calcular_impostos_item lê para resolver CST/CSOSN e o tratamento monofásico.
export default function ConfigFiscal({ usuario }) {
  const [empresas, setEmpresas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [savingEmp, setSavingEmp] = useState(null);
  const [modal, setModal] = useState(null); // grupo em edição (ou {} novo)

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await rpc("grupos_tributarios_dados", {});
      setEmpresas((d?.empresas || []).map((e) => ({ ...e })));
      setGrupos(d?.grupos_tributarios || []);
    } catch (e) { notificar("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const setEmp = (id, campo, valor) => setEmpresas((xs) => xs.map((e) => e.id === id ? { ...e, [campo]: valor } : e));

  async function salvarEmpresa(e) {
    setSavingEmp(e.id);
    try {
      await rpc("erp_empresa_fiscal_salvar", { p: {
        id_empresa: e.id, regime_tributario: e.regime_tributario || null,
        contribuinte_ipi: !!e.contribuinte_ipi, substituto_st: !!e.substituto_st,
      }});
      notificar(`Regime de ${e.nome_fantasia || "empresa"} salvo.`);
      await carregar();
    } catch (err) { notificar("Erro: " + err.message, "erro"); }
    finally { setSavingEmp(null); }
  }

  async function salvarEncargo(e) {
    setSavingEmp("enc" + e.id);
    try {
      await rpc("erp_empresa_encargo_salvar", { p: {
        id: e.id, cnae: e.cnae || null, fpas: e.fpas || null,
        rat_aliquota: e.rat_aliquota ?? null, fap: e.fap ?? 1.0,
        terceiros_aliquota: e.terceiros_aliquota ?? null, anexo_simples: e.anexo_simples ?? null,
        desoneracao_folha: !!e.desoneracao_folha,
      }});
      notificar(`Encargos de ${e.nome_fantasia || "empresa"} salvos.`);
      await carregar();
    } catch (err) { notificar("Erro: " + err.message, "erro"); }
    finally { setSavingEmp(null); }
  }

  // toggle monofásico direto na linha (grava na hora)
  async function toggleMonofasico(g) {
    try {
      await rpc("grupo_tributario_salvar", { p: { id: g.id, monofasico_pis_cofins: !g.monofasico_pis_cofins, _ator: usuario?.id } });
      setGrupos((xs) => xs.map((x) => x.id === g.id ? { ...x, monofasico_pis_cofins: !x.monofasico_pis_cofins } : x));
      notificar(!g.monofasico_pis_cofins ? "Marcado como monofásico (revenda PIS/COFINS zero)." : "Monofásico desmarcado.");
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  async function salvarGrupo() {
    if (!modal.descricao?.trim()) { notificar("Descrição obrigatória.", "erro"); return; }
    try {
      await rpc("grupo_tributario_salvar", { p: { ...modal, _ator: usuario?.id } });
      setModal(null);
      notificar("Grupo tributário salvo.");
      await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  return (
    <div>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.t === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{toast.m}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Configuração Fiscal</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Regime por empresa e grupos tributários — base do cálculo automático de impostos</p>
        </div>
        <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {loading ? (
        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
      ) : (
        <>
          {/* ─── Regime por empresa ─── */}
          <div style={{ ...cardStyle(), marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Landmark size={16} style={{ color: C.primary }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Regime tributário por empresa</h2>
            </div>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px" }}>O grupo opera os 3 regimes. Cada empresa define o seu — isso decide CST × CSOSN, monofásico e a apuração.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
                <thead><tr>{["Empresa", "UF", "Regime", "Contrib. IPI (importador)", "Substituto ST", ""].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
                <tbody>
                  {empresas.map((e) => (
                    <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontWeight: 500 }}>{e.nome_fantasia || `Empresa ${e.id}`}</td>
                      <td style={{ ...td(), fontFamily: mono }}>{e.uf || "—"}</td>
                      <td style={td()}>
                        <select value={e.regime_tributario || ""} onChange={(ev) => setEmp(e.id, "regime_tributario", ev.target.value)} style={{ ...sel(), height: 34, minWidth: 140 }}>
                          {REGIMES.map((r) => <option key={r} value={r}>{r || "— definir —"}</option>)}
                        </select>
                      </td>
                      <td style={{ ...td(), textAlign: "center" }}><input type="checkbox" checked={!!e.contribuinte_ipi} onChange={(ev) => setEmp(e.id, "contribuinte_ipi", ev.target.checked)} /></td>
                      <td style={{ ...td(), textAlign: "center" }}><input type="checkbox" checked={!!e.substituto_st} onChange={(ev) => setEmp(e.id, "substituto_st", ev.target.checked)} /></td>
                      <td style={{ ...td(), textAlign: "right" }}>
                        <button onClick={() => salvarEmpresa(e)} disabled={savingEmp === e.id} style={{ ...btnPrimary(), padding: "6px 12px", opacity: savingEmp === e.id ? 0.6 : 1 }}><Save size={14} /> {savingEmp === e.id ? "..." : "Salvar"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Encargos patronais (RH) por empresa ─── */}
          <div style={{ ...cardStyle(), marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Landmark size={16} style={{ color: C.primary }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Encargos patronais (folha) por empresa</h2>
            </div>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px" }}>Define CPP/RAT×FAP/Terceiros da folha. Simples anexos I–III/V: CPP no DAS (deixe anexo ≠ 4). Anexo IV e Presumido/Real recolhem por fora.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
                <thead><tr>{["Empresa", "CNAE", "FPAS", "RAT %", "FAP", "Terceiros %", "Anexo Simples", "Desonerada", ""].map((h, i) => <th key={i} style={th(i >= 3 && i <= 6)}>{h}</th>)}</tr></thead>
                <tbody>
                  {empresas.map((e) => (
                    <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontWeight: 500 }}>{e.nome_fantasia || `Empresa ${e.id}`}</td>
                      <td style={td()}><input value={e.cnae || ""} onChange={(ev) => setEmp(e.id, "cnae", ev.target.value)} style={{ ...inp(), width: 90, fontFamily: mono }} /></td>
                      <td style={td()}><input value={e.fpas || ""} onChange={(ev) => setEmp(e.id, "fpas", ev.target.value)} style={{ ...inp(), width: 60, fontFamily: mono }} /></td>
                      <td style={{ ...td(), textAlign: "right" }}><input type="number" step="0.01" value={e.rat_aliquota ?? ""} onChange={(ev) => setEmp(e.id, "rat_aliquota", ev.target.value)} style={{ ...inp(), width: 64, fontFamily: mono, textAlign: "right" }} /></td>
                      <td style={{ ...td(), textAlign: "right" }}><input type="number" step="0.0001" value={e.fap ?? 1} onChange={(ev) => setEmp(e.id, "fap", ev.target.value)} style={{ ...inp(), width: 70, fontFamily: mono, textAlign: "right" }} /></td>
                      <td style={{ ...td(), textAlign: "right" }}><input type="number" step="0.01" value={e.terceiros_aliquota ?? ""} onChange={(ev) => setEmp(e.id, "terceiros_aliquota", ev.target.value)} style={{ ...inp(), width: 64, fontFamily: mono, textAlign: "right" }} /></td>
                      <td style={{ ...td(), textAlign: "center" }}><input type="number" value={e.anexo_simples ?? ""} onChange={(ev) => setEmp(e.id, "anexo_simples", ev.target.value)} placeholder="—" style={{ ...inp(), width: 54, fontFamily: mono, textAlign: "center" }} /></td>
                      <td style={{ ...td(), textAlign: "center" }}><input type="checkbox" checked={!!e.desoneracao_folha} onChange={(ev) => setEmp(e.id, "desoneracao_folha", ev.target.checked)} /></td>
                      <td style={{ ...td(), textAlign: "right" }}><button onClick={() => salvarEncargo(e)} disabled={savingEmp === "enc" + e.id} style={{ ...btnPrimary(), padding: "6px 12px", opacity: savingEmp === "enc" + e.id ? 0.6 : 1 }}><Save size={14} /> {savingEmp === "enc" + e.id ? "..." : "Salvar"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Grupos tributários ─── */}
          <div style={{ ...cardStyle() }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Percent size={16} style={{ color: C.primary }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Grupos tributários</h2>
              </div>
              <button onClick={() => setModal({ ativo: true, monofasico_pis_cofins: false })} style={btnPrimary()}><Plus size={15} /> Novo grupo</button>
            </div>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px" }}>Marque <b>Monofásico</b> nos grupos de autopeças cujo PIS/COFINS já foi recolhido pela indústria — a revenda sai com CST 04 (alíquota zero).</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
                <thead><tr>{["Descrição", "CST/CSOSN", "ICMS %", "ST %", "MVA %", "PIS %", "COFINS %", "Monofásico", ""].map((h, i) => <th key={i} style={th(i >= 2 && i <= 6)}>{h}</th>)}</tr></thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.id} style={{ borderTop: `1px solid ${C.border}`, opacity: g.ativo ? 1 : 0.5 }}>
                      <td style={{ ...td(), fontWeight: 500 }}>{g.descricao}{g.empresa_nome ? <span style={{ fontSize: 11, color: C.textMuted }}> · {g.empresa_nome}</span> : null}</td>
                      <td style={{ ...td(), fontFamily: mono }}>{g.cst_icms || "—"}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(g.aliq_icms)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(g.aliq_icms_st) || "—"}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(g.mva_st) || "—"}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(g.aliq_pis)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(g.aliq_cofins)}</td>
                      <td style={{ ...td(), textAlign: "center" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", color: g.monofasico_pis_cofins ? C.success : C.textMuted, fontWeight: 600, fontSize: 12 }}>
                          <input type="checkbox" checked={!!g.monofasico_pis_cofins} onChange={() => toggleMonofasico(g)} />
                          {g.monofasico_pis_cofins ? "Sim" : "Não"}
                        </label>
                      </td>
                      <td style={{ ...td(), textAlign: "right" }}><button onClick={() => setModal({ ...g })} style={{ ...btnGhost(), padding: "4px 10px" }}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal editar/novo grupo */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModal(null)}>
          <div style={{ ...cardStyle(), width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }} onClick={(ev) => ev.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{modal.id ? "Editar grupo tributário" : "Novo grupo tributário"}</h3>
              <button onClick={() => setModal(null)} style={{ ...btnGhost(), padding: 6 }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 12 }}><Campo label="Descrição"><input value={modal.descricao || ""} onChange={(e) => setModal((m) => ({ ...m, descricao: e.target.value }))} style={{ ...inp(), width: "100%" }} /></Campo></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                ["cst_icms", "CST/CSOSN ICMS"], ["aliq_icms", "ICMS %"], ["red_bc_icms", "Redução BC %"],
                ["cst_icms_st", "CST ST"], ["aliq_icms_st", "ICMS-ST %"], ["mva_st", "MVA %"],
                ["cst_pis", "CST PIS"], ["aliq_pis", "PIS %"], ["cst_cofins", "CST COFINS"],
                ["aliq_cofins", "COFINS %"], ["cst_ipi", "CST IPI"], ["aliq_ipi", "IPI %"],
              ].map(([k, label]) => (
                <div key={k}><label style={lbl}>{label}</label><input value={modal[k] ?? ""} onChange={(e) => setModal((m) => ({ ...m, [k]: e.target.value }))} style={{ ...inp(), width: "100%", fontFamily: mono }} /></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 600, color: modal.monofasico_pis_cofins ? C.success : C.foreground }}>
                <input type="checkbox" checked={!!modal.monofasico_pis_cofins} onChange={(e) => setModal((m) => ({ ...m, monofasico_pis_cofins: e.target.checked }))} /> Monofásico PIS/COFINS (revenda alíquota zero)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={modal.ativo !== false} onChange={(e) => setModal((m) => ({ ...m, ativo: e.target.checked }))} /> Ativo
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={btnGhost()}>Cancelar</button>
              <button onClick={salvarGrupo} style={btnPrimary()}><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
