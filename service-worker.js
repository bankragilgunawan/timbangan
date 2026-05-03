const CACHE_NAME = 'nota-karet-v1';
const ASSETS_TO_CACHE = [
  '/timbangan/',
  '/timbangan/index.html',
  '/timbangan/style.css',
  '/timbangan/script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Tahap Instalasi
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Membuka cache dan menyimpan aset');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Strategi: Ambil dari Cache dulu, jika gagal baru ambil dari Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
