// Edge Function: buscar-placa
// Busca informações do veículo pela placa (marca, modelo, ano, cor)
//
// TODO: Definir provedor de API de placa (maioria é paga)
// Opções: placeapi.com, placa.info, etc.
// Requere: PLACA_API_KEY e PLACA_API_BASE_URL em variáveis de ambiente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PLACA_API_BASE_URL = Deno.env.get("PLACA_API_BASE_URL") || ""
const PLACA_API_KEY = Deno.env.get("PLACA_API_KEY") || ""

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { placa } = await req.json()

    if (!placa || placa.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Placa é obrigatória" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validar formato de placa (Brasil: ABC1234 ou ABC1D23)
    const placaLimpa = placa.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    if (placaLimpa.length !== 7) {
      return new Response(JSON.stringify({ error: "Placa inválida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ⚠️ PLACEHOLDER: implementar chamada à API real
    // Exemplo de resposta esperada:
    if (!PLACA_API_BASE_URL || !PLACA_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Provedor de placa não configurado. Configure PLACA_API_BASE_URL e PLACA_API_KEY.",
          codigo: "PLACA_API_NOT_CONFIGURED",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }

    // Chamada à API (implementar conforme o provedor escolhido)
    const response = await fetch(`${PLACA_API_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PLACA_API_KEY}`,
      },
      body: JSON.stringify({ placa: placaLimpa }),
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Erro ao consultar API de placa: ${response.statusText}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      )
    }

    const data = await response.json()

    // Normalizar resposta para o padrão esperado
    return new Response(
      JSON.stringify({
        marca: data.marca || data.fabricante || "",
        modelo: data.modelo || "",
        ano: data.ano || null,
        cor: data.cor || "",
        placa: placaLimpa,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
