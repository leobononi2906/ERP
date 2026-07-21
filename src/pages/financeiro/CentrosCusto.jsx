import { useState, useEffect } from "react";
import { Building, Plus } from "lucide-react";
import { C, rpc } from "../../config";
const inp={width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit"};
const bp={padding:"8px 16px",fontSize:13,fontWeight:600,color:"#fff",background:C.primary,border:"none",borderRadius:8,cursor:"pointer"};
const bs={...bp,background:"#fff",color:C.foreground,border:`1px solid ${C.border}`};
function Ov({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:420,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div></div>;}
function MH({children,onClose}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:700}}>{children}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button></div>;}
function MB({children}){return<div style={{padding:20}}>{children}</div>;}
function F({label,req,children}){return<div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;}

export default function CentrosCusto({simGrupo}){
  const[centros,setCentros]=useState([]);const[loading,setLoading]=useState(true);
  const[modalNovo,setModalNovo]=useState(false);const[toast,setToast]=useState("");
  const carregar=()=>{setLoading(true);rpc("erp_centros_custo_listar",{}).then(r=>setCentros(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{carregar();},[]);
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3000);};
  const gestor=!simGrupo||simGrupo==="Administrador"||simGrupo==="Gestor";

  const handleSalvar=async(f)=>{try{const r=await rpc("erp_centro_custo_salvar",{p_codigo:f.codigo,p_descricao:f.descricao,p_id_empresa:null,p_ativo:true,p_id_usuario:null});if(r?.ok){show("Centro criado");setModalNovo(false);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};

  return<div>
    {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>{toast}</div>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Building size={18} color={C.primary}/><span style={{fontSize:13,color:C.textMuted}}>{centros.length} centros</span></div>
      {gestor&&<button onClick={()=>setModalNovo(true)} style={bp}><Plus size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Novo Centro</button>}
    </div>
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

    {modalNovo&&<Ov onClose={()=>setModalNovo(false)}><MH onClose={()=>setModalNovo(false)}>Novo Centro de Custo</MH><MB>
      <div><F label="Código" req><input id="cc_cod" style={inp} placeholder="Ex: MARKETING"/></F>
      <F label="Descrição" req><input id="cc_desc" style={inp} placeholder="Ex: Marketing e Publicidade"/></F>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={()=>setModalNovo(false)} style={bs}>Cancelar</button>
      <button onClick={()=>{const cod=document.getElementById("cc_cod").value;const desc=document.getElementById("cc_desc").value;if(cod&&desc)handleSalvar({codigo:cod,descricao:desc});}} style={bp}>Salvar</button></div></div>
    </MB></Ov>}
  </div>;
}
