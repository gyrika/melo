import { starterMenuEvents } from '../src/shop/starterMenu.ts';
import type { SyncedEvent } from '../src/domain/sync.ts';
import type { Device, EventStore } from './store.ts';

/**
 * A new shop starts with an empty menu (src/shop/starterMenu.ts: the code's printed CheesyBeez items
 * hidden). Each time the server starts, the shop's counter's first pull stores those events like a
 * menu change typed in by hand, so they reach the counter, the kitchen and the cloud. The events'
 * fixed ids make this a no-op once they are stored: nothing is doubled, and the owner's own changes
 * (newer events) stay.
 */
export function firstMenu({ store, shopId, now = Date.now }: {
  store: EventStore; shopId: () => string | undefined; now?: () => number;
}): (device: Device) => Promise<SyncedEvent[]> {
  const asked = new Map<string, Promise<SyncedEvent[]>>();
  const add = async (device: Device): Promise<SyncedEvent[]> => {
    const { stored } = await store.push(device, starterMenuEvents(device.tenantId, now()), now());
    if (stored.length) console.log(`Set up the starter menu: ${stored.length} menu events`);
    return stored;
  };
  return (device) => {
    if (device.kind !== 'counter' || device.tenantId !== shopId()) return Promise.resolve([]);
    if (!asked.has(device.tenantId)) {
      asked.set(device.tenantId, add(device).catch((e: unknown) => { asked.delete(device.tenantId); throw e; }));
      return asked.get(device.tenantId)!;
    }
    return Promise.resolve([]);
  };
}
