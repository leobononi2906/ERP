import { useState, useEffect } from "react";
import { C } from "./config";

// Hub de abas reutilizável. tabs: [{ key, label, icon?, render: () => JSX }]
// keys=true habilita Alt+←→ e Alt+1..9 para trocar de aba (não conflita com as
// setas puras das telas operacionais internas). Use keys=false em sub-abas aninhadas.
export function TabHub({ tabs = [], keys = true, dica = true }) {
  const lista = tabs.filter(Boolean);
  const [ativa, setAtiva] = useState(lista[0]?.key);

  useEffect(() => {
    if (!keys) return;
    function onKey(e) {
      if (!e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = Math.max(0, lista.findIndex((t) => t.key === ativa));
        const ni = e.key === "ArrowRight" ? Math.min(lista.length - 1, idx + 1) : Math.max(0, idx - 1);
        setAtiva(lista[ni]?.key);
      } else if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (lista[n]) { e.preventDefault(); setAtiva(lista[n].key); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ativa, lista, keys]);

  const atual = lista.find((t) => t.key === ativa) || lista[0];

  return (
    <div>
      <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {lista.map((t) => {
          const on = (atual?.key) === t.key;
          return (
            <button key={t.key} onClick={() => setAtiva(t.key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600,
              border: "none", background: "transparent", cursor: "pointer",
              color: on ? C.primary : C.muted,
              borderBottom: on ? `2px solid ${C.primary}` : "2px solid transparent", marginBottom: -2,
            }}>
              {t.icon && <t.icon size={15} />}{t.label}
            </button>
          );
        })}
        {keys && dica && <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted, alignSelf: "center", paddingRight: 4 }}>Alt + ← → ou Alt + nº troca de aba</span>}
      </div>
      <div>{atual && atual.render()}</div>
    </div>
  );
}
