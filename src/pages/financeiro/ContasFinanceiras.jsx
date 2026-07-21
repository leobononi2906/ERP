import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, ArrowRightLeft, FileText } from "lucide-react";
import { C, rpc, fmtBRL } from "../../config";

const fmtData = (d) => { if (!d) return "—"; const [y,m,dd] = String(d).substring(0,10).split("-"); return `${dd}/${m}/${y}`; };
const inp = { width:"100%",padding:"8px 10px",fontSize:13,border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",fontFamily:"inherit" };
const bp = { padding:"8px 16px",fontSize:13,fontWeight:600,color:"#fff",background:C.primary,border:"none",borderRadius:8,cursor:"pointer" };
const bs = { ...bp,background:"#fff",color:C.foreground,border:`1px solid ${C.border}` };
function Ov({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:520,width:"95%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>{children}</div></div>;}
function MH({children,onClose}){return<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:15,fontWeight:700}}>{children}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.muted}}>✕</button></div>;}
function MB({children}){return<div style={{padding:20}}>{children}</div>;}
function F({label,req,children}){return<div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.textMuted,marginBottom:4}}>{label}{req&&<span style={{color:C.destructive}}> *</span>}</label>{children}</div>;}

export default function ContasFinanceiras({ simGrupo }) {
  const [contas, setContas] = useState([]); const [loading, setLoading] = useState(true);
  const [modalNova, setModalNova] = useState(false); const [modalEditar, setModalEditar] = useState(null);
  const [modalExtrato, setModalExtrato] = useState(null); const [modalTransf, setModalTransf] = useState(false);
  const [toast, setToast] = useState("");

  const carregar = () => { setLoading(true); rpc("erp_contas_financeiras_listar",{}).then(r=>setContas(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{carregar();},[]);

  const saldoTotal = useMemo(()=>contas.filter(c=>c.ativo).reduce((s,c)=>s+(Number(c.saldo_atual)||0),0),[contas]);
  const show = (m)=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const handleSalvar = async (f) => {
    try { const r = await rpc("erp_conta_financeira_salvar",{p_id:f.id||null,p_descricao:f.descricao,p_tipo:f.tipo,p_id_empresa:null,p_banco:f.banco||null,p_agencia:f.agencia||null,p_conta:f.conta||null,p_digito:f.digito||null,p_saldo_inicial:parseFloat(f.saldo_inicial)||0,p_principal:f.principal,p_ativo:f.ativo});
    if(r?.ok){show(f.id?"Atualizada":"Criada");setModalNova(false);setModalEditar(null);carregar();}else show(r?.erro||"Erro");} catch(e){show(e.message);}
  };
  const handleTransf = async (f) => {
    try { const r = await rpc("erp_transferir_contas",{p_id_empresa:null,p_id_conta_origem:parseInt(f.orig),p_id_conta_destino:parseInt(f.dest),p_valor:parseFloat(f.valor),p_data:f.data||new Date().toISOString().substring(0,10),p_descricao:f.desc||"Transferência",p_id_usuario:null});
    if(r?.ok){show("Transferência realizada");setModalTransf(false);carregar();}else show(r?.erro||"Erro");} catch(e){show(e.message);}
  };

  return <div>
    {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:100,padding:"10px 18px",borderRadius:8,background:C.successBg,color:C.success,fontSize:13,fontWeight:600,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>{toast}</div>}
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <button onClick={()=>setModalTransf(true)} style={bs}><ArrowRightLeft size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Transferir</button>
      <button onClick={()=>setModalNova(true)} style={bp}><Plus size={14} style={{marginRight:4,verticalAlign:"middle"}}/>Nova Conta</button>
    </div>
    <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
      <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:C.textMuted,marginBottom:4}}>Saldo Total (Ativas)</div>
      <div style={{fontSize:26,fontWeight:700,fontFamily:"'DM Mono',monospace",color:C.primary}}>{fmtBRL(saldoTotal)}</div>
    </div>
    {loading?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Carregando...</div>:contas.length===0?<div style={{textAlign:"center",padding:40,color:C.textMuted}}>Nenhuma conta.</div>:
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}><div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:C.surface2,borderBottom:`1px solid ${C.border}`}}>
        {["Descrição","Tipo","Banco","Ag/Conta","Saldo Atual","Status","Ações"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",color:C.muted}}>{h}</th>)}
      </tr></thead><tbody>{contas.map(c=><tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,opacity:c.ativo?1:0.5}}>
        <td style={{padding:"10px 12px",fontWeight:500}}>{c.descricao}{c.principal&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:C.primary}}>★</span>}</td>
        <td style={{padding:"10px 12px"}}>{c.tipo}</td>
        <td style={{padding:"10px 12px"}}>{c.banco||"—"}</td>
        <td style={{padding:"10px 12px",fontFamily:"'DM Mono',monospace"}}>{c.agencia?`${c.agencia}/${c.conta}-${c.digito}`:"—"}</td>
        <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,color:Number(c.saldo_atual)<0?C.destructive:C.foreground}}>{fmtBRL(c.saldo_atual)}</td>
        <td style={{padding:"10px 12px"}}><span style={{padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:c.ativo?C.successBg:C.surface2,color:c.ativo?C.success:C.muted}}>{c.ativo?"Ativa":"Inativa"}</span></td>
        <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
          <button onClick={()=>setModalExtrato(c)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.muted}}><FileText size={16}/></button>
          <button onClick={()=>setModalEditar(c)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.blueMid}}><Pencil size={16}/></button>
        </td>
      </tr>)}</tbody></table></div></div>}

    {(modalNova||modalEditar)&&<Ov onClose={()=>{setModalNova(false);setModalEditar(null)}}><MH onClose={()=>{setModalNova(false);setModalEditar(null)}}>{modalEditar?"Editar Conta":"Nova Conta"}</MH><MB><ContaForm conta={modalEditar} onSalvar={handleSalvar} onClose={()=>{setModalNova(false);setModalEditar(null)}}/></MB></Ov>}
    {modalExtrato&&<Ov onClose={()=>setModalExtrato(null)}><MH onClose={()=>setModalExtrato(null)}>Extrato — {modalExtrato.descricao}</MH><MB><ExtratoView conta={modalExtrato}/></MB></Ov>}
    {modalTransf&&<Ov onClose={()=>setModalTransf(false)}><MH onClose={()=>setModalTransf(false)}>Transferência</MH><MB><TransfForm contas={contas.filter(c=>c.ativo)} onTransf={handleTransf} onClose={()=>setModalTransf(false)}/></MB></Ov>}
  </div>;
}

