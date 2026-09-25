import { MemoryStore } from "./memory";
import type { CaptchaStore } from "./store";

let defaultStore: CaptchaStore | null = null;

/** Process-local default store used when callers do not inject one. */
export function getDefaultStore(): CaptchaStore {
  if (!defaultStore) {
    defaultStore = new MemoryStore();
  }
  return defaultStore;
}

/** Replace or clear the default store (useful in tests). */
export function setDefaultStore(store: CaptchaStore | null): void {
  if (defaultStore && defaultStore !== store) {
    defaultStore.destroy();
  }
  defaultStore = store;
}
