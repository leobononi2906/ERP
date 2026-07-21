import { useState, useEffect, useMemo } from "react";
import { C, rpc, fmtBRL } from "../../config";
const fmtData=(d)=>{if(!d)return"—";const[y,m,dd]=String(d).substring(0,10).split("-");return`${dd}/${m}/${y}`;};
const inp={width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit"};
const SB={CARTEIRA:{l:"Em Carteira",bg:C.bluePale,fg:C.blueMid},COMPENSADO:{l:"Compensado",bg:C.successBg,fg:C.success},DEVOLVIDO:{l:"Devolvido",bg:C.destructiveBg,fg:C.destructive},REPASSADO:{l:"Repassado",bg:"#FFF3E0",fg:C.warning}};

export default function Cheques({simGrupo}){
  const[cheques,setCheques]=useState([]);const[loading,setLoading]=useState(true);
  const[filtroTipo,setFiltroTipo]=useState("");const[filtroStatus,setFiltroStatus]=useState("");
  const carregar=()=>{setLoading(true);rpc("erp_cheques_listar",{p_id_empresa:null,p_tipo:filtroTipo||null,p_status:filtroStatus||null}).then(r=>setCheques(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{carregar();},[filtroTipo,filtroStatus]);
  const resumo=useMemo(()=>{let cart=0,dev=0;cheques.forEach(c=>{const v=Number(c.valor)||0;if(c.status==="CARTEIRA")cart+=v;if(c.status==="DEVOLVIDO")dev+=v;});return{cart,dev};},[cheques]);

  return<div>
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
        {["Tipo","Nº","Banco/Ag/Conta","Cliente","Valor","Bom Para","Status"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{cheques.map(ch=>{const b=SB[ch.status]||{l:ch.status,bg:C.surface2,fg:C.muted};return<tr key={ch.id} style={{borderBottom:`1px solid ${C.border}`}}>
        <td style={{padding:"10px 12px",fontWeight:600,color:ch.tipo==="RECEBIDO"?C.success:C.blueMid}}>{ch.tipo}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{ch.numero||"—"}</td>
        <td style={{padding:"10px 12px"}}>{ch.banco?`${ch.banco}/${ch.agencia}/${ch.conta}`:"—"}</td>
        <td style={{padding:"10px 12px",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.cliente_nome||"—"}</td>
        <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtBRL(ch.valor)}</td>
        <td style={{padding:"10px 12px",textAlign:"center"}}>{fmtData(ch.data_bom_para)}</td>
        <td style={{padding:"10px 12px",textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:b.bg,color:b.fg}}>{b.l}</span>{ch.motivo_devolucao&&<div style={{fontSize:10,color:C.destructive}}>{ch.motivo_devolucao}</div>}</td>
      </tr>;})}</tbody></table></div></div>}
  </div>;
}
