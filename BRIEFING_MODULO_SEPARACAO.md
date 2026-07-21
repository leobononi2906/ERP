# BRIEFING — MÓDULO SEPARAÇÃO (BOQUETA) · ERP Bononi · 21/07/2026

> Executor: Sonnet 4.6. Planejado e revisado pelo Fable.
> Usar SEMPRE as skills `bononi-erp` (o quê) e `bononi-padrao` (como).
> Regra nº 1: conferir o schema real no Supabase (projeto `vishxwdxqiygbxmtpfoy`, schema `"Teste ERP"`) antes de codar — NUNCA confiar de memória em nome de coluna.
> Todo DDL/DML: mostrar ao Leo e aguardar confirmação antes de aplicar.

---

## 1. CONTEXTO DE NEGÓCIO (fluxo real da operação)

- O vendedor **não lança produto direto** na venda nem na OS. Ele lança no **orçamento**.
- Quando o orçamento **converte em venda** (fluxo já existente no módulo Vendas), os itens entram no documento e o sistema **gera automaticamente uma Solicitação de Separação** com os itens de produto.
- A solicitação cai na **fila única da Separação** (boqueta): todas as empresas na mesma fila, cada uma identificada, cada uma baixando/reservando do estoque da SUA empresa.
- O estoquista imprime o **picking**, separa fisicamente e **valida** item a item:
  - Quantidade separada = pedida → ok.
  - Separou MENOS → **justificativa obrigatória por item**:
    - `ERRO_LANCAMENTO` → saldo do sistema estava errado → vira **pendência de ajuste de inventário** (aparece na tela de Movimentações Internas até ser resolvida).
    - `VENDA_PERDIDA` → demanda real não atendida → grava em `vendas_perdidas` (alimenta a demanda no módulo de Compras).
  - Ao validar: cria **reserva** (`estoque_saldos.estoque_reservado`), e a **quantidade do item na venda/OS é ajustada** para a quantidade separada (se 0, o item sai do documento).
- **Baixa de estoque só no faturamento** (consome a reserva). A validação da separação NÃO baixa estoque.
- **Devolução**: peça separada e não usada (cliente desistiu no balcão, sobra de OS) volta pro estoque via movimentação interna do tipo "Devolução de Separação" (libera a reserva).
- **Entrega**: após separada, a boqueta registra entrega para VENDAS ou PATIO (status ENTREGUE).
- **Gôndola (exceção)**: produtos expostos na loja. É um **centro de estoque separado** ("Gôndola Loja"). Abastecida por movimentação interna TRANSFER. O vendedor SÓ pode lançar produto direto na venda se o produto tiver saldo no centro Gôndola da empresa — e a baixa sai da Gôndola. Não existe venda perdida no fluxo da gôndola.
- Status da solicitação: `SOLICITADA → EM_SEPARACAO → SEPARADA → ENTREGUE`, com `CANCELADA` possível antes de SEPARADA.
- Nome nas telas: **"Separação"** (não usar "expedição" na UI; a tabela do banco continua `expedicoes`).

---

## 2. BANCO — MIGRATIONS (aplicar via MCP após ok do Leo)

### 2.1 `expedicoes` (vira a solicitação de separação)
```sql
ALTER TABLE "Teste ERP".expedicoes
  ADD COLUMN IF NOT EXISTS id_orcamento_venda integer REFERENCES "Teste ERP".orcamentos_venda(id),
  ADD COLUMN IF NOT EXISTS id_os_orcamento    integer REFERENCES "Teste ERP".os_orcamentos(id),
  ADD COLUMN IF NOT EXISTS id_solicitante     integer REFERENCES "Teste ERP".usuarios(id),
  ADD COLUMN IF NOT EXISTS id_separador       integer REFERENCES "Teste ERP".usuarios(id),
  ADD COLUMN IF NOT EXISTS data_solicitacao   timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_separacao     timestamp,
  ADD COLUMN IF NOT EXISTS data_entrega       timestamp,
  ADD COLUMN IF NOT EXISTS entregue_para      varchar(20); -- VENDAS | PATIO

ALTER TABLE "Teste ERP".expedicoes ALTER COLUMN status SET DEFAULT 'SOLICITADA';

ALTER TABLE "Teste ERP".expedicoes
  ADD CONSTRAINT expedicoes_status_chk
  CHECK (status IN ('SOLICITADA','EM_SEPARACAO','SEPARADA','ENTREGUE','CANCELADA'));

CREATE INDEX IF NOT EXISTS idx_expedicoes_status  ON "Teste ERP".expedicoes(status);
CREATE INDEX IF NOT EXISTS idx_expedicoes_empresa ON "Teste ERP".expedicoes(id_empresa);
CREATE INDEX IF NOT EXISTS idx_expedicoes_venda   ON "Teste ERP".expedicoes(id_venda);
CREATE INDEX IF NOT EXISTS idx_expedicoes_os      ON "Teste ERP".expedicoes(id_os);
```

