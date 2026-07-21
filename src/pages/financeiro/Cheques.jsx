import { useState, useEffect, useMemo } from "react";
import { Plus, CheckCircle, XCircle, Pencil } from "lucide-react";
import { C, rpc, fmtBRL } from "../../config";
const fmtData=(d)=>{if(!d)return"—";const[y,m,dd]=String(d).substring(0,10).split("-");return`${dd}/${m}/${y}`;};
const inp={width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit"};
const bp={padding:"8px 16px",fontSize:13,fontWeight:600,color:"#fff",background:C.primary,border:"none",borderRadius:8,cursor:"pointer"};
const bs={...bp,background:"#fff",color:C.foreground,border:`1px solid ${C.border}`};
const SB={CARTEIRA:{l:"Em Carteira",bg:C.bluePale,fg:C.blueMid},COMPENSADO:{l:"Compensado",bg:C.successBg,fg:C.success},DEVOLVIDO:{l:"Devolvido",bg:C.destructiveBg,fg:C.destructive},REPASSADO:{l:"Repassado",bg:"#FFF3E0",fg:C.warning}};
function Ov({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:480,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div></div>;}
function MH({children,onClose}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:700}}>{children}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button></div>;}
function MB({children}){return<div style={{padding:20}}>{children}</div>;}
function F({label,req,children}){return<div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;}

export default function Cheques({usuario}){
  const[cheques,setCheques]=useState([]);const[loading,setLoading]=useState(true);
  const[filtroTipo,setFiltroTipo]=useState("");const[filtroStatus,setFiltroStatus]=useState("");
  const[contas,setContas]=useState([]);
  const[modalNovo,setModalNovo]=useState(false);const[modalComp,setModalComp]=useState(null);const[modalDev,setModalDev]=useState(null);
  const[toast,setToast]=useState("");
  const carregar=()=>{setLoading(true);rpc("erp_cheques_listar",{p_id_empresa:null,p_tipo:filtroTipo||null,p_status:filtroStatus||null}).then(r=>setCheques(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{carregar();},[filtroTipo,filtroStatus]);
  useEffect(()=>{rpc("erp_contas_financeiras_listar",{}).then(r=>setContas(Array.isArray(r)?r:[])).catch(()=>{});},[]);
  const resumo=useMemo(()=>{let cart=0,dev=0;cheques.forEach(c=>{const v=Number(c.valor)||0;if(c.status==="CARTEIRA")cart+=v;if(c.status==="DEVOLVIDO")dev+=v;});return{cart,dev};},[cheques]);
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const handleSalvar=async(f)=>{try{const r=await rpc("erp_cheque_salvar",{p_id:f.id||null,p_id_empresa:null,p_tipo:f.tipo,p_banco:f.banco||null,p_agencia:f.agencia||null,p_conta:f.conta||null,p_numero:f.numero,p_valor:parseFloat(f.valor),p_data_emissao:f.data_emissao||null,p_data_bom_para:f.data_bom_para||null,p_id_cliente:parseInt(f.id_cliente)||null,p_id_titulo:parseInt(f.id_titulo)||null,p_observacao:f.obs||null,p_id_usuario:null});if(r?.ok){show("Cheque salvo");setModalNovo(false);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};
  const handleCompensar=async(f)=>{try{const r=await rpc("erp_cheque_compensar",{p_id_cheque:f.id_cheque,p_id_conta_financeira:parseInt(f.id_conta),p_data_compensacao:f.data||new Date().toISOString().substring(0,10),p_id_usuario:null});if(r?.ok){show("Cheque compensado");setModalComp(null);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};
  const handleDevolver=async(f)=>{try{const r=await rpc("erp_cheque_devolver",{p_id_cheque:f.id_cheque,p_motivo:f.motivo,p_id_usuario:null});if(r?.ok){show("Cheque devolvido"+(r.baixa_estornada?" — baixa estornada":""));setModalDev(null);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};

  return<div>
    {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>{toast}</div>}
    <div style={{display:"flex",gap:8,marginBottom:16,justifyContent:"flex-end"}}>
      <button onClick={()=>setModalNovo(true)} style={bp}><Plus size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Novo Cheque</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:16}}>
      {[["Em Carteira",resumo.cart,C.primary],["Devolvidos",resumo.dev,C.destructive]].map(([l,v,c])=>(
        <div key={l} style={{background:"#fff",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:C.textMuted,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:c}}>{fmtBRL(v)}</div></div>
      ))}
    </div>
    <div style={{display:"flex",gap:10,background:"#fff",borderRadius:12,padding:14,marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{...inp,width:"auto"}}><option value="">Todos tipos</option><option value="RECEBIDO">Recebidos</option><option value="EMITIDO">Emitidos</option></select>
      <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...inp,width:"auto"}}><option value="">Todos status</option><option value="CARTEIRA">Carteira</option><option value="COMPENSADO">Compensado</option><option value="DEVOLVIDO">Devolvido</option><option value="REPASSADO">Repassado</option></select>
    </div>
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:cheques.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Nenhum cheque.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Tipo","Nº","Banco/Ag/Conta","Cliente","Valor","Bom Para","Status","Ações"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{cheques.map(ch=>{const b=SB[ch.status]||{l:ch.status,bg:C.surface2,fg:C.muted};return<tr key={ch.id} style={{borderBottom:`1px solid ${C.border}`}}>
        <td style={{padding:"10px 12px",fontWeight:600,color:ch.tipo==="RECEBIDO"?C.success:C.blueMid}}>{ch.tipo}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{ch.numero||"—"}</td>
        <td style={{padding:"10px 12px"}}>{ch.banco?`${ch.banco}/${ch.agencia}/${ch.conta}`:"—"}</td>
        <td style={{padding:"10px 12px",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.cliente_nome||"—"}</td>
        <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtBRL(ch.valor)}</td>
        <td style={{padding:"10px 12px",textAlign:"center"}}>{fmtData(ch.data_bom_para)}</td>
        <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:b.bg,color:b.fg}}>{b.l}</span>{ch.motivo_devolucao&&<div style={{fontSize:10,color:C.destructive}}>{ch.motivo_devolucao}</div>}</td>
        <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
          {ch.status==="CARTEIRA"&&<><button onClick={()=>setModalComp(ch)} title="Compensar" style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.success}}><CheckCircle size={16}/></button>
          <button onClick={()=>setModalDev(ch)} title="Devolver" style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.destructive}}><XCircle size={16}/></button></>}
        </td>
      </tr>;})}</tbody></table></div></div>}

    {modalNovo&&<Ov onClose={()=>setModalNovo(false)}><MH onClose={()=>setModalNovo(false)}>Novo Cheque</MH><MB><ChequeForm onSalvar={handleSalvar} onClose={()=>setModalNovo(false)}/></MB></Ov>}
    {modalComp&&<Ov onClose={()=>setModalComp(null)}><MH onClose={()=>setModalComp(null)}>Compensar Cheque #{modalComp.numero}</MH><MB><CompForm cheque={modalComp} contas={contas} onComp={handleCompensar} onClose={()=>setModalComp(null)}/></MB></Ov>}
    {modalDev&&<Ov onClose={()=>setModalDev(null)}><MH onClose={()=>setModalDev(null)}>Devolver Cheque #{modalDev.numero}</MH><MB><DevForm cheque={modalDev} onDev={handleDevolver} onClose={()=>setModalDev(null)}/></MB></Ov>}
  </div>;
}

function ChequeForm({onSalvar,onClose}){
  const[f,sF]=useState({tipo:"RECEBIDO",banco:"",agencia:"",conta:"",numero:"",valor:"",data_emissao:"",data_bom_para:"",id_cliente:"",id_titulo:"",obs:""});const s=(k,v)=>sF(p=>({...p,[k]:v}));
  return<><F label="Tipo" req><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={inp}><option value="RECEBIDO">Recebido</option><option value="EMITIDO">Emitido</option></select></F>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><F label="Banco"><input value={f.banco} onChange={e=>s("banco",e.target.value)} style={inp}/></F><F label="Agência"><input value={f.agencia} onChange={e=>s("agencia",e.target.value)} style={inp}/></F><F label="Conta"><input value={f.conta} onChange={e=>s("conta",e.target.value)} style={inp}/></F></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><F label="Nº Cheque" req><input value={f.numero} onChange={e=>s("numero",e.target.value)} style={inp}/></F><F label="Valor" req><input type="number" step="0.01" value={f.valor} onChange={e=>s("valor",e.target.value)} style={inp}/></F></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><F label="Data Emissão"><input type="date" value={f.data_emissao} onChange={e=>s("data_emissao",e.target.value)} style={inp}/></F><F label="Bom Para"><input type="date" value={f.data_bom_para} onChange={e=>s("data_bom_para",e.target.value)} style={inp}/></F></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><F label="ID Cliente"><input type="number" value={f.id_cliente} onChange={e=>s("id_cliente",e.target.value)} style={inp}/></F><F label="ID Título"><input type="number" value={f.id_titulo} onChange={e=>s("id_titulo",e.target.value)} style={inp}/></F></div>
  <F label="Observação"><input value={f.obs} onChange={e=>s("obs",e.target.value)} style={inp}/></F>
  <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onSalvar(f)} style={bp} disabled={!f.numero||!f.valor}>Salvar</button></div></>;
}

