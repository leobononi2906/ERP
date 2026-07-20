# ERP Bononi — Atualização 20.07.2026

## Repositório GitHub
- **Repo:** leobononi2906/ERP
- **Deploy:** https://erp-five-chi.vercel.app
- **Vercel Project ID:** prj_GR0sUdsXgwNWbNk2UJe3kEwC1Ruo

---

## O que foi feito

### 1. Correção da estrutura do repositório

Os arquivos tinham sido enviados pelo GitHub com os conteúdos trocados (upload via interface web embaralhou os nomes). Todos foram remapeados e reorganizados na estrutura padrão Vite + React:

```
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
├── README.md
└── src/
    ├── main.jsx          ← entry point (createRoot)
    ├── App.jsx            ← sidebar + roteamento de páginas
    ├── config.js          ← conexão Supabase, cores, helpers
    ├── ui.jsx             ← componentes reutilizáveis (Card, Campo, Badge, etc.)
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Clientes.jsx
        ├── Produtos.jsx
        └── OrdensServico.jsx   ← NOVO
```

### 2. Tabela `os_apontamentos` criada no Supabase

**Schema:** `Teste ERP`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL PK | — |
| id_os | INTEGER NOT NULL | FK → ordens_servico |
| id_servico_os | INTEGER NOT NULL | FK → os_servicos |
| id_colaborador | INTEGER NOT NULL | FK → usuarios |
| data_apontamento | DATE | Data do apontamento (default CURRENT_DATE) |
| hora_inicio | TIME NOT NULL | Hora que o técnico iniciou |
| hora_termino | TIME | Hora que finalizou (null = em andamento) |
| horas_trabalhadas | NUMERIC(10,2) | Calculado: (termino - inicio) em horas |
| fator | NUMERIC(10,2) | Fração de hora (igual ao Firebird) |
| observacao | TEXT | Observação opcional |
| criado_em | TIMESTAMP | Default now() |

**Índices:** id_os, id_servico_os, id_colaborador, data_apontamento

**Grants:** SELECT, INSERT, UPDATE, DELETE para anon e authenticated

### 3. Módulo Ordem de Serviço (frontend)

Arquivo: `src/pages/OrdensServico.jsx`

**Funcionalidades entregues:**

- **Lista de OS** — tabela com nº OS, cliente, veículo, status, data entrada, valores
  - Busca por número da OS ou nome do cliente
  - Filtro por status (Aberta, Em execução, Faturada)
  - Clique na linha abre o detalhe

- **Nova OS / Editar** — formulário com:
  - Cliente (select), Tipo de OS, Veículo (filtrado pelo cliente)
  - Responsável, Data prevista, KM entrada
  - Defeito relatado, Observação interna

- **Detalhe da OS** — 3 abas:
  - **Serviços** — lista de serviços com descrição, técnico, valor, status
    - Adicionar serviço inline (descrição, qtd, valor unitário, técnico)
    - Botão Play/Stop pra apontar direto na linha do serviço
  - **Peças** — lista de peças com referência, qtd, valores
  - **Apontamentos** — histórico de apontamentos com data, colaborador, serviço, início/término, horas
    - Indicador visual "em andamento" para apontamentos abertos
    - Botão finalizar (calcula horas automaticamente)
    - Botão excluir apontamento

- **KPIs no detalhe** — 4 cards: Total Serviços, Total Peças, Total Geral, Qtd Apontamentos

- **Permissões por grupo** — Administrador/Gestor podem tudo; Vendedor inclui/edita mas não aponta; Estoque/Financeiro só visualiza

**Conexão com Supabase:** REST API direto (fetch) com headers do schema "Teste ERP", sem dependência de lib externa.

---

## Tabelas consultadas pelo módulo

| Tabela | Uso |
|--------|-----|
| ordens_servico | CRUD da OS |
| os_servicos | Serviços vinculados à OS |
| os_pecas | Peças vinculadas à OS |
| os_apontamentos | Apontamento de técnicos (NOVA) |
| clientes | Select de cliente no formulário |
| tipos_os | Select de tipo de OS |
| veiculos | Select de veículo (filtrado por cliente) |
| usuarios | Select de responsável/técnico |
| servicos | Catálogo de serviços |

---

## Pendências / próximos passos

- [ ] Testar com dados reais nas tabelas (clientes, tipos_os, veiculos, usuarios)
- [ ] Vincular apontamento ao usuário logado (hoje usa id fixo = 1)
- [ ] Adicionar peças inline (igual ao serviço)
- [ ] Movimentação de estoque ao adicionar peça
- [ ] Alterar status da OS (ABERTA → EM_EXECUCAO → FATURADA)
- [ ] Andamentos (histórico de mudança de status)
- [ ] Upload de fotos (os_fotos)
- [ ] Orçamento da OS (os_orcamentos + os_orcamento_itens)
- [ ] Comissão sobre produtos (tapeçaria) — tabela os_comissoes a criar quando necessário
- [ ] Responsividade mobile (cards no lugar da tabela)
