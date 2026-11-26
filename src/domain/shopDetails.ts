import type { Actor } from './auth.ts';
import type { SyncEvent } from './sync.ts';
import { SHOP_NAME } from '../shop/identity.ts';

/**
 * Each shop's own name and town (Melo POS, 2026-11-26): typed in the setup wizard's first step and
 * changed later in Shop setup › Shop (owner's PIN). The shop server records them as one
 * `shop.details_set` event, so they reach the counter, the kitchen, the cloud and the owner's phone
 * like any other event; the latest one wins. Before a shop is named, screens say "Melo POS".
 */
export type ShopDetailsEvent = {
  id: string;
  shopId: string;
  at: number;
  orderNumber: 0;
  actor: Actor;
  type: 'shop.details_set';
  name: string;
  place: string;
};

export const SHOP_DETAILS_EVENT_TYPES = ['shop.details_set'] as const satisfies readonly ShopDetailsEvent['type'][];

export interface ShopDetails { name: string; place: string }

/** Long enough for any shop's name, short enough for the screens' corner and one printed line. */
export const SHOP_NAME_MAX = 40;
export const SHOP_PLACE_MAX = 40;

/**
 * Why these cannot be the shop's name and town, or null. The name and town print on every bill,
 * and the printer has English letters only (its own code page): Sinhala, Tamil and emoji would
 * print as '?', so they are refused here, not on paper.
 */
export const checkShopDetails = (name: unknown, place: unknown): string | null => {
  if (typeof name !== 'string' || !name.trim()) return 'the shop needs a name';
  if (typeof place !== 'string') return 'write the town';
  if (name.length > SHOP_NAME_MAX) return `keep the name to ${SHOP_NAME_MAX} letters`;
  if (place.length > SHOP_PLACE_MAX) return `keep the town to ${SHOP_PLACE_MAX} letters`;
  if (!/^[\x20-\x7e]*$/.test(name + place)) return 'the printer prints English letters, numbers and signs only';
  return null;
};

/** The shop's name and town now, from its events (null before it was named). */
export const shopDetailsOf = (events: readonly SyncEvent[]): ShopDetails | null => {
  let out: ShopDetails | null = null;
  for (const e of events) if (e.type === 'shop.details_set') out = { name: e.name.trim(), place: e.place.trim() };
  return out;
};

/*
 * This screen's copy, kept by whoever reads the shop's events (the event log on the counter and the
 * kitchen, the cloud's history on the owner's phone). A screen that knows nothing yet keeps the last
 * one it had: a name is never taken away, only changed.
 */
let current: ShopDetails | null = null;
const listeners = new Set<() => void>();

export const setShopDetails = (next: ShopDetails | null): void => {
  if (!next || (current && current.name === next.name && current.place === next.place)) return;
  current = next;
  for (const l of listeners) l();
};

export const shopDetails = (): ShopDetails | null => current;

/** The name every screen shows: the shop's own, or the product's before setup. */
export const shopName = (): string => current?.name || SHOP_NAME;

export const subscribeShopDetails = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** For tests: forget the shop's name. */
export const resetShopDetails = (): void => { current = null; };
