import { useState, useEffect, useRef } from "react";
import { Receipt, RotateCcw, DollarSign, X, RefreshCw, FileText, ShoppingCart } from "lucide-react";
import { C, rpc, fmtBRL, num } from "../config";
import { cardStyle, inp, sel, btnPrimary, btnGhost, th, td, Badge, Campo, useSort, ThSort } from "../ui";

// Fila de Faturamento — OS e Vendas liberadas pelo vendedor aguardando o time de faturamento.
// O vendedor libera (bloqueia edição); aqui o faturamento FATURA de verdade ou REVERTE (devolve pra edição).
export default function Faturamento({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.financeiro) || {};
  const podeFaturar = perms.aprovar || perms.editar || perms.incluir;
  const [dados, setDados] = useState({ os: [], vendas: [], formas: [], condicoes: [], empresas: [], empresa_servicos_padrao: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalFat, setModalFat] = useState(null); // { tipo:'os'|'venda', item }
  const [fForma, setFForma] = useState("");
  const [fCond, setFCond] = useState("");
  const [fSplit, setFSplit] = useState(false);   // OS: faturar separando peças×serviços em 2 empresas
  const [fEmpServ, setFEmpServ] = useState("");   // empresa dos serviços no split
  const timer = useRef(null);
  const { sort, onSort, ordenar } = useSort();

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  async function carregar() {
    try {
      const d = await rpc("erp_faturamento_fila_dados");
      setDados({ os: d?.os || [], vendas: d?.vendas || [], formas: d?.formas || [], condicoes: d?.condicoes || [], empresas: d?.empresas || [], empresa_servicos_padrao: d?.empresa_servicos_padrao || null });
    } catch (e) { /* silencioso no refresh */ }
    finally { setLoading(false); }
  }
  useEffect(() => {
    carregar();
    timer.current = setInterval(carregar, 30000);
    return () => clearInterval(timer.current);
  }, []);

  function abrirFaturar(tipo, item) { setFForma(""); setFCond(""); setFSplit(false); setFEmpServ(dados.empresa_servicos_padrao ? String(dados.empresa_servicos_padrao) : ""); setModalFat({ tipo, item }); }

  async function confirmarFaturar() {
    if (!fForma) { notificar("Selecione a forma de pagamento.", "erro"); return; }
    const { tipo, item } = modalFat;
    const split = tipo === "os" && fSplit;
    if (split && !fEmpServ) { notificar("Selecione a empresa dos serviços para faturar separado.", "erro"); return; }
    setSaving(tipo + item.id);
    try {
      const fn = split ? "erp_os_faturar_split" : (tipo === "os" ? "os_faturar" : "venda_faturar");
      const p = split
        ? { id_os: item.id, id_empresa_servicos: num(fEmpServ), id_forma_pagamento: num(fForma), id_condicao_pagamento: num(fCond) || null, _ator: usuario.id }
        : tipo === "os"
          ? { id_os: item.id, id_forma_pagamento: num(fForma), id_condicao_pagamento: num(fCond) || null, _ator: usuario.id }
          : { id_venda: item.id, id_forma_pagamento: num(fForma), id_condicao_pagamento: num(fCond) || null, _ator: usuario.id };
      const res = await rpc(fn, { p });
      if (res?.ok === false) { notificar(res.msg || res.erro || "Não foi possível faturar.", "erro"); setSaving(null); return; }
      notificar(`${tipo === "os" ? "OS" : "Venda"} ${item.numero} faturada!`);
      setModalFat(null);
      await carregar();
    } catch (e) {
      const m = String(e.message || "");
      notificar(m.includes("|") ? m.split("|")[1] : "Erro: " + m, "erro");
    } finally { setSaving(null); }
  }

  async function reverter(tipo, item) {
    setSaving(tipo + item.id);
    try {
      const fn = tipo === "os" ? "erp_os_reverter_liberacao" : "erp_venda_reverter_liberacao";
      const p = tipo === "os" ? { p_id_os: item.id, p_ator: usuario.id } : { p_id_venda: item.id, p_ator: usuario.id };
      const res = await rpc(fn, p);
      if (res?.ok === false) { notificar(res.erro || "Não foi possível reverter.", "erro"); setSaving(null); return; }
      notificar(`${tipo === "os" ? "OS" : "Venda"} ${item.numero} devolvida para edição.`);
      await carregar();
    } catch (e) { notificar("Erro: " + (e.message || ""), "erro"); }
    finally { setSaving(null); }
  }

  const linhas = [
    ...dados.os.map((o) => ({ tipo: "os", item: o })),
    ...dados.vendas.map((v) => ({ tipo: "venda", item: v })),
  ];
  const totalFila = linhas.reduce((s, l) => s + (num(l.item.valor_total) || 0), 0);

  return (
    <>
      {toast && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.tipo === "erro" ? C.warningBg : C.successBg, color: toast.tipo === "erro" ? C.warning : C.success }}>{toast.msg}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Receipt size={20} /> Fila de Faturamento</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>{linhas.length} liberada(s) · {fmtBRL(totalFila)} · aguardando faturamento</p>
        </div>
        <button onClick={carregar} style={btnGhost()}><RefreshCw size={15} /> Atualizar</button>
      </div>

      {!podeFaturar && (
        <div style={{ background: C.warningBg, color: C.warning, padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          Você pode acompanhar a fila, mas faturar/reverter exige permissão do Financeiro.
        </div>
      )}

      <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Carregando...</div>
        ) : linhas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
            <Receipt size={30} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>Nenhuma OS ou venda liberada para faturamento.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
              <thead><tr>
                <ThSort label="Tipo" k="tipo" sort={sort} onSort={onSort} />
                <ThSort label="Número" k="numero" sort={sort} onSort={onSort} />
                <ThSort label="Cliente" k="cliente" sort={sort} onSort={onSort} />
                <ThSort label="Empresa" k="empresa" sort={sort} onSort={onSort} />
                <ThSort label="Valor" k="valor" sort={sort} onSort={onSort} right />
                <ThSort label="Liberado por" k="liberado" sort={sort} onSort={onSort} />
                <th style={th()}></th>
              </tr></thead>
              <tbody>
                {ordenar(linhas, { tipo: (l) => l.tipo, numero: (l) => l.item.numero, cliente: (l) => l.item.cliente, empresa: (l) => l.item.empresa, valor: (l) => Number(l.item.valor_total) || 0, liberado: (l) => l.item.liberado_por }).map(({ tipo, item }) => (
                  <tr key={tipo + item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={td()}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: tipo === "os" ? C.blueMid : C.primary }}>{tipo === "os" ? <FileText size={13} /> : <ShoppingCart size={13} />} {tipo === "os" ? "OS" : "VENDA"}</span></td>
                    <td style={{ ...td(), fontWeight: 600 }}>{item.numero}</td>
                    <td style={td()}>{item.cliente_codigo ? <span style={{ color: C.muted, fontFamily: "monospace" }}>#{item.cliente_codigo} · </span> : null}{item.cliente || "—"}</td>
                    <td style={td()}><span style={{ fontSize: 11, background: C.bluePale, color: C.blueMid, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{item.empresa || "—"}</span></td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmtBRL(item.valor_total)}</td>
                    <td style={{ ...td(), fontSize: 12, color: C.muted }}>{item.liberado_por || "—"}</td>
                    <td style={{ ...td(), textAlign: "right", whiteSpace: "nowrap" }}>
                      {podeFaturar && (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => reverter(tipo, item)} disabled={saving === tipo + item.id} style={{ ...btnGhost(), color: C.warning, borderColor: C.warning, padding: "6px 10px" }} title="Devolver para edição"><RotateCcw size={14} /> Reverter</button>
                          <button onClick={() => abrirFaturar(tipo, item)} disabled={saving === tipo + item.id} style={{ ...btnPrimary(), padding: "6px 12px" }}><DollarSign size={14} /> Faturar</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalFat && (
        <div onClick={() => setModalFat(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle(), width: 460, maxWidth: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <b style={{ fontSize: 15 }}>Faturar {modalFat.tipo === "os" ? "OS" : "Venda"} {modalFat.item.numero}</b>
              <button onClick={() => setModalFat(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ background: C.surface2, borderRadius: 8, padding: 12, margin: "10px 0 14px", fontSize: 13 }}>
              <div><b>Cliente:</b> {modalFat.item.cliente || "—"}</div>
              <div><b>Valor:</b> <span style={{ fontWeight: 700, color: C.primary }}>{fmtBRL(modalFat.item.valor_total)}</span></div>
            </div>
            <Campo label="Forma de pagamento *">
              <select value={fForma} onChange={(e) => setFForma(e.target.value)} style={sel(true)}>
                <option value="">Selecione...</option>
                {dados.formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
              </select>
            </Campo>
            <Campo label="Condição de pagamento">
              <select value={fCond} onChange={(e) => setFCond(e.target.value)} style={sel(true)}>
                <option value="">À vista / padrão</option>
                {dados.condicoes.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
              </select>
            </Campo>

            {modalFat.tipo === "os" && (
              <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: fSplit ? C.bluePale : C.surface2, border: `1px solid ${fSplit ? C.blueMid : C.border}` }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={fSplit} onChange={(e) => setFSplit(e.target.checked)} />
                  Faturar separando peças × serviços em 2 empresas (2 NFs)
                </label>
                {fSplit && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Peças ficam na empresa da OS (ICMS / NF-e). Escolha a empresa dos <b>serviços</b> (ISS / NFS-e):</div>
                    <select value={fEmpServ} onChange={(e) => setFEmpServ(e.target.value)} style={sel(true)}>
                      <option value="">Selecione a empresa dos serviços...</option>
                      {dados.empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}{e.uf ? " (" + e.uf + ")" : ""}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={() => setModalFat(null)} style={btnGhost()}>Cancelar</button>
              <button onClick={confirmarFaturar} disabled={!fForma || saving} style={{ ...btnPrimary(), opacity: (!fForma || saving) ? 0.6 : 1 }}><DollarSign size={14} /> Confirmar Faturamento</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
