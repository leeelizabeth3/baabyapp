// src/screens/PremiumScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeModules } from 'react-native';
import { isPremium, setPremium, FREE_THEMES, getProducts, purchaseProduct, restorePurchases, disconnectIAP, PRODUCTS } from '../utils/purchase';
import { THEME_LIST } from '../data/themes';

export default function PremiumScreen({ onClose, onPurchaseSuccess }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(null);
  const [alreadyPremium, setAlreadyPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('lifetime');
  const [products, setProducts] = useState({});

  useEffect(() => {
    isPremium().then(setAlreadyPremium);

    // 실제 상품 가격 불러오기
    getProducts().then(results => {
      const map = {};
      results.forEach(p => { map[p.productId] = p; });
      setProducts(map);
    });

    // 결제 완료 리스너
    let subscription;
    if (NativeModules.ExpoInAppPurchases) {
      const IAP = require('expo-in-app-purchases');
      subscription = IAP.setPurchaseListener(async ({ responseCode, results }) => {
        if (responseCode === IAP.IAPResponseCode.OK) {
          for (const purchase of results) {
            if (!purchase.acknowledged) {
              await IAP.finishTransactionAsync(purchase, true);
            }
          }
          await setPremium();
          setAlreadyPremium(true);
          setLoading(null);
          Alert.alert(
            '🎉 프리미엄 활성화!',
            '이제 모든 테마를 무제한으로 사용할 수 있어요!\n\n수익은 전액 베이비박스 기부에 사용됩니다 ❤️'
          );
          onPurchaseSuccess?.();
        } else if (responseCode === IAP.IAPResponseCode.USER_CANCELED) {
          setLoading(null);
        } else {
          setLoading(null);
          Alert.alert('결제 실패', '다시 시도해주세요.');
        }
      });
    }

    return () => {
      subscription?.remove?.();
      disconnectIAP();
    };
  }, []);

  const handlePurchase = async (plan) => {
    setLoading(plan);
    try {
      const productId = plan === 'lifetime' ? PRODUCTS.LIFETIME : PRODUCTS.YEARLY;
      await purchaseProduct(productId);
      // 결제 결과는 setPurchaseListener에서 처리
    } catch (e) {
      setLoading(null);
      Alert.alert('결제 오류', e.message || '다시 시도해주세요.');
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    try {
      const restored = await restorePurchases();
      if (restored) {
        setAlreadyPremium(true);
        Alert.alert('복원 완료! 🎉', '프리미엄이 복원되었어요!');
        onPurchaseSuccess?.();
      } else {
        Alert.alert('복원할 구매 없음', '아직 프리미엄을 구매하지 않으셨어요.');
      }
    } catch {
      Alert.alert('오류', '복원 중 문제가 생겼어요.');
    }
    setLoading(null);
  };

  const premiumThemes = THEME_LIST.filter(t => !FREE_THEMES.includes(t.key));
  const freeThemes = THEME_LIST.filter(t => FREE_THEMES.includes(t.key));

  if (alreadyPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.alreadyWrap}>
          <Text style={styles.alreadyEmoji}>🎉</Text>
          <Text style={styles.alreadyTitle}>프리미엄 사용 중이에요!</Text>
          <Text style={styles.alreadySub}>모든 테마 15개를 자유롭게 사용하세요 🐾</Text>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>✨</Text>
          <Text style={styles.headerTitle}>BabySteps Premium</Text>
          <Text style={styles.headerSub}>더 많은 테마로 특별한 추억을 만들어요</Text>
        </View>

        {/* 무료 테마 */}
        <View style={styles.themeSection}>
          <Text style={styles.themeSectionLabel}>🆓 무료 테마 (3개)</Text>
          <View style={styles.themeRow}>
            {freeThemes.map(t => (
              <View key={t.key} style={styles.themeChip}>
                <View style={[styles.themeChipDot, { backgroundColor: t.swatchColors[0] }]}>
                  <Text style={{ fontSize: 16 }}>{t.swatchIcon}</Text>
                </View>
                <Text style={styles.themeChipName}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 프리미엄 테마 */}
        <View style={[styles.themeSection, styles.premiumThemeSection]}>
          <Text style={styles.themeSectionLabel}>✨ 프리미엄 테마 (12개)</Text>
          <View style={styles.themeGrid}>
            {premiumThemes.map(t => (
              <View key={t.key} style={styles.premiumThemeChip}>
                <View style={[styles.themeChipDot, { backgroundColor: t.swatchColors[0] }]}>
                  <Text style={{ fontSize: 16 }}>{t.swatchIcon}</Text>
                </View>
                <Text style={styles.themeChipName}>{t.name}</Text>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 기부 배너 */}
        <View style={styles.donationBanner}>
          <Text style={styles.donationEmoji}>❤️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.donationTitle}>수익 100% 기부</Text>
            <Text style={styles.donationText}>
              앱 수익은 전액 싱가포르 베이비박스 기부에 사용돼요.
              구매 한 번이 도움이 필요한 아기에게 전달됩니다 🍼
            </Text>
          </View>
        </View>

        {/* 플랜 선택 */}
        <Text style={styles.planTitle}>플랜 선택</Text>
        <View style={styles.planRow}>
          {/* 일회결제 */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'lifetime' && styles.planCardActive]}
            onPress={() => setSelectedPlan('lifetime')}
          >
            <View style={styles.planBadgeWrap}>
              <View style={styles.planBestBadge}>
                <Text style={styles.planBestText}>인기 ⭐</Text>
              </View>
            </View>
            <Text style={styles.planName}>평생 이용권</Text>
            <Text style={styles.planPrice}>
              {products[PRODUCTS.LIFETIME]?.price ?? 'S$4.99'}
            </Text>
            <Text style={styles.planDesc}>한 번만 결제{'\n'}평생 사용</Text>
          </TouchableOpacity>

          {/* 연간 구독 */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planBadgeWrap} />
            <Text style={styles.planName}>연간 구독</Text>
            <Text style={styles.planPrice}>
              {products[PRODUCTS.YEARLY]?.price ?? 'S$2.99'}
            </Text>
            <Text style={styles.planDesc}>매년 자동 갱신{'\n'}S$2.99/년</Text>
          </TouchableOpacity>
        </View>

        {/* 구매 버튼 */}
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => handlePurchase(selectedPlan)}
          disabled={!!loading}
        >
          {loading === selectedPlan
            ? <ActivityIndicator color="#5A3A10" />
            : <Text style={styles.buyBtnText}>
                {selectedPlan === 'lifetime'
                  ? `${products[PRODUCTS.LIFETIME]?.price ?? 'S$4.99'} — 지금 구매하기 ✨`
                  : `${products[PRODUCTS.YEARLY]?.price ?? 'S$2.99'}/년 — 구독 시작하기 ✨`
                }
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={!!loading}
        >
          {loading === 'restore'
            ? <ActivityIndicator color="#A09070" size="small" />
            : <Text style={styles.restoreBtnText}>구매 복원하기</Text>
          }
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={styles.laterBtnText}>나중에 하기</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legal}>
          구독은 언제든지 취소할 수 있어요.{'\n'}
          Apple ID 계정으로 청구됩니다.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E0' },
  scroll: { padding: 20, paddingBottom: 40 },
  alreadyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  alreadyEmoji: { fontSize: 64, marginBottom: 16 },
  alreadyTitle: { fontSize: 24, fontWeight: '800', color: '#5A3A10', marginBottom: 8 },
  alreadySub: { fontSize: 15, color: '#8A7050', textAlign: 'center', lineHeight: 22 },
  header: { alignItems: 'center', marginBottom: 24 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#5A3A10' },
  headerSub: { fontSize: 13, color: '#8A6830', marginTop: 4, textAlign: 'center' },
  themeSection: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  premiumThemeSection: { borderWidth: 2, borderColor: '#F5C842' },
  themeSectionLabel: { fontSize: 13, fontWeight: '700', color: '#5A3A10', marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: { alignItems: 'center', gap: 4 },
  premiumThemeChip: { alignItems: 'center', gap: 2, width: '22%' },
  themeChipDot: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  themeChipName: { fontSize: 9, color: '#8A7050', textAlign: 'center' },
  lockIcon: { fontSize: 10 },
  donationBanner: {
    backgroundColor: '#FFF0F0', borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#FFD0D0',
  },
  donationEmoji: { fontSize: 26 },
  donationTitle: { fontSize: 14, fontWeight: '800', color: '#C04040', marginBottom: 3 },
  donationText: { fontSize: 12, color: '#8A4040', lineHeight: 18 },
  planTitle: { fontSize: 16, fontWeight: '800', color: '#5A3A10', marginBottom: 12 },
  planRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  planCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: '#EAD9C0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  planCardActive: { borderColor: '#F5C842', backgroundColor: '#FFFBE8' },
  planBadgeWrap: { height: 22, marginBottom: 4, justifyContent: 'center' },
  planBestBadge: {
    backgroundColor: '#F5C842', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  planBestText: { fontSize: 10, fontWeight: '700', color: '#5A3A10' },
  planName: { fontSize: 14, fontWeight: '700', color: '#5A3A10', marginBottom: 4 },
  planPrice: { fontSize: 26, fontWeight: '800', color: '#C87820', marginBottom: 4 },
  planDesc: { fontSize: 11, color: '#8A7050', textAlign: 'center', lineHeight: 16 },
  buyBtn: {
    backgroundColor: '#F5C842', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    marginBottom: 10,
  },
  buyBtnText: { fontSize: 16, fontWeight: '800', color: '#5A3A10' },
  restoreBtn: { alignItems: 'center', paddingVertical: 10 },
  restoreBtnText: { fontSize: 13, color: '#A09070', textDecorationLine: 'underline' },
  laterBtn: { alignItems: 'center', paddingVertical: 10 },
  laterBtnText: { fontSize: 14, color: '#A09070' },
  closeBtn: {
    marginTop: 24, backgroundColor: '#F5C842',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32,
  },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#5A3A10' },
  legal: { fontSize: 10, color: '#B0A080', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});