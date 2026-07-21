import { useState, useEffect, useMemo } from "react";
import { Search, Plus, DollarSign, RotateCcw, Eye } from "lucide-react";
import { C, rpc, fmtBRL } from "../../config";

const fmtData = (d) => { if (!d) return "—"; const [y,m,dd] = String(d).substring(0,10).split("-"); return `${dd}/${m}/${y}`; };
const diasAtraso = (v) => { if (!v) return 0; const [y,m,d] = String(v).substring(0,10).split("-").map(Number); const h = new Date(); h.setHours(0,0,0,0); return Math.max(0, Math.floor((h - new Date(y,m-1,d)) / 864e5)); };

const badge = (status, venc) => {
  if (status === "ABERTO" && diasAtraso(venc) > 0) return { label: "Vencido", bg: C.destructiveBg, fg: C.destructive };
  if (status === "PARCIAL") return { label: "Parcial", bg: "#FFF3E0", fg: C.warning };
  if (status === "QUITADO") return { label: "Quitado", bg: C.successBg, fg: C.success };
  return { label: "Aberto", bg: C.bluePale, fg: C.blueMid };
};

const inputSt = { width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", fontFamily: "inherit" };
const btnPrimSt = { padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: C.primary, border: "none", borderRadius: 8, cursor: "pointer" };
const btnSecSt = { ...btnPrimSt, background: "#fff", color: C.foreground, border: `1px solid ${C.border}` };

export default function ContasReceber({ usuario }) {
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modalBaixa, setModalBaixa] = useState(null);
  const [modalBaixas, setModalBaixas] = useState(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [contas, setContas] = useState([]);
  const [plano, setPlano] = useState([]);
  const [centros, setCentros] = useState([]);
  const [toast, setToast] = useState("");

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await rpc("erp_titulos_listar", {
        p_tipo: "CR", p_id_empresa: null, p_status: filtroStatus || null,
        p_data_ini: dataIni || null, p_data_fim: dataFim || null, p_busca: busca || null,
      });
      setTitulos(Array.isArray(r) ? r : []);
    } catch { setTitulos([]); }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filtroStatus, busca, dataIni, dataFim]);
  useEffect(() => {
    rpc("erp_contas_financeiras_listar", {}).then(r => setContas(Array.isArray(r) ? r : [])).catch(() => {});
    rpc("erp_plano_contas_listar", {}).then(r => setPlano((Array.isArray(r) ? r : []).filter(p => p.aceita_lancamento))).catch(() => {});
    rpc("erp_centros_custo_listar", {}).then(r => setCentros(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const resumo = useMemo(() => {
    const h = new Date(); h.setHours(0,0,0,0); const d30 = new Date(h); d30.setDate(d30.getDate()+30);
    let aberto=0, vencido=0, av30=0;
    titulos.forEach(t => {
      const s = Number(t.valor_saldo)||0; if (t.status==="QUITADO"||s<=0) return;
      aberto += s;
      const [y,m,d] = String(t.data_vencimento).substring(0,10).split("-").map(Number);
      const dv = new Date(y,m-1,d);
      if (dv<h) vencido+=s; else if (dv<=d30) av30+=s;
    });
    return {aberto,vencido,av30};
  }, [titulos]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const handleBaixar = async (form) => {
    try {
      const res = await rpc("erp_baixar_titulo", {
        p_id_titulo: form.id_titulo, p_id_conta_financeira: parseInt(form.id_conta),
        p_id_forma_pagamento: null, p_valor_pago: parseFloat(form.valor_pago),
        p_valor_desconto: parseFloat(form.desconto)||0, p_valor_juros: parseFloat(form.juros)||0,
        p_valor_multa: parseFloat(form.multa)||0, p_data_baixa: form.data_baixa,
        p_observacao: form.obs || null, p_id_usuario: null,
      });
      if (res?.ok) { showToast("Baixa realizada — saldo: " + fmtBRL(res.novo_saldo_titulo)); setModalBaixa(null); carregar(); }
      else showToast(res?.erro || "Erro");
    } catch (e) { showToast(e.message); }
  };

  const handleEstornar = async (idBaixa) => {
    try {
      const res = await rpc("erp_estornar_baixa", { p_id_baixa: idBaixa, p_id_usuario: null });
      if (res?.ok) { showToast("Estornado"); setModalBaixas(null); carregar(); }
      else showToast(res?.erro || "Erro");
    } catch (e) { showToast(e.message); }
  };

  const handleNovo = async (form) => {
    try {
      const res = await rpc("erp_titulo_salvar", {
        p_tipo: "CR", p_id_empresa: null, p_id_cliente: parseInt(form.id_cliente)||null,
        p_numero: form.numero, p_parcela: form.parcela||"1/1", p_valor: parseFloat(form.valor),
        p_data_vencimento: form.vencimento, p_id_plano_conta: parseInt(form.id_plano)||null,
        p_id_centro_custo: parseInt(form.id_centro)||null, p_modalidade: "NORMAL",
        p_observacao: form.obs||null, p_id_usuario: null,
      });
      if (res?.ok) { showToast("Título criado"); setModalNovo(false); carregar(); }
      else showToast(res?.erro || "Erro");
    } catch (e) { showToast(e.message); }
  };

  return (
    <div>
      {toast && <div style={{ position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)" }}>{toast}</div>}

      {/* Cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:16 }}>
        {[["Em Aberto",resumo.aberto,C.primary],["Vencido",resumo.vencido,C.destructive],["A Vencer 30d",resumo.av30,C.warning]].map(([l,v,c])=>(
          <div key={l} style={{ background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:c }}>{fmtBRL(v)}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",background:"#fff",borderRadius:12,padding:14,marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ flex:1,minWidth:200,position:"relative" }}>
          <Search size={15} style={{ position:"absolute",left:10,top:10,color:C.textMuted }} />
          <input placeholder="Buscar número, cliente..." value={busca} onChange={e=>setBusca(e.target.value)} style={{ ...inputSt, paddingLeft:32 }} />
        </div>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ ...inputSt, width:"auto" }}>
          <option value="">Todos</option><option value="ABERTO">Aberto</option><option value="PARCIAL">Parcial</option><option value="QUITADO">Quitado</option>
        </select>
        <input type="date" value={dataIni} onChange={e=>setDataIni(e.target.value)} style={{ ...inputSt,width:"auto" }} />
        <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} style={{ ...inputSt,width:"auto" }} />
        <button onClick={()=>setModalNovo(true)} style={btnPrimSt}><Plus size={14} style={{marginRight:4,verticalAlign:"middle"}} />Novo</button>
      </div>

      {/* Tabela */}
      {loading ? <div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div> :
       titulos.length===0 ? <div style={{textAlign:"center",padding:40,color:C.textMuted}}>Nenhum título encontrado.</div> : (
        <div style={{ background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
              <thead><tr style={{ background:C.surface2,borderBottom:`1px solid ${C.border}` }}>
                {["Nº","Cliente","Origem","Valor","Saldo","Vencimento","Status","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {titulos.map(t => {
                  const b = badge(t.status, t.data_vencimento);
                  const atr = diasAtraso(t.data_vencimento);
                  const venc = t.status !== "QUITADO" && atr > 0;
                  return (
                    <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}`, background: venc ? "#FEF0EF" : "#fff" }}>
                      <td style={{padding:"10px 12px",fontWeight:500}}>{t.numero||"—"}<span style={{fontSize:11,color:C.textMuted,marginLeft:4}}>{t.parcela}</span></td>
                      <td style={{padding:"10px 12px",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.cliente_nome||"—"}</td>
                      <td style={{padding:"10px 12px"}}>{t.origem ? <span style={{fontSize:11,color:C.blueMid}}>{t.origem} {t.numero_origem}</span> : <span style={{fontSize:11,color:C.textMuted}}>Avulso</span>}</td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmtBRL(t.valor)}</td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtBRL(t.valor_saldo)}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",whiteSpace:"nowrap"}}>
                        {fmtData(t.data_vencimento)}
                        {venc && <div style={{fontSize:10,fontWeight:700,color:C.destructive}}>{atr}d atraso</div>}
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"center"}}>
                        <span style={{ display:"inline-block",padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:b.bg,color:b.fg }}>{b.label}</span>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"center",whiteSpace:"nowrap"}}>
                        <button onClick={()=>setModalBaixas(t)} title="Ver baixas" style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.muted}}><Eye size={16}/></button>
                        {t.status!=="QUITADO" && <button onClick={()=>setModalBaixa(t)} title="Baixar" style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.success}}><DollarSign size={16}/></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Baixa */}
      {modalBaixa && <ModalBaixaCR titulo={modalBaixa} contas={contas} onBaixar={handleBaixar} onClose={()=>setModalBaixa(null)} />}
      {modalBaixas && <ModalVerBaixasCR titulo={modalBaixas} onEstornar={handleEstornar} onClose={()=>setModalBaixas(null)} />}
      {modalNovo && <ModalNovoCR plano={plano} centros={centros} onSalvar={handleNovo} onClose={()=>setModalNovo(false)} />}
    </div>
  );
}

/* ── Modais ── */
function Overlay({ children, onClose }) {
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:480,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div>
  </div>;
}
function MHeader({ children, onClose }) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
    <div style={{fontSize:15,fontWeight:700}}>{children}</div>
    <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button>
  </div>;
}
function MBody({ children }) { return <div style={{padding:20}}>{children}</div>; }
function Field({ label, req, children }) {
  return <div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;
}

function ModalBaixaCR({ titulo, contas, onBaixar, onClose }) {
  const [f,sF] = useState({ id_titulo:titulo.id, id_conta:"", valor_pago:titulo.valor_saldo||0, desconto:0, juros:0, multa:0, data_baixa:new Date().toISOString().substring(0,10), obs:"" });
  const s = (k,v)=>sF(p=>({...p,[k]:v}));
  const vliq = (parseFloat(f.valor_pago)||0)+(parseFloat(f.juros)||0)+(parseFloat(f.multa)||0)-(parseFloat(f.desconto)||0);
  return <Overlay onClose={onClose}><MHeader onClose={onClose}>Baixa — {titulo.numero} {titulo.parcela}</MHeader><MBody>
    <div style={{background:C.surface2,borderRadius:8,padding:12,marginBottom:16,fontSize:13}}>
      <div><b>Cliente:</b> {titulo.cliente_nome||"—"}</div>
      <div><b>Saldo:</b> <span style={{fontWeight:700,color:C.primary}}>{fmtBRL(titulo.valor_saldo)}</span></div>
    </div>
    <Field label="Conta Financeira" req><select value={f.id_conta} onChange={e=>s("id_conta",e.target.value)} style={inputSt}>
      <option value="">Selecione...</option>{contas.filter(c=>c.ativo).map(c=><option key={c.id} value={c.id}>{c.descricao} ({fmtBRL(c.saldo_atual)})</option>)}
    </select></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Valor" req><input type="number" step="0.01" value={f.valor_pago} onChange={e=>s("valor_pago",e.target.value)} style={inputSt}/></Field>
      <Field label="Data"><input type="date" value={f.data_baixa} onChange={e=>s("data_baixa",e.target.value)} style={inputSt}/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Field label="Desconto"><input type="number" step="0.01" value={f.desconto} onChange={e=>s("desconto",e.target.value)} style={inputSt}/></Field>
      <Field label="Juros"><input type="number" step="0.01" value={f.juros} onChange={e=>s("juros",e.target.value)} style={inputSt}/></Field>
      <Field label="Multa"><input type="number" step="0.01" value={f.multa} onChange={e=>s("multa",e.target.value)} style={inputSt}/></Field>
    </div>
    <div style={{background:C.bluePale,borderRadius:8,padding:12,margin:"12px 0",fontSize:13,fontWeight:600,color:C.primary}}>Valor líquido: {fmtBRL(vliq)}</div>
    <Field label="Observação"><input value={f.obs} onChange={e=>s("obs",e.target.value)} style={inputSt}/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <button onClick={onClose} style={btnSecSt}>Cancelar</button>
      <button onClick={()=>onBaixar(f)} style={btnPrimSt} disabled={!f.id_conta}>Confirmar Baixa</button>
    </div>
  </MBody></Overlay>;
}

function ModalVerBaixasCR({ titulo, onEstornar, onClose }) {
  const [baixas,setBaixas] = useState([]); const [ld,setLd] = useState(true);
  useEffect(()=>{ rpc("erp_titulos_baixas_listar",{p_id_titulo:titulo.id}).then(r=>setBaixas(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLd(false)); },[]);
  return <Overlay onClose={onClose}><MHeader onClose={onClose}>Baixas — {titulo.numero} {titulo.parcela}</MHeader><MBody>
    {ld ? <div style={{padding:20,textAlign:"center",color:C.textMuted}}>Carregando...</div> :
     baixas.length===0 ? <div style={{padding:20,textAlign:"center",color:C.textMuted}}>Nenhuma baixa.</div> :
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr style={{background:C.surface2}}>{["Data","Valor","Conta","Status",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted}}>{h}</th>)}</tr></thead>
      <tbody>{baixas.map(b=><tr key={b.id} style={{borderBottom:`1px solid ${C.border}`,opacity:b.estornado?0.4:1,textDecoration:b.estornado?"line-through":"none"}}>
        <td style={{padding:"8px 10px"}}>{fmtData(b.data_baixa)}</td>
        <td style={{padding:"8px 10px",fontFamily:"'DM Mono',monospace"}}>{fmtBRL(b.valor_pago)}</td>
        <td style={{padding:"8px 10px"}}>{b.conta_financeira||"—"}</td>
        <td style={{padding:"8px 10px"}}>{b.estornado?"Estornado":"Ativo"}</td>
        <td style={{padding:"8px 10px"}}>{!b.estornado&&<button onClick={()=>onEstornar(b.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.destructive}}><RotateCcw size={14}/></button>}</td>
      </tr>)}</tbody>
    </table>}
  </MBody></Overlay>;
}

function ModalNovoCR({ plano, centros, onSalvar, onClose }) {
  const [f,sF] = useState({numero:"",parcela:"1/1",id_cliente:"",valor:"",vencimento:"",id_plano:"",id_centro:"",obs:""});
  const s = (k,v)=>sF(p=>({...p,[k]:v}));
  return <Overlay onClose={onClose}><MHeader onClose={onClose}>Novo Título a Receber</MHeader><MBody>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Número"><input value={f.numero} onChange={e=>s("numero",e.target.value)} style={inputSt}/></Field>
      <Field label="Parcela"><input value={f.parcela} onChange={e=>s("parcela",e.target.value)} style={inputSt}/></Field>
    </div>
    <Field label="ID Cliente"><input type="number" value={f.id_cliente} onChange={e=>s("id_cliente",e.target.value)} style={inputSt}/></Field>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Valor" req><input type="number" step="0.01" value={f.valor} onChange={e=>s("valor",e.target.value)} style={inputSt}/></Field>
      <Field label="Vencimento" req><input type="date" value={f.vencimento} onChange={e=>s("vencimento",e.target.value)} style={inputSt}/></Field>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Field label="Plano de Contas" req><select value={f.id_plano} onChange={e=>s("id_plano",e.target.value)} style={inputSt}><option value="">Selecione...</option>{plano.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}</select></Field>
      <Field label="Centro de Custo" req><select value={f.id_centro} onChange={e=>s("id_centro",e.target.value)} style={inputSt}><option value="">Selecione...</option>{centros.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.descricao}</option>)}</select></Field>
    </div>
    <Field label="Observação"><input value={f.obs} onChange={e=>s("obs",e.target.value)} style={inputSt}/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <button onClick={onClose} style={btnSecSt}>Cancelar</button>
      <button onClick={()=>onSalvar(f)} style={btnPrimSt} disabled={!f.valor||!f.vencimento}>Criar Título</button>
    </div>
  </MBody></Overlay>;
}
