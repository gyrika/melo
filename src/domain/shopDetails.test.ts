import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkShopDetails, resetShopDetails, setShopDetails, shopDetailsOf, shopName, type ShopDetailsEvent } from './shopDetails.ts';
import { receipt, receiptText, shopHeader } from './receipt.ts';
import { winbackFromEvents } from './campaigns.ts';
import { orderMessage } from './ordering.ts';
import { mayRecord } from './auth.ts';
import { validatePush } from '../../server/validate.ts';
import type { PaidOrder } from './types.ts';

afterEach(resetShopDetails);

const owner = { id: 'o1', name: 'Owner', role: 'owner' as const };
const named = (name: string, place: string, at = 1): ShopDetailsEvent =>
  ({ id: `n-${at}`, shopId: 'sunrise-cafe-ab12', at, orderNumber: 0, actor: owner, type: 'shop.details_set', name, place });

test('a shop name: needed, short, and in letters the printer has', () => {
  assert.equal(checkShopDetails('Sunrise Cafe', 'Galle'), null);
  assert.equal(checkShopDetails('Sunrise Cafe', ''), null, 'the town may stay empty');
  assert.equal(checkShopDetails('  ', 'Galle'), 'the shop needs a name');
  assert.match(checkShopDetails('x'.repeat(41), '') ?? '', /40 letters/);
  assert.match(checkShopDetails('බටකඩේ', 'Galle') ?? '', /English letters/, 'Sinhala would print as ?');
});

test("the latest name wins; before any, screens say Melo POS, and a screen never loses the name it had", () => {
  assert.equal(shopDetailsOf([]), null);
  assert.deepEqual(shopDetailsOf([named('Sunrise', 'Galle', 1), named('Sunrise Cafe', 'Matara', 2)]), { name: 'Sunrise Cafe', place: 'Matara' });
  assert.equal(shopName(), 'Melo POS');
  setShopDetails({ name: 'Sunrise Cafe', place: 'Galle' });
  assert.equal(shopName(), 'Sunrise Cafe');
  setShopDetails(null); // a screen that has not read the shop's events yet
  assert.equal(shopName(), 'Sunrise Cafe');
});

test("the bill prints the shop's own name, large, and its town under it", () => {
  const paid: PaidOrder = { number: 7, lines: [], total: 0, tender: 'cash', tendered: 0, change: 0, paidAt: new Date(2026, 10, 26, 12).getTime() };
  assert.equal(shopHeader().name, 'Melo POS', 'before the shop is named');
  setShopDetails({ name: 'Sunrise Cafe', place: 'Galle' });
  const lines = receipt(paid, { cashier: 'N' });
  assert.deepEqual(lines.slice(0, 2), [{ text: 'Sunrise Cafe', center: true, big: true }, { text: 'Galle', center: true }]);
  assert.ok(receiptText(lines).includes('S u n r i s e   C a f e'));
});

test('"we miss you" and the order to a supplier use the shop\'s name', () => {
  assert.equal(winbackFromEvents([named('Sunrise Cafe', 'Galle')]).title, 'We miss you at Sunrise Cafe', 'from the events: the shop server has no screen');
  setShopDetails({ name: 'Sunrise Cafe', place: 'Galle' });
  assert.match(orderMessage([]), /^Hi, this is Sunrise Cafe\./);
});

test("only the owner names the shop, through the shop PC: a device's push of it is checked", () => {
  assert.equal(mayRecord('owner', 'shop.details_set'), true);
  assert.equal(mayRecord('cashier', 'shop.details_set'), false);
  assert.ok('events' in validatePush({ events: [named('Sunrise Cafe', 'Galle')] }, 'sunrise-cafe-ab12'));
  assert.ok('reason' in validatePush({ events: [named('', 'Galle')] }, 'sunrise-cafe-ab12'), 'no name');
  assert.ok('reason' in validatePush({ events: [named('බටකඩේ', 'Galle')] }, 'sunrise-cafe-ab12'), 'letters the printer lacks');
});
