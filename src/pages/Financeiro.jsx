/**
 * ERP Bononi — Módulo Financeiro (Container)
 * Abas: Receber | Pagar | Contas | Caixa | Cheques | Plano de Contas | Centros de Custo
 */
import { useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, Landmark, DollarSign, FileCheck2,
  FolderTree, Building,
} from "lucide-react";
import { C } from "../config";
import ContasReceber from "./financeiro/ContasReceber";
import ContasPagar from "./financeiro/ContasPagar";
import ContasFinanceiras from "./financeiro/ContasFinanceiras";
import Caixa from "./financeiro/Caixa";
import Cheques from "./financeiro/Cheques";
import PlanoContas from "./financeiro/PlanoContas";
import CentrosCusto from "./financeiro/CentrosCusto";

const ABAS = [
  { key: "receber", label: "Receber", icon: ArrowDownCircle },
  { key: "pagar", label: "Pagar", icon: ArrowUpCircle },
  { key: "contas", label: "Contas", icon: Landmark },
  { key: "caixa", label: "Caixa", icon: DollarSign },
  { key: "cheques", label: "Cheques", icon: FileCheck2 },
  { key: "plano", label: "Plano de Contas", icon: FolderTree },
  { key: "centros", label: "Centros de Custo", icon: Building },
];

export default function Financeiro({ usuario }) {
  const [aba, setAba] = useState("receber");

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.foreground, margin: 0 }}>Financeiro</h1>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap", borderBottom: `2px solid ${C.border}`, paddingBottom: 0 }}>
        {ABAS.map(a => {
          const ativo = aba === a.key;
          return (
            <button key={a.key} onClick={() => setAba(a.key)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", fontSize: 13, fontWeight: ativo ? 600 : 400,
              color: ativo ? C.primary : C.muted,
              background: ativo ? C.bluePale : "transparent",
              border: "none", borderBottom: ativo ? `2px solid ${C.primary}` : "2px solid transparent",
              borderRadius: "8px 8px 0 0", cursor: "pointer",
              marginBottom: -2, transition: "all 0.15s",
            }}>
              <a.icon size={15} /> {a.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      {aba === "receber" && <ContasReceber usuario={usuario} />}
      {aba === "pagar" && <ContasPagar usuario={usuario} />}
      {aba === "contas" && <ContasFinanceiras usuario={usuario} />}
      {aba === "caixa" && <Caixa usuario={usuario} />}
      {aba === "cheques" && <Cheques usuario={usuario} />}
      {aba === "plano" && <PlanoContas usuario={usuario} />}
      {aba === "centros" && <CentrosCusto usuario={usuario} />}
    </div>
  );
}
