import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { C, rpc } from "../../config";

export default function PlanoContas({simGrupo}){
  const[contas,setContas]=useState([]);const[loading,setLoading]=useState(true);
  const[exp,setExp]=useState(new Set(["1","2","3"]));
  useEffect(()=>{rpc("erp_plano_contas_listar",{}).then(r=>setContas(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));},[]);
  const toggle=(cod)=>setExp(p=>{const n=new Set(p);n.has(cod)?n.delete(cod):n.add(cod);return n;});
  const items=contas;const filhosDe=(idPai)=>items.filter(i=>i.id_pai===idPai);

  const renderNivel=(item,depth=0)=>{const filhos=filhosDe(item.id);const tem=filhos.length>0;const ab=exp.has(item.codigo);
    return[<tr key={item.id} style={{background:depth===0?C.surface2:"#fff",borderBottom:`1px solid ${C.border}`}}>
      <td style={{padding:"8px 12px",paddingLeft:12+depth*24,whiteSpace:"nowrap"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
          {tem?<span onClick={()=>toggle(item.codigo)} style={{cursor:"pointer",display:"inline-flex"}}>{ab?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</span>:<span style={{width:19}}/>}
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:depth===0?700:400}}>{item.codigo}</span>
        </span>
      </td>
      <td style={{padding:"8px 12px",fontWeight:depth===0?600:400}}>{item.descricao}</td>
      <td style={{padding:"8px 12px",textAlign:"center",fontSize:11}}>{item.tipo}</td>
      <td style={{padding:"8px 12px",textAlign:"center",fontSize:11}}>{item.natureza}</td>
      <td style={{padding:"8px 12px",textAlign:"center"}}><span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:item.aceita_lancamento?C.successBg:C.surface2,color:item.aceita_lancamento?C.success:C.muted}}>{item.aceita_lancamento?"Sim":"Grupo"}</span></td>
    </tr>,...(tem&&ab?filhos.flatMap(f=>renderNivel(f,depth+1)):[])];
  };

  return<div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><FolderTree size={18} color={C.primary}/><span style={{fontSize:13,color:C.textMuted}}>{contas.length} contas</span></div>
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:contas.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Vazio.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Código","Descrição","Tipo","Natureza","Lançamento"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{items.filter(i=>!i.id_pai).flatMap(r=>renderNivel(r,0))}</tbody></table></div></div>}
  </div>;
}
