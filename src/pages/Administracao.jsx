import { useState, useEffect } from "react";
import {
  Shield, Users, Plus, Pencil, Trash2, Save, X, Check, ChevronDown, ChevronRight,
  Eye, FileText, Percent, Search, UserCog, KeyRound, RefreshCw, Lock,
} from "lucide-react";
import { C, rpc } from "../config";
import { cardStyle, inp, sel, btnPrimary, btnGhost, btnIcon, th, td, Campo, Badge, Aviso } from "../ui";

const ABAS = [
  { key: "grupos", label: "Grupos de Acesso", icon: Shield },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "desconto", label: "Política de Desconto", icon: Percent },
  { key: "config", label: "Configurações", icon: KeyRound },
];

export default function Administracao({ usuario }) {
  const [aba, setAba] = useState("grupos");
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const r = await rpc("erp_admin_dados");
      setDados(r);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { let a = true; carregar().then(() => { if (!a) return; }); return () => { a = false; }; }, []);

  if (loading || !dados) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <UserCog size={22} style={{ color: C.primary }} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>Administração</span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.border}`, paddingBottom: 0 }}>
        {ABAS.map((a) => (
          <div key={a.key} onClick={() => setAba(a.key)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", cursor: "pointer",
            borderBottom: aba === a.key ? `2px solid ${C.primary}` : "2px solid transparent",
            color: aba === a.key ? C.primary : C.muted, fontWeight: aba === a.key ? 600 : 400, fontSize: 13,
            marginBottom: -2,
          }}>
            <a.icon size={15} /> {a.label}
          </div>
        ))}
      </div>

      {aba === "grupos" && <AbaGrupos dados={dados} onReload={carregar} />}
      {aba === "usuarios" && <AbaUsuarios dados={dados} onReload={carregar} />}
      {aba === "desconto" && <AbaDesconto dados={dados} onReload={carregar} />}
      {aba === "config" && <AbaConfig usuario={usuario} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════ ABA GRUPOS ═══════════════════════════════════════════════ */
function AbaGrupos({ dados, onReload }) {
  const [editGrupo, setEditGrupo] = useState(null);
  const [editPerms, setEditPerms] = useState(null);
  const [perms, setPerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const grupos = (dados.grupos || []).filter((g) => !busca || g.nome.toLowerCase().includes(busca.toLowerCase()));

  async function salvarGrupo() {
    setSaving(true);
    try {
      await rpc("erp_grupo_salvar", { p: editGrupo });
      setEditGrupo(null);
      await onReload();
    } catch (e) { alert("Erro ao salvar grupo"); }
    setSaving(false);
  }

  async function abrirPermissoes(grupo) {
    setEditPerms(grupo);
    try {
      const r = await rpc("erp_grupo_permissoes", { p_id_grupo: grupo.id });
      const modulos = dados.modulos || [];
      const permMap = {};
      (r || []).forEach((p) => { permMap[p.id_modulo] = p; });
      setPerms(modulos.map((m) => ({
        id_modulo: m.id, chave: m.chave, nome: m.nome,
        pode_visualizar: permMap[m.id]?.pode_visualizar || false,
        pode_incluir: permMap[m.id]?.pode_incluir || false,
        pode_editar: permMap[m.id]?.pode_editar || false,
        pode_excluir: permMap[m.id]?.pode_excluir || false,
        pode_aprovar: permMap[m.id]?.pode_aprovar || false,
        pode_exportar: permMap[m.id]?.pode_exportar || false,
        pode_ajustar_estoque: permMap[m.id]?.pode_ajustar_estoque || false,
        pode_dar_desconto: permMap[m.id]?.pode_dar_desconto || false,
      })));
    } catch (e) { console.error(e); }
  }

  async function salvarPermissoes() {
    setSaving(true);
    try {
      await rpc("erp_grupo_permissoes_salvar", { p_id_grupo: editPerms.id, p_permissoes: perms.filter((p) => p.pode_visualizar || p.pode_incluir || p.pode_editar || p.pode_excluir) });
      setEditPerms(null);
      await onReload();
    } catch (e) { alert("Erro ao salvar permissões"); }
    setSaving(false);
  }

  function togglePerm(idx, campo) {
    setPerms((prev) => prev.map((p, i) => i === idx ? { ...p, [campo]: !p[campo] } : p));
  }

  function toggleTodosModulo(idx) {
    const p = perms[idx];
    const allOn = p.pode_visualizar && p.pode_incluir && p.pode_editar && p.pode_excluir && p.pode_aprovar && p.pode_exportar;
    setPerms((prev) => prev.map((pp, i) => i === idx ? {
      ...pp, pode_visualizar: !allOn, pode_incluir: !allOn, pode_editar: !allOn,
      pode_excluir: !allOn, pode_aprovar: !allOn, pode_exportar: !allOn,
    } : pp));
  }

  // Modal de permissões
  if (editPerms) {
    return (
      <div style={cardStyle()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={18} style={{ color: C.primary }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Permissões: {editPerms.nome}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditPerms(null)} style={btnGhost()}><X size={14} /> Cancelar</button>
            <button onClick={salvarPermissoes} disabled={saving} style={btnPrimary()}><Save size={14} /> Salvar</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th()}>Módulo</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Todos</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Ver</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Criar</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Editar</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Excluir</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Aprovar</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Exportar</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Aj.Est.</th>
                <th style={{ ...th(), textAlign: "center", width: 50 }}>Desc.</th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p, i) => {
                const allOn = p.pode_visualizar && p.pode_incluir && p.pode_editar && p.pode_excluir && p.pode_aprovar && p.pode_exportar;
                return (
                  <tr key={p.id_modulo} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td()}>{p.nome}</td>
                    <td style={{ ...td(), textAlign: "center" }}>
                      <input type="checkbox" checked={allOn} onChange={() => toggleTodosModulo(i)} />
                    </td>
                    {["pode_visualizar", "pode_incluir", "pode_editar", "pode_excluir", "pode_aprovar", "pode_exportar", "pode_ajustar_estoque", "pode_dar_desconto"].map((campo) => (
                      <td key={campo} style={{ ...td(), textAlign: "center" }}>
                        <input type="checkbox" checked={p[campo]} onChange={() => togglePerm(i, campo)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar grupo..." style={{ ...inp(true), paddingLeft: 32 }} />
        </div>
        <button onClick={() => setEditGrupo({ id: 0, nome: "", descricao: "", ativo: true })} style={btnPrimary()}>
          <Plus size={15} /> Novo Grupo
        </button>
      </div>

      {/* Modal edição grupo */}
      {editGrupo && (
        <div style={{ ...cardStyle(), marginBottom: 16, border: `2px solid ${C.primary}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editGrupo.id ? "Editar" : "Novo"} Grupo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <Campo label="Nome">
              <input value={editGrupo.nome} onChange={(e) => setEditGrupo({ ...editGrupo, nome: e.target.value })} style={inp(true)} />
            </Campo>
            <Campo label="Descrição">
              <input value={editGrupo.descricao || ""} onChange={(e) => setEditGrupo({ ...editGrupo, descricao: e.target.value })} style={inp(true)} />
            </Campo>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={salvarGrupo} disabled={saving || !editGrupo.nome} style={btnPrimary()}><Save size={14} /> Salvar</button>
              <button onClick={() => setEditGrupo(null)} style={btnGhost()}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle()}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th()}>Nome</th>
              <th style={th()}>Descrição</th>
              <th style={{ ...th(), textAlign: "center" }}>Usuários</th>
              <th style={{ ...th(), textAlign: "center" }}>Status</th>
              <th style={{ ...th(), textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 600 }}>{g.nome}</td>
                <td style={{ ...td(), color: C.muted }}>{g.descricao}</td>
                <td style={{ ...td(), textAlign: "center" }}>{g.qtd_usuarios}</td>
                <td style={{ ...td(), textAlign: "center" }}><Badge texto={g.ativo ? "ATIVO" : "INATIVO"} /></td>
                <td style={{ ...td(), textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={() => abrirPermissoes(g)} style={btnIcon()} title="Permissões"><KeyRound size={14} /></button>
                    <button onClick={() => setEditGrupo({ ...g })} style={btnIcon()} title="Editar"><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {grupos.length === 0 && (
              <tr><td colSpan={5} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 40 }}>Nenhum grupo encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ ABA USUARIOS ═══════════════════════════════════════════════ */
function AbaUsuarios({ dados, onReload }) {
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const usuarios = (dados.usuarios || []).filter((u) => !busca || u.nome.toLowerCase().includes(busca.toLowerCase()) || u.login.toLowerCase().includes(busca.toLowerCase()));

  function novoUsuario() {
    setEditUser({ id: 0, nome: "", login: "", email: "", senha: "", perfil: "OPERADOR", segmento: "", id_centro_custo: null, percentual_comissao: 0, perc_comissao_servico: 0, perc_comissao_peca: 0, ativo: true, grupos_ids: [] });
  }

  async function salvarUsuario() {
    if (!editUser.nome || !editUser.login) { alert("Nome e Login são obrigatórios"); return; }
    setSaving(true);
    try {
      await rpc("erp_usuario_salvar", { p: editUser });
      setEditUser(null);
      await onReload();
    } catch (e) { alert("Erro ao salvar usuário"); }
    setSaving(false);
  }

  function toggleGrupo(gid) {
    setEditUser((prev) => {
      const ids = prev.grupos_ids || [];
      return { ...prev, grupos_ids: ids.includes(gid) ? ids.filter((x) => x !== gid) : [...ids, gid] };
    });
  }

  if (editUser) {
    return (
      <div style={cardStyle()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{editUser.id ? "Editar" : "Novo"} Usuário</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditUser(null)} style={btnGhost()}><X size={14} /> Cancelar</button>
            <button onClick={salvarUsuario} disabled={saving} style={btnPrimary()}><Save size={14} /> Salvar</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
          <Campo label="Nome *">
            <input value={editUser.nome} onChange={(e) => setEditUser({ ...editUser, nome: e.target.value })} style={inp(true)} />
          </Campo>
          <Campo label="Login *">
            <input value={editUser.login} onChange={(e) => setEditUser({ ...editUser, login: e.target.value })} style={inp(true)} />
          </Campo>
          <Campo label={editUser.id ? "Nova Senha (deixe vazio para manter)" : "Senha"}>
            <input value={editUser.senha || ""} onChange={(e) => setEditUser({ ...editUser, senha: e.target.value })} type="password" style={inp(true)} placeholder={editUser.id ? "••••••••" : ""} />
          </Campo>
          <Campo label="Email">
            <input value={editUser.email || ""} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} style={inp(true)} />
          </Campo>
          <Campo label="Segmento">
            <select value={editUser.segmento || ""} onChange={(e) => setEditUser({ ...editUser, segmento: e.target.value })} style={sel(true)}>
              <option value="">-- Selecione --</option>
              {(dados.segmentos || []).map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Status">
            <select value={editUser.ativo ? "true" : "false"} onChange={(e) => setEditUser({ ...editUser, ativo: e.target.value === "true" })} style={sel(true)}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </Campo>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
          <Campo label="% Comissão Geral">
            <input type="number" value={editUser.percentual_comissao || 0} onChange={(e) => setEditUser({ ...editUser, percentual_comissao: Number(e.target.value) })} style={inp(true)} />
          </Campo>
          <Campo label="% Comissão Serviço">
            <input type="number" value={editUser.perc_comissao_servico || 0} onChange={(e) => setEditUser({ ...editUser, perc_comissao_servico: Number(e.target.value) })} style={inp(true)} />
          </Campo>
          <Campo label="% Comissão Peça">
            <input type="number" value={editUser.perc_comissao_peca || 0} onChange={(e) => setEditUser({ ...editUser, perc_comissao_peca: Number(e.target.value) })} style={inp(true)} />
          </Campo>
        </div>

        <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted }}>Grupos de Acesso</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(dados.grupos || []).filter((g) => g.ativo).map((g) => {
            const sel2 = (editUser.grupos_ids || []).includes(g.id);
            return (
              <div key={g.id} onClick={() => toggleGrupo(g.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                background: sel2 ? C.bluePale : C.surface2, border: `1px solid ${sel2 ? C.blueMid : C.border}`,
                color: sel2 ? C.blueMid : C.muted, fontSize: 12, fontWeight: sel2 ? 600 : 400,
              }}>
                {sel2 && <Check size={13} />} {g.nome}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: C.textMuted }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar usuário..." style={{ ...inp(true), paddingLeft: 32 }} />
        </div>
        <button onClick={novoUsuario} style={btnPrimary()}><Plus size={15} /> Novo Usuário</button>
      </div>

      <div style={cardStyle()}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th()}>Nome</th>
              <th style={th()}>Login</th>
              <th style={th()}>Grupos</th>
              <th style={th()}>Segmento</th>
              <th style={{ ...th(), textAlign: "center" }}>Status</th>
              <th style={th()}>Último Acesso</th>
              <th style={{ ...th(), textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...td(), fontWeight: 600 }}>{u.nome}</td>
                <td style={{ ...td(), color: C.muted }}>{u.login}</td>
                <td style={td()}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(u.grupos || []).map((g) => (
                      <span key={g.id} style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{g.nome}</span>
                    ))}
                    {(!u.grupos || u.grupos.length === 0) && <span style={{ color: C.textMuted, fontSize: 11 }}>Sem grupo</span>}
                  </div>
                </td>
                <td style={{ ...td(), color: C.muted }}>{u.segmento || "—"}</td>
                <td style={{ ...td(), textAlign: "center" }}><Badge texto={u.ativo ? "ATIVO" : "INATIVO"} /></td>
                <td style={{ ...td(), color: C.textMuted, fontSize: 12 }}>{u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString("pt-BR") : "—"}</td>
                <td style={{ ...td(), textAlign: "center" }}>
                  <button onClick={() => setEditUser({ ...u, senha: "", grupos_ids: (u.grupos || []).map((g) => g.id) })} style={btnIcon()} title="Editar"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ ABA DESCONTO ═══════════════════════════════════════════════ */
function AbaDesconto({ dados, onReload }) {
  const [grupoSel, setGrupoSel] = useState(null);
  const [politicas, setPoliticas] = useState([]);
  const [editPol, setEditPol] = useState(null);
  const [saving, setSaving] = useState(false);
  const [gruposProd, setGruposProd] = useState([]);
  const [subgruposProd, setSubgruposProd] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [produtosList, setProdutosList] = useState([]);

  async function selecionarGrupo(g) {
    setGrupoSel(g);
    try {
      const r = await rpc("erp_politica_desconto_listar", { p_id_grupo: g.id });
      setPoliticas(Array.isArray(r) ? r : []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    let a = true;
    async function load() {
      try {
        const hdrs2 = { apikey: "sb_publishable_nEfc7eXcI1zcai3WcRo84g_ZTg9ArSO", Authorization: "Bearer sb_publishable_nEfc7eXcI1zcai3WcRo84g_ZTg9ArSO", "Accept-Profile": "Teste ERP", Range: "0-9999" };
        const base = import.meta.env.VITE_SUPA_URL || "https://vishxwdxqiygbxmtpfoy.supabase.co";
        const [gp, sp, tp, pr] = await Promise.all([
          fetch(`${base}/rest/v1/grupos_produto?select=id,descricao&order=descricao`, { headers: hdrs2 }).then((r) => r.json()).catch(() => []),
          fetch(`${base}/rest/v1/subgrupos_produto?select=id,descricao&order=descricao`, { headers: hdrs2 }).then((r) => r.json()).catch(() => []),
          fetch(`${base}/rest/v1/tabelas_preco?select=id,descricao&order=descricao`, { headers: hdrs2 }).then((r) => r.json()).catch(() => []),
          fetch(`${base}/rest/v1/produtos?select=id,nome,referencia&situacao=eq.ATIVO&order=nome`, { headers: hdrs2 }).then((r) => r.json()).catch(() => []),
        ]);
        if (a) { setGruposProd(gp || []); setSubgruposProd(sp || []); setTabelas(tp || []); setProdutosList(pr || []); }
      } catch (e) { console.error(e); }
    }
    load();
    return () => { a = false; };
  }, []);

  async function salvarPolitica() {
    setSaving(true);
    try {
      await rpc("erp_politica_desconto_salvar", { p: { ...editPol, id_grupo_acesso: grupoSel.id } });
      setEditPol(null);
      await selecionarGrupo(grupoSel);
    } catch (e) { alert("Erro ao salvar"); }
    setSaving(false);
  }

  async function excluirPolitica(id) {
    if (!confirm("Excluir esta política?")) return;
    try {
      await rpc("erp_politica_desconto_excluir", { p_id: id });
      await selecionarGrupo(grupoSel);
    } catch (e) { alert("Erro ao excluir"); }
  }

  const novaPolitica = () => setEditPol({
    id: 0, id_grupo_produto: null, id_subgrupo_produto: null, id_produto: null,
    id_tabela_preco: null, desconto_maximo_vista: 0, desconto_maximo_prazo: 0, requer_aprovacao: false,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
      {/* Lista de grupos */}
      <div style={cardStyle()}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 10 }}>Selecione o Grupo</div>
        {(dados.grupos || []).filter((g) => g.ativo).map((g) => (
          <div key={g.id} onClick={() => selecionarGrupo(g)} style={{
            padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, fontSize: 13,
            background: grupoSel?.id === g.id ? C.bluePale : "transparent",
            color: grupoSel?.id === g.id ? C.blueMid : C.foreground,
            fontWeight: grupoSel?.id === g.id ? 600 : 400,
          }}>
            {g.nome}
          </div>
        ))}
      </div>

      {/* Políticas do grupo */}
      <div style={cardStyle()}>
        {!grupoSel ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
            <Percent size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 8 }}>Selecione um grupo para gerenciar as políticas de desconto</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Descontos: {grupoSel.nome}</span>
              <button onClick={novaPolitica} style={btnPrimary()}>
                <Plus size={14} /> Nova Política
              </button>
            </div>

            {editPol && (
              <div style={{ background: C.surface2, borderRadius: 8, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
                  <Campo label="Produto específico">
                    <select value={editPol.id_produto || ""} onChange={(e) => setEditPol({ ...editPol, id_produto: e.target.value ? Number(e.target.value) : null })} style={sel(true)}>
                      <option value="">Todos</option>
                      {produtosList.map((p) => <option key={p.id} value={p.id}>{p.referencia ? `${p.referencia} — ` : ""}{p.nome}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Grupo Produto">
                    <select value={editPol.id_grupo_produto || ""} onChange={(e) => setEditPol({ ...editPol, id_grupo_produto: e.target.value ? Number(e.target.value) : null })} style={sel(true)} disabled={!!editPol.id_produto}>
                      <option value="">Todos</option>
                      {gruposProd.map((g) => <option key={g.id} value={g.id}>{g.descricao}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Subgrupo Produto">
                    <select value={editPol.id_subgrupo_produto || ""} onChange={(e) => setEditPol({ ...editPol, id_subgrupo_produto: e.target.value ? Number(e.target.value) : null })} style={sel(true)} disabled={!!editPol.id_produto}>
                      <option value="">Todos</option>
                      {subgruposProd.map((s) => <option key={s.id} value={s.id}>{s.descricao}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Tabela de Preço">
                    <select value={editPol.id_tabela_preco || ""} onChange={(e) => setEditPol({ ...editPol, id_tabela_preco: e.target.value ? Number(e.target.value) : null })} style={sel(true)}>
                      <option value="">Todas</option>
                      {tabelas.map((t) => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                    </select>
                  </Campo>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 120px 130px auto auto", gap: 10, alignItems: "end", marginTop: 10 }}>
                  <Campo label="Desc. Vista %">
                    <input type="number" step="0.01" value={editPol.desconto_maximo_vista} onChange={(e) => setEditPol({ ...editPol, desconto_maximo_vista: Number(e.target.value) })} style={inp(true)} />
                  </Campo>
                  <Campo label="Desc. Prazo %">
                    <input type="number" step="0.01" value={editPol.desconto_maximo_prazo} onChange={(e) => setEditPol({ ...editPol, desconto_maximo_prazo: Number(e.target.value) })} style={inp(true)} />
                  </Campo>
                  <Campo label="Requer Aprovação">
                    <select value={editPol.requer_aprovacao ? "true" : "false"} onChange={(e) => setEditPol({ ...editPol, requer_aprovacao: e.target.value === "true" })} style={sel(true)}>
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </select>
                  </Campo>
                  <button onClick={salvarPolitica} disabled={saving} style={btnPrimary()}><Save size={14} /> Salvar</button>
                  <button onClick={() => setEditPol(null)} style={btnGhost()}><X size={14} /></button>
                </div>
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th()}>Escopo</th>
                  <th style={th()}>Tabela Preço</th>
                  <th style={{ ...th(), textAlign: "right" }}>Vista %</th>
                  <th style={{ ...th(), textAlign: "right" }}>Prazo %</th>
                  <th style={{ ...th(), textAlign: "center" }}>Aprovação</th>
                  <th style={{ ...th(), textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {politicas.map((p) => {
                  const escopo = p.produto_nome
                    ? `Produto: ${p.produto_nome}`
                    : p.subgrupo_produto_nome
                      ? `Subgrupo: ${p.subgrupo_produto_nome}`
                      : p.grupo_produto_nome
                        ? `Grupo: ${p.grupo_produto_nome}`
                        : "Regra geral";
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ ...td(), fontWeight: p.produto_nome ? 600 : 400 }}>{escopo}</td>
                      <td style={td()}>{p.tabela_preco_nome || "Todas"}</td>
                      <td style={{ ...td(), textAlign: "right", fontWeight: 600 }}>{p.desconto_maximo_vista}%</td>
                      <td style={{ ...td(), textAlign: "right", fontWeight: 600 }}>{p.desconto_maximo_prazo}%</td>
                      <td style={{ ...td(), textAlign: "center" }}>{p.requer_aprovacao ? <Badge texto="SIM" cor="ABERTA" /> : "—"}</td>
                      <td style={{ ...td(), textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button onClick={() => setEditPol({ ...p })} style={btnIcon()} title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => excluirPolitica(p.id)} style={{ ...btnIcon(), color: C.destructive }} title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {politicas.length === 0 && (
                  <tr><td colSpan={6} style={{ ...td(), textAlign: "center", color: C.textMuted, padding: 30 }}>Nenhuma política configurada para este grupo</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ ABA CONFIGURAÇÕES ═══════════════════════════════════════════ */
const CONFIG_META = {
  credito_bloqueia_vencido: { label: "Bloquear venda a prazo com título vencido", tipo: "sn" },
  credito_dias_tolerancia: { label: "Dias de tolerância após o vencimento", tipo: "num" },
  credito_permite_liberacao: { label: "Gestor pode liberar crédito na hora", tipo: "sn" },
  op_custo_modo: { label: "Custo do produto produzido na OS", tipo: "opcao", opcoes: [["COMPOSICAO", "Pela composição (custo de referência)"], ["REAL", "Pelo consumo real apontado"]] },
};

function AbaConfig({ usuario }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [msg, setMsg] = useState("");

  async function carregar() {
    setLoading(true);
    try { const r = await rpc("erp_config_listar"); setConfigs(Array.isArray(r) ? r : []); }
    catch (e) { console.error(e); }
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(chave, valor) {
    setSalvando(chave);
    try {
      await rpc("erp_config_salvar", { p_chave: chave, p_valor: String(valor), p_id_usuario: usuario.id });
      setConfigs((l) => l.map((c) => c.chave === chave ? { ...c, valor: String(valor) } : c));
      setMsg("Salvo.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg("Erro: " + e.message); }
    finally { setSalvando(""); }
  }

  if (loading) return <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div>;

  return (
    <div style={cardStyle()}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Configurações do sistema</div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 16 }}>Valem para todas as empresas. {msg && <b style={{ color: C.success }}>{msg}</b>}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {configs.map((c) => {
          const meta = CONFIG_META[c.chave] || { label: c.descricao || c.chave, tipo: "texto" };
          return (
            <div key={c.chave} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", background: C.surface2, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
                {c.descricao && <div style={{ fontSize: 11.5, color: C.textMuted }}>{c.descricao}</div>}
              </div>
              <div style={{ opacity: salvando === c.chave ? 0.5 : 1 }}>
                {meta.tipo === "sn" && (
                  <select value={c.valor} onChange={(e) => salvar(c.chave, e.target.value)} style={sel()}>
                    <option value="S">Sim</option><option value="N">Não</option>
                  </select>
                )}
                {meta.tipo === "num" && (
                  <input defaultValue={c.valor} onBlur={(e) => e.target.value !== c.valor && salvar(c.chave, e.target.value)} inputMode="numeric" style={{ ...inp(), width: 90, textAlign: "right" }} />
                )}
                {meta.tipo === "opcao" && (
                  <select value={c.valor} onChange={(e) => salvar(c.chave, e.target.value)} style={sel()}>
                    {meta.opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
                {meta.tipo === "texto" && (
                  <input defaultValue={c.valor} onBlur={(e) => e.target.value !== c.valor && salvar(c.chave, e.target.value)} style={{ ...inp(), width: 160 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
