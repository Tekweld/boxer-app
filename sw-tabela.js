// Service worker da tabela de teste.
// Responde apenas pela propria pagina, pela proposta preliminar e por bibliotecas/fontes pedidas por elas.
// Nao intercepta Supabase, Hub nem as demais paginas do site.
const VERSAO = 'tabela-v2';
const PAGINA = '/tabela-teste.html';
const PRELIM = '/orcamento.html';
const ESTATICOS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
  '/bpartner-logo.png',
  '/Estrela-Boxer.svg'
];
const HOSTS_CACHE = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await Promise.allSettled([
      c.add(new Request(PAGINA + '?t=1', { cache: 'reload' })).then(() => c.match(PAGINA + '?t=1')).then(r => r && c.put(PAGINA, r.clone())),
      c.add(new Request(PRELIM + '?preliminar=1', { cache: 'reload' })).then(() => c.match(PRELIM + '?preliminar=1')).then(r => r && c.put(PRELIM, r.clone())),
      ...ESTATICOS.map(u => c.add(new Request(u, { mode: u.startsWith('http') && !u.includes('fonts.googleapis') ? 'no-cors' : 'cors' })))
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

function doApp(req) {
  try { const p = new URL(req.referrer).pathname; return p === PAGINA || (p === PRELIM && new URL(req.referrer).searchParams.get('preliminar') === '1'); } catch (_) { return false; }
}

// rede primeiro (versao nova sempre que ha sinal); cache quando nao ha
function redePrimeiro(req, chave) {
  return (async () => {
    const c = await caches.open(VERSAO);
    try {
      const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 6000))]);
      if (r && r.ok) c.put(chave, r.clone());
      return r;
    } catch (_) {
      const hit = await c.match(chave);
      if (hit) return hit;
      return new Response('Sem conexão e esta página ainda não foi guardada neste aparelho. Abra uma vez com internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesma = url.origin === self.location.origin;

  if (req.mode === 'navigate' && mesma && url.pathname === PAGINA) { e.respondWith(redePrimeiro(req, PAGINA)); return; }
  if (req.mode === 'navigate' && mesma && url.pathname === PRELIM && url.searchParams.get('preliminar') === '1') { e.respondWith(redePrimeiro(req, PRELIM)); return; }

  // bibliotecas, fontes e imagens pedidas pelo app: usa o guardado e atualiza por tras
  const estatico = mesma ? /\.(png|svg|ico|webp|jpg|jpeg)$/i.test(url.pathname) : HOSTS_CACHE.includes(url.hostname);
  if (estatico && doApp(req)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSAO);
      const hit = await c.match(req);
      const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await rede) || Response.error();
    })());
  }
});
