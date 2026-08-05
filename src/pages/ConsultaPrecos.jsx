import { useState, useEffect, useRef } from "react";
import { Search, Tag, Boxes, Package } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, Skeleton } from "../ui";
import { DrawerEstoque } from "../drawers";

const CAMPOS = [{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }];

// Consulta de preços do Comercial: busca por campo, mostra preço e disponível,
// e abre o drawer de estoque (por empresa/centro, comprado, histórico).
export default function ConsultaPrecos({ usuario }) {
  const [campo, setCampo] = useState("nome");
  const [termo, setTermo] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const deb = useRef(null);

  useEffect(() => {
    rpc("vendas_dados", {}).then((d) => setEmpresas(d.empresas ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    if (termo.trim().length < 1) { setItens([]); return; }
    setLoading(true);
    deb.current = setTimeout(async () => {
      try {
        const r = await rpc("erp_consulta_precos", { p_campo: campo, p_termo: termo.trim(), p_id_empresa: idEmpresa ? Number(idEmpresa) : null, p_limit: 50 });
        setItens(Array.isArray(r) ? r : []);
      } catch { setItens([]); }
      setLoading(false);
    }, 300);
    return () => deb.current && clearTimeout(deb.current);
  }, [campo, termo, idEmpresa]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Tag size={20} style={{ color: C.primary }} /> Consulta de Preços</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Preço e disponibilidade. Clique no produto para ver estoque por empresa, comprado e histórico.</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <select value={campo} onChange={(e) => setCampo(e.target.value)} style={{ ...sel(), width: 150 }}>
          {CAMPOS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} />
          <input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Buscar por ${CAMPOS.find((c) => c.key === campo).label.toLowerCase()}...`} style={{ ...inp(), paddingLeft: 34, width: "100%" }} />
        </div>
        <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={sel()}>
          <option value="">Todas empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
        </select>
      </div>

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}</div>
        ) : termo.trim().length < 1 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Search size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Digite para buscar um produto.</div></div>
        ) : itens.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Package size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum produto encontrado.</div></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead><tr>{["Referência", "Produto", "Preço venda", "Disponível", ""].map((h, i) => <th key={i} style={th(i === 2 || i === 3)}>{h}</th>)}</tr></thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id} onClick={() => setDrawer(p.id)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <td style={{ ...td(), fontFamily: mono, color: C.muted }}>{p.referencia || "—"}</td>
                    <td style={{ ...td(), fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(p.preco_venda)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: num(p.disponivel) > 0 ? C.success : C.destructive }}>{num(p.disponivel).toLocaleString("pt-BR")}</td>
                    <td style={{ ...td(), textAlign: "right" }}><Boxes size={15} style={{ color: C.blueMid }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawer && <DrawerEstoque idProduto={drawer} idEmpresa={idEmpresa ? Number(idEmpresa) : null} onClose={() => setDrawer(null)} />}
    </div>
  );
}
