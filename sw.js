/**
 * 🕋 Service Worker لتطبيق "صفاء الروح"
 * يدعم العمل بدون إنترنت مع استراتيجية Cache-First
 */

const CACHE_NAME = 'safaa-alrouh-v2.1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Amiri:wght@400;700&display=swap',
    'https://i.postimg.cc/zGSvxgCn/1775323811617.png'
];

// 📦 تثبيت الخدمة وتخزين الأصول الأساسية
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('✅ فتح الكاش:', CACHE_NAME);
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.log('❌ فشل التخزين:', err))
    );
});

// 🔄 تنشيط الخدمة وحذف الكاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('🗑️ حذف الكاش القديم:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// 🌐 اعتراض الطلبات وتطبيق استراتيجية Cache-First
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل طلبات غير GET    if (request.method !== 'GET') return;

    // استراتيجية Cache-First للأصول الثابتة
    if (STATIC_ASSETS.some(asset => request.url.includes(asset)) || 
        url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.png') || 
        url.pathname.endsWith('.jpg')) {
        
        event.respondWith(
            caches.match(request)
                .then((cached) => {
                    if (cached) {
                        console.log('📦 من الكاش:', request.url);
                        return cached;
                    }
                    return fetch(request)
                        .then((response) => {
                            if (response.ok) {
                                const clone = response.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => cache.put(request, clone));
                            }
                            return response;
                        })
                        .catch(() => {
                            // fallback للصفحة الرئيسية إذا فشل الطلب
                            if (request.destination === 'document') {
                                return caches.match('/index.html');
                            }
                        });
                })
        );
        return;
    }

    // استراتيجية Network-First لـ APIs (مع fallback للكاش)
    if (url.hostname.includes('api.aladhan.com') || 
        url.hostname.includes('api.openweathermap.org')) {
        
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(request, clone));
                    }
                    return response;
                })                .catch(() => caches.match(request))
        );
        return;
    }

    // الاستراتيجية الافتراضية: Network-First مع fallback
    event.respondWith(
        fetch(request)
            .catch(() => caches.match(request))
    );
});

// 🔔 دعم إشعارات الخلفية (اختياري - يتطلب Push API)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            vibrate: [200, 100, 200],
            data: { url: data.url }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 🎯 التعامل مع نقرات الإشعارات
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientsList) => {
            if (clientsList.length > 0) {
                return clientsList[0].focus();
            }
            return clients.openWindow(event.notification.data?.url || '/');
        })
    );
});

// 🔄 تحديث المحتوى في الخلفية (اختياري)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prayer-times') {
        event.waitUntil(
            // هنا يمكن إضافة منطق لتحديث المواقيت تلقائياً
            console.log('🔄 مزامنة مواقيت الصلاة في الخلفية')
        );
    }});

// 📡 التعامل مع رسائل من الصفحة الرئيسية
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(event.data.urls))
        );
    }
});

console.log('🕋 Service Worker لـ "صفاء الروح" جاهز للعمل');
