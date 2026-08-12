import { useState, useEffect, useCallback } from "react";
import { PackageOpen, Plus, Search, X, Trash2, Save, Undo2, AlertTriangle, ArrowLeft } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton, BuscaServidor } from "../ui";

const TIPO_LABEL = { DEMONSTRACAO: "Demonstração", GARANTIA: "Garantia", CONSERTO: "Conserto", COMODATO: "Comodato", OUTRO: "Outro" };
const ST = {
  PENDENTE:  [C.warningBg, C.warning, "Pendente"],
  PARCIAL:   [C.bluePale, C.blueMid, "Parcial"],
  RETORNADA: [C.successBg, C.success, "Retornada"],
  ENCERRADA: [C.surface2, C.muted, "Encerrada"],
};
function StatusBadge({ status, atrasado }) {
  const [bg, fg, label] = ST[status] || [C.surface2, C.muted, status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color: fg, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", padding: "2px 8px", borderRadius: 4 }}>
      {atrasado && <AlertTriangle size={11} />}{label}
    </span>
  );
}
const fmtData = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

export default function Remessas({ usuario }) {
  const [dom, setDom] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const [form, setForm] = useState(null);        // header em edição (null = fechado)
  const [itens, setItens] = useState([]);
  const [retornos, setRetornos] = useState([]);
  const [cliLabel, setCliLabel] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [retInput, setRetInput] = useState({});  // {id_item: qtd a devolver}
  const [regRet, setRegRet] = useState(false);

  useEffect(() => { (async () => {
    try { setDom(await rpc("erp_remessas_dominios", {})); } catch (e) { setErro(e.message); }
  })(); }, []);

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const r = await rpc("erp_remessas_listar", { p_status: fStatus || null, p_id_empresa: idEmpresa ? Number(idEmpresa) : null, p_busca: busca || null });
      setLista(Array.isArray(r) ? r : []);
    } catch (e) { setErro(e.message); } finally { setLoading(false); }
  }, [fStatus, idEmpresa, busca]);
  useEffect(() => { carregar(); }, [carregar]);

  const pendentes = lista.filter((r) => r.status === "PENDENTE" || r.status === "PARCIAL").length;
  const atrasadas = lista.filter((r) => r.atrasado).length;

  const abrirNovo = () => {
    setForm({ id: null, id_empresa: idEmpresa || (dom?.empresas?.[0]?.id ?? ""), id_cliente: "", tipo: "DEMONSTRACAO", data_remessa: new Date().toISOString().slice(0, 10), prazo_retorno: "", observacao: "" });
    setItens([]); setRetornos([]); setCliLabel(""); setRetInput({});
  };
  const abrir = async (id) => {
    try {
      const d = await rpc("erp_remessa_obter", { p_id: id });
      setForm({ ...d.remessa, data_remessa: (d.remessa.data_remessa || "").slice(0, 10), prazo_retorno: (d.remessa.prazo_retorno || "").slice(0, 10) });
      setItens(d.itens || []); setRetornos(d.retornos || []); setCliLabel(d.remessa?.cliente || ""); setRetInput({});
    } catch (e) { setErro(e.message); }
  };
  const fechar = () => { setForm(null); setItens([]); setRetornos([]); setRetInput({}); };
  const setF = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const semRetorno = retornos.length === 0;
  const addProduto = (p) => setItens((s) => [...s, { id_produto: p.id, descricao: p.nome, referencia: p.referencia, quantidade: 1, qtd_retornada: 0, valor_unitario: p.preco_venda || 0 }]);
  const addLivre = () => setItens((s) => [...s, { id_produto: null, descricao: "", quantidade: 1, qtd_retornada: 0, valor_unitario: 0 }]);
  const setItem = (i, k) => (e) => setItens((s) => s.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it));
  const rmItem = (i) => setItens((s) => s.filter((_, idx) => idx !== i));

  const salvar = async () => {
    setSalvando(true); setErro(null);
    try {
      const payload = { ...form, _ator: usuario.id, itens: semRetorno ? itens.map((i) => ({ id_produto: i.id_produto, descricao: i.descricao, quantidade: num(i.quantidade), valor_unitario: num(i.valor_unitario), observacao: i.observacao })) : undefined };
      const d = await rpc("erp_remessa_salvar", { p: payload });
      // reabre com ids atualizados
      setForm({ ...d.remessa, data_remessa: (d.remessa.data_remessa || "").slice(0, 10), prazo_retorno: (d.remessa.prazo_retorno || "").slice(0, 10) });
      setItens(d.itens || []); setRetornos(d.retornos || []); setCliLabel(d.remessa?.cliente || "");
      carregar();
    } catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setSalvando(false); }
  };

  const registrarRetorno = async () => {
    const linhas = Object.entries(retInput).map(([id_item, q]) => ({ id_item: Number(id_item), quantidade: num(q) })).filter((l) => l.quantidade > 0);
    if (linhas.length === 0) { setErro("Informe ao menos uma quantidade a retornar."); return; }
    setRegRet(true); setErro(null);
    try {
      const d = await rpc("erp_remessa_registrar_retorno", { p: { id_remessa: form.id, _ator: usuario.id, itens: linhas } });
      setForm({ ...d.remessa, data_remessa: (d.remessa.data_remessa || "").slice(0, 10), prazo_retorno: (d.remessa.prazo_retorno || "").slice(0, 10) });
      setItens(d.itens || []); setRetornos(d.retornos || []); setRetInput({});
      carregar();
    } catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setRegRet(false); }
  };

  const empresaNome = (id) => (dom?.empresas || []).find((e) => e.id === id)?.nome || "";

  /* ─────────────── detalhe/edição ─────────────── */
  if (form) {
    const isNew = !form.id;
    const saldoTotal = itens.reduce((s, i) => s + (num(i.saldo != null ? i.saldo : i.quantidade) - (i.saldo != null ? 0 : num(i.qtd_retornada))), 0);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={fechar} style={{ ...btnGhost(), padding: 8 }}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{isNew ? "Nova remessa" : `Remessa ${form.numero}`}</h1>
              {!isNew && <StatusBadge status={form.status} />}
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{empresaNome(form.id_empresa)} · {TIPO_LABEL[form.tipo] || form.tipo}{cliLabel ? ` · ${cliLabel}` : ""}</p>
          </div>
        </div>

        {erro && <div style={avisoErro}><X size={16} /> {erro}</div>}

        <div style={{ ...cardStyle(), marginBottom: 14 }}>
          <div style={grid}>
            <Campo l="Empresa *">
              <select value={form.id_empresa || ""} onChange={setF("id_empresa")} style={selF} disabled={!isNew}>
                <option value="">—</option>
                {(dom?.empresas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Campo>
            <Campo l="Tipo">
              <select value={form.tipo || "DEMONSTRACAO"} onChange={setF("tipo")} style={selF}>
                {(dom?.tipos || Object.keys(TIPO_LABEL)).map((t) => <option key={t} value={t}>{TIPO_LABEL[t] || t}</option>)}
              </select>
            </Campo>
            <div style={{ gridColumn: "span 2" }}>
              <label style={lbl}>Cliente</label>
              <BuscaServidor
                campos={[{ key: "nome", label: "Nome" }, { key: "cnpj", label: "CNPJ" }, { key: "codigo", label: "Código" }]}
                buscar={(campo, termo) => rpc("erp_clientes_buscar", { p_campo: campo, p_termo: termo, p_id_empresa: null, p_limit: 30 })}
                render={(c) => ({ label: c.nome, sub: [c.codigo ? "#" + c.codigo : "", c.cpf_cnpj, c.cidade].filter(Boolean).join(" · ") })}
                onSelect={(c) => { setForm((s) => ({ ...s, id_cliente: String(c.id) })); setCliLabel(c.nome); }}
                selecionadoLabel={cliLabel}
                placeholder="Buscar cliente (nome, CNPJ ou código)..."
                full
              />
            </div>
            <Campo l="Data da remessa"><input type="date" value={form.data_remessa || ""} onChange={setF("data_remessa")} style={inpF} /></Campo>
            <Campo l="Prazo de retorno"><input type="date" value={form.prazo_retorno || ""} onChange={setF("prazo_retorno")} style={inpF} /></Campo>
            <div style={{ gridColumn: "span 2" }}>
              <label style={lbl}>Observação</label>
              <input value={form.observacao || ""} onChange={setF("observacao")} style={inpF} />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div style={{ ...cardStyle(), marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Itens da remessa</div>
            {semRetorno && <button onClick={addLivre} style={{ ...btnGhost(), height: 32, fontSize: 12.5 }}><Plus size={14} /> Linha livre</button>}
          </div>
          {semRetorno && (
            <div style={{ marginBottom: 10 }}>
              <BuscaServidor
                campos={[{ key: "nome", label: "Nome" }, { key: "referencia", label: "Referência" }, { key: "codigo_barras", label: "Cód. barras" }]}
                buscar={(campo, termo) => rpc("erp_produtos_buscar", { p_campo: campo, p_termo: termo, p_limit: 30 })}
                render={(p) => ({ label: p.nome, sub: [p.referencia, fmtBRL(p.preco_venda)].filter(Boolean).join(" · ") })}
                onSelect={addProduto}
                selecionadoLabel=""
                placeholder="Adicionar produto por nome, referência ou cód. barras..."
                full
              />
            </div>
          )}
          {itens.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.textMuted }}>Nenhum item. Adicione um produto ou uma linha livre.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Descrição", "Qtd", "Retornado", "Saldo", "Vlr unit.", ""].map((h, i) => <th key={i} style={th(i >= 1 && i <= 4)}>{h}</th>)}</tr></thead>
                <tbody>
                  {itens.map((it, i) => {
                    const saldo = it.saldo != null ? it.saldo : (num(it.quantidade) - num(it.qtd_retornada));
                    return (
                      <tr key={it.id || i} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={td()}>{semRetorno ? <input value={it.descricao || ""} onChange={setItem(i, "descricao")} placeholder="Descrição" style={{ ...inpF, minWidth: 200 }} /> : <span>{it.referencia ? <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{it.referencia} </span> : ""}{it.descricao}</span>}</td>
                        <td style={{ ...td(true) }}>{semRetorno ? <input type="number" value={it.quantidade} onChange={setItem(i, "quantidade")} style={{ ...inpF, width: 70, textAlign: "right" }} /> : <span style={{ fontFamily: mono }}>{num(it.quantidade)}</span>}</td>
                        <td style={{ ...td(true), fontFamily: mono }}>{num(it.qtd_retornada)}</td>
                        <td style={{ ...td(true), fontFamily: mono, fontWeight: 700, color: saldo > 0 ? C.warning : C.success }}>{saldo}</td>
                        <td style={{ ...td(true) }}>{semRetorno ? <input type="number" value={it.valor_unitario} onChange={setItem(i, "valor_unitario")} style={{ ...inpF, width: 90, textAlign: "right" }} /> : <span style={{ fontFamily: mono }}>{fmtBRL(it.valor_unitario)}</span>}</td>
                        <td style={{ ...td(true) }}>{semRetorno && <button onClick={() => rmItem(i)} style={{ ...btnGhost(), padding: 5, color: C.destructive }}><Trash2 size={13} /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Registrar retorno (só quando já salva e há saldo) */}
        {!isNew && form.status !== "RETORNADA" && form.status !== "ENCERRADA" && saldoTotal > 0 && (
          <div style={{ ...cardStyle(), marginBottom: 14, borderLeft: `3px solid ${C.primary}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><Undo2 size={15} color={C.primary} /><div style={{ fontSize: 14, fontWeight: 700 }}>Registrar retorno</div></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr>{["Item", "Saldo pendente", "Devolver agora"].map((h, i) => <th key={i} style={th(i >= 1)}>{h}</th>)}</tr></thead>
                <tbody>
                  {itens.filter((it) => (it.saldo != null ? it.saldo : num(it.quantidade) - num(it.qtd_retornada)) > 0).map((it) => {
                    const saldo = it.saldo != null ? it.saldo : (num(it.quantidade) - num(it.qtd_retornada));
                    return (
                      <tr key={it.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={td()}>{it.descricao}</td>
                        <td style={{ ...td(true), fontFamily: mono }}>{saldo}</td>
                        <td style={{ ...td(true) }}>
                          <input type="number" min={0} max={saldo} value={retInput[it.id] ?? ""} onChange={(e) => setRetInput((s) => ({ ...s, [it.id]: e.target.value }))} placeholder="0" style={{ ...inpF, width: 90, textAlign: "right" }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={registrarRetorno} disabled={regRet} style={{ ...btnPrimary(), height: 36, opacity: regRet ? 0.6 : 1 }}><Undo2 size={14} /> {regRet ? "Registrando..." : "Registrar retorno"}</button>
            </div>
          </div>
        )}

        {/* Histórico de retornos */}
        {retornos.length > 0 && (
          <div style={{ ...cardStyle(), marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>Histórico de retornos</div>
            {retornos.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "5px 0", borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: mono, color: C.muted }}>{fmtData((r.data_retorno || "").slice(0, 10))}</span>
                <span style={{ flex: 1 }}>{r.item_desc}</span>
                <span style={{ fontFamily: mono, fontWeight: 700 }}>{num(r.quantidade)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={fechar} style={{ ...btnGhost(), height: 40 }}>Fechar</button>
          {(isNew || semRetorno) && <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary(), height: 40, opacity: salvando ? 0.6 : 1 }}><Save size={15} /> {salvando ? "Salvando..." : "Salvar remessa"}</button>}
        </div>
      </div>
    );
  }

  /* ─────────────── lista ─────────────── */
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Remessas & Retornos</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Demonstração, garantia, conserto, comodato — controle do que saiu e está pendente de retorno.</p>
        </div>
        <button onClick={abrirNovo} style={{ ...btnPrimary(), height: 38 }}><Plus size={15} /> Nova remessa</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <div style={cardStyle()}><div style={kpiL}>Pendentes de retorno</div><div style={{ ...kpiV, color: C.warning }}>{pendentes}</div></div>
        <div style={cardStyle()}><div style={kpiL}>Atrasadas</div><div style={{ ...kpiV, color: C.destructive }}>{atrasadas}</div></div>
        <div style={cardStyle()}><div style={kpiL}>Total listado</div><div style={kpiV}>{lista.length}</div></div>
      </div>

      <div style={{ ...cardStyle(), marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>Empresa</label>
          <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ ...sel(), height: 38, minWidth: 160 }}>
            <option value="">Todas</option>
            {(dom?.empresas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ ...sel(), height: 38, minWidth: 150 }}>
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="RETORNADA">Retornada</option>
            <option value="ENCERRADA">Encerrada</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={lbl}>Buscar (nº ou cliente)</label>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: C.textMuted }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para filtrar..." style={{ ...inp(), width: "100%", paddingLeft: 32 }} />
          </div>
        </div>
      </div>

      {erro && <div style={avisoErro}><X size={16} /> {erro}</div>}

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><PackageOpen size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma remessa. Clique em "Nova remessa".</div></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
              <thead><tr>{["Nº", "Tipo", "Cliente", "Remessa", "Prazo", "Enviado", "Retornado", "Saldo", "Status"].map((h, i) => <th key={i} style={th(i >= 5 && i <= 7)}>{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: r.atrasado ? "rgba(220,38,38,0.04)" : "transparent" }} onClick={() => abrir(r.id)}>
                    <td style={{ ...td(), fontFamily: mono, fontWeight: 700, color: C.primary }}>{r.numero}</td>
                    <td style={td()}>{TIPO_LABEL[r.tipo] || r.tipo}</td>
                    <td style={td()}>{r.cliente || "—"}</td>
                    <td style={td()}>{fmtData((r.data_remessa || "").slice(0, 10))}</td>
                    <td style={{ ...td(), color: r.atrasado ? C.destructive : C.foreground, fontWeight: r.atrasado ? 700 : 400 }}>{fmtData((r.prazo_retorno || "").slice(0, 10))}</td>
                    <td style={{ ...td(true), fontFamily: mono }}>{num(r.qtd_enviada)}</td>
                    <td style={{ ...td(true), fontFamily: mono }}>{num(r.qtd_retornada)}</td>
                    <td style={{ ...td(true), fontFamily: mono, fontWeight: 700, color: num(r.saldo) > 0 ? C.warning : C.success }}>{num(r.saldo)}</td>
                    <td style={td()}><StatusBadge status={r.status} atrasado={r.atrasado} /></td>
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
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 };
const inpF = { ...inp(), width: "100%" };
const selF = { ...sel(), width: "100%" };
const kpiL = { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 5 };
const kpiV = { fontSize: 24, fontWeight: 700, fontFamily: mono };
const avisoErro = { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive };

function Campo({ l, children }) { return <div><label style={lbl}>{l}</label>{children}</div>; }