function ContaForm({conta,onSalvar,onClose}){
  const[f,sF]=useState({id:conta?.id||null,descricao:conta?.descricao||"",tipo:conta?.tipo||"CONTA_CORRENTE",banco:conta?.banco||"",agencia:conta?.agencia||"",conta:conta?.conta||"",digito:conta?.digito||"",saldo_inicial:conta?.saldo_inicial||0,principal:conta?.principal||false,ativo:conta?.ativo??true});
  const s=(k,v)=>sF(p=>({...p,[k]:v}));
  return<><F label="Descrição" req><input value={f.descricao} onChange={e=>s("descricao",e.target.value)} style={inp}/></F>
  <F label="Tipo"><select value={f.tipo} onChange={e=>s("tipo",e.target.value)} style={inp}><option value="CONTA_CORRENTE">Conta Corrente</option><option value="POUPANCA">Poupança</option><option value="CAIXA">Caixa Físico</option><option value="CARTEIRA">Carteira Digital</option></select></F>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}><F label="Banco"><input value={f.banco} onChange={e=>s("banco",e.target.value)} style={inp}/></F><F label="Agência"><input value={f.agencia} onChange={e=>s("agencia",e.target.value)} style={inp}/></F><F label="Conta"><input value={f.conta} onChange={e=>s("conta",e.target.value)} style={inp}/></F><F label="Dígito"><input value={f.digito} onChange={e=>s("digito",e.target.value)} style={inp}/></F></div>
  {!conta&&<F label="Saldo Inicial"><input type="number" step="0.01" value={f.saldo_inicial} onChange={e=>s("saldo_inicial",e.target.value)} style={inp}/></F>}
  <div style={{display:"flex",gap:16,marginBottom:12}}><label style={{fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={f.principal} onChange={e=>s("principal",e.target.checked)}/>Principal</label><label style={{fontSize:13,display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={f.ativo} onChange={e=>s("ativo",e.target.checked)}/>Ativa</label></div>
  <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onSalvar(f)} style={bp} disabled={!f.descricao}>Salvar</button></div></>;
}

function ExtratoView({conta}){
  const[mov,setMov]=useState([]);const[ld,setLd]=useState(true);const[di,setDi]=useState("");const[df,setDf]=useState("");
  const carregar=()=>{setLd(true);rpc("erp_extrato_conta",{p_id_conta:conta.id,p_data_ini:di||null,p_data_fim:df||null}).then(r=>setMov(Array.isArray(r)?r:[])).catch(()=>{}).finally(()=>setLd(false));};
  useEffect(()=>{carregar();},[di,df]);
  return<><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
    <input type="date" value={di} onChange={e=>setDi(e.target.value)} style={{...inp,width:"auto"}}/>
    <input type="date" value={df} onChange={e=>setDf(e.target.value)} style={{...inp,width:"auto"}}/>
    <span style={{fontSize:13,fontWeight:600,color:C.primary}}>Saldo: {fmtBRL(conta.saldo_atual)}</span>
  </div>
  {ld?<div style={{padding:20,textAlign:"center",color:C.textMuted}}>Carregando...</div>:mov.length===0?<div style={{padding:20,textAlign:"center",color:C.textMuted}}>Sem movimentos.</div>:
  <div style={{maxHeight:350,overflowY:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:C.surface2}}>
    {["Data","Tipo","Descrição","Valor","Saldo"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,position:"sticky",top:0,background:C.surface2}}>{h}</th>)}
  </tr></thead><tbody>{mov.map(m=><tr key={m.id} style={{borderBottom:`1px solid ${C.border}`,opacity:m.estornado?0.4:1}}>
    <td style={{padding:"7px 10px"}}>{fmtData(m.data_movimento)}</td>
    <td style={{padding:"7px 10px",color:m.tipo==="ENTRADA"?C.success:C.destructive,fontWeight:600}}>{m.tipo==="ENTRADA"?"+ Entrada":"- Saída"}</td>
    <td style={{padding:"7px 10px",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.descricao}</td>
    <td style={{padding:"7px 10px",fontFamily:"'DM Mono',monospace",color:m.tipo==="ENTRADA"?C.success:C.destructive}}>{fmtBRL(m.valor)}</td>
    <td style={{padding:"7px 10px",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtBRL(m.saldo_posterior)}</td>
  </tr>)}</tbody></table></div>}</>;
}

function TransfForm({contas,onTransf,onClose}){
  const[f,sF]=useState({orig:"",dest:"",valor:"",data:new Date().toISOString().substring(0,10),desc:""});const s=(k,v)=>sF(p=>({...p,[k]:v}));
  return<><F label="Conta Origem" req><select value={f.orig} onChange={e=>s("orig",e.target.value)} style={inp}><option value="">Selecione...</option>{contas.map(c=><option key={c.id} value={c.id}>{c.descricao} ({fmtBRL(c.saldo_atual)})</option>)}</select></F>
  <F label="Conta Destino" req><select value={f.dest} onChange={e=>s("dest",e.target.value)} style={inp}><option value="">Selecione...</option>{contas.filter(c=>String(c.id)!==f.orig).map(c=><option key={c.id} value={c.id}>{c.descricao} ({fmtBRL(c.saldo_atual)})</option>)}</select></F>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><F label="Valor" req><input type="number" step="0.01" value={f.valor} onChange={e=>s("valor",e.target.value)} style={inp}/></F><F label="Data"><input type="date" value={f.data} onChange={e=>s("data",e.target.value)} style={inp}/></F></div>
  <F label="Descrição"><input value={f.desc} onChange={e=>s("desc",e.target.value)} style={inp}/></F>
  <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}><button onClick={onClose} style={bs}>Cancelar</button><button onClick={()=>onTransf(f)} style={bp} disabled={!f.orig||!f.dest||!f.valor}>Transferir</button></div></>;
}
