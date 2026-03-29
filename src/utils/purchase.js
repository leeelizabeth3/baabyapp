// src/utils/purchase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

function getIAP() {
  if (!NativeModules.ExpoInAppPurchases) return null;
  return require('expo-in-app-purchases');
}

const PREMIUM_KEY = 'isPremium_v1';

// 무료로 제공하는 테마 3개
export const FREE_THEMES = ['honeybee', 'blossom', 'ocean'];

// App Store Connect에서 등록한 상품 ID와 반드시 일치해야 함
export const PRODUCTS = {
  LIFETIME: 'com.elizlee.babyreport.premium_lifetime',
  YEARLY: 'com.elizlee.babyreport.premium_yearly',
};

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

// ── 실제 IAP 결제 ──────────────────────────────

export async function getProducts() {
  try {
    const IAP = getIAP();
    if (!IAP) return [];
    await IAP.connectAsync();
    const { results } = await IAP.getProductsAsync([
      PRODUCTS.LIFETIME,
      PRODUCTS.YEARLY,
    ]);
    return results || [];
  } catch (e) {
    console.error('getProducts error:', e);
    return [];
  }
}

export async function purchaseProduct(productId) {
  const IAP = getIAP();
  if (!IAP) throw new Error('In-app purchases not available in Expo Go. Please use a development build.');
  await IAP.purchaseItemAsync(productId);
}

export async function restorePurchases() {
  const IAP = getIAP();
  if (!IAP) return false;
  const history = await IAP.getPurchaseHistoryAsync();
  const items = history?.results || [];
  const hasPremium = items.some(
    item => item.productId === PRODUCTS.LIFETIME || item.productId === PRODUCTS.YEARLY
  );
  if (hasPremium) {
    await setPremium();
  }
  return hasPremium;
}

export async function disconnectIAP() {
  try {
    const IAP = getIAP();
    if (IAP) await IAP.disconnectAsync();
  } catch (_) {}
}