### 2.2 `expedicoes_itens`
```sql
ALTER TABLE "Teste ERP".expedicoes_itens
  ADD COLUMN IF NOT EXISTS valor_unitario    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS id_os_peca        integer REFERENCES "Teste ERP".os_pecas(id),
  ADD COLUMN IF NOT EXISTS motivo_falta      varchar(20)
      CHECK (motivo_falta IN ('ERRO_LANCAMENTO','VENDA_PERDIDA')),
  ADD COLUMN IF NOT EXISTS observacao_falta  text,
  ADD COLUMN IF NOT EXISTS id_venda_perdida  integer REFERENCES "Teste ERP".vendas_perdidas(id),
  ADD COLUMN IF NOT EXISTS ajuste_resolvido  boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_expedicoes_itens_expedicao
  ON "Teste ERP".expedicoes_itens(id_expedicao);
CREATE INDEX IF NOT EXISTS idx_expedicoes_itens_motivo_falta
  ON "Teste ERP".expedicoes_itens(motivo_falta) WHERE motivo_falta IS NOT NULL;
```
Obs: `id_venda_item` já existe. Na criação da solicitação, cada item já nasce vinculado ao item do documento (`id_venda_item` ou `id_os_peca`) e com `valor_unitario` copiado dele.

### 2.3 `tipos_movimento_interno` (configurável em tela)
```sql
CREATE TABLE IF NOT EXISTS "Teste ERP".tipos_movimento_interno (
  id                  serial PRIMARY KEY,
  descricao           varchar(60) NOT NULL,
  sentido             varchar(10) NOT NULL CHECK (sentido IN ('ENTRADA','SAIDA','TRANSFER')),
  mexe_reserva        boolean DEFAULT false,
  exige_justificativa boolean DEFAULT false,
  exige_aprovacao     boolean DEFAULT false,
  atualiza_custo      boolean DEFAULT false,
  padrao              boolean DEFAULT false,
  ativo               boolean DEFAULT true,
  criado_em           timestamp DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON "Teste ERP".tipos_movimento_interno TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE "Teste ERP".tipos_movimento_interno_id_seq TO anon, authenticated, service_role;

INSERT INTO "Teste ERP".tipos_movimento_interno
  (descricao, sentido, mexe_reserva, exige_justificativa, exige_aprovacao, atualiza_custo, padrao) VALUES
  ('DEVOLUÇÃO DE SEPARAÇÃO',        'ENTRADA',  true,  false, false, false, true ),
  ('AJUSTE DE INVENTÁRIO (ENTRADA)','ENTRADA',  false, true,  true,  false, false),
  ('AJUSTE DE INVENTÁRIO (SAÍDA)',  'SAIDA',    false, true,  true,  false, false),
  ('PERDA / QUEBRA',                'SAIDA',    false, true,  false, false, false),
  ('USO INTERNO',                   'SAIDA',    false, true,  false, false, false),
  ('ABASTECIMENTO DE GÔNDOLA',      'TRANSFER', false, false, false, false, false);
```

### 2.4 Centro Gôndola
```sql
INSERT INTO "Teste ERP".centros_estoque (descricao, id_empresa, principal, ativo)
VALUES ('Gôndola Loja', 3, false, true);  -- MLB PR; demais lojas criam pela tela
```

---

## 3. BANCO — FUNÇÕES (transacionais, validações ANTES de alterar qualquer coisa)

### 3.1 `erp_separacao_confirmar(p_id_expedicao int, p_id_usuario int, p_itens jsonb)`
`p_itens`: `[{"id_item":1,"qtd_separada":2,"motivo_falta":null,"observacao_falta":null}, ...]`

**FASE 1 — valida tudo, não altera nada:**
- Expedição existe, `FOR UPDATE`, status IN (SOLICITADA, EM_SEPARACAO); senão EXCEPTION.
- Cada item pertence à expedição; `0 ≤ qtd_separada ≤ quantidade_pedida`.
- Se `qtd_separada < quantidade_pedida` → `motivo_falta` obrigatório e válido.

