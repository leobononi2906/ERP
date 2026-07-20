import { useState } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingCart, Wrench, DollarSign, FileText,
  Building2, Eye, LogOut,
} from "lucide-react";
import { C } from "./config";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import OrdensServico from "./pages/OrdensServico";

const GRUPOS_DEMO = ["Administrador", "Gestor", "Vendedor Loja", "Estoque", "Financeiro"];

const MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, ok: true },
  { key: "clientes", label: "Clientes", icon: Users, ok: true },
  { key: "produtos", label: "Produtos", icon: Package, ok: true },
  { key: "vendas", label: "Vendas", icon: ShoppingCart },
  { key: "os", label: "Ordem de Serviço", icon: Wrench, ok: true },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "fiscal", label: "Fiscal", icon: FileText },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [pagina, setPagina] = useState("dashboard");
  const [simGrupo, setSimGrupo] = useState("Administrador");

  if (!usuario) return <Login onLogin={setUsuario} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.background, color: C.foreground }}>
      <aside style={{ width: 212, background: C.sidebar, flexShrink: 0, padding: "20px 12px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={18} color="#fff" /></div>
          <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>Bononi</div><div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>ERP</div></div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 8px 6px" }}>Menu</div>
        {MENU.map((m) => {
          const ativo = pagina === m.key;
          return (
            <div key={m.key} onClick={() => m.ok && setPagina(m.key)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2,
              cursor: m.ok ? "pointer" : "default", opacity: m.ok ? 1 : 0.45,
              background: ativo ? "rgba(0,170,238,0.18)" : "transparent",
              borderLeft: ativo ? `3px solid ${C.blueLight}` : "3px solid transparent",
              color: ativo ? C.blueLight : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: ativo ? 600 : 400,
            }}>
              <m.icon size={17} /> {m.label}{!m.ok && <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>em breve</span>}
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Eye size={12} /> Simular grupo (demo)</div>
          <select value={simGrupo} onChange={(e) => setSimGrupo(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, padding: "7px 8px", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
            {GRUPOS_DEMO.map((g) => <option key={g} value={g} style={{ color: "#000" }}>{g}</option>)}
          </select>
          <div onClick={() => setUsuario(null)} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}>
            <LogOut size={16} /> Sair ({usuario.nome})
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 20 }}>
        {pagina === "dashboard" && <Dashboard />}
        {pagina === "clientes" && <Clientes simGrupo={simGrupo} />}
        {pagina === "produtos" && <Produtos simGrupo={simGrupo} />}
        {pagina === "os" && <OrdensServico simGrupo={simGrupo} />}
        {!["dashboard", "clientes", "produtos", "os"].includes(pagina) && (
          <div style={{ textAlign: "center", padding: "80px 0", color: C.textMuted }}>
            <Package size={36} style={{ opacity: 0.4 }} />
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Módulo em construção</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Este módulo será desenvolvido nas próximas etapas.</div>
          </div>
        )}
      </main>
    </div>
  );
}
