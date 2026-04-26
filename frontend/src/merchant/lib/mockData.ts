/**
 * mockData.ts — seeded fixtures for the merchant POV. All data is deterministic
 * given a merchant_id so the demo looks plausible across reloads. The store
 * layer mutates working copies on top of these seeds.
 */

import { customerInitials } from '../../lib/channel';

export type MerchantSeed = {
  id: string;
  name: string;
  address: string;
  category: 'cafe' | 'ice_cream' | 'restaurant' | 'bakery' | 'bar';
  brandHue1: string;
  brandHue2: string;
  emoji: string;
};

export const MERCHANT_SEEDS: MerchantSeed[] = [
  {
    id: 'm_1',
    name: 'BACK FACTORY',
    address: 'Luisenpl. 4, 64283 Darmstadt',
    category: 'cafe',
    brandHue1: '#fde68a',
    brandHue2: '#f97316',
    emoji: '🥤',
  },
  {
    id: 'm_2',
    name: 'Café Metropol',
    address: 'Marktplatz 8, 64283 Darmstadt',
    category: 'cafe',
    brandHue1: '#fbbf24',
    brandHue2: '#f97316',
    emoji: '☕',
  },
  {
    id: 'm_3',
    name: 'Bistro Zentrum',
    address: 'Rheinstraße 12, 64283 Darmstadt',
    category: 'restaurant',
    brandHue1: '#86efac',
    brandHue2: '#10b981',
    emoji: '🍝',
  },
  {
    id: 'm_4',
    name: 'Bäckerei Köhler',
    address: 'Wilhelminenstraße 3, 64283 Darmstadt',
    category: 'bakery',
    brandHue1: '#fcd34d',
    brandHue2: '#d97706',
    emoji: '🥨',
  },
  {
    id: 'm_5',
    name: 'Smoothie Lab',
    address: 'Mathildenplatz 2, 64283 Darmstadt',
    category: 'cafe',
    brandHue1: '#a7f3d0',
    brandHue2: '#06b6d4',
    emoji: '🥤',
  },
  {
    id: 'm_6',
    name: 'Taproom Darmstadt',
    address: 'Landgraf-Georg-Straße 5, 64283 Darmstadt',
    category: 'bar',
    brandHue1: '#fcd34d',
    brandHue2: '#92400e',
    emoji: '🍺',
  },
];

export type LiveOfferSeed = {
  id: string;
  title: string;
  subtitle: string;
  priceOriginal: number;
  priceFinal: number;
  discountPct: number;
  trigger: string;
  emoji: string;
  viewers: number;
  redeemed: number;
};

export const LIVE_OFFER_TEMPLATES: Record<MerchantSeed['category'], LiveOfferSeed[]> = {
  cafe: [
    {
      id: 'cafe-recovery-latte',
      title: 'High-Protein Choco-Latte',
      subtitle: '20% off · ends in 15 min',
      priceOriginal: 4.90,
      priceFinal: 3.92,
      discountPct: 20,
      trigger: 'Post-training tram wait · 12°C sunny',
      emoji: '🥤',
      viewers: 8,
      redeemed: 0,
    },
    {
      id: 'cafe-tartine',
      title: 'Avocado tartine + filter coffee',
      subtitle: '15% off bundle',
      priceOriginal: 9.80,
      priceFinal: 8.33,
      discountPct: 15,
      trigger: 'Quiet hour, basket-size goal',
      emoji: '🥑',
      viewers: 3,
      redeemed: 0,
    },
  ],
  ice_cream: [
    {
      id: 'ice-stracciatella',
      title: 'Two-scoop stracciatella',
      subtitle: '25% off · ends in 18 min',
      priceOriginal: 4.80,
      priceFinal: 3.60,
      discountPct: 25,
      trigger: 'Hot afternoon · footfall sparse',
      emoji: '🍦',
      viewers: 12,
      redeemed: 1,
    },
    {
      id: 'ice-affogato',
      title: 'Affogato',
      subtitle: '20% off · solo treat',
      priceOriginal: 5.40,
      priceFinal: 4.32,
      discountPct: 20,
      trigger: 'Lunch dip · expresso pairing',
      emoji: '🍨',
      viewers: 4,
      redeemed: 0,
    },
  ],
  restaurant: [
    {
      id: 'rest-pasta',
      title: 'Pasta del giorno',
      subtitle: '15% off · table window 14-16',
      priceOriginal: 12.50,
      priceFinal: 10.62,
      discountPct: 15,
      trigger: 'Late-lunch capacity open',
      emoji: '🍝',
      viewers: 6,
      redeemed: 0,
    },
  ],
  bakery: [
    {
      id: 'bakery-pretzel',
      title: 'Pretzel + filter coffee',
      subtitle: '20% off bundle · 14:30 cutoff',
      priceOriginal: 4.10,
      priceFinal: 3.28,
      discountPct: 20,
      trigger: 'Stock pressure · last batch',
      emoji: '🥨',
      viewers: 5,
      redeemed: 0,
    },
    {
      id: 'bakery-quiche',
      title: 'Quiche Lorraine slice',
      subtitle: '25% off · expires 16:00',
      priceOriginal: 5.20,
      priceFinal: 3.90,
      discountPct: 25,
      trigger: 'End-of-day waste avoidance',
      emoji: '🥧',
      viewers: 2,
      redeemed: 0,
    },
  ],
  bar: [
    {
      id: 'bar-aperitif',
      title: 'House aperitif spritz',
      subtitle: '15% off early bird',
      priceOriginal: 7.50,
      priceFinal: 6.38,
      discountPct: 15,
      trigger: '17:00 quiet window · pre-dinner',
      emoji: '🍹',
      viewers: 0,
      redeemed: 0,
    },
  ],
};

