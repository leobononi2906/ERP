import { useState, useEffect } from "react";
import { Plus, Save, X, Pencil, CreditCard, Ruler, Wrench, Boxes } from "lucide-react";
import { C, rpc, mono } from "../config";
import { cardStyle, inp, sel, btnPrimary, btnGhost, btnIcon, th, td, Campo, Badge } from "../ui";
import { TabHub } from "../Hub";
import Servicos from "./Servicos";
import TiposOperacao from "./TiposOperacao";
import PrecosEspeciais from "./PrecosEspeciais";
import Prismas from "./Prismas";

const TIPOS_FP = [
  ["DINHEIRO", "Dinheiro"], ["PIX", "Pix"], ["CARTAO_CREDITO", "Cartão de Crédito"],
  ["CARTAO_DEBITO", "Cartão de Débito"], ["BOLETO", "Boleto"], ["CHEQUE", "Cheque"],
  ["TRANSFERENCIA", "Transferência"], ["CREDIARIO", "Crediário"], ["OUTROS", "Outros"],
];
const MODALIDADES = [["A_VISTA", "À vista"], ["A_PRAZO", "A prazo"], ["CARTAO", "Cartão"]];

// Hub dos cadastros auxiliares — carrega os dados uma vez e distribui.
export default function Auxiliares({ usuario }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    try { setDados(await rpc("erp_aux_cadastros_dados")); }
    catch (e) { console.error(e); setDados({}); }
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  return (
    <TabHub keys={false} tabs={[
      { key: "formas", label: "Formas de Pagamento", render: () => <FormasPagamento dados={dados} loading={loading} reload={carregar} /> },
      { key: "unidades", label: "Unidades", render: () => <Unidades dados={dados} loading={loading} reload={carregar} /> },
      { key: "areas", label: "Áreas de Serviço", render: () => <AreasServico dados={dados} loading={loading} reload={carregar} /> },
      { key: "gruposprod", label: "Grupos de Produto", render: () => <GruposProduto dados={dados} loading={loading} reload={carregar} /> },
      { key: "servicos", label: "Serviços (catálogo)", render: () => <Servicos usuario={usuario} /> },
      { key: "tipos", label: "Tipos de Operação", render: () => <TiposOperacao usuario={usuario} /> },
      { key: "precos", label: "Preços Especiais", render: () => <PrecosEspeciais usuario={usuario} /> },
      { key: "prismas", label: "Prismas", render: () => <Prismas usuario={usuario} /> },
    ]} />
  );
}

function Cabecalho({ icon: Icon, titulo, onNovo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
        <Icon size={18} style={{ color: C.primary }} /> {titulo}
      </div>
      <button onClick={onNovo} style={btnPrimary()}><Plus size={15} /> Novo</button>
    </div>
  );
}

function estadoLista(dados, chave) {
  return Array.isArray(dados?.[chave]) ? dados[chave] : [];
}

