// Busca o saldo de estoque de todos os produtos no ZenERP e grava na
// tabela estoque_zenerp do Supabase. Pensada para rodar em cron (ex: a
// cada 30 minutos) - ver Database > Cron Jobs no painel do Supabase.
//
// Segredos necessários (Project Settings > Edge Functions > Secrets):
//   ZENERP_TENANT       - ex: "boxer"
//   ZENERP_TOKEN        - o token Bearer do ZenERP (sem o prefixo "Bearer ")
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente
// pelo Supabase em toda Edge Function - não precisam ser cadastrados.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  try {
    const tenant = Deno.env.get('ZENERP_TENANT');
    const token = Deno.env.get('ZENERP_TOKEN');
    if (!tenant || !token) {
      return new Response(JSON.stringify({ error: 'ZENERP_TENANT ou ZENERP_TOKEN não configurados' }), { status: 500 });
    }

    const zenRes = await fetch('https://api.zenerp.app.br/system/data/dataSourceOpRead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tenant': tenant,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: '/salesbreath/stockAvailabilityCube',
        parameters: { SHOW_PRODUCT: true, SHOW_PRODUCT_PACKING: true },
      }),
    });

    if (!zenRes.ok) {
      const text = await zenRes.text();
      return new Response(JSON.stringify({ error: 'ZenERP respondeu ' + zenRes.status, body: text.slice(0, 500) }), { status: 502 });
    }

    const rows = await zenRes.json();

    // Cada embalagem (productPacking_code) é um item vendável próprio no
    // nosso catálogo - ex: "7005012" e "7005012/20" são dois códigos
    // distintos em produtos.codigo, então o saldo é indexado por
    // productPacking_code, não por product_code.
    const byCodigo = new Map();
    for (const r of rows) {
      const codigo = r.productPacking_code;
      if (!codigo) continue;
      byCodigo.set(codigo, r);
    }

    const agora = new Date().toISOString();
    const upsertRows = Array.from(byCodigo.entries()).map(([codigo, r]) => ({
      codigo,
      quantity_balance: r.quantity_balance ?? 0,
      atualizado_em: agora,
    }));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.from('estoque_zenerp').upsert(upsertRows, { onConflict: 'codigo' });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, produtos_atualizados: upsertRows.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
