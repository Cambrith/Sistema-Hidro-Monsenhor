// Service worker do Portal do Aluno — Hidro Monsenhor
//
// Estratégia:
// - Assets estáticos (JS, CSS, imagens, fontes) → cache-first
// - Navegação (HTML) e chamadas de dados (Supabase, RPC) → network-first,
//   com fallback pro cache (ou pra offline.html, no caso de navegação)
//
// IMPORTANTE sobre versionamento: sempre que este arquivo mudar (nova versão
// do app), troque o valor de CACHE_VERSION abaixo. Isso força o navegador a
// criar um cache novo e descartar o antigo — sem isso, o celular do usuário
// pode ficar "preso" numa versão antiga do app.
const CACHE_VERSION = "v2";
const STATIC_CACHE = `hidro-monsenhor-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `hidro-monsenhor-runtime-${CACHE_VERSION}`;

const CACHE_ATUAL = [STATIC_CACHE, RUNTIME_CACHE];

// Arquivos essenciais, cacheados assim que o service worker instala.
// v2: adicionado manifest-admin.json (Fase 2 / Opção B — painel instalável).
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/manifest-admin.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const EXTENSOES_ESTATICAS = /\.(js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((nome) => !CACHE_ATUAL.includes(nome)).map((nome) => caches.delete(nome)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só GET entra no jogo de cache — nunca interceptar POST/PUT/DELETE
  // (login, gravação de dados no Supabase, etc.)
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const mesmaOrigem = url.origin === self.location.origin;

  // Navegação (usuário abrindo uma página / trocando de rota) → network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavegacao(request));
    return;
  }

  // Assets estáticos same-origin → cache-first
  if (mesmaOrigem && EXTENSOES_ESTATICAS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Fontes do Google (cross-origin, mudam raramente) → cache-first também
  if (url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.hostname === "fonts.googleapis.com") {
    event.respondWith(networkFirstGenerico(request));
    return;
  }

  // Todo o resto (chamadas de API, Supabase, RPC) → network-first sem
  // fallback forçado: se falhar e não tiver nada em cache, deixa a
  // aplicação lidar com o erro normalmente (não é papel do SW mascarar isso).
  if (mesmaOrigem) {
    event.respondWith(networkFirstGenerico(request));
  }
  // Chamadas cross-origin que não sejam fontes (ex: api.supabase.co) passam
  // direto, sem interceptação do service worker.
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cacheado = await cache.match(request);
  if (cacheado) return cacheado;

  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch (erro) {
    return cacheado || Response.error();
  }
}

async function networkFirstNavegacao(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch (erro) {
    const cacheado = await cache.match(request);
    if (cacheado) return cacheado;
    const offline = await caches.match("/offline.html");
    return offline || Response.error();
  }
}

async function networkFirstGenerico(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch (erro) {
    const cacheado = await cache.match(request);
    if (cacheado) return cacheado;
    throw erro;
  }
}

// Permite que a página force a ativação imediata de uma nova versão
// (usado pelo banner de atualização, se o app decidir avisar o usuário).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
