import { useState, useEffect, useCallback } from "react";
import { Calculator, AlertCircle } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, sel, td, th, btnPrimary, Skeleton } from "../ui";

const ABAS = [["rescisao", "Rescisão"], ["ferias", "Férias"], ["decimo", "13º Salário"]];
const TIPOS_DESLIG = [
  ["SEM_JUSTA_CAUSA", "Sem justa causa"], ["PEDIDO", "Pedido de demissão"], ["ACORDO_484A", "Acordo (484-A)"],
  ["JUSTA_CAUSA", "Justa causa"], ["TERMINO", "Término de contrato"], ["INDIRETA", "Rescisão indireta"],
];

export default function VerbasTrabalhistas({ usuario }) {
  const [colabs, setColabs] = useState([]);
  const [idColab, setIdColab] = useState("");
  const [aba, setAba] = useState("rescisao");
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  // parâmetros por aba
  const [tipo, setTipo] = useState("SEM_JUSTA_CAUSA");
  const [dataDeslig, setDataDeslig] = useState(new Date().toISOString().slice(0, 10));
  const [saldoFgts, setSaldoFgts] = useState("");
  const [avisoInden, setAvisoInden] = useState(true);
  const [feriasVenc, setFeriasVenc] = useState(false);
  const [diasFerias, setDiasFerias] = useState(30);
  const [abonoDias, setAbonoDias] = useState(0);
  const [avos13, setAvos13] = useState(12);

  useEffect(() => { (async () => {
    try { const l = await rpc("erp_colaboradores_listar", { p_id_empresa: null, p_busca: null, p_incluir_inativos: true }); setColabs(l || []); if (l?.length) setIdColab(String(l[0].id)); }
    catch (e) { setErro(e.message); }
  })(); }, []);

  const calcular = useCallback(async () => {
    if (!idColab) { setErro("Selecione o colaborador."); return; }
    setLoading(true); setErro(null); setRes(null);
    try {
      let r;
      if (aba === "rescisao") r = await rpc("erp_rescisao_calcular", { p_id_colaborador: Number(idColab), p_data_deslig: dataDeslig, p_tipo: tipo, p_saldo_fgts: saldoFgts ? Number(saldoFgts) : null, p_aviso_indenizado: avisoInden, p_ferias_vencidas: feriasVenc });
      else if (aba === "ferias") r = await rpc("erp_ferias_calcular", { p_id_colaborador: Number(idColab), p_dias: Number(diasFerias), p_abono_dias: Number(abonoDias), p_comp: "2026-01-01" });
      else r = await rpc("erp_decimo_terceiro_calcular", { p_id_colaborador: Number(idColab), p_avos: Number(avos13), p_comp: "2026-12-01" });
      setRes(r);
    } catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setLoading(false); }
  }, [aba, idColab, tipo, dataDeslig, saldoFgts, avisoInden, feriasVenc, diasFerias, abonoDias, avos13]);

  const linha = (l, v, sinal) => (
    <tr style={{ borderTop: `1px solid ${C.border}` }}>
      <td style={td()}>{l}</td>
      <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: sinal === "−" ? C.destructive : C.foreground }}>{sinal || ""} {fmtBRL(v)}</td>
    </tr>
  );

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Rescisão · Férias · 13º</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Calculadoras que puxam salário e dependentes do cadastro e aplicam o motor (INSS/IRRF). Estimativas — validar com contador.</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {ABAS.map(([k, l]) => (
          <button key={k} onClick={() => { setAba(k); setRes(null); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${aba === k ? C.primary : C.border}`, background: aba === k ? C.primary : "transparent", color: aba === k ? "#fff" : C.foreground, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      <div style={{ ...cardStyle(), marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 220 }}>
          <label style={lbl}>Colaborador</label>
          <select value={idColab} onChange={(e) => setIdColab(e.target.value)} style={{ ...sel(), height: 38, width: "100%" }}>
            {colabs.map((c) => <option key={c.id} value={c.id}>{c.nome} — {fmtBRL(c.salario_base)}</option>)}
          </select>
        </div>

        {aba === "rescisao" && <>
          <div><label style={lbl}>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ ...sel(), height: 38, minWidth: 180 }}>{TIPOS_DESLIG.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label style={lbl}>Data desligamento</label><input type="date" value={dataDeslig} onChange={(e) => setDataDeslig(e.target.value)} style={{ ...inp(), height: 38 }} /></div>
          <div><label style={lbl}>Saldo FGTS (opc.)</label><input type="number" value={saldoFgts} onChange={(e) => setSaldoFgts(e.target.value)} placeholder="estimado" style={{ ...inp(), height: 38, width: 120 }} /></div>
          <label style={chk}><input type="checkbox" checked={avisoInden} onChange={(e) => setAvisoInden(e.target.checked)} /> Aviso indenizado</label>
          <label style={chk}><input type="checkbox" checked={feriasVenc} onChange={(e) => setFeriasVenc(e.target.checked)} /> Tem férias vencidas</label>
        </>}
        {aba === "ferias" && <>
          <div><label style={lbl}>Dias de férias</label><input type="number" value={diasFerias} onChange={(e) => setDiasFerias(e.target.value)} style={{ ...inp(), height: 38, width: 110 }} /></div>
          <div><label style={lbl}>Abono (venda, dias)</label><input type="number" value={abonoDias} onChange={(e) => setAbonoDias(e.target.value)} style={{ ...inp(), height: 38, width: 130 }} /></div>
        </>}
        {aba === "decimo" && <>
          <div><label style={lbl}>Avos (meses)</label><input type="number" value={avos13} onChange={(e) => setAvos13(e.target.value)} style={{ ...inp(), height: 38, width: 110 }} /></div>
        </>}

        <button onClick={calcular} disabled={loading} style={{ ...btnPrimary(), height: 38, opacity: loading ? 0.6 : 1 }}><Calculator size={15} /> {loading ? "Calculando..." : "Calcular"}</button>
      </div>

      {erro && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive }}><AlertCircle size={16} /> {erro}</div>}

      {loading ? <div style={{ ...cardStyle() }}><Skeleton h={34} /></div> : res && (
        <div style={{ ...cardStyle(), maxWidth: 560 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><th style={th(false)}>Verba</th><th style={th(true)}>Valor</th></tr></thead>
            <tbody>
              {aba === "rescisao" && <>
                {linha("Saldo de salário", res.verbas.saldo_salario)}
                {Number(res.verbas.aviso_previo) > 0 && linha(`Aviso prévio (${res.aviso_dias} dias)`, res.verbas.aviso_previo)}
                {Number(res.verbas.decimo_terceiro_prop) > 0 && linha(`13º proporcional (${res.avos_13}/12)`, res.verbas.decimo_terceiro_prop)}
                {Number(res.verbas.ferias_prop) > 0 && linha(`Férias proporcionais (${res.avos_ferias}/12)`, res.verbas.ferias_prop)}
                {Number(res.verbas.terco_ferias_prop) > 0 && linha("1/3 sobre férias prop.", res.verbas.terco_ferias_prop)}
                {Number(res.verbas.ferias_vencidas) > 0 && linha("Férias vencidas", res.verbas.ferias_vencidas)}
                {Number(res.verbas.terco_ferias_venc) > 0 && linha("1/3 férias vencidas", res.verbas.terco_ferias_venc)}
                {Number(res.verbas.multa_fgts) > 0 && linha(`Multa FGTS (${res.multa_fgts_pct}%)`, res.verbas.multa_fgts)}
                {linha("INSS", res.descontos.inss, "−")}
                {Number(res.descontos.irrf) > 0 && linha("IRRF", res.descontos.irrf, "−")}
              </>}
              {aba === "ferias" && <>
                {linha(`Férias (${res.dias} dias)`, res.ferias)}
                {linha("1/3 constitucional", res.terco)}
                {Number(res.abono_pecuniario) > 0 && linha("Abono pecuniário", res.abono_pecuniario)}
                {Number(res.abono_terco) > 0 && linha("1/3 do abono", res.abono_terco)}
                {linha("INSS", res.inss, "−")}
                {Number(res.irrf) > 0 && linha("IRRF", res.irrf, "−")}
              </>}
              {aba === "decimo" && <>
                {linha(`13º (${res.avos}/12)`, res.decimo_terceiro)}
                {linha("1ª parcela (até 30/11)", res.primeira_parcela)}
                {linha("INSS", res.inss, "−")}
                {Number(res.irrf) > 0 && linha("IRRF", res.irrf, "−")}
                {linha("2ª parcela (até 20/12)", res.segunda_parcela)}
              </>}
            </tbody>
            <tfoot><tr style={{ borderTop: `2px solid ${C.border}`, fontWeight: 700 }}>
              <td style={td()}>Líquido</td>
              <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.success, fontSize: 15 }}>{fmtBRL(res.liquido)}</td>
            </tr></tfoot>
          </table>
          {res.obs && <div style={{ marginTop: 10, fontSize: 11.5, color: C.textMuted, display: "flex", gap: 6 }}><AlertCircle size={13} /> {res.obs}</div>}
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
const chk = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.foreground, cursor: "pointer", whiteSpace: "nowrap", paddingBottom: 8 };
