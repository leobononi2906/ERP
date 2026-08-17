import { useState, useEffect, useRef, useCallback } from "react";
import { HardHat, LogOut, Play, Pause, CheckCircle2, RotateCcw, PackagePlus, Boxes, Search, X, KeyRound, Clock, Plus } from "lucide-react";
import { C, mono, fmtBRL, num, rpc } from "../config";
import { cardStyle, inp, btnPrimary, btnGhost, Skeleton, SelectBusca } from "../ui";

const SESSAO_MS = 60 * 1000; // PC coletivo: volta ao login após 60s parado (era 10s — curto demais ao preencher a solicitação de peça)

const DEFEITO_COR = {
  ABERTO:       { bg: C.bluePale,      fg: C.blueMid,   label: "Aberto" },
  EM_EXECUCAO:  { bg: "#FFF3E0",       fg: C.warning,   label: "Em execução" },
  PAUSADO:      { bg: "#F1F5F9",       fg: "#64748B",   label: "Pausado" },
  CONCLUIDO:    { bg: C.successBg,     fg: C.success,   label: "Concluído" },
};

// Imprime o comprovante da solicitação/consumo na impressora padrão (bobina 78mm)
function imprimirSolicitacao({ tipo, os, prisma, colaborador, produto, referencia, qtd, obs }) {
  const titulo = tipo === "peca" ? "SOLICITAÇÃO DE PEÇA" : "CONSUMO";
  const dt = new Date().toLocaleString("pt-BR");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:78mm auto;margin:2mm;}body{margin:0;font-family:Arial,sans-serif;}</style></head><body><div style="width:74mm;"><div style="text-align:center;border-bottom:2px solid #000;padding-bottom:4px;"><div style="font-size:15px;font-weight:bold;">${titulo}</div><div style="font-size:12px;">Prisma ${prisma || "—"}${os ? " · OS " + os : ""}</div></div><div style="font-size:12px;padding:6px 0;line-height:1.5;"><b>Produto:</b> ${produto || "—"}<br><b>Ref.:</b> ${referencia || "—"}<br><b>Qtd:</b> <span style="font-size:16px;font-weight:bold;">${qtd}</span><br><b>Colaborador:</b> ${colaborador || "—"}<br>${obs ? "<b>Obs.:</b> " + obs + "<br>" : ""}<b>Data:</b> ${dt}</div><div style="border-top:1px dashed #000;margin-top:8px;padding-top:10px;font-size:11px;">Separador: ______________________</div></div></body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  iframe.contentDocument.open(); iframe.contentDocument.write(html); iframe.contentDocument.close();
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 2000); }, 100);
}

