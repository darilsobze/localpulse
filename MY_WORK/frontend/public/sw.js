/* LocalPulse service worker — handles push notifications */
self.addEventListener('push', (event) => {
  let data = { title: 'Local Pulse', body: 'A moment is waiting for you.', url: '/' };

  if (event.data) {
    try { data = { ...data, ...JSON.parse(event.data.text()) }; } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      tag: 'localpulse-moment',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url },
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const match = cs.find((c) => c.url.includes(self.location.origin));
      if (match) return match.focus();
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
