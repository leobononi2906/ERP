# Plano — Distribuição + Apontamento de OS como ACESSÓRIO do sistema atual

> Objetivo: usar a ideia da **distribuição/apontamento de OS** (feita no ERP novo) como um **acessório do sistema legado** — sem migrar o ERP inteiro. O chão de fábrica opera num quadro web moderno; o **apontamento volta** pro sistema atual pra fechar/faturar/comissionar a OS lá.
> Decidido com o Leo (19/08): "queria como se fosse um acessório do sistema atual, **precisa voltar lá**."
> Este documento é **portátil** — pode ser colado em outras conversas (replicador, integração) pra elas continuarem daqui. Ver a seção **BRIEF PORTÁTIL** no fim.

---

## 1. Princípio inegociável
**No Firebird de produção a gente SÓ LÊ, nunca escreve.** Toda a "volta" do apontamento passa por um **ponto de entrada controlado** que o fornecedor do sistema atual fornece — nunca por escrita direta nas tabelas de produção. (Isso, inclusive, torna o "sim" do fornecedor mais fácil: não pedimos acesso ao banco, pedimos uma caixa de entrada.)

## 2. Arquitetura em 3 camadas
```
   [ SISTEMA ATUAL / Firebird ]
        │  (1) LER: OS abertas / em produção
        ▼
   [ REPLICADOR Firebird→Supabase ]  ← já existe (SRV-DASHBOARD)
        │
        ▼
   [ NOSSA CAMADA (Supabase) ]
        • quadro de distribuição (lê OS real)
        • apontamento (tabela própria = fonte da verdade do apontamento)
        │
        │  (3) DEVOLVER: apontamento consolidado
        ▼
   [ PONTO DE ENTRADA do fornecedor ]  ← eles puxam / API deles / arquivo
        │
        ▼
   [ SISTEMA ATUAL fecha/fatura/comissiona a OS ]
```
- **(1) Ler:** a OS aberta vem pro Supabase via replicador.
- **(2) Operar:** quadro de distribuição + apontamento na nossa camada (React + Supabase). Reaproveita as telas do ERP novo.
- **(3) Devolver:** o apontamento consolidado entra no sistema atual por um dos 3 pontos de entrada (seção 4).

## 3. Fases (com entregável e responsável)

**Fase 0 — Alinhamento (o gate político).** *Resp.: Leo + fornecedor.*
- Reunião com o pessoal do sistema. Levar a **proposta de 1 página** (a gente não toca no banco; só precisa de 1 ponto de entrada).
- Sair com **uma** definição: qual dos 3 pontos de entrada (seção 4) eles topam.
- Entregável: ponto de entrada acordado + o "de-para" de campos da OS deles.

**Fase 1 — Leitura da OS real.** *Resp.: conversa do replicador.*
- Confirmar se a **OS aberta / em produção** já é replicada pro Supabase. **Provável que NÃO** — hoje o replicador foca em faturamento (movimento fechado); OS em produção pode faltar.
- Se faltar: criar **alvo de extração** "OS abertas + itens/serviços" (padrão `bononi-replicador/alvos/`, só leitura).
- Entregável: view no Supabase com a OS real aberta (nº, cliente, itens/serviços, status).

**Fase 2 — Quadro + apontamento na nossa camada.** *Resp.: conversa do ERP.*
- Tabela própria `apontamentos_os` (fonte da verdade do apontamento) — chaveada pelo **nº real da OS** do legado.
- Reusar as telas de **distribuição** (quem faz o quê, por habilidade/área) e **apontamento**.
- Regra de produção pedida pelo Leo: **pode lançar mais de um produto/item na mesma produção; o colaborador finaliza cada item separadamente e só depois encerra o apontamento.**
- Entregável: chão de fábrica operando (mesmo antes da volta estar pronta).

**Fase 3 — A volta pro sistema atual.** *Resp.: nossa camada + fornecedor.*
- Implementar o ponto de entrada acordado na Fase 0.
- **Idempotência**: cada apontamento tem id único; reenviar não duplica. Marca "enviado/confirmado".
- **Conciliação**: painel que mostra apontado × recebido pelo legado (o que ficou pendente).
- Entregável: apontamento pingando de volta e sendo consumido lá.