/* ═══ FORMAS DE PAGAMENTO ═══ */
function FormasPagamento({ dados, loading, reload }) {
  const [ed, setEd] = useState(null);
  const [saving, setSaving] = useState(false);
  const itens = estadoLista(dados, "formas_pagamento");

  async function salvar() {
    if (!ed.descricao) return;
    setSaving(true);
    try { await rpc("erp_forma_pagamento_salvar", { p: ed }); setEd(null); await reload(); }
    catch (e) { alert("Erro ao salvar forma de pagamento"); }
    setSaving(false);
  }

  if (loading && !dados) return <Carregando />;
  return (
    <div>
      <Cabecalho icon={CreditCard} titulo="Formas de Pagamento" onNovo={() => setEd({ id: 0, descricao: "", tipo: "DINHEIRO", modalidade: "A_VISTA", usa_limite_credito: false, gera_parcelas: false, prazo_medio_dias: 0, taxa_juros: 0, ativo: true })} />
      {ed && (
        <div style={{ ...cardStyle(), marginBottom: 14, border: `2px solid ${C.primary}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.3fr", gap: 12 }}>
            <Campo label="Descrição *"><input value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} style={inp(true)} autoFocus /></Campo>
            <Campo label="Tipo"><select value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value })} style={sel(true)}>{TIPOS_FP.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Campo>
            <Campo label="Modalidade"><select value={ed.modalidade} onChange={(e) => setEd({ ...ed, modalidade: e.target.value })} style={sel(true)}>{MODALIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Campo>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 10, alignItems: "end" }}>
            <Campo label="Prazo médio (dias)"><input type="number" value={ed.prazo_medio_dias} onChange={(e) => setEd({ ...ed, prazo_medio_dias: Number(e.target.value) })} style={inp(true)} /></Campo>
            <Campo label="Taxa juros %"><input type="number" step="0.01" value={ed.taxa_juros} onChange={(e) => setEd({ ...ed, taxa_juros: Number(e.target.value) })} style={inp(true)} /></Campo>
            <label style={chk}><input type="checkbox" checked={!!ed.usa_limite_credito} onChange={(e) => setEd({ ...ed, usa_limite_credito: e.target.checked })} /> Usa limite de crédito</label>
            <label style={chk}><input type="checkbox" checked={!!ed.gera_parcelas} onChange={(e) => setEd({ ...ed, gera_parcelas: e.target.checked })} /> Gera parcelas</label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={salvar} disabled={saving || !ed.descricao} style={btnPrimary()}><Save size={14} /> Salvar</button>
            <button onClick={() => setEd(null)} style={btnGhost()}><X size={14} /> Cancelar</button>
          </div>
        </div>
      )}
      <div style={cardStyle()}>
        <table style={tabela}>
          <thead><tr><th style={th()}>Descrição</th><th style={th()}>Tipo</th><th style={th()}>Modalidade</th><th style={{ ...th(), textAlign: "center" }}>Limite</th><th style={{ ...th(), textAlign: "right" }}>Prazo</th><th style={{ ...th(), textAlign: "center" }}>Status</th><th style={{ ...th(), textAlign: "center" }}>Ações</th></tr></thead>
          <tbody>
            {itens.map((f) => (
              <tr key={f.id} style={linha}>
                <td style={{ ...td(), fontWeight: 600 }}>{f.descricao}</td>
                <td style={td()}>{(TIPOS_FP.find((t) => t[0] === f.tipo) || [])[1] || f.tipo}</td>
                <td style={td()}>{(MODALIDADES.find((m) => m[0] === f.modalidade) || [])[1] || f.modalidade}</td>
                <td style={{ ...td(), textAlign: "center" }}>{f.usa_limite_credito ? "Sim" : "—"}</td>
                <td style={{ ...td(), textAlign: "right" }}>{f.prazo_medio_dias ? `${f.prazo_medio_dias}d` : "—"}</td>
                <td style={{ ...td(), textAlign: "center" }}><Badge texto={f.ativo ? "ATIVO" : "INATIVO"} /></td>
                <td style={{ ...td(), textAlign: "center" }}><button onClick={() => setEd({ ...f })} style={btnIcon()} title="Editar"><Pencil size={14} /></button></td>
              </tr>
            ))}
            {itens.length === 0 && <VazioRow n={7} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ UNIDADES ═══ */
function Unidades({ dados, loading, reload }) {
  const [ed, setEd] = useState(null);
  const [saving, setSaving] = useState(false);
  const itens = estadoLista(dados, "unidades");

  async function salvar() {
    if (!ed.descricao || !ed.sigla) return;
    setSaving(true);
    try { await rpc("erp_unidade_salvar", { p: ed }); setEd(null); await reload(); }
    catch (e) { alert("Erro ao salvar unidade"); }
    setSaving(false);
  }

  if (loading && !dados) return <Carregando />;
  return (
    <div>
      <Cabecalho icon={Ruler} titulo="Unidades de Medida" onNovo={() => setEd({ id: 0, descricao: "", sigla: "", ativo: true })} />
      {ed && (
        <div style={{ ...cardStyle(), marginBottom: 14, border: `2px solid ${C.primary}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <Campo label="Descrição *"><input value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} style={inp(true)} autoFocus /></Campo>
            <Campo label="Sigla *"><input value={ed.sigla} onChange={(e) => setEd({ ...ed, sigla: e.target.value })} style={inp(true)} maxLength={10} /></Campo>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={salvar} disabled={saving || !ed.descricao || !ed.sigla} style={btnPrimary()}><Save size={14} /> Salvar</button>
              <button onClick={() => setEd(null)} style={btnGhost()}><X size={14} /></button>
            </div>
          </div>
          <label style={{ ...chk, marginTop: 10 }}><input type="checkbox" checked={!!ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Ativo</label>
        </div>
      )}
      <div style={cardStyle()}>
        <table style={tabela}>
          <thead><tr><th style={th()}>Descrição</th><th style={th()}>Sigla</th><th style={{ ...th(), textAlign: "center" }}>Status</th><th style={{ ...th(), textAlign: "center" }}>Ações</th></tr></thead>
          <tbody>
            {itens.map((u) => (
              <tr key={u.id} style={linha}>
                <td style={{ ...td(), fontWeight: 600 }}>{u.descricao}</td>
                <td style={td()}>{u.sigla}</td>
                <td style={{ ...td(), textAlign: "center" }}><Badge texto={u.ativo ? "ATIVO" : "INATIVO"} /></td>
                <td style={{ ...td(), textAlign: "center" }}><button onClick={() => setEd({ ...u })} style={btnIcon()} title="Editar"><Pencil size={14} /></button></td>
              </tr>
            ))}
            {itens.length === 0 && <VazioRow n={4} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ ÁREAS DE SERVIÇO (grupos_servico) ═══ */
function AreasServico({ dados, loading, reload }) {
  const [ed, setEd] = useState(null);
  const [saving, setSaving] = useState(false);
  const itens = estadoLista(dados, "areas_servico");

  async function salvar() {
    if (!ed.descricao) return;
    setSaving(true);
    try { await rpc("erp_area_servico_salvar", { p: ed }); setEd(null); await reload(); }
    catch (e) { alert("Erro ao salvar área"); }
    setSaving(false);
  }

  if (loading && !dados) return <Carregando />;
  return (
    <div>
      <Cabecalho icon={Wrench} titulo="Áreas de Serviço (Pátio)" onNovo={() => setEd({ id: 0, descricao: "", codigo: "", ativo: true })} />
      {ed && (
        <div style={{ ...cardStyle(), marginBottom: 14, border: `2px solid ${C.primary}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
            <Campo label="Descrição *"><input value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} style={inp(true)} autoFocus /></Campo>
            <Campo label="Código"><input value={ed.codigo || ""} onChange={(e) => setEd({ ...ed, codigo: e.target.value })} style={inp(true)} /></Campo>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={salvar} disabled={saving || !ed.descricao} style={btnPrimary()}><Save size={14} /> Salvar</button>
              <button onClick={() => setEd(null)} style={btnGhost()}><X size={14} /></button>
            </div>
          </div>
          <label style={{ ...chk, marginTop: 10 }}><input type="checkbox" checked={!!ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Ativo</label>
        </div>
      )}
      <div style={cardStyle()}>
        <table style={tabela}>
          <thead><tr><th style={th()}>Descrição</th><th style={th()}>Código</th><th style={{ ...th(), textAlign: "center" }}>Status</th><th style={{ ...th(), textAlign: "center" }}>Ações</th></tr></thead>
          <tbody>
            {itens.map((a) => (
              <tr key={a.id} style={linha}>
                <td style={{ ...td(), fontWeight: 600 }}>{a.descricao}</td>
                <td style={td()}>{a.codigo || "—"}</td>
                <td style={{ ...td(), textAlign: "center" }}><Badge texto={a.ativo ? "ATIVO" : "INATIVO"} /></td>
                <td style={{ ...td(), textAlign: "center" }}><button onClick={() => setEd({ ...a })} style={btnIcon()} title="Editar"><Pencil size={14} /></button></td>
              </tr>
            ))}
            {itens.length === 0 && <VazioRow n={4} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ GRUPOS + SUBGRUPOS DE PRODUTO ═══ */
function GruposProduto({ dados, loading, reload }) {
  const [edG, setEdG] = useState(null);
  const [edS, setEdS] = useState(null);
  const [saving, setSaving] = useState(false);
  const grupos = estadoLista(dados, "grupos_produto");
  const subgrupos = estadoLista(dados, "subgrupos_produto");

  // Markup padrão por grupo × tabela
  const [mkTabelas, setMkTabelas] = useState([]);
  const [mkTodos, setMkTodos] = useState([]);   // todas as linhas de markup padrão
  const [mkLinhas, setMkLinhas] = useState([]); // linhas do grupo em edição
  useEffect(() => {
    let a = true;
    rpc("erp_grupos_markup_listar", {}).then((d) => { if (!a) return; setMkTabelas(d?.tabelas || []); setMkTodos(d?.markups || []); }).catch(() => {});
    return () => { a = false; };
  }, [dados]);

  function abrirGrupo(g) {
    setEdG({ ...g });
    setMkLinhas((mkTabelas || []).map((t) => {
      const m = g.id ? mkTodos.find((x) => x.id_grupo === g.id && x.id_tabela_preco === t.id) : null;
      return { id_tabela_preco: t.id, tabela: t.descricao, tipo_calculo: m?.tipo_calculo || "MARKUP", percentual: m?.percentual ?? "" };
    }));
  }
  const setMk = (i, k, v) => setMkLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  async function salvarGrupo() {
    if (!edG.descricao) return;
    setSaving(true);
    try {
      const row = await rpc("erp_grupo_produto_salvar", { p: edG });
      const gid = edG.id || row?.id;
      if (gid && mkLinhas.length) {
        await rpc("erp_grupo_markup_salvar", { p_id_grupo: gid, p_linhas: mkLinhas.map((l) => ({ id_tabela_preco: l.id_tabela_preco, tipo_calculo: l.tipo_calculo, percentual: l.percentual === "" ? null : Number(String(l.percentual).replace(",", ".")) })) });
      }
      setEdG(null); await reload();
    }
    catch (e) { alert("Erro ao salvar grupo"); }
    setSaving(false);
  }
  async function salvarSub() {
    if (!edS.descricao) return;
    setSaving(true);
    try { await rpc("erp_subgrupo_produto_salvar", { p: edS }); setEdS(null); await reload(); }
    catch (e) { alert("Erro ao salvar subgrupo"); }
    setSaving(false);
  }

  if (loading && !dados) return <Carregando />;
  const nomeGrupo = (id) => (grupos.find((g) => g.id === id) || {}).descricao || "—";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Grupos */}
      <div>
        <Cabecalho icon={Boxes} titulo="Grupos de Produto" onNovo={() => abrirGrupo({ id: 0, descricao: "", permite_estoque_negativo: false, ativo: true })} />
        {edG && (
          <div style={{ ...cardStyle(), marginBottom: 14, border: `2px solid ${C.primary}` }}>
            <Campo label="Descrição *"><input value={edG.descricao} onChange={(e) => setEdG({ ...edG, descricao: e.target.value })} style={inp(true)} autoFocus /></Campo>
            <label style={{ ...chk, marginTop: 10 }}><input type="checkbox" checked={!!edG.permite_estoque_negativo} onChange={(e) => setEdG({ ...edG, permite_estoque_negativo: e.target.checked })} /> Permite estoque negativo</label>
            <label style={{ ...chk, marginTop: 6 }}><input type="checkbox" checked={!!edG.ativo} onChange={(e) => setEdG({ ...edG, ativo: e.target.checked })} /> Ativo</label>

            {mkLinhas.length > 0 && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 4 }}>Markup padrão por tabela</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>Sobre o <b>custo médio</b>. Produtos deste grupo já nascem precificados e recalculam sozinhos na entrada de NF. Em branco = sem padrão.</div>
                {mkLinhas.map((l, i) => (
                  <div key={l.id_tabela_preco} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 100, fontSize: 13, fontWeight: 600 }}>{l.tabela}</span>
                    <select value={l.tipo_calculo} onChange={(e) => setMk(i, "tipo_calculo", e.target.value)} style={{ ...sel(true), width: 130 }}>
                      <option value="MARKUP">Markup (custo+%)</option>
                      <option value="MARGEM">Margem (% s/ venda)</option>
                    </select>
                    <input value={l.percentual} onChange={(e) => setMk(i, "percentual", e.target.value.replace(/[^\d.,]/g, ""))} placeholder="%" style={{ ...inp(true), width: 90, fontFamily: mono, textAlign: "right" }} />
                    <span style={{ fontSize: 12, color: C.textMuted }}>%</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={salvarGrupo} disabled={saving || !edG.descricao} style={btnPrimary()}><Save size={14} /> Salvar</button>
              <button onClick={() => setEdG(null)} style={btnGhost()}><X size={14} /></button>
            </div>
          </div>
        )}
        <div style={cardStyle()}>
          <table style={tabela}>
            <thead><tr><th style={th()}>Descrição</th><th style={{ ...th(), textAlign: "center" }}>Status</th><th style={{ ...th(), textAlign: "center" }}>Ações</th></tr></thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id} style={linha}>
                  <td style={{ ...td(), fontWeight: 600 }}>{g.descricao}</td>
                  <td style={{ ...td(), textAlign: "center" }}><Badge texto={g.ativo ? "ATIVO" : "INATIVO"} /></td>
                  <td style={{ ...td(), textAlign: "center" }}><button onClick={() => abrirGrupo(g)} style={btnIcon()} title="Editar"><Pencil size={14} /></button></td>
                </tr>
              ))}
              {grupos.length === 0 && <VazioRow n={3} />}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subgrupos */}
      <div>
        <Cabecalho icon={Boxes} titulo="Subgrupos de Produto" onNovo={() => setEdS({ id: 0, descricao: "", id_grupo: grupos[0]?.id || null, permite_estoque_negativo: false, ativo: true })} />
        {edS && (
          <div style={{ ...cardStyle(), marginBottom: 14, border: `2px solid ${C.primary}` }}>
            <Campo label="Descrição *"><input value={edS.descricao} onChange={(e) => setEdS({ ...edS, descricao: e.target.value })} style={inp(true)} autoFocus /></Campo>
            <Campo label="Grupo" span><select value={edS.id_grupo || ""} onChange={(e) => setEdS({ ...edS, id_grupo: e.target.value ? Number(e.target.value) : null })} style={sel(true)}><option value="">— Selecione —</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}</select></Campo>
            <label style={{ ...chk, marginTop: 10 }}><input type="checkbox" checked={!!edS.ativo} onChange={(e) => setEdS({ ...edS, ativo: e.target.checked })} /> Ativo</label>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={salvarSub} disabled={saving || !edS.descricao} style={btnPrimary()}><Save size={14} /> Salvar</button>
              <button onClick={() => setEdS(null)} style={btnGhost()}><X size={14} /></button>
            </div>
          </div>
        )}
        <div style={cardStyle()}>
          <table style={tabela}>
            <thead><tr><th style={th()}>Descrição</th><th style={th()}>Grupo</th><th style={{ ...th(), textAlign: "center" }}>Ações</th></tr></thead>
            <tbody>
              {subgrupos.map((s) => (
                <tr key={s.id} style={linha}>
                  <td style={{ ...td(), fontWeight: 600 }}>{s.descricao}</td>
                  <td style={{ ...td(), color: C.muted }}>{nomeGrupo(s.id_grupo)}</td>
                  <td style={{ ...td(), textAlign: "center" }}><button onClick={() => setEdS({ ...s })} style={btnIcon()} title="Editar"><Pencil size={14} /></button></td>
                </tr>
              ))}
              {subgrupos.length === 0 && <VazioRow n={3} />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══ helpers locais ═══ */
const tabela = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const linha = { borderBottom: `1px solid ${C.border}` };
const chk = { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.foreground, cursor: "pointer" };
function Carregando() { return <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div>; }
function VazioRow({ n }) { return <tr><td colSpan={n} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 30 }}>Nenhum registro</td></tr>; }
