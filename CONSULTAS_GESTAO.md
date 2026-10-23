# Consultas de Gestão — receitas prontas (NÃO refazer do zero)

> Caminhos já validados contra o banco. Usar estes, não reinventar join a cada pedido.

## Lucratividade do Marketplace (por produto e por marketplace)

**Fontes certas:**
- Itens: `vw_comercial_itens_margem` (tem id_produto, id_empresa, qtd, total_item, custo_unit, tipo_saida, data_faturamento)
- Doc (taxa/frete): `vw_comercial_docs_faturados` — join por `id_doc` + `tipo_doc`
- Custo REAL: `vw_fb_produtos_compras` — join por `id_produto` **E `id_empresa`** (⚠️ sem o id_empresa o join DUPLICA a venda ~7x)
- Vendedor/canal: `vw_dim_vendedor` — `departamento = 'ECOMMERCE MKT PLACE'`

**Marketplaces (vendedores desse departamento):**
ML BONONI, ML BONONI FULL, ML BATTOGO, SHOPEE BRASIL (+ Daniel/Eric = resíduo).

**Regras de ouro aplicadas:**
- Venda e-commerce = `tipo_saida = 'ONLINE'`
- Excluir intragrupo: `abs(total_item - qtd*custo_unit) > 0.01*abs(total_item)`
- Margem SEMPRE de `custo_real`, nunca custo_unit/custo_total (congelados)
- **Taxa ML** = `taxa_marketplace` do doc = valor REAL gravado (NÃO é estimativa)
- **Taxa Shopee** vem ZERADA na base (buraco de dado — Shopee aparece com margem inflada ~+10-15pp)
- **Frete ML** = 0 na nota (ML trata frete por dentro da plataforma). **Frete Shopee** vem gravado em `valor_frete`.
- "Lucro final" aqui = venda − custo_real − taxa − frete. **NÃO inclui imposto/ST** (não é rastreável por produto).

**Query (trocar as datas):**
```sql
with it as (
  select i.qtd, i.total_item, i.custo_unit, i.produto, v.nome_vendedor,
    case when d.faturamento_doc>0 then d.taxa_marketplace*(i.total_item/d.faturamento_doc) else 0 end::numeric as taxa_item,
    case when d.faturamento_doc>0 then coalesce(d.valor_frete,0)*(i.total_item/d.faturamento_doc) else 0 end::numeric as frete_item,
    coalesce(pc.custo_real::numeric, i.custo_unit) as cr
  from vw_comercial_itens_margem i
  join vw_dim_vendedor v on v.id_vendedor=i.id_vendedor
  join vw_comercial_docs_faturados d on d.id_doc=i.id_doc and d.tipo_doc=i.tipo_doc
  left join vw_fb_produtos_compras pc on pc.id_produto=i.id_produto and pc.id_empresa=i.id_empresa
  where v.departamento='ECOMMERCE MKT PLACE' and i.tipo_saida='ONLINE'
    and i.data_faturamento between date 'INICIO' and date 'FIM'
    and abs(i.total_item - i.qtd*i.custo_unit) > 0.01*abs(i.total_item)
)
-- por marketplace: group by nome_vendedor
-- por produto:     group by nome_vendedor, produto
select nome_vendedor marketplace, produto,
  round(sum(total_item),2) venda,
  round(sum(cr*qtd),2) custo,
  round(sum(taxa_item),2) taxa,
  round(sum(frete_item),2) frete,
  round(sum(total_item - cr*qtd - taxa_item - frete_item),2) lucro_final,
  round(100.0*sum(total_item - cr*qtd - taxa_item - frete_item)/nullif(sum(total_item),0),1) lucro_pct
from it group by nome_vendedor, produto order by venda desc;
```

**Projeto Supabase:** `vishxwdxqiygbxmtpfoy`. Break-even de margem de contribuição: ~30%.
