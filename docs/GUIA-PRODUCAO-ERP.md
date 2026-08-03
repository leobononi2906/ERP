# Guia de Produção do ERP Bononi — versão para quem decide (não técnico)

> Objetivo: colocar o ERP novo no ar **sem parar a empresa** e sem sustos. Leia como um roteiro de obra: cada etapa tem que estar pronta antes da próxima.

---

## 0. A regra de ouro
**Nunca desligue o sistema antigo (Firebird) antes do novo estar 100% provado.** Os dois rodam juntos por um período. O antigo é a sua rede de segurança.

---

## 1. Onde o ERP vai morar: SERVIDOR INTERNO
A produção será em um **servidor dentro da empresa** (on-premise). O Supabase usado hoje é **apenas para testes** — não é a produção.

O que isso exige, na prática:
- **Um servidor interno** (máquina dedicada, ligada 24/7, estável) rodando o banco de dados **PostgreSQL** e a aplicação.
- **Nobreak / energia estável** — se o servidor cai, a loja para.
- **Rede boa** entre as máquinas dos usuários e o servidor.
- **Acesso à internet liberado** no servidor para as funções que consultam serviços externos:
  - **Emissão de NF-e** (API fiscal terceirizada)
  - **Busca de CNPJ** e **busca de CEP** (preenchem cadastro automaticamente)
  - **Busca de placa** (quando contratarem um provedor)
  - Se a rede interna for fechada, esses endereços precisam ser **liberados no firewall**, senão as buscas e a nota não funcionam.
- **Acesso remoto seguro** (VPN) se quiserem usar de fora (vendedor externo, home office).

> ⚠️ Ponto técnico importante: tudo foi construído em **PostgreSQL puro e portável**, sem depender de recursos exclusivos do Supabase. Isso é de propósito — para migrar do teste (Supabase) para o servidor interno com o mínimo de retrabalho. As alterações do banco ficam versionadas em `supabase/migrations` (podem ser reaplicadas no servidor interno).

---

## 2. Os passos, em ordem

1. **Preparar o servidor interno** — instalar PostgreSQL, subir a aplicação, configurar backup e energia.
2. **Recriar a estrutura do banco** no servidor (aplicar as migrações versionadas).
3. **Migrar os dados do Firebird** — cadastros (clientes, produtos, fornecedores), **saldos de estoque** e **títulos em aberto** (contas a pagar/receber). **Conferir se os números batem** com o sistema antigo. Esta etapa é a que mais causa dor se feita às pressas.
4. **Rodar em paralelo** — por semanas: mesma venda lançada nos dois, comparar estoque e financeiro.
5. **Piloto pequeno** — começar por **uma loja ou um setor**, não a empresa toda.
6. **Treinar as pessoas** — manual simples + acompanhamento de perto. A maioria das falhas de ERP é gente, não sistema.
7. **Homologar o fiscal** — emitir NF-e no ambiente de teste da Sefaz, conferir impostos, só então emitir "pra valer".
8. **Data de corte por módulo** — "a partir do dia X, vendas só no novo". Um módulo de cada vez, nunca tudo junto.
9. **Suporte intenso nas primeiras semanas** — alguém de plantão para resolver na hora.
10. **Desligar o Firebird** — só quando todos os módulos estiverem estáveis e conferidos.

---

## 3. O que pode dar errado (e como evitar)

| Risco | Consequência | Como reduzir |
|---|---|---|
| Dados migrados errados | Estoque/financeiro não bate; perde confiança | Conferência lado a lado antes do corte |
| **Nota fiscal com imposto errado** | Problema com o fisco (o mais grave) | Validação contábil + homologação Sefaz |
| Pessoas resistirem/errarem | Retrabalho, reclamação | Treinamento e suporte próximo |
| Depender de uma só pessoa | Sistema "refém" de alguém | Ter responsável interno + técnico de apoio |
| Servidor cair / sem backup | Perda de dados, loja parada | Nobreak + **backup automático diário testado** |
| Sem internet no servidor | NF-e e buscas param | Liberar endpoints no firewall |
| Custos recorrentes | Surpresa no caixa | Mapear: API NF-e, provedor de placa, etc. |
| "Escopo infinito" | Nunca fica pronto | Priorizar; ERP nunca "acaba" |

---

## 4. Precisa de gente dedicada? SIM

- **Responsável interno pelo produto** (pode não ser técnico): conhece o negócio, coordena testes, valida dados, treina, decide prioridades. Hoje esse papel é do Leo — conforme cresce, precisa de mais gente.
- **Apoio técnico** (desenvolvedor contratado ou parceiro): entende o código e o banco, resolve urgências, faz manutenção. **Não depender de uma única fonte.** A IA acelera muito a construção, mas não substitui alguém que responda pelo sistema quando a loja está cheia.
- **Contador/fiscal** validando a parte de impostos e NF-e.

---

## 5. Checklist de "virar a chave" (por módulo)

Antes de ligar cada módulo em produção, confirme:

- [ ] Dados migrados e **conferidos** (bate com o Firebird)
- [ ] Usuários e permissões configurados (cada um vê/faz só o que deve)
- [ ] Pessoas **treinadas** nesse módulo
- [ ] **Backup automático** rodando e já testado (restaurar de verdade)
- [ ] Impressões conferidas (venda, OS, etiquetas)
- [ ] (Se envolve nota) NF-e **homologada** e impostos conferidos
- [ ] Plano de "e se der errado" (voltar pro Firebird nesse módulo)
- [ ] Alguém de **plantão** nos primeiros dias

Ordem sugerida: Cadastros → Produtos/Preços → Vendas → OS → Estoque → Financeiro → Fiscal/NF-e.

---

## 6. Depois do go-live
- Acompanhar erros (o sistema já registra falhas automaticamente).
- Rotina de backup **verificada** toda semana.
- Lista de melhorias priorizada (não sair fazendo tudo de uma vez).
- Revisão de permissões periódica (quem entrou/saiu da empresa).

---

## 7. Situação atual (fase de teste)
- ERP roda em teste no Supabase + Vercel; produção será no servidor interno.
- Módulos com telas prontas: Dashboard, Clientes, Produtos (com preço por empresa/tabela), Orçamentos, Vendas, OS, Estoque, Separação, Financeiro, Tipos de Operação, Relatórios (Vendas/Compras/Produtos/Clientes) e DRE.
- Impressão: Venda/Recibo, OS e etiquetas (produto e expedição).
- Regras já ativas: crédito de cliente só liberado por aprovação; operações restritas (garantia/bonificação/remessa) bloqueadas para vendedor.

_Este guia deve ser revisado a cada etapa concluída._
