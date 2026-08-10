import { useState, useEffect, useCallback } from "react";
import { PackageMinus, RefreshCw, Send, Boxes } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton, BuscaServidor } from "../ui";
import { useEmpresaAtiva } from "../empresa";

const fmtDH = (d) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

// Saída de estoque para uso interno (consumo): colaborador + departamento (centro de custo).
// Baixa o estoque e lança o custo médio no CC do departamento.
export default function EstoqueUsoInterno({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.estoque) || {};
  const podeLancar = perms.incluir || perms.editar || usuario?.admin;
  const empresa = useEmpresaAtiva();

  const [dados, setDados] = useState({ centros_estoque: [], departamentos: [], colaboradores: [] });
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [f, setF] = useState({ id_centro: "", id_produto: "", produto_nome: "", quantidade: "", id_colaborador: "", id_departamento: "", observacao: "" });

  const notificar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };
  const setCampo = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [d, l] = await Promise.all([
        rpc("erp_uso_interno_dados", { p_id_empresa: empresa }),
        rpc("erp_uso_interno_listar", { p_id_empresa: empresa, p_limit: 100 }),
      ]);
      setDados({ centros_estoque: d?.centros_estoque || [], departamentos: d?.departamentos || [], colaboradores: d?.colaboradores || [] });
      setLista(Array.isArray(l) ? l : []);
      setF((p) => ({ ...p, id_centro: p.id_centro || (d?.centros_estoque?.find((c) => c.principal) || d?.centros_estoque?.[0] || {}).id || "" }));
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setLoading(false); }
  }, [empresa]);
  useEffect(() => { carregar(); }, [carregar]);

  async function lancar() {
    if (!podeLancar) return;
    if (!f.id_centro) { notificar("Selecione o centro de estoque.", "erro"); return; }
    if (!f.id_produto) { notificar("Selecione o produto.", "erro"); return; }
    if (!(num(f.quantidade) > 0)) { notificar("Informe a quantidade.", "erro"); return; }
    if (!f.id_colaborador) { notificar("Selecione o colaborador.", "erro"); return; }
    if (!f.id_departamento) { notificar("Selecione o departamento.", "erro"); return; }
    setSaving(true);
    try {
      const r = await rpc("erp_saida_uso_interno", {
        p_id_produto: Number(f.id_produto), p_id_centro: Number(f.id_centro), p_quantidade: num(f.quantidade),
        p_id_colaborador: Number(f.id_colaborador), p_id_departamento: Number(f.id_departamento),
        p_observacao: f.observacao || null, p_id_usuario: usuario?.id || null,
      });
      if (r?.ok === false) { notificar(r.erro || "Não foi possível lançar.", "erro"); setSaving(false); return; }
      notificar(`Saída registrada · custo ${fmtBRL(r.custo_total)}`);
      setF((p) => ({ ...p, id_produto: "", produto_nome: "", quantidade: "", observacao: "" }));
      await carregar();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSaving(false); }
  }

  const depSemCC = dados.departamentos.filter((d) => !d.id_centro_custo).length;

  return (
    <div>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.t === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>{toast.m}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Estoque — Uso Interno</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Saída para consumo interno: baixa o estoque e lança o custo no centro de custo do departamento</p>
        </div>
        <button onClick={carregar} style={btnGhost()}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {depSemCC > 0 && <div style={{ fontSize: 12.5, color: C.warning, marginBottom: 12 }}>⚠ {depSemCC} departamento(s) sem centro de custo — o custo não será alocado no DRE até vincular (Auxiliares → Departamentos).</div>}

      {/* Formulário de saída */}
      {podeLancar && (
        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div>
              <label style={lbl}>Centro de estoque</label>
              <select value={f.id_centro} onChange={(e) => setCampo("id_centro", e.target.value)} style={{ ...sel(), width: "100%" }}>
                <option value="">Selecione...</option>
                {dados.centros_estoque.map((c) => <option key={c.id} value={c.id}>{c.descricao}{c.principal ? " (principal)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Produto</label>
              <BuscaServidor
                campos={[{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }]}
                buscar={(campo, termo) => rpc("erp_produtos_buscar", { p_campo: campo, p_termo: termo, p_limit: 30 })}
                render={(p) => ({ label: p.nome, sub: [p.referencia, fmtBRL(p.preco_venda)].filter(Boolean).join(" · ") })}
                onSelect={(p) => setF((s) => ({ ...s, id_produto: String(p.id), produto_nome: p.nome }))}
                selecionadoLabel={f.produto_nome}
                placeholder="Buscar produto (nome, ref, cód)..."
                full
              />
            </div>
            <div>
              <label style={lbl}>Quantidade</label>
              <input value={f.quantidade} onChange={(e) => setCampo("quantidade", e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" style={{ ...inp(), width: "100%", fontFamily: mono }} />
            </div>
            <div>
              <label style={lbl}>Colaborador (solicitante)</label>
              <select value={f.id_colaborador} onChange={(e) => setCampo("id_colaborador", e.target.value)} style={{ ...sel(), width: "100%" }}>
                <option value="">Selecione...</option>
                {dados.colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Departamento</label>
              <select value={f.id_departamento} onChange={(e) => setCampo("id_departamento", e.target.value)} style={{ ...sel(), width: "100%" }}>
                <option value="">Selecione...</option>
                {dados.departamentos.map((d) => <option key={d.id} value={d.id}>{d.descricao}{d.centro_custo ? ` · ${d.centro_custo}` : " · (sem CC)"}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Observação (opcional)</label>
              <input value={f.observacao} onChange={(e) => setCampo("observacao", e.target.value)} style={{ ...inp(), width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={lancar} disabled={saving} style={{ ...btnPrimary(), opacity: saving ? 0.6 : 1 }}><Send size={15} /> {saving ? "Lançando..." : "Lançar saída"}</button>
          </div>
        </div>
      )}

      {/* Últimas saídas */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted }}>
            <PackageMinus size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Nenhuma saída de uso interno ainda.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
              <thead><tr>{["Data", "Produto", "Qtd", "Custo", "Colaborador", "Departamento", "Centro de custo"].map((h, i) => <th key={i} style={th(i === 2 || i === 3)}>{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...td(), whiteSpace: "nowrap", fontFamily: mono, fontSize: 12 }}>{fmtDH(m.criado_em)}</td>
                    <td style={td()}>
                      <div style={{ fontWeight: 500 }}>{m.produto}</div>
                      {m.referencia && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: mono }}>{m.referencia}</div>}
                    </td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(m.quantidade)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(m.custo_total)}</td>
                    <td style={td()}>{m.colaborador || "—"}</td>
                    <td style={td()}>{m.departamento || "—"}</td>
                    <td style={{ ...td(), color: m.centro_custo ? C.foreground : C.textMuted }}>{m.centro_custo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
