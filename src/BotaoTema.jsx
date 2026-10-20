import { useEffect, useRef } from "react";

// Botão claro/escuro/sistema do kit (public/bononi-tema.js). O script lê estas variáveis do
// container; aqui ficam ajustadas para a sidebar, que é escura nos dois temas.
export default function BotaoTema() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.firstChild) return;
    window.BnnTema?.botao(el);
  }, []);
  return (
    <span ref={ref} style={{
      display: "inline-flex",
      "--border-default": "rgba(255,255,255,0.25)", "--surface-card": "transparent",
      "--text-body": "rgba(255,255,255,0.8)", "--surface-hover": "rgba(255,255,255,0.12)",
    }} />
  );
}
