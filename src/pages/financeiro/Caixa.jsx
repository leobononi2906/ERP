import { useState, useEffect, useMemo } from "react";
import { Lock, Unlock, DollarSign, History } from "lucide-react";
import { C, rpc, fmtBRL } from "../../config";
const fmtDH=(d)=>{if(!d)return"—";return new Date(d).toLocaleString("pt-BR");};
const inp={width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit"};
const bp={padding:"8px 16px",fontSize:13,fontWeight:600,color:"#fff",background:C.primary,border:"none",borderRadius:8,cursor:"pointer"};
const bs={...bp,background:"#fff",color:C.foreground,border:`1px solid ${C.border}`};
function Ov({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:520,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div></div>;}
function MH({children,onClose}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:700}}>{children}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button></div>;}
function MB({children}){return<div style={{padding:20}}>{children}</div>;}
function F({label,req,children}){return<div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;}

export default function Caixa({simGrupo}){
  const[sessoes,setSessoes]=useState([]);const[loading,setLoading]=useState(true);
  const[contas,setContas]=useState([]);
  const[modalAbrir,setModalAbrir]=useState(false);const[modalFechar,setModalFechar]=useState(null);
  const[modalMov,setModalMov]=useState(null);const[modalHist,setModalHist]=useState(null);
  const[toast,setToast]=useState("");
  const carregar=()=>{setLoading(true);rpc("erp_caixas_listar",{}).then(r=>setSessoes(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{carregar();rpc("erp_contas_financeiras_listar",{}).then(r=>setContas(Array.isArray(r)?r:[])).catch(()=>{});},[]);
  const sessaoAberta=useMemo(()=>sessoes.find(s=>s.status==="ABERTO"),[sessoes]);
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const handleAbrir=async(f)=>{try{const r=await rpc("erp_abrir_caixa",{p_id_empresa:null,p_id_conta_financeira:parseInt(f.id_conta),p_id_usuario:null,p_valor_abertura:parseFloat(f.valor)||0});if(r?.ok){show("Caixa aberto");setModalAbrir(false);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};
  const handleFechar=async(f)=>{try{const r=await rpc("erp_fechar_caixa",{p_id_sessao:f.id_sessao,p_id_usuario:null,p_valor_contado:parseFloat(f.contado),p_observacao:f.obs||null});if(r?.ok){show(`Fechado. Sistema: ${fmtBRL(r.valor_sistema)} | Contado: ${fmtBRL(r.valor_contado)} | Dif: ${fmtBRL(r.diferenca)}`);setModalFechar(null);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};
  const handleMov=async(f)=>{try{const r=await rpc("erp_movimento_caixa",{p_id_sessao:f.id_sessao,p_tipo:f.tipo,p_valor:parseFloat(f.valor),p_descricao:f.desc,p_id_usuario:null});if(r?.ok){show("Movimento registrado");setModalMov(null);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};

  return<div>
    {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>{toast}</div>}
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {sessaoAberta?<><button onClick={()=>setModalMov(sessaoAberta)} style={bp}><DollarSign size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Movimentar</button><button onClick={()=>setModalFechar(sessaoAberta)} style={bs}><Lock size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Fechar</button></>:<button onClick={()=>setModalAbrir(true)} style={bp}><Unlock size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Abrir Caixa</button>}
    </div>
    {sessaoAberta&&<div style={{background:C.successBg,border:`1px solid ${C.success}33`,borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><Unlock size={18} color={C.success}/><span style={{fontSize:13,fontWeight:700,color:C.success}}>CAIXA ABERTO</span></div>
      <div style={{fontSize:13}}><b>{sessaoAberta.conta_desc}</b> — Aberto em {fmtDH(sessaoAberta.data_abertura)} — Fundo: {fmtBRL(sessaoAberta.valor_abertura)}</div>
    </div>}
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:sessoes.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Nenhuma sessão.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Conta","Operador","Abertura","Fundo","Fechamento","Sistema","Contado","Diferença","Status",""].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{sessoes.map(s=>{const d=Number(s.diferenca)||0;return<tr key={s.id} style={{borderBottom:`1px solid ${C.border}`}}>
        <td style={{padding:"10px 12px",fontWeight:500}}>{s.conta_desc}</td>
        <td style={{padding:"10px 12px"}}>{s.usuario_nome}</td>
        <td style={{padding:"10px 12px",fontSize:11}}>{fmtDH(s.data_abertura)}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{fmtBRL(s.valor_abertura)}</td>
        <td style={{padding:"10px 12px",fontSize:11}}>{s.data_fechamento?fmtDH(s.data_fechamento):"—"}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{s.valor_sistema!=null?fmtBRL(s.valor_sistema):"—"}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{s.valor_contado!=null?fmtBRL(s.valor_contado):"—"}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace",fontWeight:700,color:d>0?C.success:d<0?C.destructive:C.foreground}}>{s.diferenca!=null?fmtBRL(d):"—"}</td>
        <td style={{padding:"10px 12px"}}><span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:s.status==="ABERTO"?C.successBg:C.surface2,color:s.status==="ABERTO"?C.success:C.muted}}>{s.status}</span></td>
        <td style={{padding:"10px 12px"}}><button onClick={()=>setModalHist(s)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.muted}}><History size={16}/></button></td>
      </tr>;})}</tbody></table></div></div>}

    {modalAbrir&&<Ov onClose={()=>setModalAbrir(false)}><MH onClose={()=>setModalAbrir(false)}>Abrir Caixa</MH><MB>
      <AbrirForm contas={contas} onAbrir={handleAbrir} onClose={()=>setModalAbrir(false)}/></MB></Ov>}
    {modalFechar&&<Ov onClose={()=>setModalFechar(null)}><MH onClose={()=>setModalFechar(null)}>Fechar Caixa</MH><MB>
      <FecharForm sessao={modalFechar} onFechar={handleFechar} onClose={()=>setModalFechar(null)}/></MB></Ov>}
    {modalMov&&<Ov onClose={()=>setModalMov(null)}><MH onClose={()=>setModalMov(null)}>Movimento de Caixa</MH><MB>
      <MovForm sessao={modalMov} onSalvar={handleMov} onClose={()=>setModalMov(null)}/></MB></Ov>}
    {modalHist&&<Ov onClose={()=>setModalHist(null)}><MH onClose={()=>setModalHist(null)}>Movimentos — Sessão #{modalHist.id}</MH><MB>
      <HistView idSessao={modalHist.id}/></MB></Ov>}
  </div>;
}

function AbrirForm({contas,onAbrir,onClose}){const[f,sF]=useState({id_conta:"",valor:"200"});const s=(k,v)=>sF(p=>({...p,[k]:v}));
return<><F label="Conta do Caixa" req><select value={f.id_conta} onChange={e=>s("id_conta",e.target.value)} style={inp}><option value="">Selecione...</option>{contas.filter(c=>c.ativo).map(c=><option key={c.id} value={c.id}>{c.descricao}</option>)}</select></F>
<F label="Fundo de Troco"><input type="number" step="0.01" value={f.valor} onChange={e=>s("valor",e.target.value)} style={inp}/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onAbrir(f)} style={bp} disabled={!f.id_conta}>Abrir</button></div></>;}

function FecharForm({sessao,onFechar,onClose}){const[etapa,setEtapa]=useState("contagem");const[f,sF]=useState({id_sessao:sessao.id,contado:"",obs:""});
return etapa==="contagem"?<><div style={{background:C.bluePale,borderRadius:8,padding:12,marginBottom:16,fontSize:13,color:C.primary}}><b>Conferência cega:</b> informe o valor contado sem ver o sistema.</div>
<F label="Valor Contado" req><input type="number" step="0.01" value={f.contado} onChange={e=>sF(p=>({...p,contado:e.target.value}))} style={inp} placeholder="R$ 0,00" autoFocus/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>setEtapa("confirma")} style={bp} disabled={!f.contado}>Prosseguir</button></div></>
:<><div style={{fontSize:13,marginBottom:12}}>Contado: <b style={{fontFamily:"'DM Mono',monospace"}}>{fmtBRL(parseFloat(f.contado)||0)}</b></div>
<F label="Observação (obrigatória se diferença)"><input value={f.obs} onChange={e=>sF(p=>({...p,obs:e.target.value}))} style={inp}/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setEtapa("contagem")} style={bs}>Voltar</button><button onClick={()=>onFechar(f)} style={bp}>Confirmar Fechamento</button></div></>;}

