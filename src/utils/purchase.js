// src/utils/purchase.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'isPremium_v1';

export const FREE_THEMES = ['honeybee', 'blossom', 'ocean'];

export const PRODUCTS = {
  LIFETIME: 'com.elizlee.babyreport.premium_lifetime',
};

// Expo Go에서는 네이티브 모듈 없음 → lazy require로 안전하게 처리
function getIAP() {
  try {
    const mod = require('expo-iap');
    if (!mod?.initConnection) return null;
    return mod;
  } catch (_) {
    return null;
  }
}

// ── 프리미엄 상태 ─────────────────────────────

export async function isPremium() {
  try {
    const val = await AsyncStorage.getItem(PREMIUM_KEY);
    return val === 'true';
  } catch { return false; }
}

export async function setPremium() {
  try {
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
  } catch (e) { console.error(e); }
}

export async function revokePremium() {
  try {
    await AsyncStorage.removeItem(PREMIUM_KEY);
  } catch (e) { console.error(e); }
}

export function isThemeFree(themeKey) {
  return FREE_THEMES.includes(themeKey);
}

export async function canUseTheme(themeKey) {
  if (isThemeFree(themeKey)) return true;
  return await isPremium();
}

// ── 실제 IAP (개발 빌드에서만 동작) ──────────────

export async function getProducts() {
  try {
    const IAP = getIAP();
    if (!IAP) return [];
    await IAP.initConnection();
    const results = await IAP.fetchProducts({ skus: [PRODUCTS.LIFETIME], type: 'in-app' });
    console.log('[IAP] products:', JSON.stringify(results));
    return results || [];
  } catch (e) {
    console.error('getProducts error:', e);
    return [];
  }
}

export async function purchaseProduct(productId) {
  const IAP = getIAP();
  if (!IAP) throw new Error('개발 빌드에서만 결제할 수 있어요.');
  console.log('[IAP] purchaseProduct called with:', productId);
  await IAP.initConnection();
  await IAP.requestPurchase({
    request: {
      apple: { sku: productId },
      google: { skus: [productId] },
    },
    type: 'in-app',
  });
}

export async function restorePurchases() {
  const IAP = getIAP();
  if (!IAP) return false;
  const purchases = (await IAP.getAvailablePurchases()) || [];
  const hasPremium = purchases.some(item => item.productId === PRODUCTS.LIFETIME);
  if (hasPremium) await setPremium();
  return hasPremium;
}

export async function disconnectIAP() {
  try {
    const IAP = getIAP();
    if (IAP) await IAP.endConnection();
  } catch (_) {}
}

export function addPurchaseListener(callback) {
  const IAP = getIAP();
  if (!IAP) return { remove: () => {} };

  const errorSub = IAP.purchaseErrorListener((error) => {
    console.error('[IAP] purchaseError:', JSON.stringify(error));
  });

  const purchaseSub = IAP.purchaseUpdatedListener(async (purchase) => {
    console.log('[IAP] purchaseUpdated:', JSON.stringify(purchase));
    if (!purchase) return;
    try {
      await IAP.finishTransaction({ purchase, isConsumable: false });
      console.log('[IAP] finishTransaction OK');
    } catch (e) {
      console.error('[IAP] finishTransaction error:', e);
    }
    callback(purchase);
  });

  return {
    remove: () => {
      purchaseSub?.remove?.();
      errorSub?.remove?.();
    },
  };
}
