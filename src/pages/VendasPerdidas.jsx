import { useState, useEffect } from "react";
import { TrendingDown, Calendar, Building2 } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Campo, Skeleton } from "../ui";

export default function VendasPerdidas({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.compras) || {};
  const [empresas, setEmpresas] = useState([]);
  const [carregandoBase, setCarregandoBase] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [toast, setToast] = useState(null);
  const [aba, setAba] = useState("produto"); // "produto" ou "detalhado"

  // Filtros
  const [fEmpresa, setFEmpresa] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");

  // Dados
  const [porProduto, setPorProduto] = useState([]);
  const [detalhado, setDetalhado] = useState([]);

  const notificar = (msg, tipo = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      setCarregandoBase(true);
      try {
        const d = await rpc("erp_empresa_listar", {});
        setEmpresas(Array.isArray(d) ? d : []);
        // Define empresa padrão como a primeira
        if (Array.isArray(d) && d.length > 0) {
          setFEmpresa(String(d[0].id));
        }
      } catch (e) {
        notificar("Erro ao carregar empresas: " + e.message, "erro");
      } finally {
        setCarregandoBase(false);
      }
    })();
  }, []);

  async function carregar() {
    if (!fEmpresa) {
      notificar("Selecione uma empresa", "aviso");
      return;
    }
    setCarregando(true);
    try {
      const d = await rpc("erp_vendas_perdidas_listar", {
        p_id_empresa: Number(fEmpresa),
        p_ini: fIni || null,
        p_fim: fFim || null,
      });
      if (d) {
        setPorProduto(Array.isArray(d.por_produto) ? d.por_produto : []);
        setDetalhado(Array.isArray(d.itens) ? d.itens : []);
      }
    } catch (e) {
      notificar("Erro ao carregar vendas perdidas: " + e.message, "erro");
      setPorProduto([]);
      setDetalhado([]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <TrendingDown size={24} color={C.warning} />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Vendas Perdidas</h1>
      </div>

      {/* Filtros */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 15 }}>
          <Campo label="Empresa">
            <select
              style={{ ...sel, width: "100%" }}
              value={fEmpresa}
              onChange={(e) => setFEmpresa(e.target.value)}
              disabled={carregandoBase}
            >
              <option value="">— Selecione</option>
              {empresas.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Data Inicial">
            <input
              type="date"
              style={{ ...inp, width: "100%" }}
              value={fIni}
              onChange={(e) => setFIni(e.target.value)}
            />
          </Campo>
          <Campo label="Data Final">
            <input
              type="date"
              style={{ ...inp, width: "100%" }}
              value={fFim}
              onChange={(e) => setFFim(e.target.value)}
            />
          </Campo>
        </div>
        <button style={{ ...btnPrimary, width: "100%" }} onClick={carregar} disabled={carregando}>
          {carregando ? "Carregando..." : "Filtrar"}
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 10, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {["produto", "detalhado"].map((a) => (
          <button
            key={a}
            style={{
              ...btnGhost,
              borderBottom: aba === a ? `2px solid ${C.primary}` : "none",
              borderRadius: 0,
              paddingBottom: 12,
              fontWeight: aba === a ? 600 : 400,
              color: aba === a ? C.text : C.textMuted,
            }}
            onClick={() => setAba(a)}
          >
            {a === "produto" ? "Por Produto" : "Detalhado"}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "12px 16px",
            borderRadius: 8,
            backgroundColor: toast.tipo === "erro" ? C.destructiveBg : toast.tipo === "aviso" ? C.warningBg : C.successBg,
            color: toast.tipo === "erro" ? C.destructive : toast.tipo === "aviso" ? C.warning : C.success,
            zIndex: 1000,
            fontWeight: 500,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Aba: Por Produto */}
      {aba === "produto" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                <th style={{ ...th, textAlign: "left" }}>Produto</th>
                <th style={{ ...th, textAlign: "center" }}>Código</th>
                <th style={{ ...th, textAlign: "right" }}>Qtd Total</th>
                <th style={{ ...th, textAlign: "right" }}>Valor Total</th>
                <th style={{ ...th, textAlign: "center" }}>Ocorrências</th>
              </tr>
            </thead>
            <tbody>
              {porProduto.length === 0 ? (
                <tr>
                  <td style={{ ...td, textAlign: "center", color: C.textMuted, padding: 20 }} colSpan={5}>
                    Nenhuma venda perdida encontrada
                  </td>
                </tr>
              ) : (
                porProduto.map((r) => (
                  <tr key={r.id_produto} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td, textAlign: "left" }}>
                      <strong>{r.produto}</strong>
                    </td>
                    <td style={{ ...td, textAlign: "center", fontFamily: mono }}>
                      {r.codigo}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <strong>{num(r.qtd_total)}</strong>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.warning, fontWeight: 600 }}>
                      {fmtBRL(r.valor_total)}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>{r.ocorrencias}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba: Detalhado */}
      {aba === "detalhado" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                <th style={{ ...th, textAlign: "left" }}>Data</th>
                <th style={{ ...th, textAlign: "left" }}>Produto</th>
                <th style={{ ...th, textAlign: "center" }}>Código</th>
                <th style={{ ...th, textAlign: "left" }}>Cliente</th>
                <th style={{ ...th, textAlign: "left" }}>Vendedor</th>
                <th style={{ ...th, textAlign: "center" }}>Qtd</th>
                <th style={{ ...th, textAlign: "right" }}>Valor</th>
                <th style={{ ...th, textAlign: "left" }}>Motivo</th>
                <th style={{ ...th, textAlign: "left" }}>Concorrente</th>
                <th style={{ ...th, textAlign: "left" }}>Obs</th>
              </tr>
            </thead>
            <tbody>
              {detalhado.length === 0 ? (
                <tr>
                  <td style={{ ...td, textAlign: "center", color: C.textMuted, padding: 20 }} colSpan={10}>
                    Nenhuma venda perdida encontrada
                  </td>
                </tr>
              ) : (
                detalhado.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td, textAlign: "left", fontSize: 12, color: C.textMuted }}>
                      {r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "left" }}>
                      <strong>{r.produto}</strong>
                    </td>
                    <td style={{ ...td, textAlign: "center", fontFamily: mono, fontSize: 12 }}>
                      {r.codigo}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontSize: 12 }}>{r.cliente || "—"}</td>
                    <td style={{ ...td, textAlign: "left", fontSize: 12 }}>{r.vendedor || "—"}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <strong>{num(r.quantidade)}</strong>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      {fmtBRL(r.valor_perdido)}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontSize: 12 }}>{r.motivo || "—"}</td>
                    <td style={{ ...td, textAlign: "left", fontSize: 12, color: C.textMuted }}>
                      {r.concorrente || "—"}
                    </td>
                    <td style={{ ...td, textAlign: "left", fontSize: 12, color: C.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.observacao || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
