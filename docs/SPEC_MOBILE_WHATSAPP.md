# SPEC — Telas mobile + envio por WhatsApp (OS, Orçamentos, Vendas)

> Pedido do Leo (17/08): preparar telas para o **sistema mobile** — principalmente **OS, Orçamentos e Vendas** — e **tudo integrado com envio por WhatsApp** (mandar o documento pro cliente pelo Whats). **Depende de decisões de arquitetura/provedor — spec primeiro.**

## Parte 1 — Telas mobile

### Opção A (recomendada): responsivo no próprio ERP (PWA)
- O ERP já é React SPA. Tornar as telas de **OS, Orçamento e Venda** responsivas (mobile-first) e empacotar como **PWA** (instalável no celular, ícone na home, funciona no navegador).
- **Vantagem:** um código só, mesmo backend (as RPCs já existem), sem duplicar regra de negócio. Login já existe.
- **Escopo mobile mínimo (o que o vendedor usa na rua):**
  - **Consulta rápida** (já temos F3 — adaptar pra toque): preço de produto + cliente.
  - **Orçamento**: criar/editar rápido + enviar por WhatsApp.
  - **Venda**: criar/consultar.
  - **OS**: consultar status, follow-up, e ações leves.
- **Trabalho:** camada de layout responsivo (cards em vez de tabelas largas no mobile; a ordenação de colunas que acabei de fazer ajuda) + navegação por baixo (bottom nav) no mobile.

### Opção B: app mobile dedicado (React Native / Expo)
- App nativo separado consumindo as mesmas RPCs do Supabase. Melhor experiência offline/camera/scanner, mas **duplica** telas e manutenção. Só se o uso em campo for intenso.

> **Recomendação:** começar pela **Opção A (PWA responsivo)** — entrega valor rápido reusando tudo; migrar telas específicas pra nativo depois se precisar (scanner de código de barras, foto).

## Parte 2 — Envio por WhatsApp

### Opção 1 (simples, sem provedor): link `wa.me`
- Botão "Enviar por WhatsApp" no Orçamento/OS/Venda gera `https://wa.me/55DDDNUMERO?text=<mensagem+link do documento>`.
- Abre o WhatsApp (Web/app) já com o número do cliente e o texto pronto (nº do doc, valor, link do PDF). O usuário só aperta enviar.
- **Vantagem:** zero custo/infra, funciona hoje. **Limite:** não é automático (abre o Whats do usuário), e precisa do **documento acessível por link** (hospedar o PDF).

### Opção 2 (automático, com provedor): API de WhatsApp
- Enviar direto pelo backend (Edge Function) via provedor: **Umbler Talk** (já está no ecossistema Bononi — verificar se tem API de envio), ou **WhatsApp Cloud API** (Meta), ou Z-API/Twilio.
- **Vantagem:** envio automático/registrado, templates, sem depender do Whats do vendedor. **Custo:** mensalidade/mensagem + número oficial + aprovação de template.

### Pré-requisito comum: o DOCUMENTO em link
- Já existe `imprimirOSDoc` / `imprimirVendaDoc` (gera o layout). Falta **gerar um PDF/página acessível por URL** (Edge Function que renderiza o doc + hospeda no Storage, ou uma rota pública somente-leitura por token). Esse link é o que vai no WhatsApp.

## Decisões pendentes do Leo
1. **Mobile:** PWA responsivo (Opção A, recomendada) ou app nativo (Opção B)?
2. **WhatsApp:** começar com `wa.me` (simples, já) ou já ir pro provedor automático (qual — Umbler/Meta/Z-API)?
3. Quais telas entram na 1ª leva mobile (sugestão: Consulta rápida + Orçamento + envio WhatsApp).

## Passos quando decidir
1. Gerar o **link público do documento** (Edge Function PDF + Storage/token) — serve pros 2 caminhos de WhatsApp.
2. Botão "Enviar WhatsApp" no Orçamento/OS/Venda (começa com `wa.me`).
3. Camada responsiva/PWA nas 3 telas.

**Status: SPEC. Aguardando as decisões de arquitetura/provedor.**