**FASE 2 — efetiva (mesma transação):**
Por item (`FOR UPDATE`):
1. Falta com `VENDA_PERDIDA` → INSERT em `vendas_perdidas` (id_empresa, id_produto, id_vendedor = id_solicitante, motivo = 'FALTA NA SEPARAÇÃO', valor_perdido = falta × valor_unitario, observacao com nº da solicitação) e grava o id em `expedicoes_itens.id_venda_perdida`.
2. Falta com `ERRO_LANCAMENTO` → só marca `motivo_falta` no item (a tela de Movimentações lista `motivo_falta='ERRO_LANCAMENTO' AND ajuste_resolvido=false` como pendência).
3. `qtd_separada > 0` → INSERT em `estoque_reservas` (origem 'SEPARACAO', id_referencia = id da expedição) + UPDATE `estoque_saldos` (`estoque_reservado += qtd`, recalcular `estoque_disponivel = estoque_atual − estoque_reservado`); se não existir linha de saldo, criar com atual 0.
4. **Ajustar o item do documento** (`vendas_itens` via `id_venda_item` OU `os_pecas` via `id_os_peca`): `quantidade = qtd_separada`, recalcular `valor_total` (e desconto proporcional se houver). Se `qtd_separada = 0` → excluir o item do documento. Depois **recalcular os totais da venda/OS** usando a mesma lógica do módulo Vendas já existente (conferir colunas reais antes).
5. Gravar `quantidade_separada`, motivo, observação no item.

Fecho: expedição → `status='SEPARADA'`, `id_separador`, `data_separacao`. RETURN jsonb com resumo. GRANT EXECUTE para anon, authenticated, service_role.

### 3.2 `erp_movimento_interno_executar(p_id_tipo int, p_id_empresa int, p_id_centro int, p_id_produto int, p_quantidade numeric, p_id_usuario int, p_justificativa text, p_id_centro_destino int DEFAULT NULL, p_id_referencia int DEFAULT NULL)`
Função genérica que lê as flags do `tipos_movimento_interno`:
- `exige_justificativa` → p_justificativa obrigatória (EXCEPTION se vazia).
- `sentido ENTRADA` → `estoque_atual += qtd`; `SAIDA` → `estoque_atual −= qtd` (validar saldo suficiente ANTES); `TRANSFER` → saída no centro origem + entrada no destino (p_id_centro_destino obrigatório).
- `mexe_reserva = true` (ex.: Devolução de Separação) → além do estoque, liberar a reserva: desativar/abater em `estoque_reservas` (origem 'SEPARACAO', id_referencia = p_id_referencia) e `estoque_reservado −= qtd`. Usar junto com a remoção/ajuste do item no documento (a tela orquestra: primeiro ajusta o item da venda/OS, depois chama a função).
- Sempre: INSERT em `estoque_movimentos` (tipo = descricao do tipo, origem 'MOV_INTERNA', estoque_anterior/posterior, custo do `estoque_saldos.custo_medio`), recalcular `estoque_disponivel`.
- `exige_aprovacao` → v1: a TELA só habilita para perfil Gestor (validar permissão no frontend + registrar id_usuario). Fluxo de aprovação em duas etapas fica pra fase 2.

---

## 4. TELAS (React + Vite + Tailwind, padrão `bononi-padrao`)

### 4.1 Fila de Separação (tela principal da boqueta)
- Lista de solicitações de TODAS as empresas (badge da empresa em cada linha), filtros: status, empresa, busca por nº/cliente. Default: SOLICITADA + EM_SEPARACAO.
- Colunas: nº, empresa, origem (Venda/OS + número), cliente, solicitante, data/hora, qtd itens, status (badges do padrão).
- Ações: abrir detalhe; imprimir picking; assumir (status → EM_SEPARACAO, grava id_separador).
- Auto-refresh (polling ~30s) — é a fila de trabalho do estoquista.
- `.range(0, 9999)` em toda listagem.

### 4.2 Detalhe da Separação (validação)
- Cabeçalho: origem, cliente, empresa, solicitante, status.
- Itens: produto, referência, qtd pedida, input qtd separada (default = pedida).
- Se qtd separada < pedida → obrigar seleção do motivo (ERRO_LANCAMENTO | VENDA_PERDIDA) + observação opcional. Não deixa confirmar sem motivo.
- Botão Confirmar Separação → chama `erp_separacao_confirmar` via RPC. Exibir resumo retornado (separados, faltas, vendas perdidas geradas).
- Botão Cancelar solicitação (só em SOLICITADA/EM_SEPARACAO; UPDATE status='CANCELADA').
- Após SEPARADA: botão Registrar Entrega (VENDAS | PATIO) → status ENTREGUE + data_entrega.
- Impressão do picking: bobina 78mm, iframe oculto com CSS inline (padrão `bononi-padrao` seção 10).

