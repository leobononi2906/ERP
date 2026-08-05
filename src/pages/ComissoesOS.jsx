import { useState, useEffect } from "react";
import { RefreshCw, DollarSign, Users, Clock } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, th, td, btnGhost, Skeleton, Badge } from "../ui";

const fmtH = (h) => (Number(h) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "h";

// Comissão de serviço rateada por apontamento (colaborador + área + horas).
export default function ComissoesOS() {
  const hoje = new Date();
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [dataIni, setDataIni] = useState(ini);
  const [dataFim, setDataFim] = useState(fim);
  const [soFaturadas, setSoFaturadas] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({ linhas: [], por_colaborador: [] });

  async function carregar() {
    setLoading(true);
    try {
      const d = await rpc("erp_comissoes_os_dados", {
        p_data_ini: dataIni || null, p_data_fim: dataFim || null,
        p_id_os: null, p_somente_faturadas: soFaturadas,
      });
      setDados({ linhas: Array.isArray(d?.linhas) ? d.linhas : [], por_colaborador: Array.isArray(d?.por_colaborador) ? d.por_colaborador : [] });
    } catch (e) { console.error(e); setDados({ linhas: [], por_colaborador: [] }); }
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line

  const totalComissao = dados.por_colaborador.reduce((s, c) => s + (Number(c.valor_comissao) || 0), 0);
  const totalHoras = dados.por_colaborador.reduce((s, c) => s + (Number(c.horas) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Comissões de Serviço</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Rateio por apontamento — cada colaborador recebe pela sua parcela de horas faturáveis</p>
        </div>
        <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <label style={lbl}>De</label>
          <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} style={inp()} />
        </div>
        <div>
          <label style={lbl}>Até</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={inp()} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.muted, cursor: "pointer", height: 40 }}>
          <input type="checkbox" checked={soFaturadas} onChange={(e) => setSoFaturadas(e.target.checked)} /> Só OS faturadas
        </label>
        <button onClick={carregar} style={{ ...btnGhost(), height: 40 }}>Aplicar</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={cardStyle()}><div style={kpiLbl}><Users size={13} /> Colaboradores</div><div style={kpiVal}>{dados.por_colaborador.length}</div></div>
        <div style={cardStyle()}><div style={kpiLbl}><Clock size={13} /> Horas faturáveis</div><div style={{ ...kpiVal, color: C.primary }}>{fmtH(totalHoras)}</div></div>
        <div style={cardStyle()}><div style={kpiLbl}><DollarSign size={13} /> Total comissão</div><div style={{ ...kpiVal, color: C.success }}>{fmtBRL(totalComissao)}</div></div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={44} />)}</div>
      ) : (
        <>
          {/* Resumo por colaborador */}
          <div style={{ ...cardStyle(), marginBottom: 16 }}>
            <div style={secTit}>Resumo por colaborador</div>
            <table style={tabela}>
              <thead><tr><th style={th()}>Colaborador</th><th style={{ ...th(), textAlign: "right" }}>Horas</th><th style={{ ...th(), textAlign: "right" }}>Base rateada</th><th style={{ ...th(), textAlign: "right" }}>Comissão</th></tr></thead>
              <tbody>
                {dados.por_colaborador.map((c) => (
                  <tr key={c.id_colaborador} style={linha}>
                    <td style={{ ...td(), fontWeight: 600 }}>{c.colaborador}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtH(c.horas)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(c.valor_rateado)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: C.success }}>{fmtBRL(c.valor_comissao)}</td>
                  </tr>
                ))}
                {dados.por_colaborador.length === 0 && <tr><td colSpan={4} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 30 }}>Sem comissões no período.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Detalhe por serviço */}
          <div style={cardStyle()}>
            <div style={secTit}>Detalhe por serviço</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tabela, minWidth: 720 }}>
                <thead><tr>
                  <th style={th()}>OS</th><th style={th()}>Serviço</th><th style={th()}>Área</th><th style={th()}>Colaborador</th>
                  <th style={{ ...th(), textAlign: "right" }}>Horas</th><th style={{ ...th(), textAlign: "right" }}>Base rateada</th>
                  <th style={{ ...th(), textAlign: "right" }}>%</th><th style={{ ...th(), textAlign: "right" }}>Comissão</th>
                </tr></thead>
                <tbody>
                  {dados.linhas.map((l, i) => (
                    <tr key={i} style={linha}>
                      <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{l.numero_os}</td>
                      <td style={{ ...td(), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.servico}</td>
                      <td style={td()}>{l.area ? <Badge texto={l.area} cor="info" /> : <span style={{ color: C.textMuted }}>—</span>}</td>
                      <td style={td()}>{l.colaborador}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtH(l.horas)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(l.valor_rateado)}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.muted }}>{Number(l.perc) || 0}%</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: C.success }}>{fmtBRL(l.valor_comissao)}</td>
                    </tr>
                  ))}
                  {dados.linhas.length === 0 && <tr><td colSpan={8} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 30 }}>Sem apontamentos faturáveis no período.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const tabela = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const linha = { borderBottom: `1px solid ${C.border}` };
const lbl = { display: "block", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 4 };
const kpiLbl = { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 };
const kpiVal = { fontSize: 24, fontWeight: 700, fontFamily: mono };
const secTit = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.muted, marginBottom: 12 };
