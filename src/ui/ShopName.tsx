import { useSyncExternalStore } from 'react';
import { shopName, subscribeShopDetails } from '../domain/shopDetails.ts';
import { startMenuStore } from './menuStore.ts';

/** The shop's own name (shopDetails.ts), or "Melo POS" before setup; re-renders when it changes. */
export const useShopName = (): string => {
  startMenuStore(); // reads the shop's events, where its name is kept
  return useSyncExternalStore(subscribeShopDetails, shopName);
};

/** The shop's name as text, for a screen's corner or a sentence. */
export function ShopName() {
  return <>{useShopName()}</>;
}

/** The ordering site's: the name the cloud gave it (OrderSite sets it), without the counter's event log. */
export function ShopNameText() {
  return <>{useSyncExternalStore(subscribeShopDetails, shopName)}</>;
}
