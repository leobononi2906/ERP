import { useState } from "react";
import { Search, Tag, X, AlertCircle, Printer } from "lucide-react";
import { C, mono } from "./config";
import { cardStyle, inp, th, td, btnIcon, btnGhost, btnPrimary, Aviso } from "./ui";
import { imprimirEtiquetasLote } from "./print";

/* Modal de etiquetas em lote com quantidade editável por item.
   Reutilizado em Produtos e em Entradas (recebimento). */
export function EtiquetasLote({ produtos = [], itens, setItens, onClose }) {
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const achados = q ? produtos.filter((p) => (p.nome || "").toLowerCase().includes(q) || (p.referencia || "").toLowerCase().includes(q) || String(p.codigo_barras || "").includes(q)).slice(0, 8) : [];
  const add = (p) => { setItens((l) => l.some((x) => x.id === p.id) ? l : [...l, { id: p.id, nome: p.nome, referencia: p.referencia, codigo_barras: p.codigo_barras, preco_venda: p.preco_venda, qtd: 1 }]); setBusca(""); };
  const setQtd = (id, v) => setItens((l) => l.map((x) => x.id === id ? { ...x, qtd: v.replace(/[^\d]/g, "") } : x));
  const rm = (id) => setItens((l) => l.filter((x) => x.id !== id));
  const total = itens.reduce((s, x) => s + (Number(x.qtd) || 0), 0);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle(), width: 640, maxWidth: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Tag size={17} style={{ color: C.primary }} /> Etiquetas de produtos</div>
          <button onClick={onClose} style={btnIcon()}><X size={16} /></button>
        </div>
        <Aviso cor="muted"><AlertCircle size={15} /> Ajuste a <b>quantidade de etiquetas</b> por item (ex.: recebeu 1000 parafusos, imprime só 20).</Aviso>
        {produtos.length > 0 && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome, referência ou código de barras..." style={{ ...inp(true), paddingLeft: 34 }} />
            {achados.length > 0 && (
              <div style={{ position: "absolute", top: 42, left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 5, maxHeight: 220, overflowY: "auto" }}>
                {achados.map((p) => (
                  <div key={p.id} onClick={() => add(p)} style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surface2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    {p.nome} {p.referencia && <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>· {p.referencia}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 80 }}>
          {itens.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "24px 0" }}>Busque e adicione produtos para etiquetar.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Produto", "Referência", "Nº de etiquetas", ""].map((h, i) => <th key={i} style={th(i === 2)}>{h}</th>)}</tr></thead>
              <tbody>
                {itens.map((x) => (
                  <tr key={x.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontWeight: 500 }}>{x.nome}</td>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{x.referencia || "—"}</td>
                    <td style={{ ...td(), textAlign: "right" }}><input value={x.qtd} onChange={(e) => setQtd(x.id, e.target.value)} inputMode="numeric" style={{ ...inp(true), fontFamily: mono, textAlign: "right", width: 90 }} /></td>
                    <td style={{ ...td(), textAlign: "right" }}><button onClick={() => rm(x.id)} style={{ ...btnIcon(), color: C.destructive }} title="Remover"><X size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 13, color: C.muted }}>Total: <b style={{ color: C.foreground }}>{total}</b> etiqueta(s)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnGhost()}>Fechar</button>
            <button onClick={() => imprimirEtiquetasLote(itens)} disabled={total === 0} style={{ ...btnPrimary(), opacity: total === 0 ? 0.5 : 1 }}><Printer size={15} /> Imprimir</button>
          </div>
        </div>
      </div>
    </div>
  );
}
