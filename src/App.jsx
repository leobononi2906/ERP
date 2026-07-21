import { useState } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingCart, Wrench, DollarSign, FileText,
  Building2, Eye, LogOut, Truck, ClipboardList, Settings, UserCog,
} from "lucide-react";
import { C } from "./config";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import OrdensServico from "./pages/OrdensServico";
import Veiculos from "./pages/Veiculos";
import Orcamentos from "./pages/Orcamentos";
import Vendas from "./pages/Vendas";
import TiposOperacao from "./pages/TiposOperacao";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
import Separacao from "./pages/Separacao";
import Administracao from "./pages/Administracao";

const MENU_FULL = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, ok: true },
  { key: "clientes", label: "Clientes", icon: Users, ok: true },
  { key: "produtos", label: "Produtos", icon: Package, ok: true },
  { key: "veiculos", label: "Veículos", icon: Truck, ok: true },
  { key: "orcamentos", label: "Orçamentos", icon: ClipboardList, ok: true },
  { key: "vendas", label: "Vendas", icon: ShoppingCart, ok: true },
  { key: "os", label: "Ordem de Serviço", icon: Wrench, ok: true },
  { key: "tipos_operacao", label: "Tipos de Operação", icon: Settings, ok: true, grupo: "Cadastros" },
  { key: "estoque", label: "Estoque", icon: Package, ok: true },
  { key: "separacao", label: "Separação", icon: Package, ok: true },
  { key: "financeiro", label: "Financeiro", icon: DollarSign, ok: true },
  { key: "fiscal", label: "Fiscal", icon: FileText },
  { key: "admin", label: "Administração", icon: UserCog, ok: true, grupo: "Sistema" },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [pagina, setPagina] = useState("dashboard");

  if (!usuario) return <Login onLogin={setUsuario} />;

  const perms = usuario.permissoes || {};
  const MENU = MENU_FULL.filter((m) => {
    if (!m.ok) return true; // mostra "em breve"
    const p = perms[m.key];
    return p && p.visualizar;
  });

  let lastGrupo = null;

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
          let grupoLabel = null;
          if (m.grupo && m.grupo !== lastGrupo) {
            lastGrupo = m.grupo;
            grupoLabel = <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "14px 8px 6px" }}>{m.grupo}</div>;
          }
          return (
            <div key={m.key}>
              {grupoLabel}
              <div onClick={() => m.ok && setPagina(m.key)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2,
                cursor: m.ok ? "pointer" : "default", opacity: m.ok ? 1 : 0.45,
                background: ativo ? "rgba(0,170,238,0.18)" : "transparent",
                borderLeft: ativo ? `3px solid ${C.blueLight}` : "3px solid transparent",
                color: ativo ? C.blueLight : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: ativo ? 600 : 400,
              }}>
                <m.icon size={17} /> {m.label}{!m.ok && <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>em breve</span>}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 4, padding: "0 6px" }}>
            {(usuario.grupos || []).map((g) => g.nome).join(", ") || "Sem grupo"}
          </div>
          <div onClick={() => setUsuario(null)} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}>
            <LogOut size={16} /> Sair ({usuario.nome})
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 20 }}>
        {pagina === "dashboard" && <Dashboard />}
        {pagina === "clientes" && <Clientes usuario={usuario} />}
        {pagina === "produtos" && <Produtos usuario={usuario} />}
        {pagina === "veiculos" && <Veiculos usuario={usuario} />}
        {pagina === "orcamentos" && <Orcamentos usuario={usuario} />}
        {pagina === "vendas" && <Vendas usuario={usuario} />}
        {pagina === "os" && <OrdensServico usuario={usuario} />}
        {pagina === "tipos_operacao" && <TiposOperacao usuario={usuario} />}
        {pagina === "estoque" && <Estoque usuario={usuario} />}
        {pagina === "separacao" && <Separacao usuario={usuario} />}
        {pagina === "financeiro" && <Financeiro usuario={usuario} />}
        {pagina === "admin" && <Administracao usuario={usuario} />}
        {!["dashboard", "clientes", "produtos", "veiculos", "orcamentos", "vendas", "os", "tipos_operacao", "estoque", "separacao", "financeiro", "admin"].includes(pagina) && (
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
