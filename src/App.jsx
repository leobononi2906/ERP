import { useState } from "react";
import {
  LayoutDashboard, Users, Package, ShoppingCart, Wrench, DollarSign, FileText,
  Building2, LogOut, Truck, ClipboardList, Settings, UserCog, ChevronDown, ChevronRight,
  Boxes, PackageOpen,
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
import DistribuicaoServicos from "./pages/DistribuicaoServicos";
import Servicos from "./pages/Servicos";
import PrecosEspeciais from "./pages/PrecosEspeciais";
import Encomendas from "./pages/Encomendas";
import Promocoes from "./pages/Promocoes";

const MENU_GROUPS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, ok: true, standalone: true },
  {
    groupKey: "comercial", label: "Comercial", icon: ShoppingCart,
    items: [
      { key: "orcamentos", label: "Orçamentos", icon: ClipboardList, ok: true },
      { key: "vendas", label: "Vendas", icon: ShoppingCart, ok: true },
      { key: "os", label: "Ordem de Serviço", icon: Wrench, ok: true },
      { key: "distribuicao_os", label: "Distribuição OS", icon: Users, ok: true, permKey: "os" },
      { key: "encomendas", label: "Encomendas", icon: PackageOpen, ok: true, permKey: "vendas" },
      { key: "promocoes", label: "Promoções", icon: DollarSign, ok: true, permKey: "vendas" },
    ],
  },
  {
    groupKey: "cadastros", label: "Cadastros", icon: FileText,
    items: [
      { key: "clientes", label: "Clientes", icon: Users, ok: true },
      { key: "produtos", label: "Produtos", icon: Package, ok: true },
      { key: "veiculos", label: "Veículos", icon: Truck, ok: true },
      { key: "tipos_operacao", label: "Tipos de Operação", icon: Settings, ok: true },
      { key: "servicos", label: "Serviços", icon: Wrench, ok: true, permKey: "produtos" },
      { key: "precos_especiais", label: "Preços Especiais", icon: DollarSign, ok: true, permKey: "produtos" },
    ],
  },
  {
    groupKey: "estoque_g", label: "Estoque", icon: Boxes,
    items: [
      { key: "estoque", label: "Estoque", icon: Package, ok: true },
      { key: "separacao", label: "Separação", icon: PackageOpen, ok: true },
    ],
  },
  {
    groupKey: "financeiro_g", label: "Financeiro", icon: DollarSign,
    items: [
      { key: "financeiro", label: "Financeiro", icon: DollarSign, ok: true },
      { key: "fiscal", label: "Fiscal", icon: FileText },
    ],
  },
  {
    groupKey: "sistema", label: "Sistema", icon: UserCog,
    items: [
      { key: "admin", label: "Administração", icon: UserCog, ok: true },
    ],
  },
];

function MenuItem({ m, pagina, setPagina }) {
  const ativo = pagina === m.key;
  return (
    <div onClick={() => m.ok && setPagina(m.key)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 28px", borderRadius: 8, marginBottom: 1,
      cursor: m.ok ? "pointer" : "default", opacity: m.ok ? 1 : 0.4,
      background: ativo ? "rgba(0,170,238,0.18)" : "transparent",
      borderLeft: ativo ? `3px solid ${C.blueLight}` : "3px solid transparent",
      color: ativo ? C.blueLight : "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: ativo ? 600 : 400,
    }}>
      <m.icon size={15} /> {m.label}
      {!m.ok && <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>em breve</span>}
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [pagina, setPagina] = useState("dashboard");
  const [gruposAbertos, setGruposAbertos] = useState({ comercial: true });

  if (!usuario) return <Login onLogin={setUsuario} />;

  const perms = usuario.permissoes || {};

  const itemVisivel = (m) => {
    if (!m.ok) return true;
    const pk = m.permKey || m.key;
    const p = perms[pk];
    return p && p.visualizar;
  };

  const toggleGrupo = (gk) => setGruposAbertos((g) => ({ ...g, [gk]: !g[gk] }));

  // Auto-abrir grupo da página ativa
  const grupoAtivo = MENU_GROUPS.find(g => g.items && g.items.some(m => m.key === pagina));
  if (grupoAtivo && !gruposAbertos[grupoAtivo.groupKey]) {
    gruposAbertos[grupoAtivo.groupKey] = true;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.background, color: C.foreground }}>
      <aside style={{ width: 220, background: C.sidebar, flexShrink: 0, padding: "20px 12px", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>Bononi</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>ERP</div>
          </div>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1 }}>
          {MENU_GROUPS.map((entry) => {
            // Standalone item (Dashboard)
            if (entry.standalone) {
              if (!itemVisivel(entry)) return null;
              const ativo = pagina === entry.key;
              return (
                <div key={entry.key} onClick={() => entry.ok && setPagina(entry.key)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 4,
                  cursor: "pointer",
                  background: ativo ? "rgba(0,170,238,0.18)" : "transparent",
                  borderLeft: ativo ? `3px solid ${C.blueLight}` : "3px solid transparent",
                  color: ativo ? C.blueLight : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: ativo ? 600 : 400,
                }}>
                  <entry.icon size={17} /> {entry.label}
                </div>
              );
            }

            // Group with items
            const visibleItems = entry.items.filter(itemVisivel);
            if (visibleItems.length === 0) return null;

            const aberto = !!gruposAbertos[entry.groupKey];
            const temAtivo = entry.items.some(m => m.key === pagina);
            const Chevron = aberto ? ChevronDown : ChevronRight;

            return (
              <div key={entry.groupKey} style={{ marginBottom: 2 }}>
                <div onClick={() => toggleGrupo(entry.groupKey)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8,
                  cursor: "pointer", userSelect: "none",
                  color: temAtivo ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  <entry.icon size={15} />
                  <span style={{ flex: 1 }}>{entry.label}</span>
                  <Chevron size={14} style={{ opacity: 0.5 }} />
                </div>
                {aberto && visibleItems.map((m) => (
                  <MenuItem key={m.key} m={m} pagina={pagina} setPagina={setPagina} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
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
        {pagina === "distribuicao_os" && <DistribuicaoServicos usuario={usuario} />}
        {pagina === "tipos_operacao" && <TiposOperacao usuario={usuario} />}
        {pagina === "estoque" && <Estoque usuario={usuario} />}
        {pagina === "separacao" && <Separacao usuario={usuario} />}
        {pagina === "financeiro" && <Financeiro usuario={usuario} />}
        {pagina === "servicos" && <Servicos usuario={usuario} />}
        {pagina === "precos_especiais" && <PrecosEspeciais usuario={usuario} />}
        {pagina === "encomendas" && <Encomendas usuario={usuario} />}
        {pagina === "promocoes" && <Promocoes usuario={usuario} />}
        {pagina === "admin" && <Administracao usuario={usuario} />}
        {!["dashboard", "clientes", "produtos", "veiculos", "orcamentos", "vendas", "os", "distribuicao_os", "tipos_operacao", "servicos", "estoque", "separacao", "financeiro", "precos_especiais", "encomendas", "promocoes", "admin"].includes(pagina) && (
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
