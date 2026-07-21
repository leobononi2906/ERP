import { useState, useEffect } from "react";
import { Building } from "lucide-react";
import { C, rpc } from "../../config";

export default function CentrosCusto({simGrupo}){
  const[centros,setCentros]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{rpc("erp_centros_custo_listar",{}).then(r=>setCentros(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));},[]);
  return<div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Building size={18} color={C.primary}/><span style={{fontSize:13,color:C.textMuted}}>{centros.length} centros</span></div>
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:centros.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Nenhum centro.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Código","Descrição","Escopo","Status"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{centros.map(c=><tr key={c.id} style={{borderBottom:`1px solid ${C.border}`}}>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace",fontWeight:500}}>{c.codigo}</td>
        <td style={{padding:"10px 12px"}}>{c.descricao}</td>
        <td style={{padding:"10px 12px",fontSize:12}}>{c.id_empresa?`Empresa #${c.id_empresa}`:<span style={{color:C.primary,fontWeight:600}}>Global</span>}</td>
        <td style={{padding:"10px 12px"}}><span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:c.ativo?C.successBg:C.surface2,color:c.ativo?C.success:C.muted}}>{c.ativo?"Ativo":"Inativo"}</span></td>
      </tr>)}</tbody></table></div></div>}
  </div>;
}
