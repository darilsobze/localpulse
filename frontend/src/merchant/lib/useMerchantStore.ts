import { useSyncExternalStore } from 'react';
import { ensureStore, type MerchantState, type MerchantStore } from './merchantStore';

export function useMerchantStore(merchantId: string): {
  store: MerchantStore;
  state: MerchantState;
} {
  const store = ensureStore(merchantId);
  // useSyncExternalStore is the React-blessed way to subscribe to an
  // external state holder without tripping the "setState during effect"
  // lint rule. It also concurrent-render-safe.
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.get(),
    () => store.get(),
  );
  return { store, state };
}
