/**
 * channel.ts — same-origin event bus that bridges the consumer phone (`/`) and
 * the merchant phone (`/m`). Uses BroadcastChannel where available and falls
 * back to localStorage `storage` events so two browsers / private windows on
 * the same origin can still talk.
 *
 * All payloads carry a UUID + ts so listeners can dedupe (the localStorage
 * fallback fires for both writers and readers in some browsers).
 */

export type RedeemedEvent = {
  type: 'offer_redeemed';
  id: string;
  ts: number;
  merchant_id: string;
  merchant_name: string;
  offer_title: string;
  offer_id?: string;
  amount_eur: number;
  discount_pct: number;
  cashback_eur: number;
  customer_initials: string;
  customer_id: string;
};

export type DismissedEvent = {
  type: 'offer_dismissed';
  id: string;
  ts: number;
  merchant_id: string;
  merchant_name: string;
  customer_initials: string;
  customer_id: string;
};

export type MerchantPausedEvent = {
  type: 'merchant_paused';
  id: string;
  ts: number;
  merchant_id: string;
  paused: boolean;
};

export type MerchantPublishedOfferEvent = {
  type: 'merchant_published_offer';
  id: string;
  ts: number;
  merchant_id: string;
  merchant_name: string;
  offer_title: string;
  discount_pct: number;
};

export type ChannelEvent =
  | RedeemedEvent
  | DismissedEvent
  | MerchantPausedEvent
  | MerchantPublishedOfferEvent;

const CHANNEL_NAME = 'localpulse';
const STORAGE_KEY = 'localpulse:lastEvent';
const SEEN_LIMIT = 200;

let bc: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  bc = null;
}

const seen = new Set<string>();
const seenOrder: string[] = [];
function rememberSeen(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  seenOrder.push(id);
  if (seenOrder.length > SEEN_LIMIT) {
    const evicted = seenOrder.shift();
    if (evicted) seen.delete(evicted);
  }
  return true;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type Listener = (e: ChannelEvent) => void;

const localListeners = new Set<Listener>();

export function emit<E extends ChannelEvent>(
  event: Omit<E, 'id' | 'ts'> & Partial<Pick<E, 'id' | 'ts'>>,
): E {
  const full = {
    id: event.id ?? newId(),
    ts: event.ts ?? Date.now(),
    ...event,
  } as E;
  rememberSeen(full.id);

  // BroadcastChannel + storage both skip the originating context; deliver
  // to local subscribers manually so the same tab that emits also reacts.
  localListeners.forEach((l) => {
    try { l(full); } catch (e) { console.warn('[channel] local listener threw:', e); }
  });

  try {
    bc?.postMessage(full);
  } catch (e) {
    console.warn('[channel] BroadcastChannel.postMessage failed:', e);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // ignore — private windows may block writes
  }

  return full;
}

export function subscribe(listener: Listener): () => void {
  localListeners.add(listener);

  const onBc = (e: MessageEvent) => {
    const data = e.data as ChannelEvent | undefined;
    if (!data || typeof data !== 'object' || !('type' in data)) return;
    if (!rememberSeen(data.id)) return;
    listener(data);
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const data = JSON.parse(e.newValue) as ChannelEvent;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (!rememberSeen(data.id)) return;
      listener(data);
    } catch {
      // ignore malformed payloads
    }
  };

  bc?.addEventListener('message', onBc);
  window.addEventListener('storage', onStorage);

  return () => {
    localListeners.delete(listener);
    bc?.removeEventListener('message', onBc);
    window.removeEventListener('storage', onStorage);
  };
}

export function customerInitials(userId: string): string {
  const trimmed = userId.replace(/[^a-zA-Z]/g, '');
  if (trimmed.length === 0) return 'A.N.';
  if (trimmed.length === 1) return `${trimmed[0].toUpperCase()}.`;
  return `${trimmed[0].toUpperCase()}.${trimmed[1].toUpperCase()}.`;
}
