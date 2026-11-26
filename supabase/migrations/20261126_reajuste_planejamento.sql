-- Planejamento de reajuste de tabela (apenas REGISTRA os racionais; nao altera produtos.pv_sp)
-- Precedencia na simulacao: sku > categoria > linha > tabela

create table if not exists public.reajuste_planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  vigencia date,
  status text not null default 'rascunho' check (status in ('rascunho','aprovado','aplicado','cancelado')),
  observacao text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aplicado_em timestamptz,
  aplicado_por text,
  ativo boolean not null default true
);

create table if not exists public.reajuste_regras (
  id bigint generated always as identity primary key,
  plano_id uuid not null references public.reajuste_planos(id) on delete cascade,
  tabela_id integer not null references public.tabelas(id),
  escopo text not null check (escopo in ('tabela','linha','categoria','sku')),
  linha text,                                   -- categorias.categoria_grupo (ex.: Laser, Robo, Maquinas)
  categoria_id integer references public.categorias(id),
  codigo text,                                  -- produtos.codigo (SKU)
  percentual numeric(7,3) not null,             -- +10 = aumento de 10%; negativo = reducao
  observacao text,
  criado_por text,
  criado_em timestamptz not null default now(),
  ativo boolean not null default true,
  constraint reajuste_regras_alvo check (
    (escopo='tabela'    and linha is null and categoria_id is null and codigo is null) or
    (escopo='linha'     and linha is not null and categoria_id is null and codigo is null) or
    (escopo='categoria' and categoria_id is not null and linha is null and codigo is null) or
    (escopo='sku'       and codigo is not null and linha is null and categoria_id is null))
);
create unique index if not exists reajuste_regras_unica on public.reajuste_regras
  (plano_id, tabela_id, escopo, coalesce(linha,''), coalesce(categoria_id,0), coalesce(codigo,'')) where ativo;
create index if not exists reajuste_regras_plano on public.reajuste_regras(plano_id);

alter table public.reajuste_planos enable row level security;
alter table public.reajuste_regras enable row level security;
create policy reajuste_planos_admin on public.reajuste_planos for all
  using (public.eh_perfil_admin()) with check (public.eh_perfil_admin());
create policy reajuste_regras_admin on public.reajuste_regras for all
  using (public.eh_perfil_admin()) with check (public.eh_perfil_admin());

-- Simulacao (somente leitura): preco atual x novo por produto, conforme regras do plano.
-- Mesmo criterio do "% Reajuste em Massa": produtos ativos com pv_sp>0, arredondado a 2 casas.
-- Categorias do grupo 'Maquinas' na tabela 2 (BMAX) ficam fora: sincronizadas da Revendas (x1.308).
create or replace function public.reajuste_simular(p_plano uuid)
returns table(produto_id int, tabela_id int, codigo text, modelo text, categoria_id int, categoria text,
              linha text, pv_atual numeric, percentual numeric, origem text, pv_novo numeric)
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.eh_perfil_admin() then raise exception 'acesso restrito a administradores'; end if;
  return query
  select p.id, p.tabela_id, p.codigo::text, p.modelo::text, p.categoria_id, c.nome::text,
         c.categoria_grupo::text, p.pv_sp, coalesce(r.percentual,0), coalesce(r.escopo,'sem regra'),
         case when r.id is null then p.pv_sp else round(p.pv_sp*(1+r.percentual/100),2) end
  from public.produtos p
  join public.categorias c on c.id = p.categoria_id
  left join lateral (
    select rr.* from public.reajuste_regras rr
    where rr.plano_id = p_plano and rr.ativo and rr.tabela_id = p.tabela_id
      and ((rr.escopo='sku' and rr.codigo = p.codigo)
        or (rr.escopo='categoria' and rr.categoria_id = p.categoria_id)
        or (rr.escopo='linha' and rr.linha = c.categoria_grupo)
        or rr.escopo='tabela')
    order by case rr.escopo when 'sku' then 1 when 'categoria' then 2 when 'linha' then 3 else 4 end
    limit 1) r on true
  where p.ativo and p.pv_sp > 0
    and not (p.tabela_id = 2 and c.categoria_grupo = 'Máquinas');
end $$;