**Fase 4 — Piloto e expansão.** *Resp.: Leo.*
- Rodar num **setor/tipo de OS** primeiro. Medir (erro, tempo, retrabalho).
- Se provar, expandir. Vira a vitrine que sustenta a conversa de trazer mais módulos.

## 4. Os 3 pontos de entrada (a escolha da Fase 0)
| # | Como | Esforço do fornecedor | Limpeza |
|---|---|---|---|
| 1 | **Eles puxam da nossa view/endpoint** (Supabase) e gravam com o código deles | médio | ★★★ |
| 2 | **Caixa de entrada deles** (procedure/staging/API oficial) onde a gente posta | médio | ★★★ |
| 3 | **Arquivo de importação** (CSV/XML) que entra pela importação que eles já têm | baixo | ★★ |
> Nenhum dos 3 nos deixa escrever nas tabelas cruas de produção. O #3 destrava mesmo se eles quase não programarem.

## 5. Contrato de dados — a "carga" do apontamento
O que volta pro sistema atual, por item produzido:
- `os_numero` (chave real do legado)
- `item_ref` / `id_servico` ou `id_produto` (qual item da OS)
- `colaborador` (quem produziu)
- `quantidade_produzida`
- `tempo` / horas (se apontado)
- `status` = FINALIZADO
- `data_hora`
- `id_apontamento` (único, pra idempotência)

## 6. Riscos e mitigação
- **Fornecedor não topar nenhum ponto de entrada** → a volta viraria digitação dupla (inviável). **Este é o risco #1 e é político** — resolver na Fase 0 antes de construir a volta.
- **OS aberta não replicada** → Fase 1 vira pré-requisito (novo alvo de extração).
- **Duplicidade na volta** → idempotência por `id_apontamento` + painel de conciliação.
- **Chave da OS divergente** → fixar que a chave é o nº real do legado (vindo pelo replicador), nunca um id nosso.

## 7. Próximos passos concretos
1. Eu gero a **proposta de 1 página pro fornecedor** (Fase 0).
2. Você leva pra reunião e volta com **o ponto de entrada** que eles aceitam.
3. Em paralelo, a **conversa do replicador** confirma/cria o alvo "OS aberta" (Fase 1).
4. Com isso, a **conversa do ERP** monta quadro + apontamento (Fase 2) e a volta (Fase 3).

---

## BRIEF PORTÁTIL — colar em outras conversas
> Cole este bloco na conversa do replicador / integração pra ela continuar daqui.

**Contexto:** Grupo Bononi. Sistema de produção atual = ERP legado em **Firebird (SGA_BONONI)** — **REGRA: só leitura, nunca escrever no Firebird de produção.** Existe um **replicador Firebird→Supabase** rodando (servidor SRV-DASHBOARD; padrão de alvos em `bononi-replicador/alvos/`, ver `docs/SERVIDOR_PRODUCAO.md`). Projeto Supabase do ERP novo: `vishxwdxqiygbxmtpfoy`, schema `"Teste ERP"`.

**Objetivo:** rodar a **distribuição + apontamento de OS** (telas já existentes no ERP novo) como **acessório do sistema legado**. O apontamento **precisa voltar** pro sistema atual (fechar/faturar/comissionar a OS lá), via **ponto de entrada controlado do fornecedor** (view que eles puxam / API deles / arquivo) — nunca escrita direta no Firebird.

**Pedido para a conversa do replicador:** confirmar se a **OS aberta / em produção** (não só o faturamento fechado) já está replicada no Supabase. Se não, criar um **alvo de extração** só-leitura com: nº da OS, cliente, itens (produto) e serviços, status/etapa. Chave = **nº real da OS do legado**.

**Contrato de volta do apontamento (payload):** os_numero, item (id_produto/id_servico), colaborador, quantidade_produzida, tempo/horas, status=FINALIZADO, data_hora, id_apontamento (único, idempotente).

**Regra de produção:** pode haver vários itens numa produção; o colaborador **finaliza item a item** e só depois encerra o apontamento.

**Docs de referência:** `docs/PLANO_DISTRIBUICAO_OS_ACESSORIO.md` (este plano).
