// Empresa ativa global (seletor no topo). "" = Todas.
// Persistida em localStorage e propagada por evento para todas as telas.
import { useState, useEffect } from "react";

const KEY = "erp_empresa_ativa";
let _emp = "";
try { _emp = localStorage.getItem(KEY) || ""; } catch { /* ignore */ }

export function getEmpresaAtiva() { return _emp; }

export function setEmpresaAtiva(v) {
  _emp = v ? String(v) : "";
  try { localStorage.setItem(KEY, _emp); } catch { /* ignore */ }
  window.dispatchEvent(new Event("erp-empresa"));
}

// Hook: retorna a empresa ativa como número (id) ou null quando "Todas".
export function useEmpresaAtiva() {
  const [emp, setEmp] = useState(_emp);
  useEffect(() => {
    const h = () => setEmp(_emp);
    window.addEventListener("erp-empresa", h);
    return () => window.removeEventListener("erp-empresa", h);
  }, []);
  return emp ? Number(emp) : null;
}
