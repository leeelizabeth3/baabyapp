// src/screens/PremiumScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isPremium, setPremium, FREE_THEMES, getProducts, purchaseProduct, disconnectIAP, PRODUCTS, addPurchaseListener, restorePurchases } from '../utils/purchase';
import { THEME_LIST } from '../data/themes';

export default function PremiumScreen({ onClose, onPurchaseSuccess }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(null);
  const [alreadyPremium, setAlreadyPremium] = useState(false);
  const [products, setProducts] = useState({});

  useEffect(() => {
    isPremium().then(setAlreadyPremium);

    // 실제 상품 가격 불러오기
    getProducts().then(results => {
      if (!Array.isArray(results)) return;
      const map = {};
      results.forEach(p => { if (p?.productId) map[p.productId] = p; });
      setProducts(map);
    }).catch(() => {});

    // 결제 완료 리스너
    const subscription = addPurchaseListener(async (purchase) => {
      if (!purchase) return;
      await setPremium();
      setAlreadyPremium(true);
      setLoading(null);
      Alert.alert(
        '🎉 프리미엄 활성화!',
        '이제 모든 테마를 무제한으로 사용할 수 있어요!'
      );
      onPurchaseSuccess?.();
    });

    return () => {
      subscription?.remove?.();
      disconnectIAP();
    };
  }, []);

  const handlePurchase = async () => {
    setLoading('lifetime');
    try {
      await purchaseProduct(PRODUCTS.LIFETIME);
    } catch (e) {
      setLoading(null);
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('cancel')) return;
      Alert.alert('결제 오류', msg || '다시 시도해주세요.');
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    try {
      const restored = await restorePurchases();
      setLoading(null);
      if (restored) {
        setAlreadyPremium(true);
        Alert.alert('✅ 복원 완료', '프리미엄이 복원되었어요!');
        onPurchaseSuccess?.();
      } else {
        Alert.alert('복원 실패', '이전에 구매한 내역을 찾을 수 없어요.\n같은 Apple ID로 로그인되어 있는지 확인해주세요.');
      }
    } catch (e) {
      setLoading(null);
      Alert.alert('복원 오류', e?.message || '다시 시도해주세요.');
    }
  };

  const premiumThemes = THEME_LIST.filter(t => !FREE_THEMES.includes(t.key));
  const freeThemes = THEME_LIST.filter(t => FREE_THEMES.includes(t.key));

  if (alreadyPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.alreadyWrap}>
          <Text style={styles.alreadyEmoji}>🎉</Text>
          <Text style={styles.alreadyTitle}>프리미엄 사용 중이에요!</Text>
          <Text style={styles.alreadySub}>모든 테마 16개 + 배경 패턴 5종을 자유롭게 사용하세요 🐾</Text>
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
          <Text style={styles.themeSectionLabel}>🆓 무료 테마 (4개)</Text>
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

        {/* 배경 패턴 */}
        <View style={[styles.themeSection, styles.premiumThemeSection]}>
          <Text style={styles.themeSectionLabel}>🌀 배경 패턴 (5종)</Text>
          <View style={styles.themeRow}>
            {[
              { emoji: '⠿', label: '도트' },
              { emoji: '〰', label: '물결' },
              { emoji: '≡', label: '줄무늬' },
              { emoji: '⬡', label: '육각형' },
              { emoji: '✦', label: '별' },
            ].map(p => (
              <View key={p.label} style={styles.themeChip}>
                <View style={[styles.themeChipDot, { backgroundColor: '#F0EEF8' }]}>
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                </View>
                <Text style={styles.themeChipName}>{p.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.patternHint}>카드 배경에 예쁜 패턴을 입혀보세요 ✨</Text>
        </View>

        {/* 구매 버튼 */}
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={handlePurchase}
          disabled={!!loading}
        >
          {loading === 'lifetime'
            ? <ActivityIndicator color="#5A3A10" />
            : <Text style={styles.buyBtnText}>
                {products[PRODUCTS.LIFETIME]?.displayPrice ?? '$2.99'} — 지금 구매하기 ✨
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
            : <Text style={styles.restoreBtnText}>이전 구매 복원하기</Text>
          }
        </TouchableOpacity>

        {onClose && (
          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={styles.laterBtnText}>나중에 하기</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => Linking.openURL('https://leeelizabeth3.github.io/babysteps-privacy/')}>
          <Text style={styles.legal}>개인정보 처리방침</Text>
        </TouchableOpacity>

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
  patternHint: { fontSize: 11, color: '#8A7050', marginTop: 10, textAlign: 'center' },
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
  laterBtn: { alignItems: 'center', paddingVertical: 10 },
  laterBtnText: { fontSize: 14, color: '#A09070' },
  restoreBtn: { alignItems: 'center', paddingVertical: 10 },
  restoreBtnText: { fontSize: 13, color: '#A09070', textDecorationLine: 'underline' },
  closeBtn: {
    marginTop: 24, backgroundColor: '#F5C842',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32,
  },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#5A3A10' },
  legal: { fontSize: 10, color: '#B0A080', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});