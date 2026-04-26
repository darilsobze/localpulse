/**
 * merchantStore.ts — single source of truth for the merchant POV. State is
 * persisted to localStorage so sliders/feed survive a refresh. Updates fan
 * out via a tiny pub-sub. A drift loop simulates ambient activity (viewers
 * tick up, quiet score wanders) so the dashboard always feels alive — even
 * when no real customer event arrives.
 *
 * On `offer_redeemed` events from `lib/channel`, the store mutates KPIs
 * synchronously so phone B reflects phone A's tap within ~200ms.
 */

import {
  subscribe as channelSubscribe,
  type ChannelEvent,
  customerInitials,
} from '../../lib/channel';
import {
  LIVE_OFFER_TEMPLATES,
  MERCHANT_SEEDS,
  type FeedItem,
  type LiveOfferSeed,
  type MerchantSeed,
  seedFeed,
} from './mockData';

const SESSION_KEY  = 'localpulse:merchant:session';
const STATE_PREFIX = 'localpulse:merchant:state:';

export type MerchantSession = {
  merchantId: string;
  merchantName: string;
  category: MerchantSeed['category'];
  brandHue1: string;
  brandHue2: string;
  emoji: string;
  address: string;
};

export type LiveOfferRuntime = LiveOfferSeed & {
  status: 'live' | 'paused';
  publishedAt: number;
};

export type WeatherTrigger = 'rain' | 'cold' | 'hot' | 'sunny';

export type Rules = {
  goal: 'fill_quiet_times' | 'increase_basket' | 'acquire_new';
  maxDiscountPct: number;
  minQuietGapMin: number;
  allowedHoursStart: number;
  allowedHoursEnd: number;
  aiFreedom: number; // 0 = template-only, 100 = freeform
  triggers: Record<WeatherTrigger, boolean>;
};

export type Kpis = {
  revenueEur: number;
  redemptions: number;
  dismissals: number;
  cashbackIssuedEur: number;
};

export type MerchantState = {
  quietScore: number;
  paused: boolean;
  lastTickAt: number;
  liveOffers: LiveOfferRuntime[];
  feed: FeedItem[];
  kpis: Kpis;
  rules: Rules;
};

const DEFAULT_RULES: Rules = {
  goal: 'fill_quiet_times',
  maxDiscountPct: 25,
  minQuietGapMin: 20,
  allowedHoursStart: 11,
  allowedHoursEnd: 19,
  aiFreedom: 60,
  triggers: { rain: true, cold: true, hot: true, sunny: false },
};

function defaultKpis(seed: MerchantSeed): Kpis {
  // Deterministic seed-ish numbers so each merchant feels distinct.
  const map: Record<MerchantSeed['category'], Kpis> = {
    cafe:       { revenueEur: 184.20, redemptions: 14, dismissals: 11, cashbackIssuedEur: 22.40 },
    ice_cream:  { revenueEur: 212.60, redemptions: 19, dismissals: 9,  cashbackIssuedEur: 28.80 },
    restaurant: { revenueEur: 318.80, redemptions: 11, dismissals: 14, cashbackIssuedEur: 31.20 },
    bakery:     { revenueEur: 142.00, redemptions: 22, dismissals: 7,  cashbackIssuedEur: 19.60 },
    bar:        { revenueEur:  96.50, redemptions: 7,  dismissals: 6,  cashbackIssuedEur:  9.20 },
  };
  return { ...map[seed.category] };
}

function defaultLiveOffers(seed: MerchantSeed): LiveOfferRuntime[] {
  const tpl = LIVE_OFFER_TEMPLATES[seed.category] ?? [];
  return tpl.map((o, i) => ({
    ...o,
    status: 'live',
    publishedAt: Date.now() - (i + 1) * 14 * 60 * 1000,
  }));
}

function loadState(seed: MerchantSeed): MerchantState {
  const key = STATE_PREFIX + seed.id;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as MerchantState;
      // Backfill defaults when shape evolves.
      return {
        quietScore:  parsed.quietScore  ?? 0.62,
        paused:      parsed.paused      ?? false,
        lastTickAt:  parsed.lastTickAt  ?? Date.now(),
        liveOffers:  parsed.liveOffers?.length ? parsed.liveOffers : defaultLiveOffers(seed),
        feed:        parsed.feed?.length ? parsed.feed : seedFeed(seed.id),
        kpis:        { ...defaultKpis(seed), ...(parsed.kpis ?? {}) },
        rules:       { ...DEFAULT_RULES, ...(parsed.rules ?? {}) },
      };
    }
  } catch (e) {
    console.warn('[merchantStore] load failed:', e);
  }
  return {
    quietScore: 0.62,
    paused:     false,
    lastTickAt: Date.now(),
    liveOffers: defaultLiveOffers(seed),
    feed:       seedFeed(seed.id),
    kpis:       defaultKpis(seed),
    rules:      { ...DEFAULT_RULES },
  };
}