function CompForm({cheque,contas,onComp,onClose}){const[f,sF]=useState({id_cheque:cheque.id,id_conta:"",data:new Date().toISOString().substring(0,10)});const s=(k,v)=>sF(p=>({...p,[k]:v}));
return<><div style={{background:C.surface2,borderRadius:8,padding:12,marginBottom:16,fontSize:13}}><b>Cheque:</b> {cheque.numero} — {fmtBRL(cheque.valor)}</div>
<F label="Conta Financeira" req><select value={f.id_conta} onChange={e=>s("id_conta",e.target.value)} style={inp}><option value="">Selecione...</option>{contas.filter(c=>c.ativo).map(c=><option key={c.id} value={c.id}>{c.descricao} ({fmtBRL(c.saldo_atual)})</option>)}</select></F>
<F label="Data Compensação"><input type="date" value={f.data} onChange={e=>s("data",e.target.value)} style={inp}/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onComp(f)} style={bp} disabled={!f.id_conta}>Compensar</button></div></>;}

function DevForm({cheque,onDev,onClose}){const[f,sF]=useState({id_cheque:cheque.id,motivo:""});
return<><div style={{background:C.destructiveBg,borderRadius:8,padding:12,marginBottom:16,fontSize:13,color:C.destructive}}><b>Atenção:</b> devolver o cheque {cheque.numero} vai estornar a baixa do título vinculado (se houver).</div>
<F label="Motivo da Devolução" req><input value={f.motivo} onChange={e=>sF(p=>({...p,motivo:e.target.value}))} style={inp} placeholder="Ex: Conta sem fundos"/></F>
<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onDev(f)} style={{...bp,background:C.destructive}} disabled={!f.motivo}>Devolver</button></div></>;}
