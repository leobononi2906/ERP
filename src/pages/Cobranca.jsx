import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Search, Phone, AlertCircle } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, th, td, btnGhost, Skeleton } from "../ui";
import { useEmpresaAtiva } from "../empresa";

const fmtData = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// Cobrança: worklist de títulos a receber em aberto (vencidos primeiro), com contato do cliente.
export default function Cobranca({ usuario }) {
  const empresa = useEmpresaAtiva();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("VENCIDOS"); // VENCIDOS | TODOS | A_VENCER

  const carregar = useCallback(async () => {
    setLoading(true);
    try { const r = await rpc("erp_cobranca_listar", { p_id_empresa: empresa }); setLista(Array.isArray(r) ? r : []); }
    catch (e) { setLista([]); }
    finally { setLoading(false); }
  }, [empresa]);
  useEffect(() => { carregar(); }, [carregar]);

  const resumo = useMemo(() => {
    let vencido = 0, aVencer = 0, total = 0, nClientes = new Set();
    lista.forEach((t) => {
      const s = num(t.valor_saldo);
      total += s; nClientes.add(t.id_cliente);
      if (num(t.dias_atraso) > 0) vencido += s; else aVencer += s;
    });
    return { vencido, aVencer, total, clientes: nClientes.size };
  }, [lista]);

  const filtrada = lista.filter((t) => {
    const q = busca.trim().toLowerCase();
    const okBusca = !q || [t.cliente, t.numero].some((v) => String(v || "").toLowerCase().includes(q));
    const okFiltro = filtro === "TODOS" ? true : filtro === "VENCIDOS" ? num(t.dias_atraso) > 0 : num(t.dias_atraso) <= 0;
    return okBusca && okFiltro;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Cobrança</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Títulos a receber em aberto — vencidos primeiro</p>
        </div>
        <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { l: "Vencido", v: fmtBRL(resumo.vencido), c: C.destructive },
          { l: "A vencer", v: fmtBRL(resumo.aVencer), c: C.warning },
          { l: "Total em aberto", v: fmtBRL(resumo.total), c: C.primary },
          { l: "Clientes", v: resumo.clientes, c: C.foreground },
        ].map((k, i) => (
          <div key={i} style={cardStyle()}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou nº do título..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["VENCIDOS", "Vencidos"], ["A_VENCER", "A vencer"], ["TODOS", "Todos"]].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ ...btnGhost(), background: filtro === v ? C.bluePale : "#fff", color: filtro === v ? C.primary : C.foreground, borderColor: filtro === v ? C.blueLight : C.border }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}</div>
        ) : filtrada.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <AlertCircle size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhum título {filtro === "VENCIDOS" ? "vencido" : "em aberto"}.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead><tr>{["Título", "Cliente", "Vencimento", "Atraso", "Saldo", "Contato"].map((h, i) => <th key={i} style={th(i === 4)}>{h}</th>)}</tr></thead>
              <tbody>
                {filtrada.map((t) => {
                  const atr = num(t.dias_atraso);
                  const tel = soDigitos(t.telefone);
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{t.numero}</span>{t.parcela ? <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>{t.parcela}</span> : null}</td>
                      <td style={{ ...td(), maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.cliente || "—"}</td>
                      <td style={{ ...td(), fontFamily: mono }}>{fmtData(t.data_vencimento)}</td>
                      <td style={td()}>{atr > 0 ? <span style={{ color: C.destructive, fontWeight: 700 }}>{atr}d</span> : <span style={{ color: C.textMuted }}>—</span>}</td>
                      <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(t.valor_saldo)}</td>
                      <td style={td()}>
                        {tel ? <a href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.success, fontWeight: 600, textDecoration: "none" }}><Phone size={13} /> {t.telefone}</a> : <span style={{ color: C.textMuted }}>sem contato</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