export default function Apontamento() {
  // sessão do colaborador (PC compartilhado)
  const [sessao, setSessao] = useState(null); // { id_colaborador, nome }
  const [prisma, setPrisma] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  const [ctx, setCtx] = useState(null); // { os, defeitos }
  const [defModal, setDefModal] = useState(null); // { descricao } — novo defeito no pátio
  const [salvandoDef, setSalvandoDef] = useState(false);
  const [carregandoCtx, setCarregandoCtx] = useState(false);
  const [sel, setSel] = useState(0);
  const [acaoLoad, setAcaoLoad] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { tipo:'peca'|'consumo', id_produto, qtd, obs }
  const [produtos, setProdutos] = useState([]);
  const [soMinhaArea, setSoMinhaArea] = useState(true); // técnico vê só os defeitos da sua área/pool
  const [selecionados, setSelecionados] = useState(new Set()); // IDs de defeitos selecionados
  const [finalizandoMulti, setFinalizandoMulti] = useState(false);
  const [avisoPause, setAvisoPause] = useState(null); // { defeito_pausado, defeito_novo }
  const timerRef = useRef(null);

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500); };

  // Filtro "só a minha área": mostra os defeitos da área/pool do técnico.
  // Se nenhum bater (técnico sem habilidade ou OS de outra área), mostra todos para não esconder trabalho.
  const filtrarDefeitos = useCallback((defs) => {
    if (!Array.isArray(defs)) return [];
    if (!soMinhaArea) return defs;
    const meus = defs.filter((d) => d.minha_area);
    return meus.length > 0 ? meus : defs;
  }, [soMinhaArea]);

  const encerrarSessao = useCallback(() => { setSessao(null); setCtx(null); setSenha(""); }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { encerrarSessao(); }, SESSAO_MS);
  }, [encerrarSessao]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // PC coletivo: qualquer atividade reinicia o timer; 10s parado volta ao login
  useEffect(() => {
    if (!sessao) return;
    resetTimer();
    const onAtividade = () => resetTimer();
    window.addEventListener("keydown", onAtividade);
    window.addEventListener("mousedown", onAtividade);
    return () => { window.removeEventListener("keydown", onAtividade); window.removeEventListener("mousedown", onAtividade); };
  }, [sessao, resetTimer]);

  // F4 abre a Solicitar peça (atalho do balcão)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "F4" && sessao && !modal && !defModal) { e.preventDefault(); abrirModal("peca"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function carregarContexto(pr, idColab) {
    const numeroPrisma = (pr ?? prisma).trim();
    if (!numeroPrisma) { notificar("Digite o prisma.", "erro"); return; }
    setCarregandoCtx(true);
    try {
      const r = await rpc("os_patio_contexto", { p_prisma: numeroPrisma, p_id_colaborador: idColab ?? sessao?.id_colaborador ?? null });
      if (!r?.ok) { setCtx(null); notificar(r?.erro || "OS não encontrada.", "erro"); return; }
      setCtx(r); setSel(0); resetTimer();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setCarregandoCtx(false); }
  }

  async function entrar() {
    if (!prisma.trim()) { notificar("Digite o prisma.", "erro"); return; }
    if (!login.trim() || !senha) { notificar("Informe colaborador e senha.", "erro"); return; }
    setEntrando(true);
    try {
      const r = await rpc("os_patio_login", { p_login: login.trim(), p_senha: senha });
      if (!r?.ok) { notificar(r?.erro || "Colaborador ou senha inválidos.", "erro"); return; }
      setSessao({ id_colaborador: r.id_colaborador, nome: r.nome });
      setSenha(""); setLogin("");
      resetTimer();
      await carregarContexto(prisma, r.id_colaborador);
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setEntrando(false); }
  }

  async function salvarNovoDefeito() {
    const desc = (defModal?.descricao || "").trim();
    if (!desc) { notificar("Descreva o defeito.", "erro"); return; }
    setSalvandoDef(true);
    try {
      const r = await rpc("os_defeito_salvar", { p_id_os: ctx.os.id, p_descricao: desc, p_id: null, p_id_area: null });
      if (r && r.ok === false) { notificar(r.erro || "Falha ao salvar.", "erro"); return; }
      notificar("Defeito adicionado — já pode apontar.");
      setDefModal(null);
      await carregarContexto();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setSalvandoDef(false); }
  }

  async function acao(def, tipo) {
    if (!sessao) return;
    setAcaoLoad(def.id + tipo);
    try {
      const r = await rpc("os_patio_defeito_acao", { p_id_defeito: def.id, p_id_colaborador: sessao.id_colaborador, p_acao: tipo });
      if (!r?.success === false) { notificar(r?.erro || "Não foi possível.", "erro"); return; }
      const nomes = { ENTRADA: "Entrada registrada", RETOMAR: "Retomado", PAUSA: "Pausado", FINALIZAR: "Defeito finalizado" };
      notificar(nomes[tipo] || "OK");

      // Se auto-pausou outro serviço, mostrar aviso
      if (r?.auto_pausou_outro) {
        setAvisoPause({ defeito_novo: def.descricao });
        setTimeout(() => setAvisoPause(null), 4000);
      }

      resetTimer();
      await carregarContexto();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setAcaoLoad(null); }
  }

  async function finalizarSelecionados() {
    if (selecionados.size === 0) { notificar("Selecione serviços.", "erro"); return; }
    setFinalizandoMulti(true);
    try {
      const ids = Array.from(selecionados);
      const r = await rpc("os_servicos_finalizar", { p_ids: ids, p_id_colaborador: sessao?.id_colaborador, p_ator: sessao?.id_colaborador });
      if (!r?.success) { notificar(r?.erro || "Erro ao finalizar.", "erro"); return; }
      notificar(`${r.servicos_finalizados} serviço(s) finalizado(s)`);
      setSelecionados(new Set());
      await carregarContexto();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
    finally { setFinalizandoMulti(false); }
  }

  // navegação por teclado no painel de trabalho
  useEffect(() => {
    if (!sessao || !ctx?.defeitos?.length) return;
    function onKey(e) {
      const defs = filtrarDefeitos(ctx.defeitos);
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(defs.length - 1, s + 1)); resetTimer(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); resetTimer(); }
      else {
        const d = defs[sel]; if (!d) return;
        const k = e.key.toLowerCase();
        if (k === "e") acao(d, d.status === "PAUSADO" ? "RETOMAR" : "ENTRADA");
        else if (k === "p" && d.meu_aberto) acao(d, "PAUSA");
        else if (k === "f") acao(d, "FINALIZAR");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessao, ctx, sel]); // eslint-disable-line

  async function abrirModal(tipo) {
    const temAberto = (ctx?.defeitos || []).some((d) => d.meu_aberto);
    if (!temAberto) { notificar("Faça a Entrada em um defeito antes de solicitar peça/consumo.", "erro"); return; }
    if (produtos.length === 0) {
      try { const d = await rpc("os_produtos_dados"); setProdutos(Array.isArray(d?.produtos) ? d.produtos : []); } catch { /* ignore */ }
    }
    const defAtivo = (ctx?.defeitos || []).find((d) => d.meu_aberto) || (ctx?.defeitos || [])[sel];
    setModal({ tipo, id_produto: "", qtd: "", obs: "", id_defeito: defAtivo?.id || null });
    resetTimer();
  }

  async function enviarModal() {
    const m = modal; if (!m) return;
    if (!m.id_produto) { notificar("Selecione o produto.", "erro"); return; }
    const qtd = num(m.qtd);
    if (!(qtd > 0)) { notificar("Informe a quantidade.", "erro"); return; }
    try {
      const fn = m.tipo === "peca" ? "os_patio_solicitar_peca" : "os_patio_consumo";
      const body = { p_id_colaborador: sessao.id_colaborador, p_id_os: ctx.os.id, p_id_produto: parseInt(m.id_produto), p_qtd: qtd, p_id_defeito: m.id_defeito };
      if (m.tipo === "peca") body.p_observacao = m.obs || null;
      const r = await rpc(fn, body);
      if (!r?.ok) { notificar(r?.erro || "Não foi possível.", "erro"); return; }
      notificar(m.tipo === "peca" ? "Peça solicitada!" : "Consumo lançado!");
      const prod = produtos.find((p) => p.id === parseInt(m.id_produto));
      imprimirSolicitacao({ tipo: m.tipo, os: ctx?.os?.numero, prisma: ctx?.os?.prisma, colaborador: sessao?.nome, produto: prod?.nome, referencia: prod?.referencia, qtd, obs: m.obs });
      setModal(null); resetTimer();
    } catch (e) { notificar("Erro: " + e.message, "erro"); }
  }

  /* ─────────── UI ─────────── */
  return (
    <div onMouseDown={() => sessao && resetTimer()}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {avisoPause && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 998, background: C.warning, color: "#000", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, maxWidth: 320, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          ⏸️ Horário pausado — agora corre no "{avisoPause.defeito_novo}"
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pátio — Apontamento</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
            Prisma + colaborador → entrada / pausa / finalização por defeito
          </p>
        </div>
        {sessao && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: C.muted }}>
              <b style={{ color: C.foreground }}>{sessao.nome}</b> · sessão volta ao login após inatividade
            </span>
            <button onClick={encerrarSessao} style={btnGhost()}><LogOut size={14} /> Sair</button>
          </div>
        )}
      </div>

      {/* LOGIN */}
      {!sessao ? (
        <div style={{ ...cardStyle(), maxWidth: 460, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: C.primary }}>
            <KeyRound size={18} /> <b style={{ fontSize: 15 }}>Identificação do pátio</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={lbl}>Prisma</label>
              <input value={prisma} onChange={(e) => setPrisma(e.target.value)} placeholder="Nº do prisma" autoFocus style={{ ...inp(), width: "100%", fontFamily: mono, fontSize: 18, textAlign: "center", height: 48 }} />
            </div>
            <div>
              <label style={lbl}>Nº do colaborador</label>
              <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu login/número" style={{ ...inp(), width: "100%" }} />
            </div>
            <div>
              <label style={lbl}>Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="••••••" style={{ ...inp(), width: "100%" }} />
            </div>
            <button onClick={entrar} disabled={entrando} style={{ ...btnPrimary(), justifyContent: "center", opacity: entrando ? 0.6 : 1 }}>
              {entrando ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* barra prisma */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ minWidth: 160 }}>
              <label style={lbl}>Prisma</label>
              <input value={prisma} onChange={(e) => setPrisma(e.target.value)} onKeyDown={(e) => e.key === "Enter" && carregarContexto()} placeholder="Nº do prisma" style={{ ...inp(), fontFamily: mono, fontSize: 16, textAlign: "center", width: 160 }} />
            </div>
            <button onClick={() => carregarContexto()} disabled={carregandoCtx} style={btnPrimary()}>
              {carregandoCtx ? "Buscando..." : "Carregar OS"}
            </button>
          </div>

          {carregandoCtx ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={56} />)}</div>
          ) : !ctx ? (
            <div style={{ ...cardStyle(), textAlign: "center", padding: "40px 0", color: C.textMuted }}>
              <HardHat size={30} style={{ opacity: 0.4 }} />
              <div style={{ marginTop: 10, fontSize: 13 }}>Digite o prisma e clique em Carregar OS.</div>
            </div>
          ) : (
            <>
              {/* cabeçalho da OS */}
              <div style={{ ...cardStyle(), marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                <div><div style={miniLbl}>OS</div><div style={{ fontFamily: mono, fontWeight: 700, color: C.primary, fontSize: 18 }}>{ctx.os.numero}</div></div>
                <div style={{ flex: 1, minWidth: 180 }}><div style={miniLbl}>Cliente</div><div style={{ fontWeight: 600 }}>{ctx.os.cliente}</div></div>
                <div><div style={miniLbl}>Prisma</div><div style={{ fontFamily: mono, fontWeight: 700 }}>{ctx.os.prisma}</div></div>
                <div><div style={miniLbl}>Vendedor</div><div>{ctx.os.vendedor || "—"}</div></div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setDefModal({ descricao: "" })} style={btnGhost()}><Plus size={14} /> Novo defeito</button>
                  <button onClick={() => abrirModal("peca")} style={btnGhost()}><PackagePlus size={14} /> Solicitar peça <kbd style={{ fontSize: 10, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: "0 4px", fontFamily: mono }}>F4</kbd></button>
                  <button onClick={() => abrirModal("consumo")} style={btnGhost()}><Boxes size={14} /> Consumo</button>
                </div>
              </div>
              {ctx.os.defeito && <div style={{ fontSize: 12.5, color: C.muted, margin: "0 2px 12px" }}><b style={{ color: C.foreground }}>Pedido do cliente:</b> {ctx.os.defeito}</div>}

              {/* defeitos */}
              {ctx.defeitos.length === 0 ? (
                <div style={{ ...cardStyle(), textAlign: "center", padding: "32px 0", color: C.textMuted }}>
                  Nenhum defeito pendente nesta OS. (Os defeitos são cadastrados na abertura da OS.)
                </div>
              ) : (() => {
                const defsVis = filtrarDefeitos(ctx.defeitos);
                const ocultos = ctx.defeitos.length - defsVis.length;
                return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>↑↓ seleciona · <b>E</b> entrada/retomar · <b>P</b> pausa · <b>F</b> finaliza</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, cursor: "pointer", userSelect: "none" }}>
                      <input type="checkbox" checked={soMinhaArea} onChange={(e) => { setSoMinhaArea(e.target.checked); resetTimer(); }} />
                      Só a minha área {soMinhaArea && ocultos > 0 ? `(${ocultos} oculto${ocultos > 1 ? "s" : ""})` : ""}
                    </label>
                  </div>
                  {selecionados.size > 0 && (
                    <button onClick={finalizarSelecionados} disabled={finalizandoMulti} style={{ ...btnPrimary(), background: C.success, padding: "14px 18px", fontSize: 15, fontWeight: 700, width: "100%" }} onMouseDown={() => resetTimer()}>
                      <CheckCircle2 size={18} /> Finalizar {selecionados.size} serviço{selecionados.size > 1 ? "s" : ""}
                    </button>
                  )}
                  {defsVis.length === 0 ? (
                    <div style={{ ...cardStyle(), textAlign: "center", padding: "28px 0", color: C.textMuted }}>Nenhum defeito da sua área nesta OS.</div>
                  ) : defsVis.map((d, i) => {
                    const cor = DEFEITO_COR[d.status] || DEFEITO_COR.ABERTO;
                    const ativo = i === sel;
                    return (
                      <div key={d.id} onClick={() => { setSel(i); resetTimer(); }} style={{
                        ...cardStyle(), padding: 14, cursor: "pointer",
                        border: `2px solid ${ativo ? C.blueLight : C.border}`,
                        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                      }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            {d.area && <span style={{ background: C.bluePale, color: C.blueMid, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" }}>{d.area}</span>}
                            <span style={{ background: cor.bg, color: cor.fg, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{cor.label}</span>
                            {d.aberto_por && <span style={{ fontSize: 11, color: C.muted }}>· {d.aberto_por} trabalhando</span>}
                          </div>
                          <div style={{ fontWeight: 600 }}>{d.descricao}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="checkbox" checked={selecionados.has(d.id)} onChange={(e) => { const s = new Set(selecionados); if (e.target.checked) s.add(d.id); else s.delete(d.id); setSelecionados(s); }} style={{ width: 16, height: 16, cursor: "pointer" }} />
                          {!d.meu_aberto ? (
                            <button onClick={(e) => { e.stopPropagation(); acao(d, d.status === "PAUSADO" ? "RETOMAR" : "ENTRADA"); }} disabled={acaoLoad === d.id + (d.status === "PAUSADO" ? "RETOMAR" : "ENTRADA")} style={{ ...btnPrimary(), padding: "8px 14px" }}>
                              {d.status === "PAUSADO" ? <><RotateCcw size={14} /> Retomar</> : <><Play size={14} /> Entrada</>}
                            </button>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); acao(d, "PAUSA"); }} style={{ ...btnGhost(), padding: "8px 14px", color: C.warning }}><Pause size={14} /> Pausa</button>
                              <button onClick={(e) => { e.stopPropagation(); acao(d, "FINALIZAR"); }} style={{ ...btnPrimary(), padding: "8px 14px", background: C.success }}><CheckCircle2 size={14} /> Finalizar</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* modal peça / consumo */}
      {defModal && (
        <div onMouseDown={() => resetTimer()} style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...cardStyle(), width: 440, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <b style={{ fontSize: 15 }}>Novo defeito (pedido na hora)</b>
              <button onClick={() => setDefModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>O cliente pediu algo agora. Descreva o defeito/serviço — depois é só apontar (E).</div>
            <textarea autoFocus value={defModal.descricao} onChange={(e) => setDefModal({ descricao: e.target.value })} onFocus={() => resetTimer()} rows={3} placeholder="Ex.: trocar lâmpada do farol direito" style={{ ...inp(), width: "100%", height: "auto", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setDefModal(null)} style={btnGhost()}>Cancelar</button>
              <button onClick={salvarNovoDefeito} disabled={salvandoDef} style={{ ...btnPrimary(), opacity: salvandoDef ? 0.6 : 1 }}><Plus size={14} /> {salvandoDef ? "Salvando..." : "Adicionar defeito"}</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div onMouseDown={() => resetTimer()} style={{ position: "fixed", inset: 0, background: "rgba(15,29,53,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ ...cardStyle(), width: 640, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <b style={{ fontSize: 15 }}>{modal.tipo === "peca" ? "Solicitar peça" : "Lançar consumo"}</b>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbl}>Produto (busque por nome ou código)</label>
                <SelectBusca
                  opcoes={produtos.map((p) => ({ id: p.id, label: p.nome, sub: (p.codigo ? "Cód " + p.codigo + " · " : "") + fmtBRL(p.preco_venda) + " · " + (Number(p.estoque) || 0) + " em estoque" }))}
                  value={modal.id_produto} onChange={(id) => { setModal((m) => ({ ...m, id_produto: id })); resetTimer(); }}
                  placeholder="Buscar produto..." full
                />
              </div>
              {(() => {
                const prod = produtos.find((p) => String(p.id) === String(modal.id_produto));
                if (!prod) return null;
                const est = Number(prod.estoque) || 0;
                return (
                  <div style={{ display: "flex", gap: 12, alignItems: "center", background: C.surface2, borderRadius: 10, padding: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", overflow: "hidden" }}>
                      {prod.foto ? <img src={prod.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 10, color: C.textMuted }}>sem foto</span>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{prod.nome}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{prod.codigo ? "Cód " + prod.codigo + " · " : ""}{fmtBRL(prod.preco_venda)}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: est > 0 ? C.success : C.destructive }}>{est > 0 ? est + " em estoque" : "Sem estoque"}</div>
                    </div>
                  </div>
                );
              })()}
              <div>
                <label style={lbl}>Quantidade</label>
                <input type="number" step="0.01" min="0" value={modal.qtd} onChange={(e) => setModal((m) => ({ ...m, qtd: e.target.value }))} style={{ ...inp(), width: "100%", fontFamily: mono }} />
              </div>
              {modal.tipo === "peca" && (
                <div>
                  <label style={lbl}>Observação (opcional)</label>
                  <input value={modal.obs} onChange={(e) => setModal((m) => ({ ...m, obs: e.target.value }))} style={{ ...inp(), width: "100%" }} />
                </div>
              )}
              <button onClick={enviarModal} style={{ ...btnPrimary(), justifyContent: "center" }}>
                {modal.tipo === "peca" ? "Solicitar" : "Lançar consumo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
const miniLbl = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: C.textMuted, marginBottom: 2 };
