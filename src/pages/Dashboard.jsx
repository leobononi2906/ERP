import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChevronDown, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { Card, Skeleton } from "../ui";

const MESES = { "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez" };
const fmtK = (v) => v >= 1e6 ? "R$ " + (v / 1e6).toFixed(1).replace(".", ",") + "M" : v >= 1e3 ? "R$ " + (v / 1e3).toFixed(1).replace(".", ",") + "K" : "R$ " + Math.round(v);

const FALLBACK = {
  kpis: { faturamento: 140806.30, qtd_vendas: 180, ticket_medio: 782.26 }, abertas: 29, canceladas: 11, qtd_clientes: 15, qtd_produtos: 12,
  por_empresa: [{ empresa: "Battogo", faturamento: 25128.2, vendas: 26 }, { empresa: "MLB PR", faturamento: 23144.1, vendas: 25 }, { empresa: "Truckprest", faturamento: 19100.3, vendas: 29 }, { empresa: "Santa Tereza", faturamento: 18253.1, vendas: 22 }, { empresa: "Op. Logistico", faturamento: 16246.7, vendas: 21 }, { empresa: "Bononi PR", faturamento: 13348.9, vendas: 18 }, { empresa: "Bononi SC", faturamento: 13264.8, vendas: 23 }, { empresa: "MLB SC", faturamento: 12320.2, vendas: 16 }],
  mensal: [{ mes: "2026-02", faturamento: 18319.6 }, { mes: "2026-03", faturamento: 19095.7 }, { mes: "2026-04", faturamento: 24436 }, { mes: "2026-05", faturamento: 29172.3 }, { mes: "2026-06", faturamento: 28518.8 }, { mes: "2026-07", faturamento: 14870.2 }],
  top_produtos: [{ produto: "Lona Maritima Caminhao 5x5m", faturamento: 35091 }, { produto: "Radio MP3 Bluetooth Automotivo", faturamento: 23490.6 }, { produto: "Capa de Banco Caminhao Par", faturamento: 16791.6 }, { produto: "Camera de Re com Sensor", faturamento: 13422.1 }, { produto: "Cabo Auxiliar Bateria 500A", faturamento: 10550.4 }, { produto: "Filtro de Ar Esportivo", faturamento: 10518.3 }],
  recentes: [{ numero: "V000066", empresa: "Battogo", cliente: "Caminhoes Cia", valor_total: 569.5, status: "FATURADA", data: "19/07" }, { numero: "V000096", empresa: "Bononi SC", cliente: "Rede Sul", valor_total: 479.6, status: "FATURADA", data: "19/07" }, { numero: "V000090", empresa: "Truckprest", cliente: "Oficina Joao", valor_total: 174.5, status: "ABERTA", data: "18/07" }, { numero: "V000219", empresa: "Op. Logistico", cliente: "Rapido Sul", valor_total: 799.2, status: "FATURADA", data: "15/07" }],
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(FALLBACK);
  const [live, setLive] = useState(false);
  const [empresa, setEmpresa] = useState("TODAS");

  useEffect(() => {
    let a = true;
    rpc("dashboard_resumo").then((j) => { if (a && j && j.kpis) { setDados(j); setLive(true); } }).catch(() => { }).finally(() => a && setLoading(false));
    return () => { a = false; };
  }, []);

  const emp = empresa === "TODAS" ? null : dados.por_empresa.find((e) => e.empresa === empresa);
  const fat = Number(emp ? emp.faturamento : dados.kpis.faturamento);
  const nv = emp ? emp.vendas : dados.kpis.qtd_vendas;
  const ticket = nv ? fat / nv : 0;
  const recentes = empresa === "TODAS" ? dados.recentes : (dados.recentes || []).filter((r) => r.empresa === empresa);
  const bar = (dados.por_empresa || []).map((e) => ({ nome: e.empresa, valor: Number(e.faturamento) }));
  const area = (dados.mensal || []).map((m) => ({ mes: MESES[m.mes.slice(5)] || m.mes, valor: Number(m.faturamento) }));
  const maxP = Math.max(1, ...(dados.top_produtos || []).map((p) => Number(p.faturamento)));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
            Visão geral do grupo {live ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.success, fontWeight: 600 }}><Wifi size={13} /> ao vivo</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.textMuted }}><WifiOff size={13} /> demonstração</span>}
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={{ appearance: "none", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 34px 9px 12px", fontSize: 13, fontFamily: "inherit", color: C.foreground, cursor: "pointer", fontWeight: 500 }}>
            <option value="TODAS">Todas as empresas</option>
            {(dados.por_empresa || []).map((e) => <option key={e.empresa} value={e.empresa}>{e.empresa}</option>)}
          </select>
          <ChevronDown size={16} style={{ position: "absolute", right: 10, top: 11, color: C.textMuted, pointerEvents: "none" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
        <Kpi loading={loading} label="Faturamento" value={fmtK(fat)} hint={fmtBRL(fat)} accent />
        <Kpi loading={loading} label="Vendas faturadas" value={String(nv)} hint="no período" />
        <Kpi loading={loading} label="Ticket médio" value={fmtK(ticket)} hint={fmtBRL(ticket)} />
        <Kpi loading={loading} label="Em aberto" value={String(dados.abertas)} hint="a faturar" warn />
        <Kpi loading={loading} label="Clientes" value={String(dados.qtd_clientes)} hint="cadastrados" />
        <Kpi loading={loading} label="Produtos" value={String(dados.qtd_produtos)} hint="ativos" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Card title="Faturamento por empresa">
          {loading ? <Skeleton h={240} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bar} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: C.muted }} interval={0} angle={-25} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={fmtK} width={54} />
                <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} shape={(pr) => { const sel = empresa !== "TODAS" && pr.payload.nome === empresa; return <rect x={pr.x} y={pr.y} width={pr.width} height={pr.height} rx={4} fill={sel ? C.blueLight : (empresa === "TODAS" ? C.primary : C.border)} />; }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Evolução mensal (grupo)">
          {loading ? <Skeleton h={240} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={area} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blueMid} stopOpacity={0.35} /><stop offset="100%" stopColor={C.blueMid} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={fmtK} width={54} />
                <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="valor" stroke={C.blueMid} strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card title="Top produtos">
          {loading ? <Skeleton h={180} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              {(dados.top_produtos || []).map((p) => (
                <div key={p.produto}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{p.produto}</span>
                    <span style={{ fontFamily: mono, fontWeight: 600 }}>{fmtK(Number(p.faturamento))}</span>
                  </div>
                  <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(Number(p.faturamento) / maxP) * 100}%`, background: C.blueMid, borderRadius: 3 }} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title={`Vendas recentes${empresa !== "TODAS" ? " · " + empresa : ""}`}>
          {loading ? <Skeleton h={180} /> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 4 }}>
              <thead><tr style={{ color: C.textMuted }}>{["Nº", "Cliente", "Data", "Valor"].map((h, i) => <th key={i} style={{ padding: 6, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i === 3 ? "right" : "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {recentes.map((r) => (
                  <tr key={r.numero} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 6px", fontFamily: mono, color: C.muted }}>{r.numero}</td>
                    <td style={{ padding: "8px 6px" }}>{r.cliente}</td>
                    <td style={{ padding: "8px 6px", color: C.muted }}>{r.data}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(r.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, accent, warn, loading }) {
  if (loading) return (<div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}><Skeleton h={12} w={70} /><div style={{ height: 10 }} /><Skeleton h={24} w={100} /></div>);
  const size = value.length <= 8 ? 24 : value.length <= 12 ? 20 : 16;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted }}>{label}</div>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: size, color: accent ? C.primary : warn ? C.warning : C.foreground, margin: "6px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>{accent && <TrendingUp size={12} style={{ color: C.success }} />}{hint}</div>
    </div>
  );
}
