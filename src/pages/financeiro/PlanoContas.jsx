import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderTree, Plus } from "lucide-react";
import { C, rpc } from "../../config";
const inp={width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit"};
const bp={padding:"8px 16px",fontSize:13,fontWeight:600,color:"#fff",background:C.primary,border:"none",borderRadius:8,cursor:"pointer"};
const bs={...bp,background:"#fff",color:C.foreground,border:`1px solid ${C.border}`};
function Ov({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:480,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div></div>;}
function MH({children,onClose}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:700}}>{children}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button></div>;}
function MB({children}){return<div style={{padding:20}}>{children}</div>;}
function F({label,req,children}){return<div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;}

export default function PlanoContas({usuario}){
  const[contas,setContas]=useState([]);const[loading,setLoading]=useState(true);
  const[exp,setExp]=useState(new Set(["1","2","3"]));
  const[modalNovo,setModalNovo]=useState(false);const[toast,setToast]=useState("");
  const carregar=()=>{setLoading(true);rpc("erp_plano_contas_listar",{}).then(r=>setContas(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false));};
  useEffect(()=>{carregar();},[]);
  const toggle=(cod)=>setExp(p=>{const n=new Set(p);n.has(cod)?n.delete(cod):n.add(cod);return n;});
  const filhosDe=(idPai)=>contas.filter(i=>i.id_pai===idPai);
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3000);};
  const pf=(usuario&&usuario.permissoes&&usuario.permissoes.financeiro)||{};const gestor=pf.incluir;

  const handleSalvar=async(f)=>{try{const r=await rpc("erp_plano_conta_salvar",{p_codigo:f.codigo,p_descricao:f.descricao,p_tipo:f.tipo,p_natureza:f.natureza,p_id_pai:parseInt(f.id_pai)||null,p_aceita_lancamento:f.aceita_lancamento,p_ativo:true,p_id_usuario:null});if(r?.ok){show("Conta criada");setModalNovo(false);carregar();}else show(r?.erro||"Erro");}catch(e){show(e.message);}};

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
    {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>{toast}</div>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><FolderTree size={18} color={C.primary}/><span style={{fontSize:13,color:C.textMuted}}>{contas.length} contas</span></div>
      {gestor&&<button onClick={()=>setModalNovo(true)} style={bp}><Plus size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Nova Conta</button>}
    </div>
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:contas.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Vazio.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Código","Descrição","Tipo","Natureza","Lançamento"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{contas.filter(i=>!i.id_pai).flatMap(r=>renderNivel(r,0))}</tbody></table></div></div>}

    {modalNovo&&<Ov onClose={()=>setModalNovo(false)}><MH onClose={()=>setModalNovo(false)}>Nova Conta Contábil</MH><MB>
      <PlanoForm contas={contas} onSalvar={handleSalvar} onClose={()=>setModalNovo(false)}/>
    </MB></Ov>}
  </div>;
}

function PlanoForm({contas,onSalvar,onClose}){
  const[f,sF]=useState({codigo:"",descricao:"",tipo:"RECEITA",natureza:"C",id_pai:"",aceita_lancamento:true});const s=(k,v)=>sF(p=>({...p,[k]:v}));
  const pais=contas.filter(c=>!c.aceita_lancamento||contas.filter(x=>x.id_pai===c.id).length>0||!contas.some(x=>x.id_pai===c.id));
  return<><div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
    <F label="Código" req><input value={f.codigo} onChange={e=>s("codigo",e.target.value)} style={inp} placeholder="Ex: 1.1.4"/></F>
    <F label="Descrição" req><input value={f.descricao} onChange={e=>s("descricao",e.target.value)} style={inp}/></F>
  </div>
  <F label="Conta Pai"><select value={f.id_pai} onChange={e=>s("id_pai",e.target.value)} style={inp}><option value="">Raiz (nível 1)</option>{contas.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.descricao}</option>)}</select></F>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
    <F label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={inp}><option value="RECEITA">Receita</option><option value="DESPESA">Despesa</option><option value="NEUTRO">Neutro</option><option value="ATIVO">Ativo</option><option value="PASSIVO">Passivo</option></select></F>
    <F label="Natureza"><select value={f.natureza} onChange={e=>s("natureza",e.target.value)} style={inp}><option value="C">Crédito (C)</option><option value="D">Débito (D)</option><option value="DC">Ambos (DC)</option></select></F>
  </div>
  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:12}}><input type="checkbox" checked={f.aceita_lancamento} onChange={e=>s("aceita_lancamento",e.target.checked)}/>Aceita lançamento (conta folha)</label>
  <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onSalvar(f)} style={bp} disabled={!f.codigo||!f.descricao}>Salvar</button></div></>;
}