function persistState(merchantId: string, state: MerchantState) {
  try {
    localStorage.setItem(STATE_PREFIX + merchantId, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

// ── Session ────────────────────────────────────────────────────────────────

export function loadSession(): MerchantSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MerchantSession;
  } catch {
    return null;
  }
}

export function saveSession(session: MerchantSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function sessionFromSeed(seed: MerchantSeed): MerchantSession {
  return {
    merchantId:   seed.id,
    merchantName: seed.name,
    category:     seed.category,
    brandHue1:    seed.brandHue1,
    brandHue2:    seed.brandHue2,
    emoji:        seed.emoji,
    address:      seed.address,
  };
}

// ── Store ──────────────────────────────────────────────────────────────────

type Listener = (state: MerchantState) => void;

class MerchantStore {
  private state: MerchantState;
  private listeners = new Set<Listener>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private channelUnsub: (() => void) | null = null;
  private synthTimeout: ReturnType<typeof setTimeout> | null = null;
  private synthEnabled = false;
  readonly merchantId: string;

  constructor(seed: MerchantSeed) {
    this.merchantId = seed.id;
    this.state = loadState(seed);
  }

  get(): MerchantState {
    return this.state;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }

  private setState(next: MerchantState, persist = true) {
    this.state = next;
    if (persist) persistState(this.merchantId, next);
    this.listeners.forEach((l) => l(next));
  }

  startDrift(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), 2000);

    if (!this.channelUnsub) {
      this.channelUnsub = channelSubscribe((ev) => this.onChannelEvent(ev));
    }
  }

  stopDrift(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.channelUnsub) {
      this.channelUnsub();
      this.channelUnsub = null;
    }
    this.disableSynth();
  }

  enableSynth(): void {
    if (this.synthEnabled) return;
    this.synthEnabled = true;
    const schedule = () => {
      const delay = 25_000 + Math.random() * 15_000;
      this.synthTimeout = setTimeout(() => {
        if (!this.synthEnabled) return;
        this.synthesizeRedemption();
        schedule();
      }, delay);
    };
    schedule();
  }

  disableSynth(): void {
    this.synthEnabled = false;
    if (this.synthTimeout) {
      clearTimeout(this.synthTimeout);
      this.synthTimeout = null;
    }
  }

  private tick() {
    const hour = new Date().getHours();
    // Lunch dip 11–14 and late-afternoon dip 14–17 are quietest.
    let target = 0.5;
    if (hour >= 11 && hour < 14) target = 0.72;
    else if (hour >= 14 && hour < 17) target = 0.78;
    else if (hour >= 17 && hour < 20) target = 0.45;
    else if (hour >= 20 || hour < 8) target = 0.30;

    const drift = (target - this.state.quietScore) * 0.18;
    const jitter = (Math.random() - 0.5) * 0.04;
    const nextQuiet = Math.max(0.05, Math.min(0.95, this.state.quietScore + drift + jitter));

    const liveOffers = this.state.liveOffers.map((o) => {
      if (o.status !== 'live') return o;
      const bump = Math.random() < 0.4 ? 1 : 0;
      return { ...o, viewers: Math.max(0, o.viewers + bump - (Math.random() < 0.05 ? 1 : 0)) };
    });

    this.setState(
      { ...this.state, quietScore: nextQuiet, lastTickAt: Date.now(), liveOffers },
      false, // don't persist every 2s — too chatty
    );
  }

  private synthesizeRedemption() {
    if (this.state.paused) return;
    if (this.state.liveOffers.length === 0) return;
    const offer = this.state.liveOffers.find((o) => o.status === 'live');
    if (!offer) return;

    const userIds = ['mia_278', 'lukas_044', 'sara_551', 'jonas_902', 'anna_117', 'pia_330'];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const initials = customerInitials(userId);
    const cashback = Math.round(offer.priceFinal * (offer.discountPct / 100) * 100) / 100;

    this.applyRedemption({
      id: `synth-${Date.now()}`,
      offerTitle: offer.title,
      offerId: offer.id,
      amount: offer.priceFinal,
      cashback,
      discountPct: offer.discountPct,
      initials,
      synthetic: true,
    });
  }

  private onChannelEvent(ev: ChannelEvent) {
    if (ev.type === 'offer_redeemed') {
      if (ev.merchant_id !== this.merchantId) return;
      this.applyRedemption({
        id: ev.id,
        offerTitle: ev.offer_title,
        offerId:
          ev.offer_id
          ?? this.state.liveOffers.find((o) => o.title === ev.offer_title)?.id
          ?? ev.offer_title.toLowerCase().replace(/\s+/g, '-'),
        amount: ev.amount_eur,
        cashback: ev.cashback_eur,
        discountPct: ev.discount_pct,
        initials: ev.customer_initials,
        synthetic: false,
      });
    } else if (ev.type === 'offer_dismissed') {
      if (ev.merchant_id !== this.merchantId) return;
      this.applyDismissal(ev.id, ev.customer_initials);
    }
  }

  private applyRedemption(r: {
    id: string;
    offerTitle: string;
    offerId: string;
    amount: number;
    cashback: number;
    discountPct: number;
    initials: string;
    synthetic: boolean;
  }) {
    const liveOffers = this.state.liveOffers.map((o) =>
      o.id === r.offerId
        ? { ...o, redeemed: o.redeemed + 1, viewers: Math.max(0, o.viewers - 1) }
        : o,
    );
    const newItem: FeedItem = {
      id: r.id,
      ts: Date.now(),
      kind: 'redeemed',
      title: `${r.initials} redeemed ${r.offerTitle}${r.synthetic ? '' : ' · live'}`,
      subtitle: `+€${r.amount.toFixed(2)} · paid via Google Pay`,
      amount: r.amount,
      initials: r.initials,
      emoji: r.synthetic ? '◉' : '◉',
    };
    const feed: FeedItem[] = [newItem, ...this.state.feed].slice(0, 60);

    this.setState({
      ...this.state,
      liveOffers,
      feed,
      kpis: {
        ...this.state.kpis,
        revenueEur:        Math.round((this.state.kpis.revenueEur + r.amount) * 100) / 100,
        redemptions:       this.state.kpis.redemptions + 1,
        cashbackIssuedEur: Math.round((this.state.kpis.cashbackIssuedEur + r.cashback) * 100) / 100,
      },
    });
  }

  private applyDismissal(id: string, initials: string) {
    const newItem: FeedItem = {
      id,
      ts: Date.now(),
      kind: 'dismissed',
      title: `${initials} dismissed an offer`,
      subtitle: 'Walked past · not the right moment',
      initials,
      emoji: '◌',
    };
    const feed: FeedItem[] = [newItem, ...this.state.feed].slice(0, 60);

    this.setState({
      ...this.state,
      feed,
      kpis: { ...this.state.kpis, dismissals: this.state.kpis.dismissals + 1 },
    });
  }

  // ── Public mutators ───────────────────────────────────────────────────

  setRules(next: Rules) {
    this.setState({ ...this.state, rules: next });
  }

  togglePause() {
    this.setState({ ...this.state, paused: !this.state.paused });
  }

  pushAiOfferToFeed(offerTitle: string, discountPct: number) {
    const newItem: FeedItem = {
      id: `ai-${Date.now()}`,
      ts: Date.now(),
      kind: 'ai_published',
      title: 'AI generated a new offer',
      subtitle: `${offerTitle} · −${discountPct}% · ready to publish`,
      emoji: '✦',
    };
    const feed: FeedItem[] = [newItem, ...this.state.feed].slice(0, 60);
    this.setState({ ...this.state, feed });
  }
}

// ── Singleton holder ──────────────────────────────────────────────────────

let singleton: MerchantStore | null = null;

export function ensureStore(merchantId: string): MerchantStore {
  if (singleton && singleton.merchantId === merchantId) return singleton;
  singleton?.stopDrift();
  const seed = MERCHANT_SEEDS.find((m) => m.id === merchantId);
  if (!seed) throw new Error(`Unknown merchant id: ${merchantId}`);
  singleton = new MerchantStore(seed);
  singleton.startDrift();
  return singleton;
}

export function clearStore() {
  singleton?.stopDrift();
  singleton = null;
}

export type { MerchantStore };
