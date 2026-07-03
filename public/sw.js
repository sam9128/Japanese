const CACHE="nihongo-stairs-v9-session-persistence";
const PERIODS=["115-07","115-08","115-09","115-10","115-11","115-12","116-01","116-02","116-03","116-04","116-05","116-06"];
const PRELOAD=["./","./offline.html","./manifest.webmanifest","./icons/icon.svg","./日語階梯_完整教材.txt","./content/index.json",...PERIODS.map(period=>`./content/periods/${period}.json`)];

async function installApp(){
  const cache=await caches.open(CACHE);
  await cache.addAll(PRELOAD);
  const response=await fetch("./");
  const html=await response.text();
  const assetUrls=[...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map(match=>match[1])
    .filter(url=>url.startsWith("./assets/")||url.startsWith("assets/"));
  await cache.addAll(assetUrls);
  await self.skipWaiting();
}

self.addEventListener("install",event=>event.waitUntil(installApp()));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>event.request.mode==="navigate"?caches.match("./offline.html"):cached)));
});