function MovForm({sessao,onSalvar,onClose}){const[f,sF]=useState({id_sessao:sessao.id,tipo:"RECEBIMENTO",valor:"",desc:""});const s=(k,v)=>sF(p=>({...p,[k]:v}));
return<><F label="Tipo" req><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={inp}><option value="RECEBIMENTO">Recebimento</option><option value="SUPRIMENTO">Suprimento</option><option value="SANGRIA">Sangria</option><option value="PAGAMENTO">Pagamento</option></select></F>
<F label="Valor" req><input type="number" step="0.01" value={f.valor} onChange={e=>s("valor",e.target.value)} style={inp}/></F>
<F label="Descrição" req><input value={f.desc} onChange={e=>s("desc",e.target.value)} style={inp}/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onSalvar(f)} style={bp} disabled={!f.valor||!f.desc}>Registrar</button></div></>;}

function HistView({idSessao}){const[mov,setMov]=useState([]);const[ld,setLd]=useState(true);
useEffect(()=>{rpc("erp_caixa_movimentos_listar",{p_id_sessao:idSessao}).then(r=>setMov(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLd(false));},[]);
const cores={RECEBIMENTO:C.success,SUPRIMENTO:C.blueMid,SANGRIA:C.warning,PAGAMENTO:C.destructive};
if(ld)return<div style={{padding:20,textAlign:"center",color:C.textMuted}}>Carregando...</div>;
if(!mov.length)return<div style={{padding:20,textAlign:"center",color:C.textMuted}}>Nenhum movimento.</div>;
return<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:C.surface2}}>{["Hora","Tipo","Valor","Descrição","Operador"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted}}>{h}</th>)}</tr></thead>
<tbody>{mov.map(m=><tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}><td style={{padding:"7px 10px",fontSize:11}}>{fmtDH(m.criado_em)}</td><td style={{padding:"7px 10px",fontWeight:600,color:cores[m.tipo]||C.foreground}}>{m.tipo}</td><td style={{padding:"7px 10px",fontFamily:"'DM Mono',monospace"}}>{fmtBRL(m.valor)}</td><td style={{padding:"7px 10px"}}>{m.descricao}</td><td style={{padding:"7px 10px"}}>{m.usuario_nome}</td></tr>)}</tbody></table>;}
