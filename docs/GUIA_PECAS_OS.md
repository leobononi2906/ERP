# Guia — Como adicionar peças/produtos numa Ordem de Serviço (OS)

> Dúvida do Leo (17/08): "não achei onde adiciono o produto na OS". Resposta: **a peça não entra na tela de criação da OS**. Ela entra **depois que a OS está salva**, dentro do detalhe da OS, na aba **"Peças"**. Abaixo o passo a passo e as regras já implementadas.

## Onde fica (o ponto que confunde)
- Na **criação/edição** da OS você preenche: cliente, veículo, vendedor/responsável, prisma, **defeitos** e **serviços** (mão de obra).
- **Produto/peça é lançado no detalhe da OS já salva** → abra a OS → aba **"Peças"**. É lá que estão os botões de adicionar.

## Passo a passo (adicionar uma peça)
1. **Vendas/Serviços → Ordens de Serviço** → clique na OS para abrir o **detalhe**.
2. Clique na aba **"Peças"** (ícone de caixa).
3. Clique em **"Solicitar Peça"** (botão azul).
4. No modal:
   - **Buscar produto** por *Código + Nome*, *Referência do fornecedor* ou *Código de barras*.
   - Ao selecionar, aparece **foto**, **preço** e **estoque** (verde = tem / vermelho = sem estoque).
   - Digite a **quantidade** e tecle **Enter** (ou clique "Solicitar").
5. A peça entra na OS. O modal reabre limpo pra você já lançar a próxima (fluxo por teclado).

## Os 3 botões da aba "Peças"
| Botão | Quando usar | O que acontece |
|-------|-------------|----------------|
| **Solicitar Peça** (padrão) | Peça que tem no estoque | Vai para a **Separação**; a boqueta separa e entrega; **estoque baixa na entrega**. Aparece como "Solicitação de Separação" e depois vira linha na tabela. |
| **🎯 Lançamento direto** (dentro do "Solicitar Peça", só quem tem permissão de **aprovar**) | Peça já em mãos, sem passar pela boqueta | **Baixa o estoque na hora** (`os_peca_lancar_direto`). |
| **Encomendar** | Peça que **não tem** e precisa ser comprada | Gera **encomenda** → vai para o **Compras** cotar. |
| **Lançar Produção** | Peça **fabricada internamente** | Cria item de produção com apontamento de mão de obra. |

## Regras/travas já implementadas (não é preciso construir)
- Os botões da aba Peças **só aparecem** se: você tem **permissão de editar** E a OS **não está FATURADA** nem cancelada. → Se não aparecem, é permissão ou a OS já foi faturada.
- **Peça em separação fica travada** (ícone de cadeado): só a **boqueta** altera a quantidade (por falta de estoque, etc.). A OS não mexe.
- Peça na OS é **sempre cobrada** (o modo "consumo interno" que não cobra é só no **Pátio**, não na OS).
- **Faturamento da OS trava** enquanto houver serviço, separação ou apontamento em aberto (garante a validação da oficina).
- O **"Lançamento direto"** é o modo autorizado que pula a boqueta — por isso só aparece para perfil com aprovação.

## RPCs por trás (referência técnica)
- `os_solicitar_peca(p_id_os, p_id_produto, p_quantidade, p_valor_unitario, p_id_usuario, p_consumo, p_id_producao)` — solicita para separação.
- `os_peca_lancar_direto(p_id_os, p_id_produto, p_quantidade, p_valor_unitario, p_ator)` — lançamento direto (baixa na hora).
- `encomenda_solicitar(p jsonb)` — encomenda para o Compras.
- `os_lancar_producao(p jsonb)` / `os_producao_concluir(p_id_os_peca, p_id_usuario)` — peça de produção.
- `os_detalhe_dados(p_id_os)` — recarrega peças/expedições da OS.
- Busca de produto: `erp_produtos_buscar(p_campo, p_termo, p_limit)`.

**Status: tudo implementado e no ar.** Tela em `src/pages/OrdensServico.jsx` (aba "Peças" + modal "Solicitar Peça").