### 4.3 Movimentações Internas
- Nova movimentação: tipo (dropdown de `tipos_movimento_interno` ativos), empresa, centro (+ destino se TRANSFER), produto (busca), quantidade, justificativa (obrigatória conforme flag). Chama `erp_movimento_interno_executar`.
- Tipos com `exige_aprovacao`: visíveis/habilitados só para Gestor.
- Aba/seção **Pendências de Inventário**: lista `expedicoes_itens` com `motivo_falta='ERRO_LANCAMENTO' AND ajuste_resolvido=false`; ao lançar o ajuste correspondente, marcar `ajuste_resolvido=true`.
- Histórico: `estoque_movimentos` filtrado por origem 'MOV_INTERNA'.

### 4.4 Tipos de Movimento Interno (CRUD de configuração)
- CRUD completo da tabela (mesmo padrão da tela de Tipos de Entrada). Toggles das flags. Só Gestor/Admin.

### 4.5 Mudanças nas telas EXISTENTES (Vendas e OS) — cuidado, código que já funciona
- **Conversão orçamento → venda**: após criar a venda com os itens, gerar automaticamente a solicitação de separação (expedicoes + expedicoes_itens vinculados aos `vendas_itens` de produto, valor_unitario copiado, id_solicitante = usuário logado, id_centro_estoque = depósito principal da empresa). Mesmo padrão no orçamento de OS → os_pecas.
- **Bloqueio de lançamento direto de produto** na venda e na OS: o vendedor não adiciona item de produto manualmente, EXCETO se o produto tiver `estoque_disponivel > 0` no centro "Gôndola" da empresa — nesse caso o item entra normalmente e a baixa (no faturamento) sai do centro Gôndola. Serviços continuam livres.
- **Faturamento**: a baixa de estoque consome a reserva (abater `estoque_reservado` e `estoque_atual` juntos, desativar a reserva em `estoque_reservas`). Conferir como o faturamento atual baixa estoque antes de mexer — ajustar sem quebrar o que funciona (mudança mínima, não refatorar).
- Botão "Solicitar separação" manual na venda/OS aberta (para itens adicionados por exceção/gestor).

---

## 5. PERMISSÕES (grupos_permissoes / modulos_sistema)
- Módulo novo "Separação": Estoque valida/entrega; Vendedor cria e cancela a própria solicitação; Gestor tudo.
- Módulo "Movimentações Internas": Estoque lança tipos sem aprovação; Gestor lança tudo + CRUD de tipos.
- Registrar o módulo em `modulos_sistema` e semear permissões padrão nos grupos (mostrar SQL ao Leo antes).

## 6. CRITÉRIOS DE ACEITE (testes com dados reais)
1. Orçamento com 3 produtos convertido em venda → solicitação criada automaticamente com 3 itens na fila.
2. Boqueta separa 2 de 3 (1 item com falta VENDA_PERDIDA) → reserva dos 2, quantidade ajustada na venda, registro em `vendas_perdidas` com valor correto, item de falta com vínculo.
3. Falta com ERRO_LANCAMENTO → aparece nas Pendências de Inventário; ajuste lançado → some da lista e `estoque_movimentos` registra.
4. Confirmar 2× a mesma separação → segunda dá erro, nada duplica.
5. Devolução de Separação → reserva liberada, estoque físico volta, item removido/ajustado no documento, Kardex mostra o movimento.
6. Faturamento → `estoque_atual` e `estoque_reservado` caem juntos; sem reserva órfã.
7. Vendedor tenta lançar produto direto na venda sem saldo em Gôndola → bloqueado; com saldo em Gôndola → permite e baixa da Gôndola no faturamento.
8. Transferência Depósito → Gôndola → saldos corretos nos dois centros.
9. Fila mostra solicitações de 2 empresas diferentes; cada validação mexe só no estoque da empresa certa.
10. Toda listagem com `.range(0, 9999)`; loading/error/empty states em todas as telas.

## 7. NÃO FAZER
- Não refatorar telas de Vendas/OS além do mínimo descrito em 4.5.
- Não mexer em views `vw_*` nem em tabelas de outros sistemas (fin_, cob_, atac_...).
- Não deduplicar tabelas próprias do ERP.
- Não aplicar nenhum SQL sem mostrar ao Leo e receber confirmação.
