// Service worker da tabela de teste (escopo: apenas /tabela-teste.html).
// Nao intercepta Supabase, Hub nem nenhuma outra pagina do site.
const VERSAO = 'tabela-v1';
const PAGINA = '/tabela-teste.html';
const ESTATICOS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
  '/bpartner-logo.png'
];
const HOSTS_CACHE = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await Promise.allSettled([
      c.add(new Request(PAGINA + '?t=1', { cache: 'reload' })).then(() => c.match(PAGINA + '?t=1')).then(r => r && c.put(PAGINA, r.clone())),
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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // a propria pagina: rede primeiro (sempre a versao nova), cache so quando nao ha sinal
  if (req.mode === 'navigate' && url.origin === self.location.origin && url.pathname === PAGINA) {
    e.respondWith((async () => {
      const c = await caches.open(VERSAO);
      try {
        const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 6000))]);
        if (r && r.ok) c.put(PAGINA, r.clone());
        return r;
      } catch (_) {
        const hit = await c.match(PAGINA);
        if (hit) return hit;
        return new Response('Sem conexão e a tabela ainda não foi guardada neste aparelho. Abra uma vez com internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // bibliotecas e fontes: usa o guardado e atualiza por tras
  const mesmaOrigemEstatica = url.origin === self.location.origin && /\.(png|svg|ico|webp|jpg|jpeg)$/i.test(url.pathname);
  if (HOSTS_CACHE.includes(url.hostname) || mesmaOrigemEstatica) {
    e.respondWith((async () => {
      const c = await caches.open(VERSAO);
      const hit = await c.match(req);
      const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await rede) || Response.error();
    })());
  }
});
