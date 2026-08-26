// 快取版本號 — 更新網頁內容時，把這個數字改變（例如 v3），
// 街友的手機下次連上網路時就會自動抓新版本，不需要任何手動操作。
const CACHE_VERSION = "v2";
const CACHE_NAME = "find-help-" + CACHE_VERSION;

// 需要死死鎖進手機硬碟的檔案，斷網也一定要能開啟
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 安裝階段：把核心檔案強制下載進快取
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 啟用階段：清掉舊版本快取，換上新版本
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("find-help-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 攔截所有請求：
// 策略＝「有網路就默默更新快取，沒網路就直接用快取，保證斷網也有畫面」
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("", { status: 504 });
        })
      )
  );
});
