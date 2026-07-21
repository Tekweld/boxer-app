// proposta-engine.js
// Motor de Geração de Propostas HTML — Boxer Soldas
// Gera HTML completo e autocontido a partir dos dados do Supabase

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

async function gerarHTMLProposta(sb, proposta, itens, contatos, versao) {
  versao = versao || 1;

  // 1 — Template do tipo de produto
  const { data: tpl } = await sb.schema('comercial')
    .from('templates_proposta')
    .select('conteudo_fixo')
    .eq('tipo_produto', proposta.tipo_produto)
    .maybeSingle();

  const cf = tpl?.conteudo_fixo || {};

  // 2 — Detalhes dos produtos (para Escopo de Fornecimento e seleção de capa)
  const codigos = [...new Set(itens.map(i => i.produto_codigo))];
  const { data: prods } = await sb.from('produtos')
    .select('codigo, modelo, descricao_completa, caracteristicas, imagem_url, acessorios_padrao, espessura_solda')
    .in('codigo', codigos);
  const prodMap = Object.fromEntries((prods || []).map(p => [p.codigo, p]));

  // 3 — Imagem de capa
  let imagemCapa = cf.imagem_capa || cf.imagem_capa_fallback || '';

  if (proposta.tipo_produto === 'ROBO') {
    const { data: regras } = await sb.schema('comercial')
      .from('configs_imagem_robo')
      .select('codigos_requeridos, quantidades_min, imagem_url')
      .eq('ativo', true)
      .order('prioridade', { ascending: false });

    if (regras?.length) {
      const codSel = itens.map(i => i.produto_codigo);
      const qtdMap = {};
      itens.forEach(i => {
        qtdMap[i.produto_codigo] = (qtdMap[i.produto_codigo] || 0) + (i.quantidade || 1);
      });
      for (const r of regras) {
        const todosPresentes = (r.codigos_requeridos || []).every(c => codSel.includes(c));
        if (!todosPresentes) continue;
        const qtdsOk = Object.entries(r.quantidades_min || {}).every(([c, m]) => (qtdMap[c] || 0) >= m);
        if (!qtdsOk) continue;
        imagemCapa = r.imagem_url;
        break;
      }
    }
  } else {
    // Demais tipos (Laser, Máquinas...): capa usa a foto do item de maior valor selecionado.
    const itemMaisCaro = [...itens].sort((a, b) => (parseFloat(b.preco_final) || 0) - (parseFloat(a.preco_final) || 0))[0];
    const fotoItemMaisCaro = itemMaisCaro && prodMap[itemMaisCaro.produto_codigo]?.imagem_url;
    if (fotoItemMaisCaro) imagemCapa = fotoItemMaisCaro;
  }

  // 4 — Dados derivados
  const contPrinc = contatos.find(c => c.recebe_proposta) || contatos[0] || {};
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const valorTotal = itens.reduce((s, i) => s + (parseFloat(i.preco_final || 0) * (i.quantidade || 1)), 0);
  const valorFmt   = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const tituloCapa = cf.titulo_capa || proposta.tipo_produto;

  const rep = str => (str || '')
    .replace(/\{\{cliente_nome\}\}/g, proposta.cliente_nome || '')
    .replace(/\{\{tipo_titulo\}\}/g,  tituloCapa);

  // 5 — Montar HTML
  const cssUsado = proposta.tipo_produto === 'LASER' ? CSS_PROP_LASER : CSS_PROP;

  let corpo;
  if (proposta.tipo_produto === 'LASER') {
    corpo = await montarCorpoLaser({ proposta, cf, itens, prodMap, contatos, contPrinc, hoje, tituloCapa, rep });
  } else {
    corpo = `
${pgObjetivo(cf, rep)}
${pgEquipamentos(itens)}
${pgEscopo(itens, prodMap)}
${pgAcordo(cf, proposta.tipo_produto)}`;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(tituloCapa)} — ${esc(proposta.codigo || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${cssUsado}</style>
</head>
<body>
<div id="pg-stack">
${pgCapa(proposta, cf, imagemCapa, contPrinc, hoje, tituloCapa)}
${corpo}
${pgResumo(proposta, contatos, valorFmt, versao)}
</div>
${proposta.tipo_produto === 'LASER' ? SCRIPT_SCALE_TO_FIT : ''}
</body>
</html>`;

  return { html };
}

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
// CSS EMBUTIDO NA PROPOSTA
// ─────────────────────────────────────────────────────────────

const CSS_PROP = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Outfit,sans-serif;background:#f0f4f8;color:#1a202c;font-size:14px;line-height:1.6}
.pg{background:#fff;max-width:900px;margin:0 auto 28px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}

/* Cabeçalho das páginas internas */
.pg-header{padding:32px 48px 0;position:relative}
.pg-secao-num{font-size:22px;font-weight:700;color:#1d327b;letter-spacing:-.3px}
.pg-circle{position:absolute;top:28px;right:48px;width:26px;height:26px;background:#25bbee;border-radius:50%}
.pg-linha{height:3px;background:linear-gradient(90deg,#25bbee 60%,#25bbee22);margin:10px 48px 28px}
.pg-body{padding:0 48px 44px}

/* Capa */
.capa-top{padding:24px 44px 10px;display:flex;align-items:flex-start;justify-content:space-between;background:#fff}
.capa-logo{height:52px}
.capa-pt-label{font-size:11px;letter-spacing:5px;color:#4a5568;font-weight:500;text-align:right;padding-top:4px}
.capa-titulo{font-size:28px;font-weight:700;color:#1d327b;padding:6px 44px 12px;background:#fff}
.capa-linha-azul{height:2px;background:#25bbee;margin:0 44px 0}
.capa-img-area{background:#1d327b;min-height:360px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.capa-img-area img{max-width:92%;max-height:390px;object-fit:contain;padding:20px}
.capa-img-vazio{color:rgba(255,255,255,.3);font-size:13px;text-align:center;padding:80px 40px}
.capa-rodape{background:#fff;padding:18px 44px 24px}
.capa-rod1{font-size:13px;font-weight:500;color:#1a202c;margin-bottom:10px}
.capa-rod2{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#718096;padding-top:10px;border-top:1px solid #e2e8f0}

/* Boxes e subsecções */
.content-box{border:1px solid #d0d8e8;border-radius:8px;padding:16px 20px;font-size:13px;color:#2d3748;line-height:1.75;margin-bottom:16px}
.subsec-bar{background:#1d327b;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:10px 16px;margin-bottom:12px}

/* Diferenciais */
.diferenciais{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dif-item{display:flex;align-items:center;gap:10px;border:1px solid #d0d8e8;border-radius:6px;padding:10px 14px;font-size:12.5px;line-height:1.4}
.dif-dot{width:14px;height:14px;border-radius:50%;background:#25bbee;flex-shrink:0}

/* Equipamentos inclusos */
.eq-table{width:100%;border-collapse:collapse;font-size:13px}
.eq-table thead tr{background:#1d327b}
.eq-table thead th{color:#fff;padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px}
.eq-table tbody tr:nth-child(even){background:#f7f9fc}
.eq-table tbody td{padding:9px 14px;border-bottom:1px solid #edf2f7;color:#2d3748}
.eq-num{color:#25bbee;font-weight:600;width:52px}

/* Escopo de fornecimento */
.escopo-bloco{margin-bottom:18px}
.escopo-header{background:#1d327b;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;padding:9px 14px}
.escopo-inner{border:1px solid #d0d8e8;border-top:none;display:flex}
.escopo-foto{width:220px;min-width:220px;background:#f7f9fc;display:flex;align-items:center;justify-content:center;padding:16px;border-right:1px solid #d0d8e8}
.escopo-foto img{max-width:100%;max-height:140px;object-fit:contain}
.escopo-foto-vazio{color:#a0aec0;font-size:11px;text-align:center}
.escopo-right{flex:1;padding:16px}
.escopo-desc{font-size:13px;color:#2d3748;line-height:1.6;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-bottom:12px}
.escopo-mini{border:1px solid #d0d8e8;border-top:none;padding:16px}
.carac-table{width:100%;border-collapse:collapse;font-size:12px}
.carac-table thead tr{background:#1d327b}
.carac-table thead th{color:#fff;padding:7px 12px;text-align:center;font-size:10px;letter-spacing:.8px}
.carac-table tbody tr:nth-child(even){background:#f7f9fc}
.carac-table tbody td{padding:7px 12px;border-bottom:1px solid #edf2f7}
.carac-label{color:#718096}
.carac-valor{font-weight:600;color:#1a202c}

/* Acordo de C&V */
.acordo-item{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;font-size:13px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:6px;line-height:1.5;color:#2d3748}
.acordo-item.warn{border-color:#f6ad55;background:#fffaf0}
.acordo-item.ok  {border-color:#68d391;background:#f0fff4}
.acordo-item.info{border-color:#63b3ed;background:#ebf8ff}
.acordo-item.blok{border-color:#fc8181;background:#fff5f5}
.acordo-item.docc{border-color:#b794f4;background:#faf5ff}
.ai-icon{font-size:15px;flex-shrink:0;margin-top:2px}
.ai-sub{margin-top:8px;margin-left:4px}
.ai-sub-item{display:flex;gap:8px;font-size:12px;color:#718096;font-style:italic;margin-bottom:3px}
.acordo-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.a2col-box{border:1px solid #d0d8e8;border-radius:8px;padding:16px}
.a2col-tit{display:flex;align-items:center;gap:8px;font-weight:600;color:#1d327b;margin-bottom:10px;font-size:13px}
.garantia-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.gar-item{border:2px solid #25bbee;border-radius:8px;padding:14px;text-align:center}
.gar-label{font-size:12px;color:#4a5568;margin-bottom:8px;font-weight:500}
.gar-value{background:#1d327b;color:#fff;border-radius:20px;padding:6px 20px;font-size:14px;font-weight:700;display:inline-block}
.resp-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #d0d8e8;border-radius:8px;overflow:hidden}
.resp-col-hdr{padding:10px 16px;font-size:10.5px;font-weight:700;letter-spacing:.5px;color:#fff}
.resp-col-hdr.boxer{background:#1d327b}
.resp-col-hdr.comp {background:#276749}
.resp-item{display:flex;align-items:flex-start;gap:10px;padding:8px 16px;font-size:12.5px;border-bottom:1px solid #f0f4f8}
.resp-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:4px}
.resp-dot.az{background:#25bbee}
.resp-dot.vd{background:#38a169}

/* Resumo final */
.res-header{padding:22px 44px 14px;display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:3px solid #1d327b}
.res-body{padding:0 44px 36px}
.res-table{width:100%;border-collapse:collapse;margin:20px 0 14px}
.res-table th{background:#1d327b;color:#fff;padding:10px 16px;text-align:left;font-size:10.5px;letter-spacing:.5px}
.res-table td{padding:12px 16px;border-bottom:1px solid #edf2f7;font-size:13px}
.res-valor{color:#1d327b;font-weight:700;font-size:15px}
.res-sub{font-size:12px;color:#718096}
.envolvidos-bar{background:#1d327b;color:#fff;padding:10px 16px;font-size:10px;font-weight:700;letter-spacing:1.5px;margin-top:8px}
.envolvidos-grid{display:grid;grid-template-columns:1fr 1fr}
.env-col{padding:18px 24px;border-bottom:3px solid #25bbee}
.env-nome{font-weight:700;font-size:15px;color:#1a202c;margin-bottom:4px}
.env-cargo{font-size:12px;color:#718096}
`;

// ─────────────────────────────────────────────────────────────
// CSS DA PROPOSTA LASER (tom mais sério, páginas de tamanho fixo)
// Cópia derivada de CSS_PROP: mesmo #1d327b como único destaque de
// cor; remove o #25bbee (bolinhas, linha divisória colorida, bullets,
// bordas de garantia) por tons neutros; .pg vira tamanho fixo (A4).
// ─────────────────────────────────────────────────────────────

const PAGE_W = 900;
const PAGE_H = Math.round(PAGE_W * (297 / 210)); // proporção A4 ≈ 1273px

const CSS_PROP_LASER = CSS_PROP
  .replace('.pg{background:#fff;max-width:900px;margin:0 auto 28px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}',
            `.pg{background:#fff;width:${PAGE_W}px;height:${PAGE_H}px;margin:0 auto 24px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}`)
  .replace('.pg-circle{position:absolute;top:28px;right:48px;width:26px;height:26px;background:#25bbee;border-radius:50%}',
            '.pg-circle{display:none}')
  .replace('.pg-linha{height:3px;background:linear-gradient(90deg,#25bbee 60%,#25bbee22);margin:10px 48px 28px}',
            '.pg-linha{height:1px;background:#d0d8e8;margin:10px 48px 28px}')
  .replace('.capa-linha-azul{height:2px;background:#25bbee;margin:0 44px 0}',
            '.capa-linha-azul{height:2px;background:#1d327b;margin:0 44px 0}')
  .replace('.dif-dot{width:14px;height:14px;border-radius:50%;background:#25bbee;flex-shrink:0}',
            '.dif-dot{width:14px;height:14px;border-radius:50%;background:#1d327b;flex-shrink:0}')
  .replace('.eq-num{color:#25bbee;font-weight:600;width:52px}',
            '.eq-num{color:#1d327b;font-weight:600;width:52px}')
  .replace('.gar-item{border:2px solid #25bbee;border-radius:8px;padding:14px;text-align:center}',
            '.gar-item{border:1px solid #d0d8e8;border-radius:8px;padding:14px;text-align:center}')
  .replace('.resp-dot.az{background:#25bbee}', '.resp-dot.az{background:#1d327b}')
  .replace('.env-col{padding:18px 24px;border-bottom:3px solid #25bbee}',
            '.env-col{padding:18px 24px;border-bottom:2px solid #d0d8e8}')
  + `
/* Cabeçalho de continuação (seções paginadas em mais de uma página) */
.pg-header-cont{padding:20px 48px 0}
.pg-secao-num-cont{font-size:14px;font-weight:600;color:#4a5568;letter-spacing:-.2px}

/* Acessórios Padrão */
.acessorio-card{margin-bottom:18px}
.acessorio-card-tit{background:#1d327b;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;padding:9px 14px}
.acessorio-lista{border:1px solid #d0d8e8;border-top:none;padding:14px}
.acessorio-item{display:flex;gap:14px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #edf2f7}
.acessorio-item:last-child{border-bottom:none}
.acessorio-foto{width:72px;height:72px;min-width:72px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.acessorio-foto img{max-width:100%;max-height:100%;object-fit:contain}
.acessorio-foto-vazio{color:#a0aec0;font-size:9px;text-align:center}
.acessorio-desc-txt{font-size:12.5px;color:#2d3748;line-height:1.5;padding-top:4px}

/* Espessura de solda */
.espessura-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:8px}
.espessura-table thead tr{background:#1d327b}
.espessura-table thead th{color:#fff;padding:9px 12px;text-align:center;font-size:10.5px;letter-spacing:.5px}
.espessura-table tbody tr:nth-child(even){background:#f7f9fc}
.espessura-table tbody td{padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:center}
.espessura-table tbody td:first-child{text-align:left;font-weight:600;color:#1a202c}
`;

// ─────────────────────────────────────────────────────────────
// SCRIPT DE AJUSTE DE ZOOM (view-time, embutido na proposta Laser)
// Nunca re-pagina — só encaixa a pilha de páginas de tamanho fixo
// na largura de quem está vendo (mesma ideia de um leitor de PDF).
// ─────────────────────────────────────────────────────────────

const SCRIPT_SCALE_TO_FIT = `<script>
(function(){
  var PAGE_W = ${PAGE_W};
  var stack = document.getElementById('pg-stack');
  if (!stack) return;
  function fit(){
    var vw = document.documentElement.clientWidth;
    if (!vw) return;
    var scale = Math.min(1, vw / PAGE_W);
    stack.style.transform = 'scale(' + scale + ')';
    stack.style.transformOrigin = 'top center';
    document.body.style.height = (stack.scrollHeight * scale) + 'px';
  }
  // Execução adiada: este script roda durante o parse do HTML (fim do
  // <body>), antes do layout existir — document.documentElement.clientWidth
  // ainda seria 0 se chamado de forma síncrona aqui.
  setTimeout(fit, 0);
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
})();
<\/script>`;

// ─────────────────────────────────────────────────────────────
// PÁGINAS
// ─────────────────────────────────────────────────────────────

function pgCapa(proposta, cf, imagemCapa, contPrinc, hoje, tituloCapa) {
  const imgHTML = imagemCapa
    ? `<img src="${esc(imagemCapa)}" alt="${esc(tituloCapa)}">`
    : `<div class="capa-img-vazio">Imagem do conjunto não cadastrada</div>`;

  const acStr = contPrinc.nome ? ` • A/C: ${esc(contPrinc.nome)}` : '';

  return `<div class="pg">
  <div class="capa-top">
    <img class="capa-logo" src="https://tekweld.github.io/boxer-app/Estrela-Boxer.svg" alt="Boxer Soldas">
    <div class="capa-pt-label">P R O P O S T A &nbsp; T É C N I C A</div>
  </div>
  <div class="capa-titulo">${esc(tituloCapa)}</div>
  <div class="capa-linha-azul"></div>
  <div class="capa-img-area">${imgHTML}</div>
  <div class="capa-rodape">
    <div class="capa-rod1">Para: ${esc(proposta.cliente_nome || '')}${acStr} • ${esc(proposta.cliente_cidade || '')} – ${esc(proposta.cliente_estado || '')} – Brasil</div>
    <div class="capa-rod2">
      <span>Nova Odessa, ${hoje} &nbsp;•&nbsp; Proposta Nº ${esc(proposta.codigo || '')} &nbsp;•&nbsp; Representante: ${esc(proposta.vendedor_nome || '')}</span>
      <span>www.boxersoldas.com.br</span>
    </div>
  </div>
</div>`;
}

function pgObjetivo(cf, rep) {
  const difs = (cf.diferenciais || []).map(d =>
    `<div class="dif-item"><div class="dif-dot"></div><span>${esc(d)}</span></div>`
  ).join('');

  return `<div class="pg">
  <div class="pg-header">
    <div class="pg-secao-num">1. OBJETIVO</div>
    <div class="pg-circle"></div>
  </div>
  <div class="pg-linha"></div>
  <div class="pg-body">
    <div class="content-box">${esc(rep(cf.objetivo_paragrafo || ''))}</div>
    <div class="subsec-bar">1.1 &nbsp; DIFERENCIAIS BOXER SOLDAS</div>
    <div class="diferenciais">${difs}</div>
  </div>
</div>`;
}

function pgEquipamentos(itens) {
  const linhas = itens.map((item, i) => `<tr>
    <td class="eq-num">2.${i + 1}</td>
    <td>${esc(item.produto_modelo || item.produto_codigo || '')}</td>
  </tr>`).join('');

  return `<div class="pg">
  <div class="pg-header">
    <div class="pg-secao-num">2. EQUIPAMENTOS INCLUSOS</div>
    <div class="pg-circle"></div>
  </div>
  <div class="pg-linha"></div>
  <div class="pg-body">
    <table class="eq-table">
      <thead><tr><th style="width:60px">Nº</th><th>DESCRIÇÃO</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>
</div>`;
}

function pgEscopo(itens, prodMap) {
  const comDetalhe = itens.filter(i => prodMap[i.produto_codigo]?.descricao_completa);
  if (!comDetalhe.length) return '';

  const blocos = comDetalhe.map((item, i) => {
    const p   = prodMap[item.produto_codigo] || {};
    const num = `3.${i + 1}`;
    const tit = esc((p.modelo || item.produto_modelo || item.produto_codigo || '').toUpperCase());
    const desc = esc(p.descricao_completa || '');

    const carac = Array.isArray(p.caracteristicas) ? p.caracteristicas : [];
    const caracHTML = carac.length ? `
      <table class="carac-table">
        <thead><tr><th colspan="2">C A R A C T E R Í S T I C A S &nbsp; T É C N I C A S</th></tr></thead>
        <tbody>${carac.map(c => `<tr>
          <td class="carac-label">${esc(c.label || c.chave || '')}</td>
          <td class="carac-valor">${esc(c.valor || c.value || '')}</td>
        </tr>`).join('')}</tbody>
      </table>` : '';

    if (p.imagem_url) {
      return `<div class="escopo-bloco">
  <div class="escopo-header">${esc(num)} &nbsp; ${tit}</div>
  <div class="escopo-inner">
    <div class="escopo-foto"><img src="${esc(p.imagem_url)}" alt="${tit}"></div>
    <div class="escopo-right">
      <div class="escopo-desc">${desc}</div>
      ${caracHTML}
    </div>
  </div>
</div>`;
    }
    return `<div class="escopo-bloco">
  <div class="escopo-header">${esc(num)} &nbsp; ${tit}</div>
  <div class="escopo-mini">
    <div class="escopo-desc">${desc}</div>
    ${caracHTML}
  </div>
</div>`;
  }).join('');

  return `<div class="pg">
  <div class="pg-header">
    <div class="pg-secao-num">3. ESCOPO DE FORNECIMENTO</div>
    <div class="pg-circle"></div>
  </div>
  <div class="pg-linha"></div>
  <div class="pg-body">${blocos}</div>
</div>`;
}

function pgAcordo(cf, tipo) {
  return tipo === 'ROBO' ? pgAcordoRobo(cf) : pgAcordoGenerico(cf);
}

function pgAcordoRobo(cf) {
  const gar  = cf.garantia || {};
  const rBox = cf.responsabilidades_boxer    || [];
  const rCom = cf.responsabilidades_comprador || [];

  return `<div class="pg">
  <div class="pg-header">
    <div class="pg-secao-num">4. ACORDO DE COMPRA E VENDA</div>
    <div class="pg-circle"></div>
  </div>
  <div class="pg-linha"></div>
  <div class="pg-body">

    <div class="subsec-bar">4.1 &nbsp; ESPECIFICAÇÕES TÉCNICAS</div>
    <div class="acordo-item">
      <span class="ai-icon">🔵</span>
      <span>Não é necessário que o operador do robô Boxer já seja um programador robótico formado.</span>
    </div>
    <div class="acordo-item">
      <span class="ai-icon">🔵</span>
      <span>É necessário que o operador seja um soldador experiente, capaz de realizar soldas manuais MIG-MAG de boa qualidade.</span>
    </div>
    <div class="acordo-item" style="margin-bottom:20px">
      <span class="ai-icon">🔵</span>
      <div>Não está incluso no treinamento a capacitação para a parte de soldagem. As seguintes habilidades não são objeto do treinamento Boxer:
        <div class="ai-sub">
          <div class="ai-sub-item"><span>■</span><span>Ajuste de tensão e Corrente ideais para o processo de soldagem</span></div>
          <div class="ai-sub-item"><span>■</span><span>Angulação e stickout da tocha</span></div>
          <div class="ai-sub-item"><span>■</span><span>Velocidade de avanço e movimentação lateral da tocha</span></div>
        </div>
      </div>
    </div>

    <div class="subsec-bar">4.2 &nbsp; INSTALAÇÃO</div>
    <div class="acordo-item warn"><span class="ai-icon">⚠️</span><span>É desejável que o conjunto robótico seja ligado a uma rede elétrica exclusiva, livre de outros equipamentos para evitar interferências.</span></div>
    <div class="acordo-item warn"><span class="ai-icon">⚠️</span><span>É imprescindível que a rede de alimentação seja diferente da que alimenta máquinas de solda TIG com alta frequência.</span></div>
    <div class="acordo-item ok"  ><span class="ai-icon">✅</span><span>A entrega técnica é realizada presencialmente por um técnico da Boxer e está inclusa no pacote negociado.</span></div>
    <div class="acordo-item info"><span class="ai-icon">ℹ️</span><span>A entrega técnica capacita o soldador exclusivamente para programar os movimentos do robô — não para se tornar soldador.</span></div>
    <div class="acordo-item warn"><span class="ai-icon">⚠️</span><span>A capacitação de um operador não soldador não está inclusa na entrega técnica (conforme item 4.1.3).</span></div>
    <div class="acordo-item docc" style="margin-bottom:20px"><span class="ai-icon">📋</span><span>Após a entrega técnica, um Termo de Aceite é assinado entre as partes para formalizar que a capacitação foi de qualidade aceita.</span></div>

    <div class="subsec-bar">4.3 &nbsp; PÓS-VENDA</div>
    <div class="acordo-2col" style="margin-bottom:20px">
      <div class="a2col-box">
        <div class="a2col-tit">👥 Suporte Remoto</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.7">O pós-venda ao operador consiste em:<br>• Vídeos pré-gravados de suporte<br>• Vídeo chamadas ao vivo com técnicos Boxer para tirar dúvidas e resolver problemas</div>
      </div>
      <div class="a2col-box">
        <div class="a2col-tit">🔧 Visita Técnica</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.7;margin-bottom:12px">Caso seja solicitada uma visita técnica presencial, tal visita será cobrada conforme a tabela de valores de deslocamento dos técnicos Boxer.</div>
        <div class="acordo-item warn" style="font-size:12px;margin:0"><span class="ai-icon">⚠️</span><span>Visitas técnicas presenciais não estão inclusas no pacote e são cobradas à parte.</span></div>
      </div>
    </div>

    <div class="subsec-bar">4.4 &nbsp; OPERAÇÃO</div>
    <div class="acordo-item info"><span class="ai-icon">⭐</span><span>É importante que sejam preferencialmente utilizadas peças de reposição originais Boxer para garantir o bom funcionamento do conjunto robótico.</span></div>
    <div class="acordo-item warn"><span class="ai-icon">🔒</span><span>Para que a garantia de fábrica seja mantida, é obrigatória a manutenção do conjunto interligado original Boxer: Máquina / Robô / Controlador.</span></div>
    <div class="acordo-item blok" style="margin-bottom:20px"><span class="ai-icon">🚫</span><span>A substituição de qualquer componente do conjunto por equipamento de outra marca implica perda da garantia de fábrica Boxer.</span></div>

    <div class="subsec-bar">4.5 &nbsp; GARANTIA</div>
    <div class="content-box">A Boxer garante que o conjunto robótico está coberto contra defeitos de fabricação conforme os períodos indicados abaixo:</div>
    <div class="garantia-grid">
      <div class="gar-item"><div class="gar-label">Braço Robótico</div><div class="gar-value">${esc(gar.braco_robotico || '24 meses')}</div></div>
      <div class="gar-item"><div class="gar-label">Máquina de Solda</div><div class="gar-value">${esc(gar.maquina_solda || '15 meses')}</div></div>
      <div class="gar-item"><div class="gar-label">Tocha de Solda</div><div class="gar-value">${esc(gar.tocha_solda || '15 meses')}</div></div>
      <div class="gar-item"><div class="gar-label">Equipamentos Periféricos</div><div class="gar-value">${esc(gar.perifericos || '15 meses')}</div></div>
    </div>
    <div class="acordo-item info" style="font-size:12px"><span class="ai-icon">ℹ️</span><em>Exemplos de periféricos: mesas posicionadoras, estação de limpeza de tocha, célula NR-12 (quando fornecida pela Boxer).</em></div>
    <div class="acordo-item ok"><span class="ai-icon">✅</span><span>Os custos de deslocamento motivados por conserto ou troca de peças em garantia (defeito de fabricação) são de responsabilidade da Boxer.</span></div>
    <div class="acordo-item blok" style="margin-bottom:20px"><span class="ai-icon">🚫</span><span>Caso nossos técnicos se desloquem e seja constatado problema de falha de operação (e não defeito de fabricação), os custos de deslocamento passam a ser de responsabilidade do comprador.</span></div>

    <div class="subsec-bar">RESUMO DAS RESPONSABILIDADES</div>
    <div class="resp-grid">
      <div>
        <div class="resp-col-hdr boxer">🏭 &nbsp; BOXER SOLDAS</div>
        <div>${rBox.map(r => `<div class="resp-item"><div class="resp-dot az"></div><span>${esc(r)}</span></div>`).join('')}</div>
      </div>
      <div>
        <div class="resp-col-hdr comp">🏢 &nbsp; COMPRADOR</div>
        <div>${rCom.map(r => `<div class="resp-item"><div class="resp-dot vd"></div><span>${esc(r)}</span></div>`).join('')}</div>
      </div>
    </div>

  </div>
</div>`;
}

function pgAcordoGenerico(cf, opts = {}) {
  const secNum = opts.secNum || 4;
  const gar  = cf.garantia || {};
  const rBox = cf.responsabilidades_boxer    || [];
  const rCom = cf.responsabilidades_comprador || [];
  const garItems = Object.entries(gar);

  const garHTML = garItems.length ? `
    <div class="subsec-bar">GARANTIA</div>
    <div class="garantia-grid">
      ${garItems.map(([k, v]) => `<div class="gar-item">
        <div class="gar-label">${esc(k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</div>
        <div class="gar-value">${esc(v)}</div>
      </div>`).join('')}
    </div>` : '';

  const entregaTecnicaHTML = opts.entregaTecnica ? `
    <div class="subsec-bar">ENTREGA TÉCNICA</div>
    <div class="content-box">A entrega técnica presencial do equipamento é item obrigatório da venda. O valor é calculado conforme a distância entre a sede da Boxer Soldas e o endereço do cliente, e será informado separadamente pelo vendedor responsável.</div>` : '';

  return `<div class="pg">
  <div class="pg-header">
    <div class="pg-secao-num">${secNum}. ACORDO DE COMPRA E VENDA</div>
    <div class="pg-circle"></div>
  </div>
  <div class="pg-linha"></div>
  <div class="pg-body">
    ${garHTML}
    ${entregaTecnicaHTML}
    <div class="subsec-bar">RESUMO DAS RESPONSABILIDADES</div>
    <div class="resp-grid">
      <div>
        <div class="resp-col-hdr boxer">🏭 &nbsp; BOXER SOLDAS</div>
        <div>${rBox.map(r => `<div class="resp-item"><div class="resp-dot az"></div><span>${esc(r)}</span></div>`).join('')}</div>
      </div>
      <div>
        <div class="resp-col-hdr comp">🏢 &nbsp; COMPRADOR</div>
        <div>${rCom.map(r => `<div class="resp-item"><div class="resp-dot vd"></div><span>${esc(r)}</span></div>`).join('')}</div>
      </div>
    </div>
  </div>
</div>`;
}

function pgResumo(proposta, contatos, valorFmt, versao) {
  const descAtual = `Proposta técnica ${esc(proposta.codigo || '')} V.${versao}`;

  const contatosHTML = contatos.map(c => `
  <div class="env-col">
    <div class="env-nome">${esc(c.nome || '')}</div>
    <div class="env-cargo">${esc(proposta.cliente_nome || '')}</div>
  </div>`).join('');

  return `<div class="pg">
  <div class="res-header">
    <img style="height:44px" src="https://tekweld.github.io/boxer-app/Estrela-Boxer.svg" alt="Boxer Soldas">
    <span style="font-size:11px;color:#718096">www.boxersoldas.com.br</span>
  </div>
  <div class="res-body">
    <table class="res-table">
      <thead>
        <tr>
          <th style="width:120px">Nº OFERTA</th>
          <th>DESCRIÇÃO DE ATUALIZAÇÃO</th>
          <th style="width:200px;text-align:right">VALOR DA PROPOSTA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${esc(proposta.codigo || '')}</td>
          <td>${descAtual}</td>
          <td style="text-align:right"><span class="res-valor">${esc(valorFmt)}</span></td>
        </tr>
        <tr>
          <td colspan="3" class="res-sub">Prazo de pagamento: ${esc(proposta.prazo_pagamento || '')}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:center;font-size:12px;font-weight:600;color:#1d327b;padding:10px 16px">${esc(proposta.cliente_nome || '')}</td>
        </tr>
      </tbody>
    </table>
    <div class="envolvidos-bar">E N V O L V I D O S</div>
    <div class="envolvidos-grid">
      ${contatosHTML}
      <div class="env-col">
        <div class="env-nome">${esc(proposta.vendedor_nome || '')}</div>
        <div class="env-cargo">Boxer Soldas</div>
      </div>
    </div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────
// PROPOSTA LASER — corpo com numeração dinâmica + paginação de
// tamanho fixo (Escopo, Acessórios Padrão, Espessura de Solda).
// Isolado do fluxo legado (ROBO/MÁQUINAS) para não gerar risco de
// regressão nesses tipos — nada abaixo é usado fora do tipo LASER.
// ─────────────────────────────────────────────────────────────

async function montarCorpoLaser({ proposta, cf, itens, prodMap, rep }) {
  const itensComEscopo = itens.filter(i => prodMap[i.produto_codigo]?.descricao_completa);
  const itensComAcessorios = itens.filter(i => (prodMap[i.produto_codigo]?.acessorios_padrao || []).length);
  const itensComEspessura = itens.filter(i => {
    const e = prodMap[i.produto_codigo]?.espessura_solda;
    return e && (e.aco_carbono || e.aco_inox || e.aluminio);
  });

  let n = 2; // 1 = Objetivo, 2 = Equipamentos (fixos, sempre presentes)
  const secEscopo     = itensComEscopo.length     ? ++n : null;
  const secAcessorios = itensComAcessorios.length ? ++n : null;
  const secEspessura  = itensComEspessura.length  ? ++n : null;
  const secAcordo = ++n;

  const objetivoHTML     = pgObjetivo(cf, rep);
  const equipamentosHTML = pgEquipamentos(itens);

  let escopoHTML = '', acessoriosHTML = '', espessuraHTML = '';
  const frame = await prepararMedidor();
  try {
    if (secEscopo) {
      const blocos = montarBlocosEscopo(itensComEscopo, prodMap, secEscopo);
      escopoHTML = await paginar(frame, blocos, secaoOpts(secEscopo, 'ESCOPO DE FORNECIMENTO'));
    }
    if (secAcessorios) {
      const blocos = montarBlocosAcessorios(itensComAcessorios, prodMap);
      acessoriosHTML = await paginar(frame, blocos, secaoOpts(secAcessorios, 'ACESSÓRIOS PADRÃO'));
    }
    if (secEspessura) {
      const linhas = montarLinhasEspessura(itensComEspessura, prodMap);
      espessuraHTML = await paginar(frame, linhas, {
        ...secaoOpts(secEspessura, 'ESPESSURA DE SOLDA'),
        wrap: rows => `<table class="espessura-table"><thead><tr><th>Modelo</th><th>Aço Carbono</th><th>Aço Inox</th><th>Alumínio</th></tr></thead><tbody>${rows}</tbody></table>`
      });
    }
  } finally {
    frame.remove();
  }

  const acordoHTML = pgAcordoGenerico(cf, { secNum: secAcordo, entregaTecnica: true });

  return `${objetivoHTML}\n${equipamentosHTML}\n${escopoHTML}\n${acessoriosHTML}\n${espessuraHTML}\n${acordoHTML}`;
}

function secaoOpts(secNum, titulo) {
  return {
    headerHTML: `<div class="pg-secao-num">${secNum}. ${titulo}</div><div class="pg-circle"></div>`,
    headerContHTML: `<div class="pg-secao-num-cont">${secNum}. ${titulo} (cont.)</div>`
  };
}

function montarBlocosEscopo(itensComDetalhe, prodMap, secNum) {
  return itensComDetalhe.map((item, i) => {
    const p    = prodMap[item.produto_codigo] || {};
    const num  = `${secNum}.${i + 1}`;
    const tit  = esc((p.modelo || item.produto_modelo || item.produto_codigo || '').toUpperCase());
    const desc = esc(p.descricao_completa || '');

    const carac = Array.isArray(p.caracteristicas) ? p.caracteristicas : [];
    const caracHTML = carac.length ? `
      <table class="carac-table">
        <thead><tr><th colspan="2">C A R A C T E R Í S T I C A S &nbsp; T É C N I C A S</th></tr></thead>
        <tbody>${carac.map(c => `<tr>
          <td class="carac-label">${esc(c.label || c.chave || '')}</td>
          <td class="carac-valor">${esc(c.valor || c.value || '')}</td>
        </tr>`).join('')}</tbody>
      </table>` : '';

    const html = p.imagem_url ? `<div class="escopo-bloco">
  <div class="escopo-header">${esc(num)} &nbsp; ${tit}</div>
  <div class="escopo-inner">
    <div class="escopo-foto"><img src="${esc(p.imagem_url)}" alt="${tit}"></div>
    <div class="escopo-right">
      <div class="escopo-desc">${desc}</div>
      ${caracHTML}
    </div>
  </div>
</div>` : `<div class="escopo-bloco">
  <div class="escopo-header">${esc(num)} &nbsp; ${tit}</div>
  <div class="escopo-mini">
    <div class="escopo-desc">${desc}</div>
    ${caracHTML}
  </div>
</div>`;

    return { key: item.produto_codigo, html };
  });
}

function montarBlocosAcessorios(itensComAcessorios, prodMap) {
  return itensComAcessorios.map(item => {
    const p   = prodMap[item.produto_codigo] || {};
    const tit = esc((p.modelo || item.produto_modelo || item.produto_codigo || '').toUpperCase());
    const acessorios = Array.isArray(p.acessorios_padrao) ? p.acessorios_padrao : [];

    const itensHTML = acessorios.map(a => {
      const foto = a.imagem_url
        ? `<div class="acessorio-foto"><img src="${esc(a.imagem_url)}" alt=""></div>`
        : `<div class="acessorio-foto"><span class="acessorio-foto-vazio">Sem foto</span></div>`;
      return `<div class="acessorio-item">${foto}<div class="acessorio-desc-txt">${esc(a.descricao || '')}</div></div>`;
    }).join('');

    const html = `<div class="acessorio-card">
  <div class="acessorio-card-tit">${esc(item.produto_codigo)} &nbsp; ${tit}</div>
  <div class="acessorio-lista">${itensHTML}</div>
</div>`;

    return { key: item.produto_codigo, html };
  });
}

function montarLinhasEspessura(itensComEspessura, prodMap) {
  return itensComEspessura.map(item => {
    const p = prodMap[item.produto_codigo] || {};
    const e = p.espessura_solda || {};
    const modelo = esc(p.modelo || item.produto_modelo || item.produto_codigo || '');
    const html = `<tr><td>${modelo}</td><td>${esc(e.aco_carbono || '—')}</td><td>${esc(e.aco_inox || '—')}</td><td>${esc(e.aluminio || '—')}</td></tr>`;
    return { key: item.produto_codigo, html };
  });
}

// ─── MOTOR DE PAGINAÇÃO (medição real em iframe oculto) ─────────────────────

function criarMeasureFrame() {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + PAGE_W + 'px;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);
  const doc = f.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS_PROP_LASER}</style></head>
<body><div id="measure-root" style="width:${PAGE_W}px"></div></body></html>`);
  doc.close();
  return f;
}

async function prepararMedidor() {
  const f = criarMeasureFrame();
  try {
    if (f.contentDocument.fonts?.ready) await f.contentDocument.fonts.ready;
  } catch (e) { /* segue com o melhor esforço se a API não estiver disponível */ }
  // Espera curta para o layout assentar — evitamos requestAnimationFrame aqui
  // porque não dispara de forma confiável em todo contexto (ex.: abas/iframes
  // fora de foco ou não visíveis durante a geração automática da proposta).
  await new Promise(r => setTimeout(r, 60));
  return f;
}

function medir(doc, innerHTML) {
  const root = doc.getElementById('measure-root');
  root.innerHTML = innerHTML;
  return root.getBoundingClientRect().height;
}

async function paginar(frame, blocks, opts) {
  const doc = frame.contentDocument;
  const SAFETY = 20;

  const headerH     = medir(doc, `<div class="pg-header">${opts.headerHTML}</div><div class="pg-linha"></div>`);
  const headerContH = medir(doc, `<div class="pg-header-cont">${opts.headerContHTML}</div><div class="pg-linha"></div>`);
  const heights = blocks.map(b => medir(doc, `<div class="pg-body">${opts.wrap ? opts.wrap(b.html) : b.html}</div>`));

  const pages = [];
  let current = [], used = 0, first = true;

  for (let i = 0; i < blocks.length; i++) {
    const budget = (first ? PAGE_H - headerH : PAGE_H - headerContH) - SAFETY;
    const h = heights[i];
    if (current.length && used + h > budget) {
      pages.push(current);
      current = []; used = 0; first = false;
    }
    if (!current.length && h > budget) {
      console.warn(`[proposta] bloco "${blocks[i].key}" excede o orçamento da página (${Math.round(h)}px > ${Math.round(budget)}px) — permitindo overflow controlado.`);
    }
    current.push(blocks[i]); used += h;
  }
  if (current.length) pages.push(current);

  return pages.map((pageBlocks, idx) => {
    const bodyInner = pageBlocks.map(b => b.html).join('');
    const body = opts.wrap ? opts.wrap(bodyInner) : bodyInner;
    const headerHTML = idx === 0
      ? `<div class="pg-header">${opts.headerHTML}</div>`
      : `<div class="pg-header-cont">${opts.headerContHTML}</div>`;
    return `<div class="pg">${headerHTML}<div class="pg-linha"></div><div class="pg-body">${body}</div></div>`;
  }).join('\n');
}
