import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadSession, type Rules, type WeatherTrigger } from '../lib/merchantStore';
import { useMerchantStore } from '../lib/useMerchantStore';
import { putJson } from '../../lib/api';
import type { MerchantSeed } from '../lib/mockData';

const GOAL_OPTIONS: { id: Rules['goal']; label: string; hint: string; emoji: string }[] = [
  { id: 'fill_quiet_times', label: 'Fill quiet times',     hint: 'Trigger offers when transaction density drops.', emoji: '◐' },
  { id: 'increase_basket',  label: 'Increase basket size', hint: 'Pair items, push bundles, soft upsells.',         emoji: '▲' },
  { id: 'acquire_new',      label: 'Acquire new customers', hint: 'Target users who never visited before.',         emoji: '✦' },
];

const TRIGGERS: { id: WeatherTrigger; label: string; emoji: string }[] = [
  { id: 'rain',  label: 'Rain',  emoji: '☂' },
  { id: 'cold',  label: 'Cold',  emoji: '❄' },
  { id: 'hot',   label: 'Hot',   emoji: '☀' },
  { id: 'sunny', label: 'Sunny', emoji: '◌' },
];

export default function RulesPage() {
  const session = loadSession()!;
  const { state, store } = useMerchantStore(session.merchantId);

  const [draft, setDraft] = useState<Rules>(state.rules);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Sync the local draft if the store's rules change underneath us (e.g.
  // after a successful save). Using the prev-state pattern here instead of
  // useEffect is the React-recommended way to derive state from props.
  const [syncedRules, setSyncedRules] = useState(state.rules);
  if (state.rules !== syncedRules) {
    setSyncedRules(state.rules);
    setDraft(state.rules);
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(state.rules), [draft, state.rules]);

  const update = <K extends keyof Rules>(k: K, v: Rules[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const toggleTrigger = (id: WeatherTrigger) => {
    setDraft((d) => ({ ...d, triggers: { ...d.triggers, [id]: !d.triggers[id] } }));
  };

  const onSave = async () => {
    setSaveStatus('saving');
    store.setRules(draft);
    try {
      await putJson(`/merchant/${session.merchantId}/settings`, {
        max_discount_pct:  draft.maxDiscountPct,
        min_quiet_gap_min: draft.minQuietGapMin,
      });
    } catch (e) {
      console.warn('[rules] backend persist failed (mock-only is fine):', e);
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1600);
  };

  return (
    <div className="pt-2 pb-2 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-text-mute)' }}>
          Module 02 · Generative Offer Engine
        </div>
        <h2 className="serif text-[20px] mt-1 leading-tight" style={{ color: 'var(--m-text)' }}>
          Set the rules. The AI writes the offer.
        </h2>
      </div>

      {/* Goal */}
      <Section title="Goal">
        <div className="grid grid-cols-1 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const active = draft.goal === g.id;
            return (
              <button
                key={g.id}
                onClick={() => update('goal', g.id)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition"
                style={{
                  background: active ? 'rgba(197, 245, 74, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? 'var(--m-accent)' : 'var(--m-line)'}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px]"
                  style={{
                    background: active ? 'var(--m-accent)' : 'rgba(255,255,255,0.05)',
                    color: active ? '#0b1320' : 'var(--m-text-dim)',
                  }}
                >
                  {g.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--m-text)' }}>{g.label}</div>
                  <div className="text-[11px]" style={{ color: 'var(--m-text-mute)' }}>{g.hint}</div>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{
                    borderColor: active ? 'var(--m-accent)' : 'var(--m-line-strong)',
                    background: active ? 'var(--m-accent)' : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </Section>

      {/* Numeric sliders */}
      <Section title="Limits">
        <SliderRow
          label="Max discount"
          value={draft.maxDiscountPct}
          unit="%"
          min={5}
          max={50}
          step={1}
          onChange={(v) => update('maxDiscountPct', v)}
        />
        <SliderRow
          label="Min quiet gap"
          value={draft.minQuietGapMin}
          unit=" min"
          min={5}
          max={120}
          step={5}
          onChange={(v) => update('minQuietGapMin', v)}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderRow
            label="Allowed from"
            value={draft.allowedHoursStart}
            unit=":00"
            min={6}
            max={22}
            step={1}
            onChange={(v) => update('allowedHoursStart', v)}
            compact
          />
          <SliderRow
            label="Allowed until"
            value={draft.allowedHoursEnd}
            unit=":00"
            min={8}
            max={24}
            step={1}
            onChange={(v) => update('allowedHoursEnd', v)}
            compact
          />
        </div>
        <SliderRow
          label="AI creative freedom"
          value={draft.aiFreedom}
          unit=""
          hint={draft.aiFreedom < 33 ? 'Templates only' : draft.aiFreedom < 66 ? 'Guided rephrasing' : 'Free-form copy'}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update('aiFreedom', v)}
        />
      </Section>

      {/* Weather triggers */}
      <Section title="Weather triggers" subtitle="Conditions that may fire an offer">
        <div className="flex flex-wrap gap-2">
          {TRIGGERS.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTrigger(t.id)}
              className={`m-chip ${draft.triggers[t.id] ? 'active' : ''}`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* AI Preview */}
      <AiPreview draft={draft} category={session.category} />

      {/* Save bar */}
      <div className="sticky bottom-0 left-0 right-0 -mx-4 px-4 pt-3 pb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(5, 9, 19, 0) 0%, rgba(5, 9, 19, 0.92) 50%)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 text-[10px]" style={{ color: 'var(--m-text-mute)' }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved'  && '✓ Saved · next offer uses these caps.'}
            {saveStatus === 'error'  && '✗ Save failed.'}
            {saveStatus === 'idle'   && (dirty ? 'Unsaved changes' : 'All saved · AI uses these limits when generating offers.')}
          </div>
          <button
            disabled={!dirty || saveStatus === 'saving'}
            onClick={onSave}
            className="m-button primary"
            style={{ opacity: !dirty ? 0.5 : 1 }}
          >
            Save rules
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="m-card p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] font-medium" style={{ color: 'var(--m-text-dim)' }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px]" style={{ color: 'var(--m-text-mute)' }}>{subtitle}</div>
        )}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  hint,
  compact,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[12px]" style={{ color: 'var(--m-text-dim)' }}>{label}</label>
        <span className="num text-[13px] font-medium" style={{ color: 'var(--m-accent)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="m-slider mt-1.5"
      />
      {!compact && hint && (
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--m-text-mute)' }}>{hint}</div>
      )}
    </div>
  );
}

// ── AI Preview ─────────────────────────────────────────────────────────────

const PREVIEW_TEMPLATES: Record<MerchantSeed['category'], (rules: Rules) => { title: string; body: string; trigger: string }> = {
  cafe: (r) => ({
    title: r.aiFreedom > 60 ? 'A quiet table just opened up.' : `${r.maxDiscountPct}% off iced cappuccino`,
    body:  r.aiFreedom > 60
      ? `Café Metropol just brewed a fresh batch. Drift in for an iced cappuccino at ${r.maxDiscountPct}% off — the next ${r.minQuietGapMin} minutes are yours.`
      : `Iced cappuccino · ${r.maxDiscountPct}% off · valid for ${r.minQuietGapMin} min · 200m away.`,
    trigger: r.triggers.hot ? 'Hot afternoon · density ≤ 60%' : 'Density ≤ 60% · midday',
  }),
  ice_cream: (r) => ({
    title: r.aiFreedom > 60 ? 'Two scoops, no melting yet.' : `Stracciatella -${r.maxDiscountPct}%`,
    body:  r.aiFreedom > 60
      ? `Step into the cool — Danny's just churned a fresh batch of stracciatella. ${r.maxDiscountPct}% off the next two scoops, only the next ${r.minQuietGapMin} min.`
      : `Two-scoop stracciatella · ${r.maxDiscountPct}% off · valid ${r.minQuietGapMin} min.`,
    trigger: r.triggers.hot ? 'Heat ≥ 26°C · footfall sparse' : 'Density ≤ 55%',
  }),
  restaurant: (r) => ({
    title: r.aiFreedom > 60 ? 'A late-lunch table is yours.' : `Pasta del giorno -${r.maxDiscountPct}%`,
    body:  r.aiFreedom > 60
      ? `Bistro Zentrum has table capacity at 14:30. ${r.maxDiscountPct}% off pasta del giorno — the cook is ready, the basil is fresh.`
      : `Pasta del giorno · ${r.maxDiscountPct}% off · table window ${r.allowedHoursStart}:00–${r.allowedHoursEnd}:00.`,
    trigger: 'Density ≤ 50% · capacity open',
  }),
  bakery: (r) => ({
    title: r.aiFreedom > 60 ? 'The last batch needs a home.' : `Pretzel + filter -${r.maxDiscountPct}%`,
    body:  r.aiFreedom > 60
      ? `Köhler's ovens cooled an hour ago. The remaining pretzels go ${r.maxDiscountPct}% off — pair with filter coffee on the house.`
      : `Pretzel + filter coffee · -${r.maxDiscountPct}% bundle · until 14:30.`,
    trigger: 'End-of-day stock pressure',
  }),
  bar: (r) => ({
    title: r.aiFreedom > 60 ? 'The aperitif window opens early.' : `House spritz -${r.maxDiscountPct}%`,
    body:  r.aiFreedom > 60
      ? `Taproom Darmstadt is calm at 17:00. House aperitif ${r.maxDiscountPct}% off · the bar is yours for the next ${r.minQuietGapMin} min.`
      : `Aperitif spritz · -${r.maxDiscountPct}% · valid 17:00–18:30.`,
    trigger: 'Pre-dinner quiet · density ≤ 45%',
  }),
};

function AiPreview({ draft, category }: { draft: Rules; category: MerchantSeed['category'] }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 8000);
    return () => clearInterval(t);
  }, []);

  // `tick` is intentionally part of the key but not the value — the preview
  // copy is a pure function of (category, draft); the 8s tick just retriggers
  // the entry animation to suggest the AI is "reconsidering".
  void tick;
  const preview = useMemo(() => PREVIEW_TEMPLATES[category](draft), [category, draft]);

  return (
    <div className="m-card p-4 relative overflow-hidden">
      <div className="m-shimmer absolute inset-0 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="m-pill" style={{ height: 20, fontSize: 10 }}>
            <span className="m-dot" />
            <span className="num">AI PREVIEW · refreshes every 8s</span>
          </span>
        </div>
        <motion.div
          key={tick}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-3"
        >
          <div className="serif text-[18px] leading-tight" style={{ color: 'var(--m-text)' }}>
            "{preview.title}"
          </div>
          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--m-text-dim)' }}>
            {preview.body}
          </p>
          <div className="mt-2.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--m-text-mute)' }}>
            Trigger: {preview.trigger}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
