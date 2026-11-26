import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShopTab } from './SetupWizard.tsx';
import { ShopName } from './ShopName.tsx';
import { setupClient, type SetupState } from '../services/setupClient.ts';
import { resetShopDetails } from '../domain/shopDetails.ts';

// Shop setup › Shop: the shop's own name and town (shopDetails.ts), on every screen's corner and the bill.

beforeEach(() => { localStorage.clear(); resetShopDetails(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const state = { done: true, shop: { id: 'sunrise-ab12', name: 'Sunrise', place: 'Galle' }, printer: null, printers: [], cloud: false, cv: null } as unknown as SetupState;

test("the owner renames the shop with his PIN, and the corner says the new name; Sinhala is refused before it reaches the printer", async () => {
  const user = userEvent.setup();
  const call = vi.spyOn(setupClient, 'shopDetails').mockImplementation(async (name, place) => ({
    events: [{ id: 'n1', shopId: 'sunrise-ab12', at: 1, orderNumber: 0, actor: { id: 'o', name: 'Owner', role: 'owner' }, type: 'shop.details_set', name, place }],
  }));
  render(<><span data-testid="corner"><ShopName /></span><ShopTab state={state} ownerPin="1234" /></>);
  const name = screen.getByLabelText('Shop name');
  expect((name as HTMLInputElement).value).toBe('Sunrise');
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled, 'nothing changed yet').toBe(true);

  await user.clear(name);
  await user.type(name, 'බටකඩේ');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert').textContent).toMatch(/English letters/);
  expect(call).not.toHaveBeenCalled();

  await user.clear(name);
  await user.type(name, 'Sunrise Cafe');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(call).toHaveBeenCalledWith('Sunrise Cafe', 'Galle', '1234');
  expect(screen.getByTestId('corner').textContent).toBe('Sunrise Cafe');
  expect(screen.getByRole('status').textContent).toBe('Saved. Every screen now says Sunrise Cafe.');
});
