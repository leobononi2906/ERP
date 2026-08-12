import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, X, Trash2, Save, UserPlus, KeyRound } from "lucide-react";
import { C, mono, fmtBRL, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton } from "../ui";

const VINC_LABEL = {
  CLT_INDET: "CLT indeterminado", CLT_EXPERIENCIA: "CLT experiência", APRENDIZ: "Aprendiz",
  TEMPORARIO: "Temporário", ESTAGIARIO: "Estagiário", AUTONOMO: "Autônomo/RPA",
};
const vazio = () => ({ tipo_vinculo: "CLT_INDET", unidade_salario: "MENSAL", jornada_horas_semana: 44, ativo: true, salario_base: 0 });

export default function Colaboradores({ usuario }) {
  const [dom, setDom] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [form, setForm] = useState(null);          // objeto do colaborador em edição (null = modal fechado)
  const [deps, setDeps] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [acesso, setAcesso] = useState(null);          // usuário vinculado (login) ou null
  const [acessoForm, setAcessoForm] = useState({ login: "", senha: "" });
  const [gerandoAcesso, setGerandoAcesso] = useState(false);

  useEffect(() => { (async () => {
    try { const d = await rpc("erp_rh_dominios", {}); setDom(d); } catch (e) { setErro(e.message); }
  })(); }, []);

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const r = await rpc("erp_colaboradores_listar", { p_id_empresa: idEmpresa ? Number(idEmpresa) : null, p_busca: busca || null, p_incluir_inativos: false });
      setLista(r || []);
    } catch (e) { setErro(e.message); } finally { setLoading(false); }
  }, [idEmpresa, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo = () => { setForm({ ...vazio(), id_empresa: idEmpresa || (dom?.empresas?.[0]?.id ?? "") }); setDeps([]); setAcesso(null); setAcessoForm({ login: "", senha: "" }); };
  const abrirEdicao = async (id) => {
    try {
      const r = await rpc("erp_colaborador_obter", { p_id: id });
      setForm(r.colaborador); setDeps(r.dependentes || []); setAcesso(r.acesso || null);
      setAcessoForm({ login: "", senha: "" });
    }
    catch (e) { setErro(e.message); }
  };
  const fechar = () => { setForm(null); setDeps([]); setAcesso(null); };

  const gerarAcesso = async () => {
    if (!form?.id) { setErro("Salve o colaborador antes de gerar o acesso."); return; }
    setGerandoAcesso(true); setErro(null);
    try {
      const r = await rpc("erp_colaborador_gerar_acesso", { p: { id_colaborador: form.id, login: acessoForm.login, senha: acessoForm.senha || null } });
      if (r?.ok) {
        setAcesso({ id: r.id_usuario, login: r.login, ativo: true });
        setAcessoForm({ login: "", senha: "" });
      }
    } catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setGerandoAcesso(false); }
  };
  const setF = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const salvar = async () => {
    setSalvando(true); setErro(null);
    try {
      const salvo = await rpc("erp_colaborador_salvar", { p: form });
      // dependentes novos (sem id) são vinculados ao colaborador salvo
      for (const d of deps.filter((x) => !x.id && x._novo)) {
        await rpc("erp_dependente_salvar", { p: { ...d, id_colaborador: salvo.id } });
      }
      fechar(); carregar();
    } catch (e) { setErro(e.message.replace(/^[A-Z_]+\|\s*/, "")); } finally { setSalvando(false); }
  };

  const addDep = () => setDeps((s) => [...s, { nome: "", tipo: "FILHO", dep_irrf: false, dep_salario_familia: false, _novo: true }]);
  const setDep = (i, k) => (e) => setDeps((s) => s.map((d, idx) => idx === i ? { ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } : d));
  const rmDep = async (i) => {
    const d = deps[i];
    if (d.id) { try { await rpc("erp_dependente_remover", { p_id: d.id }); } catch (e) { setErro(e.message); return; } }
    setDeps((s) => s.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Colaboradores</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>Cadastro de DP — vínculo, categoria eSocial, dependentes.</p>
        </div>
        <button onClick={abrirNovo} style={{ ...btnPrimary(), height: 38 }}><Plus size={15} /> Novo colaborador</button>
      </div>

      <div style={{ ...cardStyle(), marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>Empresa</label>
          <select value={idEmpresa} onChange={(e) => setIdEmpresa(e.target.value)} style={{ ...sel(), height: 38, minWidth: 180 }}>
            <option value="">Todas</option>
            {(dom?.empresas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={lbl}>Buscar (nome / CPF / matrícula)</label>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: C.textMuted }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para filtrar..." style={{ ...inp(), width: "100%", paddingLeft: 32 }} />
          </div>
        </div>
      </div>

      {erro && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, background: C.destructiveBg, color: C.destructive }}><X size={16} /> {erro}</div>}

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={34} />)}</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}><Users size={30} style={{ opacity: 0.4 }} /><div style={{ marginTop: 10, fontSize: 13 }}>Nenhum colaborador. Clique em "Novo colaborador".</div></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
              <thead><tr>{["Matríc.", "Nome", "Vínculo", "eSocial", "Salário", "Depend.", ""].map((h, i) => <th key={i} style={th(i >= 4 && i <= 5)}>{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => abrirEdicao(c.id)}>
                    <td style={{ ...td(), fontFamily: mono }}>{c.matricula || "—"}</td>
                    <td style={td()}><div style={{ fontWeight: 600 }}>{c.nome}</div><div style={{ fontSize: 11.5, color: C.muted }}>{[c.cargo, c.departamento].filter(Boolean).join(" · ") || "—"}</div></td>
                    <td style={td()}><span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: C.muted + "22", color: C.foreground }}>{VINC_LABEL[c.tipo_vinculo] || c.tipo_vinculo}</span></td>
                    <td style={{ ...td(), fontFamily: mono }}>{c.categoria_esocial}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono }}>{fmtBRL(c.salario_base)}</td>
                    <td style={{ ...td(), textAlign: "center", fontFamily: mono }}>{c.n_dependentes || 0}</td>
                    <td style={{ ...td(), textAlign: "right", color: C.primary, fontSize: 12 }}>editar</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div style={overlay} onClick={fechar}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{form.id ? "Editar colaborador" : "Novo colaborador"}</div>
              <button onClick={fechar} style={{ ...btnGhost(), padding: 6 }}><X size={16} /></button>
            </div>

            <div style={grid2}>
              <Campo l="Nome *"><input value={form.nome || ""} onChange={setF("nome")} style={inpF} /></Campo>
              <Campo l="Matrícula"><input value={form.matricula || ""} onChange={setF("matricula")} style={inpF} /></Campo>
              <Campo l="CPF"><input value={form.cpf || ""} onChange={setF("cpf")} style={inpF} /></Campo>
              <Campo l="PIS/NIS"><input value={form.pis_nis || ""} onChange={setF("pis_nis")} style={inpF} /></Campo>
              <Campo l="Empresa (vínculo) *">
                <select value={form.id_empresa || ""} onChange={setF("id_empresa")} style={selF}>
                  <option value="">—</option>
                  {(dom?.empresas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </Campo>
              <Campo l="Vínculo">
                <select value={form.tipo_vinculo || "CLT_INDET"} onChange={setF("tipo_vinculo")} style={selF}>
                  {(dom?.tipos_vinculo || []).map((v) => <option key={v.valor} value={v.valor}>{v.label}</option>)}
                </select>
              </Campo>
              <Campo l="Cargo">
                <select value={form.id_cargo || ""} onChange={setF("id_cargo")} style={selF}>
                  <option value="">—</option>
                  {(dom?.cargos || []).map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                </select>
              </Campo>
              <Campo l="Departamento">
                <select value={form.id_departamento || ""} onChange={setF("id_departamento")} style={selF}>
                  <option value="">—</option>
                  {(dom?.departamentos || []).map((d) => <option key={d.id} value={d.id}>{d.descricao}</option>)}
                </select>
              </Campo>
              <Campo l="Centro de custo (folha)">
                <select value={form.id_centro_custo || ""} onChange={setF("id_centro_custo")} style={selF}>
                  <option value="">— (usa o do depto)</option>
                  {(dom?.centros_custo || []).map((cc) => <option key={cc.id} value={cc.id}>{cc.descricao}</option>)}
                </select>
              </Campo>
              <Campo l="CBO"><input value={form.cbo || ""} onChange={setF("cbo")} style={inpF} /></Campo>
              <Campo l="Salário base (R$)"><input type="number" value={form.salario_base ?? ""} onChange={setF("salario_base")} style={inpF} /></Campo>
              <Campo l="Admissão"><input type="date" value={(form.data_admissao || "").slice(0, 10)} onChange={setF("data_admissao")} style={inpF} /></Campo>
              <Campo l="Jornada (h/sem)"><input type="number" value={form.jornada_horas_semana ?? 44} onChange={setF("jornada_horas_semana")} style={inpF} /></Campo>
            </div>

            {/* Acesso ao sistema (vínculo colaborador -> usuário/login) */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <KeyRound size={15} color={C.primary} />
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Acesso ao sistema</div>
              </div>
              {acesso ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: C.muted + "11", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
                  <span>Login: <b style={{ fontFamily: mono }}>{acesso.login}</b></span>
                  <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: (acesso.ativo ? C.success : C.destructive) + "22", color: acesso.ativo ? C.success : C.destructive }}>{acesso.ativo ? "ativo" : "inativo"}</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}>· gerencie perfil/grupos e senha em Administração → Usuários</span>
                </div>
              ) : !form.id ? (
                <div style={{ fontSize: 12.5, color: C.textMuted }}>Salve o colaborador para poder gerar um acesso (login) vinculado.</div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <label style={lbl}>Login</label>
                    <input value={acessoForm.login} onChange={(e) => setAcessoForm((s) => ({ ...s, login: e.target.value }))} placeholder="ex.: joao.silva" style={{ ...inpF, minWidth: 160 }} />
                  </div>
                  <div>
                    <label style={lbl}>Senha (opcional)</label>
                    <input value={acessoForm.senha} onChange={(e) => setAcessoForm((s) => ({ ...s, senha: e.target.value }))} placeholder="padrão: bononi123" style={{ ...inpF, minWidth: 160 }} />
                  </div>
                  <button onClick={gerarAcesso} disabled={gerandoAcesso || !acessoForm.login.trim()} style={{ ...btnGhost(), height: 38, opacity: (gerandoAcesso || !acessoForm.login.trim()) ? 0.6 : 1 }}>
                    <KeyRound size={14} /> {gerandoAcesso ? "Gerando..." : "Gerar acesso"}
                  </button>
                </div>
              )}
            </div>

            {/* Dependentes */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Dependentes</div>
                <button onClick={addDep} style={{ ...btnGhost(), height: 30, fontSize: 12.5 }}><UserPlus size={14} /> Adicionar</button>
              </div>
              {deps.length === 0 ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Nenhum dependente.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {deps.map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: C.muted + "11", padding: 8, borderRadius: 8 }}>
                      <input placeholder="Nome" value={d.nome || ""} onChange={setDep(i, "nome")} style={{ ...inpF, flex: 2, minWidth: 140 }} />
                      <select value={d.tipo || "FILHO"} onChange={setDep(i, "tipo")} style={{ ...selF, flex: 1, minWidth: 100 }}>
                        {["FILHO", "CONJUGE", "PAI_MAE", "OUTRO"].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="date" value={(d.data_nascimento || "").slice(0, 10)} onChange={setDep(i, "data_nascimento")} style={{ ...inpF, width: 140 }} />
                      <label style={chk}><input type="checkbox" checked={!!d.dep_irrf} onChange={setDep(i, "dep_irrf")} /> IRRF</label>
                      <label style={chk}><input type="checkbox" checked={!!d.dep_salario_familia} onChange={setDep(i, "dep_salario_familia")} /> Sal-família</label>
                      <button onClick={() => rmDep(i)} style={{ ...btnGhost(), padding: 6, color: C.destructive }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
              <label style={{ ...chk, fontSize: 13 }}><input type="checkbox" checked={form.ativo !== false} onChange={setF("ativo")} /> Ativo</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={fechar} style={{ ...btnGhost(), height: 38 }}>Cancelar</button>
                <button onClick={salvar} disabled={salvando} style={{ ...btnPrimary(), height: 38, opacity: salvando ? 0.6 : 1 }}><Save size={15} /> {salvando ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 50, overflowY: "auto" };
const modal = { ...cardStyle(), width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto" };
const grid2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 };
const inpF = { ...inp(), width: "100%" };
const selF = { ...sel(), width: "100%" };
const chk = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.foreground, cursor: "pointer", whiteSpace: "nowrap" };

function Campo({ l, children }) {
  return <div><label style={lbl}>{l}</label>{children}</div>;
}