export type FeedItem = {
  id: string;
  ts: number;
  kind: 'redeemed' | 'dismissed' | 'ai_published' | 'ai_revised' | 'paused';
  title: string;
  subtitle: string;
  amount?: number;
  initials?: string;
  emoji?: string;
};

const HASH_USER_IDS = ['mia_278', 'lukas_044', 'sara_551', 'jonas_902', 'anna_117', 'pia_330', 'omar_645', 'lena_281'];
const HASH_TITLES = ['High-Protein Choco-Latte', 'Recovery shake', 'Pretzel bundle', 'Pasta del giorno', 'Smoothie + bowl', 'Espresso macchiato'];

function pseudoRandom(seedStr: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    out.push((h >>> 0) / 4294967295);
  }
  return out;
}

export function seedFeed(merchantId: string): FeedItem[] {
  const rolls = pseudoRandom(merchantId, 18);
  const items: FeedItem[] = [];
  const now = Date.now();
  const baseAgo = 60 * 1000; // start at 1 min ago

  for (let i = 0; i < 8; i++) {
    const roll = rolls[i];
    const kindRoll = rolls[i + 8];
    const minutesAgo = 1 + i * 4 + Math.floor(roll * 3);
    const ts = now - minutesAgo * baseAgo;
    const userId = HASH_USER_IDS[Math.floor(roll * HASH_USER_IDS.length)];
    const initials = customerInitials(userId);
    const titleIdx = Math.floor(roll * HASH_TITLES.length);
    const title = HASH_TITLES[titleIdx];

    if (kindRoll < 0.55) {
      const amount = Math.round((1.2 + roll * 4.6) * 100) / 100;
      items.push({
        id: `seed-${merchantId}-${i}`,
        ts,
        kind: 'redeemed',
        title: `${initials} redeemed ${title}`,
        subtitle: `+€${amount.toFixed(2)} · paid via Google Pay`,
        amount,
        initials,
        emoji: '◉',
      });
    } else if (kindRoll < 0.75) {
      items.push({
        id: `seed-${merchantId}-${i}`,
        ts,
        kind: 'dismissed',
        title: `${initials} dismissed ${title} offer`,
        subtitle: 'Walked past · not the right moment',
        initials,
        emoji: '◌',
      });
    } else if (kindRoll < 0.92) {
      items.push({
        id: `seed-${merchantId}-${i}`,
        ts,
        kind: 'ai_published',
        title: `AI generated a new offer`,
        subtitle: `${title} · context: post-training + tram wait`,
        emoji: '✦',
      });
    } else {
      items.push({
        id: `seed-${merchantId}-${i}`,
        ts,
        kind: 'ai_revised',
        title: 'AI revised the discount',
        subtitle: `Bumped ${title} from 15% to 20%`,
        emoji: '↻',
      });
    }
  }

  return items.sort((a, b) => b.ts - a.ts);
}

export type WeeklyPoint = { day: string; revenue: number; redemptions: number };

export function seedWeekly(merchantId: string): WeeklyPoint[] {
  const rolls = pseudoRandom(merchantId, 7);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((d, i) => ({
    day: d,
    revenue: Math.round(120 + rolls[i] * 280),
    redemptions: Math.round(8 + rolls[i] * 22),
  }));
}

export type SuggestionCard = {
  id: string;
  headline: string;
  body: string;
  delta: string;
  emoji: string;
};

export function seedSuggestions(category: MerchantSeed['category']): SuggestionCard[] {
  const generic: SuggestionCard[] = [
    {
      id: 's1',
      headline: 'Tue 14:00–16:00 is your softest window',
      body: 'Try deepening discount to 25% and pairing with a hot-drink trigger when temp < 18°C.',
      delta: '+€48 / day est.',
      emoji: '◐',
    },
    {
      id: 's2',
      headline: 'Rainy days under-perform peers by 23%',
      body: 'Add a "rain in next 30 min" trigger and let the AI write a cozy framing — peers see +18% redemption.',
      delta: '+€31 / rainy day',
      emoji: '☂',
    },
  ];

  const byCat: Record<MerchantSeed['category'], SuggestionCard> = {
    cafe: {
      id: 'sc',
      headline: 'Iced drinks beat hot when temp ≥ 28°C',
      body: 'Auto-swap creative when forecast crosses the threshold — your cohort sees +9% accept rate.',
      delta: '+12 redemptions / hot day',
      emoji: '☀',
    },
    ice_cream: {
      id: 'si',
      headline: 'Affogato bundles outperform single scoops',
      body: 'Bundle with espresso when basket-size is your goal — boosts ATV by €1.40.',
      delta: '+€1.40 ATV',
      emoji: '🍨',
    },
    restaurant: {
      id: 'sr',
      headline: 'Off-peak prix-fixe converts cold-walkers',
      body: 'Try a 14:30–16:00 prix-fixe trigger when transaction density drops below 40%.',
      delta: '+8 covers / day',
      emoji: '🍴',
    },
    bakery: {
      id: 'sb',
      headline: 'End-of-day pastry pulses cut waste',
      body: 'Auto-publish a 25% pulse 90 min before close when stock signal is "high pressure".',
      delta: '–34% waste',
      emoji: '🥖',
    },
    bar: {
      id: 'sba',
      headline: 'Pre-dinner aperitif window is empty',
      body: 'Trigger 16:30–18:00 spritz offer when foot-traffic on Landgraf-Georg-Str. is moderate.',
      delta: '+14 covers / week',
      emoji: '🍸',
    },
  };

  return [byCat[category], ...generic];
}

export const PEER_BENCHMARK = {
  acceptRateYou: 0.42,
  acceptRatePeers: 0.31,
  cashbackYou: 86,
  cashbackPeers: 64,
  recoveredYou: 412,
  recoveredPeers: 298,
};
