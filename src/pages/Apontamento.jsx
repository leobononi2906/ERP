import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, RefreshCw, CheckCircle2, HardHat } from "lucide-react";
import { C, mono, rpc } from "../config";
import { cardStyle, inp, sel, th, td, btnPrimary, btnGhost, Skeleton, SelectBusca } from "../ui";

// Tela de Pátio: o colaborador lança as horas trabalhadas por OS + área.
// O apontamento NÃO fica preso a um serviço — vira um "bloco solto por área"
// que o Precificador (boca) depois transforma em serviço faturável.
export default function Apontamento({ usuario }) {
  const perms = (usuario && usuario.permissoes && usuario.permissoes.os) || {};
  const podeLancar = perms.incluir || perms.editar || perms.aprovar || usuario?.admin;

  const hoje = () => new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [areas, setAreas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const [lancados, setLancados] = useState([]); // apontamentos criados nesta sessão

  const vazio = { id_os: "", id_area: "", id_colaborador: usuario?.id ? String(usuario.id) : "", data: hoje(), horas: "", observacao: "" };
  const [f, setF] = useState(vazio);
  const s = (k, v) => setF((o) => ({ ...o, [k]: v }));

  const notificar = (msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 3000); };

  async function carregar() {
    setErro(null);
    try {
      const d = await rpc("os_apontamento_dados", {});
      setOrdens(Array.isArray(d?.ordens) ? d.ordens : []);
      setAreas(Array.isArray(d?.areas) ? d.areas : []);
      setColaboradores(Array.isArray(d?.colaboradores) ? d.colaboradores : []);
    } catch (e) {
      setErro(e.message || "Falha ao carregar dados do apontamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function lancar() {
    if (!f.id_os) { notificar("Selecione a OS.", "erro"); return; }
    if (!f.id_area) { notificar("Selecione a área.", "erro"); return; }
    if (!f.id_colaborador) { notificar("Selecione o colaborador.", "erro"); return; }
    const horas = Number(String(f.horas).replace(",", "."));
    if (!(horas > 0)) { notificar("Informe as horas trabalhadas (maior que zero).", "erro"); return; }

    setSalvando(true);
    try {
      const saved = await rpc("os_apontamento_salvar", {
        p_id_os: parseInt(f.id_os),
        p_id_area: parseInt(f.id_area),
        p_id_colaborador: parseInt(f.id_colaborador),
        p_data_apontamento: f.data || hoje(),
        p_horas_trabalhadas: horas,
        p_fator: horas,
        p_observacao: f.observacao || null,
      });
      const os = ordens.find((o) => o.id === parseInt(f.id_os));
      const area = areas.find((a) => a.id === parseInt(f.id_area));
      const colab = colaboradores.find((c) => c.id === parseInt(f.id_colaborador));
      setLancados((l) => [{
        id: saved?.id || Math.random(),
        os: os?.numero || f.id_os,
        cliente: os?.cliente || "",
        area: area?.descricao || "",
        colaborador: colab?.nome || "",
        data: f.data || hoje(),
        horas,
      }, ...l]);
      notificar("Apontamento lançado!");
      // mantém OS/área/colaborador para lançamentos em sequência; limpa horas e obs
      setF((o) => ({ ...o, horas: "", observacao: "" }));
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function removerLancado(item) {
    try {
      await rpc("os_apontamento_excluir", { p_id: item.id });
      setLancados((l) => l.filter((x) => x.id !== item.id));
      notificar("Apontamento removido.");
    } catch (e) {
      notificar("Erro: " + e.message, "erro");
    }
  }

  const osOpcoes = ordens.map((o) => ({ id: o.id, label: `${o.numero} — ${o.cliente}`, sub: o.cliente }));

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", background: toast.tipo === "erro" ? C.destructive : C.success, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Apontamento de Horas</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 0" }}>
            Pátio — registre as horas trabalhadas por OS e área
          </p>
        </div>
        <button onClick={() => { setLoading(true); carregar(); }} style={btnGhost()}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {erro && (
        <div style={{ background: C.destructiveBg, border: `1px solid ${C.destructive}33`, borderRadius: 10, padding: 14, marginBottom: 16, color: C.destructive, fontSize: 13 }}>
          {erro}
        </div>
      )}

      {!podeLancar && !loading && (
        <div style={{ ...cardStyle(), color: C.muted, fontSize: 13 }}>
          Você não tem permissão para lançar apontamentos.
        </div>
      )}

      {podeLancar && (
        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} h={40} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Ordem de Serviço</label>
                <SelectBusca opcoes={osOpcoes} value={f.id_os} onChange={(v) => s("id_os", v)} placeholder="Buscar OS ou cliente..." full />
              </div>
              <div>
                <label style={lbl}>Área</label>
                <select value={f.id_area} onChange={(e) => s("id_area", e.target.value)} style={{ ...sel(), width: "100%" }}>
                  <option value="">Selecione a área...</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.descricao}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Colaborador</label>
                <select value={f.id_colaborador} onChange={(e) => s("id_colaborador", e.target.value)} style={{ ...sel(), width: "100%" }}>
                  <option value="">Selecione...</option>
                  {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Data</label>
                <input type="date" value={f.data} onChange={(e) => s("data", e.target.value)} style={{ ...inp(), width: "100%" }} />
              </div>
              <div>
                <label style={lbl}>Horas trabalhadas</label>
                <input type="number" step="0.25" min="0" value={f.horas} onChange={(e) => s("horas", e.target.value)} placeholder="Ex.: 3,5" style={{ ...inp(), width: "100%", fontFamily: mono }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Observação (opcional)</label>
                <input value={f.observacao} onChange={(e) => s("observacao", e.target.value)} placeholder="O que foi feito..." style={{ ...inp(), width: "100%" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={lancar} disabled={salvando} style={{ ...btnPrimary(), opacity: salvando ? 0.6 : 1 }}>
                  <Plus size={15} /> {salvando ? "Lançando..." : "Lançar apontamento"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lançados nesta sessão */}
      {lancados.length > 0 && (
        <div style={{ ...cardStyle(), padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.foreground }}>
            <CheckCircle2 size={16} style={{ color: C.success }} /> Lançados agora ({lancados.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead><tr>
                {["OS", "Cliente", "Área", "Colaborador", "Data", "Horas", ""].map((h, i) => <th key={i} style={th(i === 5)}>{h}</th>)}
              </tr></thead>
              <tbody>
                {lancados.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td()}><span style={{ fontFamily: mono, fontWeight: 700, color: C.primary }}>{l.os}</span></td>
                    <td style={{ ...td(), maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.cliente}</td>
                    <td style={td()}>{l.area}</td>
                    <td style={td()}>{l.colaborador}</td>
                    <td style={{ ...td(), fontFamily: mono, fontSize: 12 }}>{l.data.split("-").reverse().join("/")}</td>
                    <td style={{ ...td(), textAlign: "right", fontFamily: mono, fontWeight: 700 }}>{l.horas.toLocaleString("pt-BR")}h</td>
                    <td style={{ ...td(), textAlign: "right" }}>
                      <button onClick={() => removerLancado(l)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", color: C.destructive, padding: 4 }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && lancados.length === 0 && podeLancar && (
        <div style={{ textAlign: "center", padding: "36px 0", color: C.textMuted }}>
          <HardHat size={30} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontSize: 13 }}>Nenhum apontamento lançado nesta sessão. Preencha acima para começar.</div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, marginBottom: 5 };
