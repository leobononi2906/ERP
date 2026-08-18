import { useState, useRef, useEffect } from "react";
import { C, mono, rpc } from "./config";

export function cardStyle() { return { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(15,29,53,0.04)", minWidth: 0 }; }
export function inp(full, ro) { return { background: ro ? "#EEF1F6" : C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: ro ? C.muted : C.foreground, outline: "none", height: 40, width: full ? "100%" : "auto", boxSizing: "border-box", cursor: ro ? "not-allowed" : "text" }; }
export function sel(full, ro) { return { ...inp(full, ro), cursor: ro ? "not-allowed" : "pointer", appearance: "auto" }; }
export function th(right) { return { padding: "10px 14px", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, background: C.surface2, textAlign: right ? "right" : "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }; }
export function td() { return { padding: "10px 14px", verticalAlign: "middle" }; }

// Ordenação de colunas reusável: const { sort, onSort, ordenar } = useSort();
// No thead use <ThSort label="Nome" k="nome" sort={sort} onSort={onSort} />; nas linhas use ordenar(lista, { nome: r => r.nome }).
export function useSort(initialKey = null, initialDir = "asc") {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const ordenar = (rows, accessors = {}) => {
    if (!sort.key || !Array.isArray(rows)) return rows;
    const get = accessors[sort.key] || ((r) => r?.[sort.key]);
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      const ea = va === null || va === undefined || va === "";
      const eb = vb === null || vb === undefined || vb === "";
      if (ea && eb) return 0;
      if (ea) return 1;   // vazios sempre por último
      if (eb) return -1;
      let cmp;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" });
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  };
  return { sort, onSort, ordenar };
}

export function ThSort({ label, k, sort, onSort, right }) {
  const active = sort && sort.key === k;
  return (
    <th onClick={() => onSort && onSort(k)} style={{ ...th(right), cursor: "pointer", userSelect: "none" }} title="Ordenar por esta coluna">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexDirection: right ? "row-reverse" : "row" }}>
        {label}
        <span style={{ opacity: active ? 1 : 0.3, fontSize: 9 }}>{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </span>
    </th>
  );
}
export function btnPrimary() { return { display: "inline-flex", alignItems: "center", gap: 7, background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }; }
export function btnGhost() { return { display: "inline-flex", alignItems: "center", gap: 7, background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }; }
export function btnIcon() { return { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: C.surface2, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer" }; }

export function Card({ title, children }) {
  return (<div style={cardStyle()}>{title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>}{children}</div>);
}
export function Secao({ titulo, children }) {
  return (<div style={{ ...cardStyle(), marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.muted, marginBottom: 14 }}>{titulo}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>{children}</div>
  </div>);
}
export function Campo({ label, children, span }) {
  return (<label style={{ display: "block", gridColumn: span ? `span ${span}` : "auto", minWidth: 0 }}>
    <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 5 }}>{label}</span>{children}</label>);
}
export function Aviso({ children, cor }) {
  const map = { warning: [C.warningBg, C.warning], destructive: [C.destructiveBg, C.destructive], muted: [C.surface2, C.muted], success: [C.successBg, C.success] };
  const [bg, fg] = map[cor] || map.muted;
  return <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: bg, color: fg, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>{children}</div>;
}
export function Skeleton({ h, w }) {
  return <div style={{ height: h, width: w || "100%", background: C.surface2, borderRadius: 6, animation: "pulse 1.4s ease-in-out infinite" }} />;
}
export function Badge({ texto, cor }) {
  const map = { ATIVO: [C.successBg, C.success], INATIVO: [C.surface2, C.muted], BLOQUEADO: [C.destructiveBg, C.destructive], FATURADA: [C.successBg, C.success], ABERTA: [C.bluePale, C.blueMid], CANCELADA: [C.destructiveBg, C.destructive] };
  const [bg, fg] = map[cor || texto] || [C.surface2, C.muted];
  return <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 8px", borderRadius: 4 }}>{texto}</span>;
}

/**
 * SelectBusca — combobox com filtro de texto para listas grandes.
 * Props:
 *   opcoes: [{id, label, sub?}] — lista de opções
 *   value: id selecionado
 *   onChange: (id) => void
 *   placeholder: string
 *   disabled: boolean
 *   full: boolean (width 100%)
 */
export function SelectBusca({ opcoes = [], value, onChange, placeholder = "Selecione...", disabled, full }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  useEffect(() => { if (aberto && inputRef.current) inputRef.current.focus(); }, [aberto]);

  const selecionado = opcoes.find((o) => String(o.id) === String(value));
  const q = busca.trim().toLowerCase();
  const filtradas = q ? opcoes.filter((o) => (o.label || "").toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)) : opcoes;

  function selecionar(id) {
    onChange(String(id));
    setAberto(false);
    setBusca("");
  }

  return (
    <div ref={ref} style={{ position: "relative", width: full ? "100%" : "auto" }}>
      <div onClick={() => !disabled && setAberto(!aberto)} style={{
        ...inp(true, disabled), display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: disabled ? "not-allowed" : "pointer", userSelect: "none", minHeight: 40,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: selecionado ? C.foreground : C.textMuted }}>
          {selecionado ? selecionado.label : placeholder}
        </span>
        <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 8 }}>&#9662;</span>
      </div>

      {aberto && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 4, maxHeight: 280, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
            <input ref={inputRef} value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..." style={{ ...inp(true), height: 34, fontSize: 13, padding: "6px 10px" }}
              onKeyDown={(e) => { if (e.key === "Escape") setAberto(false); if (e.key === "Enter" && filtradas.length === 1) selecionar(filtradas[0].id); }}
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 230 }}>
            <div onClick={() => { onChange(""); setAberto(false); setBusca(""); }}
              style={{ padding: "8px 12px", fontSize: 13, color: C.textMuted, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.surface2}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {placeholder}
            </div>
            {filtradas.length === 0 ? (
              <div style={{ padding: "14px 12px", fontSize: 12, color: C.textMuted, textAlign: "center" }}>Nenhum resultado</div>
            ) : filtradas.map((o) => (
              <div key={o.id} onClick={() => selecionar(o.id)}
                style={{
                  padding: "8px 12px", fontSize: 13, cursor: "pointer",
                  background: String(o.id) === String(value) ? C.bluePale : "transparent",
                  fontWeight: String(o.id) === String(value) ? 600 : 400,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = String(o.id) === String(value) ? C.bluePale : C.surface2}
                onMouseLeave={(e) => e.currentTarget.style.background = String(o.id) === String(value) ? C.bluePale : "transparent"}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{o.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ModalAprovacao — modal de re-autenticação para operações críticas.
 * Props:
 *   aberto: boolean
 *   titulo: string (ex: "Liberar desconto acima do permitido")
 *   mensagem: string (ex: "Desconto de 15% acima do limite de 8%")
 *   modulo: string (chave do módulo — "vendas", "orcamentos", etc.)
 *   acao: string (ação para log — "DESCONTO_LIBERADO", etc.)
 *   contexto: object (dados extras para o log — {id_venda, percentual, ...})
 *   onAprovado: (aprovador) => void — chamado com {id, nome, login} do aprovador
 *   onCancelar: () => void
 */
export function ModalAprovacao({ aberto, titulo, mensagem, modulo, acao, contexto, onAprovado, onCancelar,
  solicitante, idEmpresa, tipo, origem, idOrigem, numeroOrigem, descricao }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState("login"); // login | aguardando
  const [reqId, setReqId] = useState(null);

  // Polling da autorização remota: quando aprovada, libera com o mesmo callback.
  useEffect(() => {
    if (!aberto || modo !== "aguardando" || !reqId) return;
    let vivo = true;
    const tick = async () => {
      try {
        const r = await rpc("erp_autorizacao_consultar", { p_id: reqId });
        if (!vivo || !r) return;
        if (r.status === "APROVADA") { vivo = false; limpar(); onAprovado({ id: r.id_aprovador, nome: r.aprovador }); }
        else if (r.status === "REJEITADA") { vivo = false; setModo("login"); setErro("Rejeitada" + (r.motivo ? `: ${r.motivo}` : "") + (r.aprovador ? ` (por ${r.aprovador})` : "")); }
      } catch { /* mantém aguardando */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { vivo = false; clearInterval(t); };
  }, [aberto, modo, reqId]); // eslint-disable-line

  if (!aberto) return null;

  async function autenticar(e) {
    e.preventDefault();
    if (!login.trim() || !senha.trim()) { setErro("Preencha login e senha."); return; }
    setLoading(true); setErro("");
    try {
      const res = await rpc("erp_autenticar_aprovador", {
        p_login: login.trim(), p_senha: senha, p_modulo: modulo,
        p_acao: acao || "APROVACAO", p_contexto: contexto || {},
      });
      if (res?.ok) { limpar(); onAprovado(res.aprovador); }
      else { setErro(res?.erro || "Falha na autenticação."); }
    } catch (err) {
      setErro(err.message || "Erro de conexão.");
    } finally { setLoading(false); }
  }

  async function solicitarRemota() {
    setLoading(true); setErro("");
    try {
      const r = await rpc("erp_autorizacao_solicitar", { p: {
        tipo: tipo || "APROVACAO", modulo, id_empresa: idEmpresa || null, id_solicitante: solicitante,
        origem: origem || null, id_origem: idOrigem || null, numero_origem: numeroOrigem || null,
        titulo: titulo || "Autorização necessária", descricao: descricao || mensagem || null,
        detalhes: contexto || {},
      } });
      if (r?.ok) { setReqId(r.id); setModo("aguardando"); }
      else { setErro(r?.erro || "Falha ao solicitar autorização."); }
    } catch (err) { setErro(err.message || "Erro de conexão."); }
    finally { setLoading(false); }
  }

  function limpar() { setLogin(""); setSenha(""); setErro(""); setModo("login"); setReqId(null); }
  function fechar() { limpar(); onCancelar(); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={fechar}>
      <form onSubmit={autenticar} onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 14, padding: 28, width: 400, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.foreground, marginBottom: 6 }}>{titulo || "Aprovação necessária"}</div>
        {mensagem && <div style={{ fontSize: 13, color: C.warning, background: C.warningBg, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>{mensagem}</div>}

        {modo === "aguardando" ? (
          <div style={{ textAlign: "center", padding: "14px 0 6px" }}>
            <div style={{ fontSize: 13, color: C.foreground, marginBottom: 6 }}>Solicitação enviada. Aguardando liberação de um responsável…</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Quem tem permissão recebe a notificação e pode liberar de qualquer lugar. Esta janela libera sozinha assim que for aprovada.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" onClick={fechar} style={btnGhost()}>Fechar</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Informe as credenciais de um aprovador{solicitante ? ", ou solicite a liberação remota." : "."}</div>

            <label style={{ display: "block", marginBottom: 10 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 4 }}>Login</span>
              <input value={login} onChange={(e) => setLogin(e.target.value)} autoFocus style={inp(true)} autoComplete="username" />
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: C.textMuted, marginBottom: 4 }}>Senha</span>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={inp(true)} autoComplete="current-password" />
            </label>

            {erro && <div style={{ fontSize: 12, color: C.destructive, background: C.destructiveBg, padding: "6px 10px", borderRadius: 6, marginBottom: 10 }}>{erro}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={fechar} style={btnGhost()} disabled={loading}>Cancelar</button>
              {solicitante && <button type="button" onClick={solicitarRemota} style={btnGhost()} disabled={loading}>Solicitar liberação remota</button>}
              <button type="submit" style={{ ...btnPrimary(), background: C.success, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? "Verificando..." : "Aprovar aqui"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

/* Busca no servidor por CAMPO escolhido (leve p/ bases grandes — não carrega tudo).
 * props:
 *   campos: [{key,label}]  — campos buscáveis (ex.: Nome/CNPJ/Código)
 *   buscar: (campo, termo) => Promise<array>  — normalmente chama uma RPC de busca
 *   render: (item) => ({label, sub})  — exibição de cada resultado
 *   onSelect: (item) => void
 *   selecionadoLabel: string  — rótulo do item já selecionado (mostrado na caixa)
 *   placeholder, full, minChars=1, disabled
 */
export function BuscaServidor({ campos = [{ key: "nome", label: "Nome" }], buscar, render, onSelect, selecionadoLabel, placeholder = "Buscar...", full, minChars = 1, disabled }) {
  const [aberto, setAberto] = useState(false);
  const [campo, setCampo] = useState(campos[0]?.key);
  const [termo, setTermo] = useState("");
  const [res, setRes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null); const inputRef = useRef(null); const deb = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  useEffect(() => { if (aberto && inputRef.current) inputRef.current.focus(); }, [aberto]);

  useEffect(() => {
    if (!aberto || !buscar) return;
    if (deb.current) clearTimeout(deb.current);
    const t = (termo || "").trim();
    setLoading(true);
    deb.current = setTimeout(async () => {
      try { const r = await buscar(campo, t); setRes(Array.isArray(r) ? r : []); setHi(0); }
      catch { setRes([]); }
      finally { setLoading(false); }
    }, 250);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [termo, campo, aberto]); // eslint-disable-line

  function escolher(item) { if (onSelect) onSelect(item); setAberto(false); setTermo(""); setRes([]); }

  return (
    <div ref={ref} style={{ position: "relative", width: full ? "100%" : "auto" }}>
      <div onClick={() => !disabled && setAberto(!aberto)} style={{ ...inp(true, disabled), display: "flex", alignItems: "center", justifyContent: "space-between", cursor: disabled ? "not-allowed" : "pointer", userSelect: "none", minHeight: 40 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: selecionadoLabel ? C.foreground : C.textMuted }}>
          {selecionadoLabel || placeholder}
        </span>
        <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 8 }}>&#9662;</span>
      </div>
      {aberto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 4, maxHeight: 340, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 6, padding: 8, borderBottom: `1px solid ${C.border}` }}>
            {campos.length > 1 && (
              <select value={campo} onChange={(e) => setCampo(e.target.value)} style={{ ...sel(false), height: 34, fontSize: 12, padding: "4px 8px", flex: "0 0 auto" }}>
                {campos.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            )}
            <input ref={inputRef} value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder={"Buscar por " + (campos.find((c) => c.key === campo)?.label || "").toLowerCase() + "..."}
              style={{ ...inp(true), height: 34, fontSize: 13, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setHi((s) => Math.min(res.length - 1, s + 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setHi((s) => Math.max(0, s - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (res[hi]) escolher(res[hi]); }
                else if (e.key === "Escape") setAberto(false);
              }} />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 290 }}>
            {loading ? <div style={{ padding: "14px 12px", fontSize: 12, color: C.textMuted, textAlign: "center" }}>Buscando...</div>
             : res.length === 0 ? <div style={{ padding: "14px 12px", fontSize: 12, color: C.textMuted, textAlign: "center" }}>{(termo || "").trim() ? "Nenhum resultado" : "Digite para buscar"}</div>
             : res.map((item, i) => {
                 const r = render ? render(item) : { label: item.nome, sub: "" };
                 return (
                   <div key={item.id ?? i} onClick={() => escolher(item)} onMouseEnter={() => setHi(i)}
                     style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: i === hi ? C.surface2 : "transparent" }}>
                     <div style={{ fontSize: 13, fontWeight: 500, color: C.foreground }}>{r.label}</div>
                     {r.sub && <div style={{ fontSize: 11, color: C.textMuted }}>{r.sub}</div>}
                   </div>
                 );
               })}
          </div>
        </div>
      )}
    </div>
  );
}
