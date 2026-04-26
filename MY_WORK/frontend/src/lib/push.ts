/**
 * Web Push subscription & notification logic.
 */

import { apiUrl } from './api';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.error('SW register failed:', e);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported');
    return null;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      console.log('Push permission denied');
      return null;
    }

    const reg = await navigator.serviceWorker.ready;
    const pubKeyResp = await fetch(apiUrl('/vapid-public-key'));
    const { publicKey } = await pubKeyResp.json();

    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const p256dh = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    if (!p256dh || !auth) throw new Error('Push subscription keys are missing');

    // Send every time: the demo backend stores subscriptions in memory.
    const subResp = await fetch(apiUrl('/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dh),
          auth: arrayBufferToBase64(auth),
        },
      }),
    });

    if (!subResp.ok) throw new Error('Subscribe failed');
    return sub;
  } catch (e) {
    console.error('Subscribe failed:', e);
    return null;
  }
}

export async function sendTestPush() {
  const res = await fetch(apiUrl('/push/send'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Local Pulse',
      body: 'Real phone notification test. Lock the Pixel and send again from Merchant.',
      url: '/',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to send push');
  return data as { sent: number };
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((x) => x.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
