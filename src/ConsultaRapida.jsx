import { useState, useEffect, useRef } from "react";
import { Search, Package, User, X, Boxes, CreditCard } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "./config";
import { inp, sel, th, td } from "./ui";

const CAMPOS_PROD = [{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }];
const CAMPOS_CLI = [{ key: "nome", label: "Nome" }, { key: "cnpj", label: "CNPJ/CPF" }, { key: "codigo", label: "Código" }];

// Consulta rápida (F2): modal NÃO-bloqueante por cima da OS/Venda. Só consulta, não lança nada.
// Esc fecha e volta exatamente pro ponto onde o vendedor estava (a página de trás não é desmontada).
export default function ConsultaRapida({ aberto, onClose, usuario }) {
  const [aba, setAba] = useState("produto");
  const [campo, setCampo] = useState("nome");
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cliSel, setCliSel] = useState(null);
  const [credito, setCredito] = useState(null);
  const inputRef = useRef(null);
  const deb = useRef(null);

  // reset ao abrir + foco
  useEffect(() => {
    if (aberto) { setTermo(""); setItens([]); setCliSel(null); setCredito(null); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [aberto, aba]);

  // Esc fecha (não interfere no que está atrás)
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [aberto, onClose]);

  // busca com debounce
  useEffect(() => {
    if (!aberto) return;
    if (deb.current) clearTimeout(deb.current);
    const t = termo.trim();
    if (t.length < 1) { setItens([]); return; }
    setLoading(true);
    deb.current = setTimeout(async () => {
      try {
        if (aba === "produto") {
          const r = await rpc("erp_consulta_precos", { p_campo: campo, p_termo: t, p_id_empresa: null, p_limit: 40 });
          setItens(Array.isArray(r) ? r : []);
        } else {
          const r = await rpc("erp_clientes_buscar", { p_campo: campo, p_termo: t, p_id_empresa: null, p_limit: 40 });
          setItens(Array.isArray(r) ? r : []);
        }
      } catch { setItens([]); }
      setLoading(false);
    }, 280);
    return () => deb.current && clearTimeout(deb.current);
  }, [termo, campo, aba, aberto]);

  async function verCliente(c) {
    setCliSel(c); setCredito(null);
    try { const r = await rpc("erp_cliente_credito", { p_id_cliente: c.id, p_id_empresa: null }); setCredito(r); } catch { /* ignora */ }
  }

  function trocarAba(nova) {
    setAba(nova);
    setCampo("nome");
    setCliSel(null); setCredito(null); setItens([]); setTermo("");
  }

  if (!aberto) return null;

  const campos = aba === "produto" ? CAMPOS_PROD : CAMPOS_CLI;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9990, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "8vh" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, width: 720, maxWidth: "94vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 70px rgba(0,0,0,0.28)", overflow: "hidden" }}>
        {/* cabeçalho + abas */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => trocarAba("produto")} style={tab(aba === "produto")}><Package size={15} /> Produto</button>
          <button onClick={() => trocarAba("cliente")} style={tab(aba === "cliente")}><User size={15} /> Cliente</button>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted, padding: "0 10px" }}>Consulta rápida · <b>Esc</b> volta</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: "10px 12px" }}><X size={18} /></button>
        </div>

        {/* busca */}
        <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <select value={campo} onChange={(e) => setCampo(e.target.value)} style={{ ...sel(), width: 140 }}>
            {campos.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
            <input ref={inputRef} value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder={aba === "produto" ? "Buscar produto..." : "Buscar cliente..."}
              style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
          </div>
        </div>

        {/* resultados */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? <div style={vazio}>Buscando...</div>
          : termo.trim().length < 1 ? <div style={vazio}>{aba === "produto" ? "Digite para consultar preço e estoque." : "Digite para consultar dados e crédito do cliente."}</div>
          : itens.length === 0 ? <div style={vazio}>Nada encontrado.</div>
          : aba === "produto" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Referência", "Produto", "Preço", "Disponível"].map((h, i) => <th key={i} style={th(i >= 2)}>{h}</th>)}</tr></thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{p.referencia || "—"}</td>
                    <td style={{ ...td(), fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(p.preco_venda)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: num(p.disponivel) > 0 ? C.success : C.destructive }}>
                      <Boxes size={13} style={{ verticalAlign: "-2px", marginRight: 4, opacity: 0.6 }} />{num(p.disponivel).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : cliSel ? (
            <div style={{ padding: 16 }}>
              <button onClick={() => { setCliSel(null); setCredito(null); }} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontSize: 12, marginBottom: 10 }}>← voltar aos resultados</button>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{cliSel.nome}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>{[cliSel.codigo ? "#" + cliSel.codigo : "", cliSel.cpf_cnpj, cliSel.cidade].filter(Boolean).join(" · ")}</div>
              <div style={{ padding: 14, borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}><CreditCard size={14} style={{ color: C.primary }} /> Situação de crédito</div>
                {!credito ? <div style={{ fontSize: 12, color: C.textMuted }}>Carregando...</div> : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 18px", fontSize: 13 }}>
                    <span>A prazo disponível</span><b style={{ textAlign: "right", fontFamily: mono, color: num(credito.disponivel) > 0 ? C.success : C.destructive }}>{fmtBRL(credito.disponivel)}</b>
                    <span>Limite</span><b style={{ textAlign: "right", fontFamily: mono }}>{fmtBRL(credito.limite)}</b>
                    <span>Em aberto</span><b style={{ textAlign: "right", fontFamily: mono }}>{fmtBRL(credito.devedor)}</b>
                    {num(credito.saldo) > 0 && <><span>Saldo a favor</span><b style={{ textAlign: "right", fontFamily: mono, color: C.success }}>{fmtBRL(credito.saldo)}</b></>}
                    {num(credito.qtd_vencidos) > 0 && <><span style={{ color: C.destructive }}>⚠ Vencidos ({credito.qtd_vencidos})</span><b style={{ textAlign: "right", fontFamily: mono, color: C.destructive }}>{fmtBRL(credito.vencidos)}</b></>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Código", "Cliente", "CNPJ/CPF", "Cidade"].map((h, i) => <th key={i} style={th(false)}>{h}</th>)}</tr></thead>
              <tbody>
                {itens.map((c) => (
                  <tr key={c.id} onClick={() => verCliente(c)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{c.codigo ? "#" + c.codigo : "—"}</td>
                    <td style={{ ...td(), fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{c.cpf_cnpj || "—"}</td>
                    <td style={td()}>{c.cidade || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const tab = (on) => ({ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", background: on ? C.card : C.surface2, color: on ? C.foreground : C.textMuted, borderBottom: on ? `2px solid ${C.primary}` : "2px solid transparent" });
const vazio = { padding: "40px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 };
