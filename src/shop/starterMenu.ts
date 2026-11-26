import type { Actor } from '../domain/auth.ts';
import { MENU } from '../domain/menu.ts';
import type { MenuEvent } from '../domain/menuEdits.ts';

/*
 * A new shop's menu (Melo POS, 2026-11-26): empty. The owner adds his own sections and dishes on
 * the Menu screen. The code still carries CheesyBeez' printed pizzas, burgers and pastas
 * (src/domain/menu.ts, locked by its tests), so these events hide them, the way Bata Kade's menu
 * did (src/shop/bataKade.ts, now the demo's only). The shop server stores them on the counter's
 * first pull (server/firstMenu.ts) and every screen folds them first (src/ui/menuStore.ts).
 */

/** Who set up the menu and named the shop at first start: the POS itself, not a person (it shows in the audit as this). */
export const MENU_INSTALLER: Actor = { id: 'melo-pos', name: 'Melo POS', role: 'owner' };

/**
 * The starter menu as events, with fixed ids: the server keeps one event per id, so sending them
 * again is a no-op, and an item the owner shows again later (a newer event) stays shown.
 */
export const starterMenuEvents = (shopId: string, at: number, actor: Actor = MENU_INSTALLER): MenuEvent[] => {
  const base = { shopId, at, orderNumber: 0 as const, actor };
  return MENU.map((m): MenuEvent => ({ ...base, id: `melo-menu-hide-${m.id}`, type: 'menu.item_set', itemId: m.id, before: {}, after: { hidden: true } }));
};
