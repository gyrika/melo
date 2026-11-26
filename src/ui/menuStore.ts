import { useSyncExternalStore } from 'react';
import { menuState, menuVersion, openSectionsKey, setMenuState, subscribeMenu } from '../domain/menu.ts';
import { menuStateFromEvents } from '../domain/menuEdits.ts';
import { readAll, subscribeEvents } from './eventLog.ts';
import { starterMenuEvents } from '../shop/starterMenu.ts';
import { setShopDetails, shopDetailsOf } from '../domain/shopDetails.ts';
import type { SyncEvent } from '../domain/sync.ts';

/**
 * Keeps this screen's menu in step with the shop's menu events (from the event log, which
 * keeps them for good), and re-checks "sold out until morning" every minute.
 */
let started = false;
/**
 * The starter menu (src/shop/starterMenu.ts: empty) comes first, under the shop's own menu events (the
 * shop server stores the same events, with the same ids, on the counter's first pull:
 * server/firstMenu.ts), so the printed CheesyBeez items never show, even before the first sync, and
 * the owner's own sections and dishes win. The tests keep the printed menu.
 * Worked out when asked, so a test can switch the real menu on (vi.stubEnv('MODE', ...)).
 */
let base: { mode: string; events: SyncEvent[] } | undefined;
const baseMenu = (): SyncEvent[] => {
  const mode = import.meta.env.MODE;
  if (base?.mode !== mode) base = { mode, events: mode === 'test' ? [] : starterMenuEvents('', 0) };
  return base.events;
};
/**
 * The shop's menu from its menu events, always on top of the starter menu: every screen that folds the
 * menu goes through here (the event log here, the shop's history in ownerData.ts), so none drops it.
 */
export const shopMenuState = (menuEvents: SyncEvent[]) => menuStateFromEvents([...baseMenu(), ...menuEvents]);
const refresh = () => {
  const all = readAll();
  setMenuState(shopMenuState(all.filter((e) => e.type.startsWith('menu.'))));
  setShopDetails(shopDetailsOf(all)); // the shop's own name, for every screen's corner and the bill
};

export const startMenuStore = (): void => {
  if (started) return;
  started = true;
  refresh();
  subscribeEvents(refresh);
  // Sold-out items come back by themselves in the morning; a section opens or closes at its hours.
  let open = openSectionsKey();
  setInterval(() => {
    const now = openSectionsKey();
    if (Object.keys(menuState().soldOut).length || now !== open) refresh();
    open = now;
  }, 60_000);
};

/** Re-renders when the menu changes. Any screen showing items or prices calls it. */
export const useMenu = (): number => {
  startMenuStore();
  return useSyncExternalStore(subscribeMenu, menuVersion);
};
