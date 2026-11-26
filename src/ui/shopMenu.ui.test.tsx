import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Root } from './Root.tsx';

// The real shop's menu (the starter menu, empty, folded under the shop's own menu events), not the printed one tests use.
beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('MODE', 'production');
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  history.replaceState(null, '', '/');
});

const go = async (hash: string) => {
  await act(async () => {
    history.replaceState(null, '', `/${hash}`);
    dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 20));
  });
};

test("Cash out, then the Register: a new shop's menu is empty, never CheesyBeez' printed one (the shop's history never brings it back)", async () => {
  history.replaceState(null, '', '/#cashout');
  render(<Root />);
  expect(await screen.findByPlaceholderText(/fish 4500/)).toBeTruthy();
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // the shop's history has loaded
  await go('');
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  for (const printed of ['Margherita', 'Biriyani', 'Chicken Kottu']) expect(screen.queryByText(printed)).toBeNull();
  const tabs = screen.queryAllByRole('button').filter((b) => b.closest('nav[aria-label="Menu"]')).map((b) => b.textContent);
  for (const printed of ['Pizza', 'Burgers', 'Pasta', 'Breakfast']) expect(tabs).not.toContain(printed);
});

test("the Menu screen of a new shop: no sections but the owner's own, ready for his first, no CheesyBeez, no stock, recipes or costs", async () => {
  history.replaceState(null, '', '/#menu');
  render(<Root />);
  expect(await screen.findByRole('heading', { name: 'Menu' })).toBeTruthy();
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // the shop's history has loaded
  const tabs = screen.getAllByRole('button').filter((b) => b.closest('nav[aria-label="Menu sections"]')).map((b) => b.textContent);
  expect(tabs).toContain('+ Section');
  for (const printed of ['Pizza', 'Burgers', 'Pasta', 'Kottu', 'Breakfast']) expect(tabs).not.toContain(printed);
  const page = screen.getByRole('main', { name: 'Menu' }).textContent ?? '';
  expect(page).not.toMatch(/cheesybeez|Margherita|Biriyani|Stock value|Raw materials|Warehouses|recipe|Cost /i);
});
