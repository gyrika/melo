import assert from 'node:assert/strict';
import { test } from 'node:test';
import { menuStateFromEvents, effectiveMenu } from '../src/domain/menuEdits.ts';
import { MENU } from '../src/domain/menu.ts';
import { sectionsOf } from '../src/domain/sections.ts';
import { bataKadeMenuEvents } from '../src/shop/bataKade.ts';
import { firstMenu } from './firstMenu.ts';
import { memoryStore } from './store.ts';

test("a new shop's menu starts empty: stored on the counter's first pull, once; CheesyBeez' printed items are hidden", async () => {
  const store = memoryStore();
  const { device: counter } = await store.addDevice('sunrise-cafe-ab12', 'Sunrise Cafe', 'counter');
  const { device: kitchen } = await store.addDevice('sunrise-cafe-ab12', 'Sunrise Cafe', 'kitchen');
  const seed = firstMenu({ store, shopId: () => 'sunrise-cafe-ab12', now: () => 1_000 });

  assert.deepEqual(await seed(kitchen), [], 'only the counter brings it');
  const stored = await seed(counter);
  assert.equal(stored.length, MENU.length, 'one event per printed item, hiding it');
  assert.deepEqual(await seed(counter), [], 'asked again: nothing more');
  // A restarted server sends the same events again: their ids are already stored, so nothing doubles.
  assert.deepEqual(await firstMenu({ store, shopId: () => 'sunrise-cafe-ab12', now: () => 2_000 })(counter), []);

  const state = menuStateFromEvents((await store.pull('sunrise-cafe-ab12', 0, 1000)).map((r) => r.event));
  assert.deepEqual(effectiveMenu(MENU, state, 3_000).filter((m) => !m.hidden), [], 'nothing on offer until the owner adds his own');
  assert.ok(!stored.some(({ event: e }) => e.type === 'menu.item_added' || e.type === 'menu.section_set'), "no other shop's dishes or sections");
});

test("the owner's own dishes stay after a restart: the starter menu never hides them", async () => {
  const store = memoryStore();
  const { device: counter } = await store.addDevice('sunrise-cafe-ab12', 'Sunrise Cafe', 'counter');
  await firstMenu({ store, shopId: () => 'sunrise-cafe-ab12', now: () => 1_000 })(counter);
  const owner = { id: 'o1', name: 'Owner', role: 'owner' as const };
  await store.push(counter, [{
    id: 'mine-1', shopId: 'sunrise-cafe-ab12', at: 1_500, orderNumber: 0, actor: owner, type: 'menu.item_set', itemId: 'margherita',
    before: { hidden: true }, after: { hidden: false },
  }], 1_500);
  await firstMenu({ store, shopId: () => 'sunrise-cafe-ab12', now: () => 2_000 })(counter);
  const state = menuStateFromEvents((await store.pull('sunrise-cafe-ab12', 0, 1000)).map((r) => r.event));
  assert.ok(effectiveMenu(MENU, state, 3_000).some((m) => m.id === 'margherita' && !m.hidden), 'shown again by the owner, still shown');
});

test("the demo's menu is still Bata Kade's: its dishes, two rice tabs, no pizza", () => {
  const state = menuStateFromEvents(bataKadeMenuEvents('demo', 1_000));
  const offered = effectiveMenu(MENU, state, 3_000).filter((m) => !m.hidden);
  assert.ok(offered.some((m) => m.name.en === 'Chicken Kottu' && m.variants?.map((v) => `${v.label} ${v.price}`).join() === 'Half 50000,Full 75000'));
  assert.ok(!offered.some((m) => m.id === 'margherita'), 'no pizza');
  assert.deepEqual(sectionsOf(state).slice(0, 2).map((s) => s.label), ['Breakfast', 'Lunch']);
});
