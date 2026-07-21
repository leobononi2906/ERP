import { useState, useEffect } from "react";
import { Search, Plus, ArrowLeft, Save, Package, Boxes, ArrowDownCircle, ArrowUpCircle, History, Warehouse, AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { C, mono, fmtBRL, num, rpc, ATOR } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, btnIcon, Secao, Campo, Aviso, Badge } from "../ui";

const PERMS = {
  "Administrador": { ajustar: true, centros: true },
  "Gestor": { ajustar: true, centros: true },
  "Estoque": { ajustar: true, centros: false },
  "Vendedor Loja": { ajustar: false, centros: false },
  "Financeiro": { ajustar: false, centros: false },
};

export default function Estoque({ simGrupo }) {
  const perms = PERMS[simGrupo] || {};
  const [loading, setLoading] = useState(true);
  const [saldos, setSaldos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [view, setView] = useState("saldos");
  const [busca, setBusca] = useState("");
  const [fCentro, setFCentro] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fAlerta, setFAlerta] = useState(false);
  const [toast, setToast] = useState(null);

  // kardex
  const [kardexProd, setKardexProd] = useState(null);
  const [kardexData, setKardexData] = useState([]);
  const [kardexLoading, setKardexLoading] = useState(false);

  // ajuste
  const [ajuste, setAjuste] = useState(null);

  // centros form
  const [centroForm, setCentroForm] = useState(null);
  const [centroSaving, setCentroSaving] = useState(false);

  const carregar = () => {
    let a = true;
    setLoading(true);
    rpc("erp_estoque_dados").then(j => {
      if (!a) return;
      setSaldos(j.saldos || []);
      setCentros(j.centros || []);
      setEmpresas(j.empresas || []);
      setProdutos(j.produtos || []);
    }).catch(() => {}).finally(() => a && setLoading(false));
    return () => { a = false; };
  };
  useEffect(carregar, []);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); };

  // === KARDEX ===
  const abrirKardex = (s) => {
    setKardexProd(s);
    setKardexLoading(true);
    setKardexData([]);
    setView("kardex");
    rpc("erp_estoque_kardex", { p_id_produto: s.id_produto, p_id_centro: s.id_centro })
      .then(j => setKardexData(Array.isArray(j) ? j : []))
      .catch(() => {})
      .finally(() => setKardexLoading(false));
  };

  // === AJUSTE ===
  const abrirAjuste = () => setAjuste({ id_produto: "", id_centro: "", quantidade: "", tipo: "ENTRADA", observacao: "" });
  const setA = (k, v) => setAjuste(a => ({ ...a, [k]: v }));
  const salvarAjuste = async () => {
    if (!ajuste.id_produto || !ajuste.id_centro || !ajuste.quantidade) return notificar("Preencha todos os campos.", "warn");
    try {
      await rpc("erp_estoque_ajuste", {
        p_id_produto: Number(ajuste.id_produto), p_id_centro: Number(ajuste.id_centro),
        p_quantidade: num(ajuste.quantidade), p_tipo: ajuste.tipo,
        p_observacao: ajuste.observacao || "", p_id_usuario: ATOR,
      });
      notificar("Ajuste realizado com sucesso!");
      setAjuste(null);
      carregar();
    } catch (e) { notificar(e.message || "Erro ao ajustar.", "destructive"); }
  };

  // === CENTROS ===
  const abrirCentro = (c) => setCentroForm(c ? { ...c } : { id: null, descricao: "", id_empresa: "", endereco: "", principal: false, ativo: true });
  const setCF = (k, v) => setCentroForm(f => ({ ...f, [k]: v }));
  const salvarCentro = async () => {
    if (!centroForm.descricao || !centroForm.id_empresa) return notificar("Descrição e empresa são obrigatórios.", "warn");
    setCentroSaving(true);
    try {
      await rpc("erp_centro_estoque_salvar", { p: centroForm });
      notificar(centroForm.id ? "Centro atualizado." : "Centro cadastrado.");
      setCentroForm(null);
      carregar();
    } catch (e) { notificar("Erro ao salvar centro.", "destructive"); }
    finally { setCentroSaving(false); }
  };

  // FILTROS
  const filtrados = saldos.filter(s => {
    const q = busca.trim().toLowerCase();
    const okB = !q || (s.produto_nome || "").toLowerCase().includes(q) || (s.produto_ref || "").toLowerCase().includes(q) || (s.codigo_barras || "").toLowerCase().includes(q);
    const okC = !fCentro || String(s.id_centro) === fCentro;
    const okE = !fEmpresa || String(s.id_empresa) === fEmpresa;
    const okA = !fAlerta || num(s.estoque_disponivel) <= num(s.estoque_minimo);
    return okB && okC && okE && okA;
  });

  const totalItens = filtrados.reduce((a, s) => a + num(s.estoque_atual), 0);
  const totalValor = filtrados.reduce((a, s) => a + num(s.estoque_atual) * num(s.custo_medio), 0);
  const alertas = saldos.filter(s => num(s.estoque_disponivel) <= num(s.estoque_minimo) && num(s.estoque_minimo) > 0).length;

  // === TOAST ===
  const Toast = () => toast && (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.tipo === "ok" ? C.success : toast.tipo === "warn" ? C.warning : C.destructive, color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{toast.msg}</div>
  );

  // === VIEW: KARDEX ===
  if (view === "kardex" && kardexProd) return (
    <>
      <Toast />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => setView("saldos")} style={btnGhost()}><ArrowLeft size={16} /> Voltar</button>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Kardex — {kardexProd.produto_nome}</h1>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>Centro: {kardexProd.centro_nome} · Saldo atual: {num(kardexProd.estoque_atual)}</p></div>
      </div>
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {kardexLoading ? <div style={{ padding: 16 }}>{[0,1,2,3].map(i => <div key={i} style={{ height: 28, background: C.surface2, borderRadius: 6, marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : kardexData.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><History size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum movimento encontrado.</div></div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
              <thead><tr>{["Data", "Tipo", "Origem", "Ref.", "Qtd", "Est. Anterior", "Est. Posterior", "Custo Unit.", "Usuário", "Obs."].map((h, i) => <th key={i} style={th([4,5,6,7].includes(i))}>{h}</th>)}</tr></thead>
              <tbody>{kardexData.map((m, i) => {
                const isEntrada = m.tipo?.includes("ENTRADA") || m.tipo?.includes("AJUSTE_ENTRADA");
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.surface2 : "transparent" }}>
                    <td style={td()}><span style={{ fontFamily: mono, fontSize: 12 }}>{m.criado_em ? new Date(m.criado_em).toLocaleString("pt-BR") : "—"}</span></td>
                    <td style={td()}><Badge texto={m.tipo || "—"} cor={isEntrada ? "ATIVO" : "CANCELADA"} /></td>
                    <td style={td()}>{m.origem || "—"}</td>
                    <td style={td()}>{m.numero_referencia || "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600, color: isEntrada ? C.success : C.destructive }}>{isEntrada ? "+" : "−"}{num(m.quantidade)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{num(m.estoque_anterior)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{num(m.estoque_posterior)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(m.custo_unitario)}</td>
                    <td style={td()}>{m.usuario_nome || "—"}</td>
                    <td style={{ ...td(), maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.observacao || "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
        }
      </div>
    </>
  );

  // === VIEW: CENTROS ===
  if (view === "centros") return (
    <>
      <Toast />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("saldos")} style={btnGhost()}><ArrowLeft size={16} /> Voltar</button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Centros de Estoque</h1>
        </div>
        {perms.centros && <button onClick={() => abrirCentro(null)} style={btnPrimary()}><Plus size={16} /> Novo centro</button>}
      </div>
      {centroForm && (
        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{centroForm.id ? "Editar Centro" : "Novo Centro"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Campo label="Descrição" span={2}><input value={centroForm.descricao} onChange={e => setCF("descricao", e.target.value)} style={inp(true)} /></Campo>
            <Campo label="Empresa"><select value={centroForm.id_empresa} onChange={e => setCF("id_empresa", e.target.value)} style={sel(true)}><option value="">Selecione</option>{empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select></Campo>
            <Campo label="Endereço" span={2}><input value={centroForm.endereco || ""} onChange={e => setCF("endereco", e.target.value)} style={inp(true)} /></Campo>
            <Campo label="Opções"><div style={{ display: "flex", gap: 16, paddingTop: 6 }}>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={centroForm.principal} onChange={e => setCF("principal", e.target.checked)} /> Principal</label>
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={centroForm.ativo} onChange={e => setCF("ativo", e.target.checked)} /> Ativo</label>
            </div></Campo>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={() => setCentroForm(null)} style={btnGhost()}><X size={16} /> Cancelar</button>
            <button onClick={salvarCentro} disabled={centroSaving} style={btnPrimary()}><Save size={16} /> {centroSaving ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Descrição", "Empresa", "Endereço", "Principal", "Ativo", ""].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
          <tbody>{centros.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 ? C.surface2 : "transparent" }}>
              <td style={{ ...td(), fontWeight: 600 }}>{c.descricao}</td>
              <td style={td()}>{c.empresa_nome || "—"}</td>
              <td style={td()}>{c.endereco || "—"}</td>
              <td style={td()}>{c.principal ? <Badge texto="SIM" cor="ATIVO" /> : "—"}</td>
              <td style={td()}><Badge texto={c.ativo ? "ATIVO" : "INATIVO"} cor={c.ativo ? "ATIVO" : "INATIVO"} /></td>
              <td style={td()}>{perms.centros && <button onClick={() => abrirCentro(c)} style={btnIcon()} title="Editar">✏️</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );

  // === VIEW: SALDOS (principal) ===
  return (
    <>
      <Toast />
      {/* Modal de Ajuste */}
      {ajuste && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...cardStyle(), width: 460, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>Ajuste de Estoque <button onClick={() => setAjuste(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Campo label="Tipo"><select value={ajuste.tipo} onChange={e => setA("tipo", e.target.value)} style={sel(true)}>
                <option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option>
              </select></Campo>
              <Campo label="Produto"><select value={ajuste.id_produto} onChange={e => setA("id_produto", e.target.value)} style={sel(true)}>
                <option value="">Selecione</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
              </select></Campo>
              <Campo label="Centro de Estoque"><select value={ajuste.id_centro} onChange={e => setA("id_centro", e.target.value)} style={sel(true)}>
                <option value="">Selecione</option>{centros.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.descricao} ({c.empresa_nome})</option>)}
              </select></Campo>
              <Campo label="Quantidade"><input type="number" min="0.01" step="0.01" value={ajuste.quantidade} onChange={e => setA("quantidade", e.target.value)} style={inp(true)} /></Campo>
              <Campo label="Observação"><input value={ajuste.observacao} onChange={e => setA("observacao", e.target.value)} placeholder="Motivo do ajuste..." style={inp(true)} /></Campo>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setAjuste(null)} style={btnGhost()}>Cancelar</button>
              <button onClick={salvarAjuste} style={{ ...btnPrimary(), background: ajuste.tipo === "ENTRADA" ? C.success : C.destructive }}>{ajuste.tipo === "ENTRADA" ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />} Confirmar {ajuste.tipo === "ENTRADA" ? "Entrada" : "Saída"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Estoque</h1><p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{filtrados.length} saldos · como <strong>{simGrupo}</strong></p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("centros")} style={btnGhost()}><Warehouse size={16} /> Centros</button>
          {perms.ajustar && <button onClick={abrirAjuste} style={btnPrimary()}><Plus size={16} /> Ajuste de Estoque</button>}
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        {[
          { label: "Itens em estoque", valor: totalItens.toLocaleString("pt-BR"), icon: Package, cor: C.primary },
          { label: "Valor total", valor: fmtBRL(totalValor), icon: Boxes, cor: C.blueMid },
          { label: "Centros ativos", valor: centros.filter(c => c.ativo).length, icon: Warehouse, cor: C.success },
          { label: "Alertas (mínimo)", valor: alertas, icon: AlertTriangle, cor: alertas > 0 ? C.warning : C.success },
        ].map((c, i) => (
          <div key={i} style={{ ...cardStyle(), display: "flex", alignItems: "center", gap: 14 }} onClick={i === 3 && alertas > 0 ? () => setFAlerta(!fAlerta) : undefined}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${c.cor}14`, display: "flex", alignItems: "center", justifyContent: "center" }}><c.icon size={20} color={c.cor} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono }}>{c.valor}</div></div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}><Search size={16} style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, referência ou código de barras..." style={{ ...inp(), paddingLeft: 34, width: "100%" }} /></div>
        <select value={fEmpresa} onChange={e => setFEmpresa(e.target.value)} style={sel()}><option value="">Todas empresas</option>{empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select>
        <select value={fCentro} onChange={e => setFCentro(e.target.value)} style={sel()}><option value="">Todos centros</option>{centros.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}</select>
        <button onClick={() => setFAlerta(!fAlerta)} style={{ ...btnGhost(), background: fAlerta ? C.warningBg : undefined, color: fAlerta ? C.warning : undefined, borderColor: fAlerta ? C.warning : undefined }}><AlertTriangle size={14} /> Alertas</button>
      </div>

      {/* Tabela */}
      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0,1,2,3,4].map(i => <div key={i} style={{ height: 28, background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
          : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Package size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum saldo encontrado.</div></div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
              <thead><tr>{["Produto", "Ref.", "Centro", "Empresa", "Atual", "Reservado", "Disponível", "Mín.", "Custo Médio", "Valor Est.", ""].map((h, i) => <th key={i} style={th([4,5,6,7,8,9].includes(i))}>{h}</th>)}</tr></thead>
              <tbody>{filtrados.map((s, i) => {
                const baixo = num(s.estoque_minimo) > 0 && num(s.estoque_disponivel) <= num(s.estoque_minimo);
                return (
                  <tr key={`${s.id_produto}-${s.id_centro}`} style={{ borderBottom: `1px solid ${C.border}`, background: baixo ? C.warningBg : i % 2 ? C.surface2 : "transparent" }}>
                    <td style={{ ...td(), fontWeight: 600, maxWidth: 200 }}><div>{s.produto_nome}</div>{s.grupo_nome && <div style={{ fontSize: 11, color: C.textMuted }}>{s.grupo_nome}</div>}</td>
                    <td style={{ ...td(), fontFamily: mono, fontSize: 12 }}>{s.produto_ref || "—"}</td>
                    <td style={td()}>{s.centro_nome}</td>
                    <td style={{ ...td(), fontSize: 12, color: C.textMuted }}>{s.empresa_nome || "—"}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{num(s.estoque_atual)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: num(s.estoque_reservado) > 0 ? C.warning : C.textMuted }}>{num(s.estoque_reservado)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700, color: baixo ? C.destructive : C.success }}>{num(s.estoque_disponivel)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, color: C.textMuted }}>{num(s.estoque_minimo)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(s.custo_medio)}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 600 }}>{fmtBRL(num(s.estoque_atual) * num(s.custo_medio))}</td>
                    <td style={td()}><button onClick={() => abrirKardex(s)} style={btnIcon()} title="Kardex"><History size={16} /></button></td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr style={{ background: C.surface2 }}>
                <td colSpan={4} style={{ ...td(), fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Total</td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700 }}>{totalItens.toLocaleString("pt-BR")}</td>
                <td colSpan={4}></td>
                <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700 }}>{fmtBRL(totalValor)}</td>
                <td></td>
              </tr></tfoot>
            </table></div>
        }
      </div>
    </>
  );
}
