// src/utils/purchase.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = 'isPremium_v1';

export const FREE_THEMES = ['honeybee', 'blossom', 'ocean'];

export const PRODUCTS = {
  LIFETIME: 'com.elizlee.babyreport.premium_lifetime',
  YEARLY: 'com.elizlee.babyreport.premium_yearly',
};

// Expo Go에서는 네이티브 모듈 없음 → lazy require로 안전하게 처리
function getIAP() {
  try {
    const { NativeModules } = require('react-native');
    if (!NativeModules.ExpoIap) return null;
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
    const results = await IAP.fetchProducts({ skus: [PRODUCTS.LIFETIME, PRODUCTS.YEARLY] });
    return results || [];
  } catch (e) {
    console.error('getProducts error:', e);
    return [];
  }
}

export async function purchaseProduct(productId) {
  const IAP = getIAP();
  if (!IAP) throw new Error('개발 빌드에서만 결제할 수 있어요.');
  const isSubs = productId === PRODUCTS.YEARLY;
  await IAP.requestPurchase({
    request: { apple: { sku: productId } },
    type: isSubs ? 'subs' : 'in-app',
  });
}

export async function restorePurchases() {
  const IAP = getIAP();
  if (!IAP) return false;
  const purchases = (await IAP.getAvailablePurchases()) || [];
  const hasPremium = purchases.some(
    item => item.productId === PRODUCTS.LIFETIME || item.productId === PRODUCTS.YEARLY
  );
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
  return IAP.purchaseUpdatedListener(async (purchase) => {
    if (!purchase) return;
    try {
      await IAP.finishTransaction({ purchase, isConsumable: false });
    } catch (_) {}
    callback(purchase);
  });
}
