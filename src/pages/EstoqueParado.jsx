import { useState, useEffect } from "react";
import { PackageX, AlertCircle, RefreshCw, Download } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Campo, Skeleton } from "../ui";

export default function EstoqueParado({ usuario }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [fEmpresa, setFEmpresa] = useState("");
  const [dias, setDias] = useState(90);
  const [fGrupo, setFGrupo] = useState("");
  const [fSubgrupo, setFSubgrupo] = useState("");
  const [busca, setBusca] = useState("");

  async function carregar() {
    setLoading(true); setErro("");
    try {
      const d = await rpc("erp_estoque_parado", {
        p_id_empresa: fEmpresa ? Number(fEmpresa) : null, p_dias: Number(dias) || 90,
        p_id_grupo: fGrupo ? Number(fGrupo) : null, p_id_subgrupo: fSubgrupo ? Number(fSubgrupo) : null,
        p_busca: busca.trim() || null,
      });
      setDados(d);
    } catch (e) { setErro(e.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const L = dados || {};
  const itens = L.itens || [], resumo = L.resumo || {};
  const empresas = L.empresas || [], grupos = L.grupos || [], subgrupos = (L.subgrupos || []).filter((s) => !fGrupo || String(s.id_grupo) === String(fGrupo));

  function exportarCSV() {
    const head = ["Referência", "Produto", "Grupo", "Subgrupo", "Estoque", "Custo médio", "Valor parado", "Dias parado", "Última saída"];
    const linhas = itens.map((i) => [i.referencia || "", i.nome || "", i.grupo || "", i.subgrupo || "", num(i.estoque), num(i.custo_medio), num(i.valor_parado), i.dias_parado ?? "", i.ultima_saida ? String(i.ultima_saida).slice(0, 10) : "nunca"]);
    const csv = [head, ...linhas].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "estoque-parado.csv"; a.click();
  }

  const diasCor = (d) => d >= 180 ? C.destructive : d >= 90 ? C.warning : C.muted;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Estoque Parado</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Produtos com saldo em estoque e <b>sem saída</b> no período — capital imobilizado a girar ou negociar</p>
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle(), marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 120px auto", gap: 12, alignItems: "end" }}>
          <Campo label="Empresa"><select value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} style={sel(true)}><option value="">Todas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></Campo>
          <Campo label="Grupo"><select value={fGrupo} onChange={(e) => { setFGrupo(e.target.value); setFSubgrupo(""); }} style={sel(true)}><option value="">Todos</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select></Campo>
          <Campo label="Subgrupo"><select value={fSubgrupo} onChange={(e) => setFSubgrupo(e.target.value)} style={sel(true)}><option value="">Todos</option>{subgrupos.map((s) => <option key={s.id} value={s.id}>{s.descricao}</option>)}</select></Campo>
          <Campo label="Sem saída há (dias)"><input value={dias} onChange={(e) => setDias(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" style={{ ...inp(true), fontFamily: mono }} /></Campo>
          <button onClick={carregar} disabled={loading} style={{ ...btnPrimary(), justifyContent: "center" }}><RefreshCw size={15} /> Aplicar</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <Campo label="Buscar produto"><input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") carregar(); }} placeholder="nome ou referência" style={inp(true)} /></Campo>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
        <Kpi lbl="Produtos parados" val={resumo.produtos ?? 0} />
        <Kpi lbl="Valor imobilizado" val={fmtBRL(resumo.valor_total)} cor={C.destructive} />
        <Kpi lbl="Qtd em estoque" val={num(resumo.estoque_total).toLocaleString("pt-BR")} />
      </div>

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.muted }}>Itens parados</div>
          {itens.length > 0 && <button onClick={exportarCSV} style={btnGhost()}><Download size={14} /> Exportar CSV</button>}
        </div>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={28} />)}</div>
          : erro ? <div style={{ padding: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: C.destructiveBg, color: C.destructive, fontSize: 13 }}><AlertCircle size={16} /> {erro}</div></div>
            : itens.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><PackageX size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum produto parado para os filtros.</div></div>
              : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
                <thead><tr>{["Ref.", "Produto", "Grupo / Subgrupo", "Estoque", "Custo méd.", "Valor parado", "Dias parado", "Última saída"].map((h, i) => <th key={i} style={th(i >= 3 && i <= 6)}>{h}</th>)}</tr></thead>
                <tbody>{itens.map((i) => (
                  <tr key={i.id_produto} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{i.referencia || "—"}</td>
                    <td style={{ ...td(), fontWeight: 500 }}>{i.nome}</td>
                    <td style={{ ...td(), color: C.muted, fontSize: 12 }}>{i.grupo || "—"}{i.subgrupo ? " · " + i.subgrupo : ""}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(i.estoque).toLocaleString("pt-BR")}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(i.custo_medio)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(i.valor_parado)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: diasCor(i.dias_parado) }}>{i.dias_parado ?? "—"}</td>
                    <td style={{ ...td(), color: C.muted, fontSize: 12 }}>{i.ultima_saida ? new Date(String(i.ultima_saida)).toLocaleDateString("pt-BR") : "nunca vendeu"}</td>
                  </tr>))}
                </tbody>
              </table></div>}
      </div>
    </>
  );
}

function Kpi({ lbl, val, cor }) {
  return (
    <div style={cardStyle()}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 6 }}>{lbl}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: cor || C.foreground }}>{val}</div>
    </div>
  );
}
