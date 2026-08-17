# 📖 Glossário — termos do ERP e da operação Bononi

> O "internês" da empresa + os termos técnicos/fiscais. Se um termo no código ou nas conversas não fizer sentido, procure aqui. Termos **em negrito** são jargão interno (não são padrão de mercado).

---

## Operação / chão de loja

- **OS (Ordem de Serviço):** o documento do serviço prestado (instalação, conserto). Tem serviços, peças, apontamentos, defeitos.
- **Orçamento:** proposta antes de virar venda ou OS. Vários orçamentos podem se ligar a uma mesma OS.
- **Venda:** o pedido de venda de mercadoria (balcão ou não).
- **Encomenda:** pedido de um produto que **não tem em estoque** — a ser encomendado/comprado.
- **🔸 Boqueta:** apelido interno do setor de **Separação/Conferência**. É onde se **separa** o que foi solicitado e se **confere** antes de sair. Tem dois papéis: quem faz o **picking** (separa) e quem **confere e lança** (dá o OK). É também de onde a mercadoria vai pra Expedição. *(Termo interno; no código aparece como "separação".)*
- **🔸 Gôndola:** a **prateleira da loja** (estoque de frente). O vendedor pega o produto direto da gôndola e lança na venda. É um **centro de estoque** separado do depósito. Ponto sensível de controle (o vendedor tira sem conferência formal).
- **🔸 Pátio:** a área técnica onde os **técnicos** trabalham nas OS. Tem **login coletivo**; o técnico faz **apontamento** na OS. Técnicos são classificados por **habilidade/área**.
- **Apontamento:** registro do trabalho/horas de um técnico numa OS. Vários apontamentos podem ser somados e precificados num serviço.
- **🔸 Defeito / "Serviço Solicitado":** o problema/serviço a executar numa OS. É distribuído a uma **área (especialidade)** ou técnico.
- **🔸 Prisma:** a **sequência/numeração de OS por vendedor** (cada vendedor tem a sua, pra organizar o serviço). Tela em Serviços → Prismas. Não é um pool livre.
- **Distribuição:** a fila onde os serviços/defeitos são atribuídos a áreas/técnicos.
- **Solicitação (de peça):** pedido de uma peça do estoque, feito pela OS/venda/pátio. **Consolida num picking** na boqueta.
- **Picking:** a separação **consolidada** (um documento por OS/venda, com vários itens, número próprio). No banco = `expedicoes` + `expedicoes_itens`.
- **Separação:** o processo da boqueta (separar + conferir + baixar estoque ao validar).
- **Expedição:** o despacho da mercadoria (transportadora). Valida o que a boqueta separou, embala e envia.
- **Remessa / Retorno:** envio de mercadoria/equipamento para fora (demonstração, garantia, conserto, comodato) e o retorno correspondente. Controla pendências.
- **Uso interno:** saída de produto do estoque para consumo da própria empresa (com colaborador + departamento).

---

## Estoque / produto

- **Centro de estoque:** um local de estoque (Depósito Principal, Gôndola Loja…). Saldo é **por centro**.
- **Kardex:** o livro de movimentação do estoque (toda entrada/saída grava kardex, via `erp_baixar_estoque`).
- **Custo médio:** custo do produto, atualizado só em entradas do tipo Compra/Importação (não em bonificação/retorno/devolução).
- **Curva ABC:** classificação dos produtos por importância/giro (A = mais relevantes).
- **Código (do produto/cliente/fornecedor):** o **código sequencial interno** (imutável), importado do Firebird. ≠ **Referência** (que é o código do fornecedor).
- **Localização:** endereçamento do produto no estoque (rua/prateleira/nível). Pode ter mais de uma.

---

## Financeiro

- **Título:** uma conta a **receber** (CR) ou a **pagar** (CP). Gerado da venda/OS conforme a condição de pagamento.
- **Forma de pagamento:** *como* paga (dinheiro, Pix, cartão, boleto, cheque). Tem flag `usa_limite_credito`.
- **Condição de pagamento:** *quando* paga (à vista, 30, 30/60, 30/60/90…). Define parcelas e vencimentos.
- **Perfil de pagamento:** um **grupo** de formas/condições atribuído ao cliente (ex.: "Padrão à vista", "Atacado 30/60/90"). Cliente novo já nasce com um.
- **Prazo médio:** *quando o dinheiro entra de fato* (por forma). Cartão: a operadora paga ~30 dias mesmo sendo "à vista" pro cliente. Serve pro fluxo de caixa.
- **Limite de crédito:** só é consumido por pagamento **a prazo**. À vista/cartão/Pix **não** travam o limite.
- **🔸 Sino / Autorização remota:** o sininho no topo do sistema. Permite pedir **liberação remota** (desconto, crédito) a quem tem alçada, sem sair da tela. Tabela `autorizacoes`.
- **DRE:** Demonstração do Resultado (lucro/prejuízo por período).
- **Caixa (da loja):** o caixa de frente de balcão (operação diária), separado do Financeiro geral.

---

## Fiscal

- **NF-e (mod. 55):** nota de **mercadoria** (atacado, transferência, remessa, devolução).
- **NFC-e (mod. 65):** nota de **consumidor** no balcão (varejo presencial).
- **NFS-e:** nota de **serviço** (instalação/mão de obra — ISS). No grupo, só as empresas de **Umuarama** emitem.
- **CST / CSOSN:** código da situação tributária (CST = regime normal; CSOSN = Simples).
- **NCM:** classificação fiscal do produto (8 dígitos). **CEST:** complementa a NCM quando há ST.
- **🔸 Monofásico (PIS/COFINS):** produto cujo imposto é recolhido concentrado lá no fabricante/importador; o revendedor vende a **alíquota zero** (CST 04). Comum em autopeças. Se não marcar, **bitributa**.
- **ST (Substituição Tributária):** ICMS recolhido antecipado por toda a cadeia. O "substituído" (o balcão) revende **sem destaque** (CST 060 / CSOSN 500). É a maioria do catálogo.
- **DIFAL:** diferencial de alíquota em venda interestadual a consumidor final.
- **FCP:** Fundo de Combate à Pobreza (adicional de ICMS; PR tem 2% em alguns NCMs, SC não tem).
- **Regime tributário:** Lucro Real, Lucro Presumido ou Simples Nacional. Muda todo o cálculo. É por CNPJ.
- **Apuração:** o cálculo mensal de imposto a recolher (débitos − créditos).
- **SPED (EFD):** arquivos que a empresa entrega ao fisco (ICMS/IPI, Contribuições).
- **Reforma Tributária (IBS/CBS/IS):** os tributos novos que vão substituir ICMS/ISS/PIS/COFINS entre 2026 e 2033.
- **CHDADOS:** o id de empresa no **Firebird** (legado). ⚠️ Diferente do id de empresa no ERP novo.

---

## Técnico

- **RPC:** função no PostgreSQL que carrega a lógica de negócio. O front chama a RPC; a regra vive no banco.
- **Schema `"Teste ERP"`:** onde ficam as tabelas do ERP. As RPCs precisam de um **wrapper em `public`** pro front alcançar.
- **Firebird:** o sistema legado (a substituir). Fonte da verdade das regras antigas e dos dados a migrar.
- **Migration:** um arquivo de alteração do banco (em `supabase/migrations/`).
- **Guard / `erp_exigir_permissao`:** a verificação server-side de permissão do usuário.

> Falta algum termo? Adicione aqui — este glossário é a memória compartilhada da equipe.
