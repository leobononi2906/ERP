# Fotos de produto — arquitetura (servidor interno)

> Decisão do Leo (17/08): as fotos **não** virão do Bling; vão morar no **servidor interno** do grupo (o mesmo que já roda). Aqui está o plano da melhor forma.

## Princípio central
**O banco guarda só a URL/caminho da foto — nunca o binário.** Colocar imagem como `bytea` no Postgres incha o banco, deixa backup/replicação lentos e piora tudo. Arquivo é arquivo (servidor de arquivos), banco é índice.

## Como fica (recomendado)
1. **Arquivo** mora no servidor interno, numa pasta dedicada. Ex.: `D:\fotos\produtos\`.
2. **Nome do arquivo = `codigo` do produto** (o sequencial interno **imutável**). Ex.: `1045.jpg`, `1045_2.jpg` (2ª foto).
   - Por quê o código: nunca muda (trigger trava), então a URL **nunca quebra**; e permite **importar em lote** fotos que já existam, nomeando pelo código.
3. **Servir por HTTP** pelo servidor web interno (nginx / IIS) como pasta estática: `http://servidor-interno/fotos/produtos/1045.jpg`. O ERP só aponta a URL — não processa imagem.
4. **No banco:**
   - `produtos.foto_url` = URL da foto **principal** (atalho pra listas/cards). ✅ coluna criada.
   - `produtos_imagens(id_produto, url, ordem, principal)` = galeria (várias fotos). ✅ tabela criada.
5. **Upload** (no cadastro de produto): campo de foto → envia o arquivo pro servidor interno (endpoint simples de upload) → grava a URL no banco. No upload já gerar **miniatura** (thumb pra lista) + manter a **full** (pro zoom).

## Fonte plugável (importante pro período de teste)
Como o que fica no banco é **a URL**, a origem é trocável sem mexer no front:
- **Agora (ERP em teste no Supabase):** dá pra usar **Supabase Storage** e já testar foto de verdade.
- **Produção (on-prem):** troca a base da URL pro servidor interno. O front (que só renderiza `foto_url`) não muda nada.

Ou seja: podemos ligar foto **hoje** via Storage e migrar os arquivos pro servidor interno depois, sem retrabalho de código.

## O que falta construir
- **Endpoint de upload** no servidor interno (recebe arquivo, salva por código, gera thumb, devolve URL). Alternativa de transição: Supabase Storage bucket `produtos`.
- **UI no cadastro de produto:** enviar/trocar/remover foto + marcar principal (grava em `produtos_imagens` + espelha `produtos.foto_url`).
- **RPCs:** `erp_produto_imagens_listar/_salvar/_excluir/_principal`.
- Já pronto: `os_produtos_dados` devolve `foto` → o card da **Solicitar peça** mostra assim que houver URL.

## Decisão pendente do Leo
- **Upgrade opcional:** em vez de pasta + nginx, usar **MinIO** (object storage S3 self-hosted no servidor interno) — mais robusto/escalável, URLs assinadas. Pasta+web server é mais simples e resolve; MinIO é o "next level" se o volume crescer.
