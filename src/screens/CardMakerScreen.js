// src/screens/CardMakerScreen.js
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, Dimensions, Platform, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  AppHeader, SectionTitle, Card, PrimaryButton, SecondaryButton,
  FormField, StyledInput, RowFields, COLORS,
} from '../components/UI';
import { THEME_LIST, THEMES } from '../data/themes';
import { MILESTONES } from '../data/milestones';
import { saveAlbumRecord } from '../utils/storage';
import { canUseTheme, isThemeFree, isPremium } from '../utils/purchase';
import PremiumScreen from './PremiumScreen';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = SW - 32;

const MONTHS = Array.from({ length: 13 }, (_, i) => ({ label: `${i}개월`, value: String(i) }));

function MonthDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = MONTHS.find(m => m.value === value) || MONTHS[0];
  return (
    <>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownBtnText}>{selected.label}</Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdownList}>
            <Text style={styles.dropdownListTitle}>개월 수 선택</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MONTHS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.dropdownItem, value === m.value && styles.dropdownItemActive]}
                  onPress={() => { onChange(m.value); setOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, value === m.value && styles.dropdownItemTextActive]}>
                    {m.label}
                  </Text>
                  {value === m.value && <Text style={styles.dropdownItemCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function CardMakerScreen() {
  const insets = useSafeAreaInsets();
  const cardRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [month, setMonth] = useState('0');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [heightStart, setHeightStart] = useState('');
  const [heightEnd, setHeightEnd] = useState('');
  const [weightStart, setWeightStart] = useState('');
  const [weightEnd, setWeightEnd] = useState('');
  const [clothes, setClothes] = useState('');
  const [sleep, setSleep] = useState('');
  const [feeding, setFeeding] = useState('');
  const [diaper, setDiaper] = useState('');
  const [vaccine, setVaccine] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [special, setSpecial] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('honeybee');
  const [cardVisible, setCardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [isPremature, setIsPremature] = useState(false);
  const [prematureWeeks, setPrematureWeeks] = useState('');
  const [showPremium, setShowPremium] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);

  useFocusEffect(useCallback(() => {
    isPremium().then(setUserIsPremium);
  }, []));
  const ageInfo = useMemo(() => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);
    const daysOld = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
    if (daysOld < 0) return null;
    const weeksOld = Math.floor(daysOld / 7);
    const monthsOld = Math.min(12, Math.floor(daysOld / 30.4375));
    let corrected = null;
    if (isPremature && prematureWeeks) {
      const premWeeks = parseInt(prematureWeeks) || 0;
      const correctedDays = Math.max(0, daysOld - premWeeks * 7);
      corrected = {
        days: correctedDays,
        weeks: Math.floor(correctedDays / 7),
        months: Math.min(12, Math.max(0, Math.floor(correctedDays / 30.4375))),
      };
    }
    return { days: daysOld, weeks: weeksOld, months: monthsOld, corrected };
  }, [birthdate, isPremature, prematureWeeks]);

  const t = THEMES[selectedTheme];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const generateCard = () => {
    setCardVisible(true);
  };

  const saveCard = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const tmpUri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });

      // Copy to permanent app documents directory (persists across restarts)
      const fileName = `baby_card_${Date.now()}.png`;
      const permanentUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: tmpUri, to: permanentUri });

      // Try saving to photo library (optional — don't fail if denied)
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.createAssetAsync(tmpUri);
        }
      } catch (_) {}

      await saveAlbumRecord({
        id: Date.now(),
        name: name || '아기',
        month: parseInt(month),
        date: dateStart || new Date().toISOString().split('T')[0],
        theme: selectedTheme,
        uri: permanentUri,
      });

      Alert.alert('저장 완료! 🎉', '앨범에 저장되었어요!');
    } catch (e) {
      Alert.alert('오류', '저장 중 오류가 발생했어요: ' + e.message);
    }
    setSaving(false);
  };

  // Build display strings
  const hwStr = [
    (heightStart || heightEnd) ? `${heightStart || '?'}cm${heightEnd ? ' → ' + heightEnd + 'cm' : ''}` : null,
    (weightStart || weightEnd) ? `${weightStart || '?'}kg${weightEnd ? ' → ' + weightEnd + 'kg' : ''}` : null,
  ].filter(Boolean).join('\n');

  const dateStr = dateStart && dateEnd
    ? `${dateStart.replace(/-/g, '.')} ~ ${dateEnd.replace(/-/g, '.')}`
    : dateStart ? dateStart.replace(/-/g, '.') : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader subtitle="카드 만들기 · 앨범 · 성장 추적" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 아기 나이 계산기 ── */}
        <View style={styles.sec}>
          <SectionTitle>🧮 아기 나이 계산기</SectionTitle>
          <Card>
            <RowFields>
              <FormField label="아기 이름" style={{ flex: 1 }}>
                <StyledInput value={name} onChangeText={setName} placeholder="예: 하엘" />
              </FormField>
              <FormField label="생년월일" style={{ flex: 1 }}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowBirthPicker(true)}>
                  <Text style={birthdate ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                    {birthdate || '날짜 선택'}
                  </Text>
                  <Text style={{ fontSize: 12 }}>🎂</Text>
                </TouchableOpacity>
                {showBirthPicker && (
                  <DateTimePicker
                    value={birthdate ? new Date(birthdate) : new Date()}
                    mode="date"
                    display="compact"
                    maximumDate={new Date()}
                    onChange={(event, date) => {
                      setShowBirthPicker(false);
                      if (date) setBirthdate(date.toISOString().split('T')[0]);
                    }}
                  />
                )}
              </FormField>
            </RowFields>

            <TouchableOpacity style={styles.premToggle} onPress={() => setIsPremature(v => !v)}>
              <View style={[styles.checkbox, isPremature && styles.checkboxActive]}>
                {isPremature && <Text style={{ color: '#fff', fontSize: 10, lineHeight: 14 }}>✓</Text>}
              </View>
              <Text style={styles.premToggleText}>조산아예요 (교정나이 계산)</Text>
            </TouchableOpacity>

            {isPremature && (
              <FormField label="몇 주 일찍 태어났나요?">
                <StyledInput
                  value={prematureWeeks}
                  onChangeText={setPrematureWeeks}
                  placeholder="예: 6  (6주 조산)"
                  keyboardType="number-pad"
                />
              </FormField>
            )}

            {ageInfo && (() => {
              const displayMonth = ageInfo.corrected ? ageInfo.corrected.months : ageInfo.months;
              const ms = MILESTONES[displayMonth];
              return (
                <>
                  <View style={styles.ageBadgeRow}>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeNum}>{ageInfo.days}</Text>
                      <Text style={styles.ageBadgeLabel}>일</Text>
                    </View>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeNum}>{ageInfo.weeks}</Text>
                      <Text style={styles.ageBadgeLabel}>주</Text>
                    </View>
                    <View style={[styles.ageBadge, styles.ageBadgeMain]}>
                      <Text style={[styles.ageBadgeNum, styles.ageBadgeNumMain]}>{ageInfo.months}</Text>
                      <Text style={[styles.ageBadgeLabel, styles.ageBadgeLabelMain]}>개월</Text>
                    </View>
                  </View>

                  {ageInfo.corrected && (
                    <View style={styles.correctedBox}>
                      <Text style={styles.correctedTitle}>👶 교정나이</Text>
                      <Text style={styles.correctedValue}>
                        {ageInfo.corrected.months}개월 {ageInfo.corrected.weeks % 4}주
                      </Text>
                      <Text style={styles.correctedSub}>
                        실제 {ageInfo.months}개월 — 조산 {prematureWeeks}주 보정
                      </Text>
                    </View>
                  )}

                  <View style={styles.milestoneBox}>
                    <Text style={styles.milestoneTitle}>{ms.emoji} {ms.stage} 발달 정보</Text>
                    {ms.items.map((item, i) => (
                      <Text key={i} style={styles.milestoneItem}>{item}</Text>
                    ))}
                  </View>
                </>
              );
            })()}
          </Card>
        </View>

        {/* ── 기본 정보 ── */}
        <View style={styles.sec}>
          <SectionTitle>👶 기본 정보</SectionTitle>
          <Card>
            <FormField label="개월 수 (카드용)">
              <MonthDropdown value={month} onChange={setMonth} />
            </FormField>
            <RowFields>
              <FormField label="시작일" style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={dateStart ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                    {dateStart || '날짜 선택'}
                  </Text>
                  <Text style={{ fontSize: 12 }}>📅</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={dateStart ? new Date(dateStart) : new Date()}
                    mode="date"
                    display="compact"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setDateStart(date.toISOString().split('T')[0]);
                    }}
                  />
                )}
              </FormField>
              <FormField label="종료일" style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={dateEnd ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                    {dateEnd || '날짜 선택'}
                  </Text>
                  <Text style={{ fontSize: 12 }}>📅</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={dateEnd ? new Date(dateEnd) : new Date()}
                    mode="date"
                    display="compact"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setDateEnd(date.toISOString().split('T')[0]);
                    }}
                  />
                )}
              </FormField>
            </RowFields>
          </Card>
        </View>

        {/* ── 키/몸무게 ── */}
        <View style={styles.sec}>
          <SectionTitle>📐 키 / 몸무게</SectionTitle>
          <Card>
            <RowFields>
              <FormField label="키 시작 (cm)" style={{ flex: 1 }}>
                <StyledInput value={heightStart} onChangeText={setHeightStart} placeholder="49" keyboardType="decimal-pad" />
              </FormField>
              <FormField label="키 끝 (cm)" style={{ flex: 1 }}>
                <StyledInput value={heightEnd} onChangeText={setHeightEnd} placeholder="54" keyboardType="decimal-pad" />
              </FormField>
            </RowFields>
            <RowFields>
              <FormField label="몸무게 시작 (kg)" style={{ flex: 1 }}>
                <StyledInput value={weightStart} onChangeText={setWeightStart} placeholder="3.06" keyboardType="decimal-pad" />
              </FormField>
              <FormField label="몸무게 끝 (kg)" style={{ flex: 1 }}>
                <StyledInput value={weightEnd} onChangeText={setWeightEnd} placeholder="4.0" keyboardType="decimal-pad" />
              </FormField>
            </RowFields>
          </Card>
        </View>

        {/* ── 내용 ── */}
        <View style={styles.sec}>
          <SectionTitle>📝 내용</SectionTitle>
          <Card>
            <FormField label="👗 옷사이즈">
              <StyledInput value={clothes} onChangeText={setClothes} placeholder="배냇저고리 / 60" />
            </FormField>
            <FormField label="😴 수면">
              <StyledInput value={sleep} onChangeText={setSleep} placeholder={"평균 13~14시간\n2시간에 한 번 일어나 맘마타임"} multiline />
            </FormField>
            <FormField label="🍼 맘마">
              <StyledInput value={feeding} onChangeText={setFeeding} placeholder={"트루맘 뉴클래스 1단계\n유축수유 60~100ml × 8회"} multiline />
            </FormField>
            <FormField label="🧷 기저귀">
              <StyledInput value={diaper} onChangeText={setDiaper} placeholder="하기스 네이처메이드 2단계" />
            </FormField>
            <FormField label="💉 접종내역">
              <StyledInput value={vaccine} onChangeText={setVaccine} placeholder="B형 간염 1차 (02/26)" multiline />
            </FormField>
            <FormField label="❤️ 좋아하는 것">
              <StyledInput value={likes} onChangeText={setLikes} placeholder={"아빠와 하는 목욕\n트립트랩 뉴본"} multiline />
            </FormField>
            <FormField label="😤 싫어하는 것">
              <StyledInput value={dislikes} onChangeText={setDislikes} placeholder={"아기침대\n속싸개"} multiline />
            </FormField>
            <FormField label="✨ 특이사항">
              <StyledInput value={special} onChangeText={setSpecial} placeholder={"왼쪽발목 & 등 몽고반점\n황달 3일 겪음\n취미: 딸꾹질"} multiline />
            </FormField>
          </Card>
        </View>

        {/* ── 사진 ── */}
        <View style={styles.sec}>
          <SectionTitle>📸 아기 사진</SectionTitle>
          <Card>
            <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>탭해서 사진 선택</Text>
                  <Text style={styles.photoSub}>없으면 이모지로 대체 🍼</Text>
                </>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ alignSelf: 'center', marginTop: 8 }}>
                <Text style={{ color: '#E06040', fontSize: 13 }}>✕ 사진 삭제</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* ── 테마 선택 ── */}
        <View style={styles.sec}>
          <SectionTitle>🎨 테마 선택</SectionTitle>
          <Card>
            <View style={styles.themeGrid}>
              {THEME_LIST.map(theme => {
                const locked = !isThemeFree(theme.key) && !userIsPremium;
                return (
                  <TouchableOpacity
                    key={theme.key}
                    style={[
                      styles.themeSwatch,
                      selectedTheme === theme.key && styles.themeSwatchActive,
                      locked && styles.themeSwatchLocked,
                    ]}
                    onPress={() => {
                      if (locked) {
                        setShowPremium(true);
                      } else {
                        setSelectedTheme(theme.key);
                      }
                    }}
                  >
                    <View style={[styles.swatchPreview, { backgroundColor: theme.swatchColors[0] }]}>
                      <Text style={{ fontSize: 22 }}>{theme.swatchIcon}</Text>
                      {locked && (
                        <View style={styles.lockOverlay}>
                          <Text style={{ fontSize: 16 }}>🔒</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.swatchName}>{theme.name}</Text>
                    {selectedTheme === theme.key && !locked && (
                      <View style={styles.swatchCheck}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 프리미엄 모달 */}
            <Modal visible={showPremium} animationType="slide">
              <PremiumScreen
                onClose={() => setShowPremium(false)}
                onPurchaseSuccess={() => {
                  setUserIsPremium(true);
                  setShowPremium(false);
                }}
              />
            </Modal>
          </Card>
        </View>

        <PrimaryButton onPress={generateCard}>✨ 성장보고서 카드 만들기!</PrimaryButton>

        {/* ── Card Preview ── */}
        {cardVisible && (
          <View style={styles.cardSection}>
            <Text style={styles.cardHint}>👇 완성된 성장보고서</Text>
            <BabyCard
              ref={cardRef}
              theme={t}
              name={name || '아기'}
              month={month}
              dateStr={dateStr}
              hwStr={hwStr}
              clothes={clothes}
              vaccine={vaccine}
              sleep={sleep}
              feeding={feeding}
              diaper={diaper}
              dislikes={dislikes}
              likes={likes}
              special={special}
              photoUri={photoUri}
            />
            <SecondaryButton onPress={saveCard} style={saving ? { opacity: 0.7 } : {}}>
              {saving ? '저장 중...' : '💾 사진첩 & 앨범에 저장하기'}
            </SecondaryButton>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Baby Card Component ───────────────────────
const BabyCard = React.forwardRef(function BabyCard(
  { theme: t, name, month, dateStr, hwStr, clothes, vaccine, sleep, feeding, diaper, dislikes, likes, special, photoUri },
  ref
) {
  const cardW = SW - 32;

  function InfoBlock({ tag, content, flex }) {
    if (!content) return <View style={{ flex: flex || 1 }} />;
    return (
      <View style={[cardStyles.infoBlock, { flex: flex || 1, backgroundColor: t.ibBg, borderColor: t.ibBorder }]}>
        <View style={[cardStyles.infoTag, { backgroundColor: t.tagBg }]}>
          <Text style={[cardStyles.infoTagText, { color: t.tagColor }]}>{tag}</Text>
        </View>
        <Text style={[cardStyles.infoBody, t.dark && { color: 'rgba(255,255,255,0.88)' }]}>{content}</Text>
      </View>
    );
  }

  return (
    <View ref={ref} style={[cardStyles.card, { backgroundColor: t.cardBg, width: SW - 32 }]}>
      {/* Corner decos */}
      <Text style={[cardStyles.deco, { top: 8, left: 12, transform: [{ rotate: '-15deg' }] }]}>{t.emoji[0]}</Text>
      <Text style={[cardStyles.deco, { top: 8, right: 12, transform: [{ rotate: '12deg' }] }]}>{t.emoji[1]}</Text>
      <Text style={[cardStyles.deco, { bottom: 8, left: 12, transform: [{ rotate: '8deg' }], opacity: 0.7 }]}>{t.emoji[2]}</Text>
      <Text style={[cardStyles.deco, { bottom: 8, right: 12, transform: [{ rotate: '-10deg' }], opacity: 0.7 }]}>{t.emoji[3]}</Text>

      {/* Title */}
      <Text style={[cardStyles.title, { color: t.titleColor }]}>{t.emoji[0]} {name} {month}개월 성장보고서</Text>

      {/* Date pill */}
      {dateStr ? (
        <View style={[cardStyles.datePill, { backgroundColor: t.pillBg, borderColor: t.pillBorder }]}>
          <Text style={[cardStyles.datePillText, { color: t.pillColor }]}>{dateStr}</Text>
        </View>
      ) : null}

      {/* TOP ROW: 키/몸무게 | 접종내역 | 옷사이즈 */}
      <View style={cardStyles.row}>
        <InfoBlock tag="📐 키/몸무게" content={hwStr} />
        <View style={{ width: 6 }} />
        <InfoBlock tag="💉 접종내역" content={vaccine} />
        <View style={{ width: 6 }} />
        <InfoBlock tag="👗 옷사이즈" content={clothes} />
      </View>

      {/* MID ROW: 수면+맘마 | Photo | 기저귀+싫어 */}
      <View style={[cardStyles.row, { alignItems: 'center', marginVertical: 6 }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <InfoBlock tag="😴 수면" content={sleep} />
          <InfoBlock tag="🍼 맘마" content={feeding} />
        </View>
        <View style={{ width: 6 }} />
        {/* Photo circle */}
        <View style={[cardStyles.photoCircle, {
          borderColor: t.photoBorder,
          backgroundColor: t.photoBg[0],
        }]}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={cardStyles.photoImg} />
            : <Text style={{ fontSize: 44, opacity: 0.5 }}>🍼</Text>
          }
        </View>
        <View style={{ width: 6 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <InfoBlock tag="🧷 기저귀" content={diaper} />
          <InfoBlock tag="😤 싫어하는 것" content={dislikes} />
        </View>
      </View>

      {/* BOTTOM ROW: 좋아하는것 | 특이사항 */}
      <View style={cardStyles.row}>
        {likes ? <InfoBlock tag="❤️ 좋아하는 것" content={likes} /> : null}
        {likes && special ? <View style={{ width: 6 }} /> : null}
        {special ? <InfoBlock tag="✨ 특이사항" content={special} /> : null}
      </View>

      <Text style={[cardStyles.footer, { color: t.dark ? 'rgba(255,255,255,0.25)' : 'rgba(90,60,20,0.3)' }]}>
        Baby Steps 🍼
      </Text>
    </View>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  deco: { position: 'absolute', fontSize: 30, zIndex: 1 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6, marginTop: 4 },
  datePill: {
    alignSelf: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, marginBottom: 10,
  },
  datePillText: { fontSize: 11, fontWeight: '500' },
  row: { flexDirection: 'row', marginBottom: 6 },
  infoBlock: {
    borderRadius: 10, padding: 8, borderWidth: 1.5, flex: 1,
  },
  infoTag: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4,
  },
  infoTagText: { fontSize: 10, fontWeight: '700' },
  infoBody: { fontSize: 10, color: '#4A3520', lineHeight: 15 },
  photoCircle: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  photoImg: { width: '100%', height: '100%' },
  footer: { textAlign: 'center', fontSize: 10, marginTop: 8 },
});

const styles = StyleSheet.create({
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    backgroundColor: '#FFFDF5', paddingHorizontal: 10, paddingVertical: 8,
  },
  dateBtnText: { fontSize: 11, color: '#4A3520', fontWeight: '500' },
  dateBtnPlaceholder: { fontSize: 11, color: '#B0A080' },
  container: { flex: 1, backgroundColor: '#F5EDD8' },
  scroll: { padding: 16, paddingBottom: 40 },
  sec: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#EAD9C0', backgroundColor: '#FFFDF5',
  },
  chipActive: { backgroundColor: '#F5C842', borderColor: '#E8A020' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#8A7050' },
  chipTextActive: { color: '#5A3A10', fontWeight: '700' },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    backgroundColor: '#FFFDF5', paddingHorizontal: 14, paddingVertical: 10,
  },
  dropdownBtnText: { fontSize: 14, fontWeight: '600', color: '#5A3A10' },
  dropdownArrow: { fontSize: 10, color: '#A09070', marginLeft: 6 },
  dropdownOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  dropdownList: {
    backgroundColor: '#FFFDF5', borderRadius: 16, padding: 12,
    width: 220, maxHeight: 320,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  dropdownListTitle: {
    fontSize: 13, fontWeight: '700', color: '#8A7050',
    textAlign: 'center', marginBottom: 8, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#EAD9C0',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8,
  },
  dropdownItemActive: { backgroundColor: '#FFF0C0' },
  dropdownItemText: { fontSize: 14, color: '#5A3A10' },
  dropdownItemTextActive: { fontWeight: '700', color: '#C87820' },
  dropdownItemCheck: { fontSize: 13, color: '#C87820', fontWeight: '700' },
  photoArea: {
    borderWidth: 2, borderColor: '#E8DCC8', borderStyle: 'dashed',
    borderRadius: 12, padding: 20, alignItems: 'center', backgroundColor: '#FFFDF5',
  },
  photoPreview: { width: '100%', height: 180, borderRadius: 10 },
  photoIcon: { fontSize: 28, marginBottom: 6 },
  photoText: { fontSize: 13, color: '#8A7050' },
  photoSub: { fontSize: 11, color: '#A09070', marginTop: 2 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeSwatch: {
    width: '30%', borderRadius: 12, padding: 8, alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  themeSwatchActive: { borderColor: '#5A3A10' },
  swatchPreview: { width: '100%', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  swatchName: { fontSize: 10, fontWeight: '600', color: '#5A3A10', textAlign: 'center' },
  swatchCheck: {
    position: 'absolute', top: 4, right: 4, width: 16, height: 16,
    backgroundColor: '#5A3A10', borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  cardSection: { marginTop: 20 },
  cardHint: { fontSize: 12, color: '#8A7050', textAlign: 'center', marginBottom: 10 },
  premToggle: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#C8B090',
    backgroundColor: '#FFFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  checkboxActive: { backgroundColor: '#C87820', borderColor: '#C87820' },
  premToggleText: { fontSize: 13, color: '#6A5030', fontWeight: '500' },
  ageBadgeRow: {
    flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8, justifyContent: 'center',
  },
  ageBadge: {
    flex: 1, alignItems: 'center', backgroundColor: '#FFF8E8',
    borderRadius: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EAD9C0',
  },
  ageBadgeMain: { backgroundColor: '#FFF0A0', borderColor: '#E8C020' },
  ageBadgeNum: { fontSize: 22, fontWeight: '800', color: '#7A5020' },
  ageBadgeNumMain: { fontSize: 26, color: '#B07010' },
  ageBadgeLabel: { fontSize: 11, color: '#A08050', fontWeight: '600', marginTop: 1 },
  ageBadgeLabelMain: { fontSize: 12, color: '#C87820', fontWeight: '700' },
  correctedBox: {
    backgroundColor: '#EEF8FF', borderRadius: 10, padding: 12,
    borderWidth: 1.5, borderColor: '#B8D8F0', marginBottom: 10, alignItems: 'center',
  },
  correctedTitle: { fontSize: 11, fontWeight: '700', color: '#4A80B0', marginBottom: 2 },
  correctedValue: { fontSize: 20, fontWeight: '800', color: '#2A60A0' },
  correctedSub: { fontSize: 10, color: '#7AAAD0', marginTop: 2 },
  milestoneBox: {
    backgroundColor: '#FFFCF0', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#F0E0A0', marginTop: 4,
  },
  milestoneTitle: {
    fontSize: 13, fontWeight: '800', color: '#7A5010', marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0E0A0', paddingBottom: 6,
  },
  milestoneItem: {
    fontSize: 12, color: '#5A4020', lineHeight: 20, paddingVertical: 1,
  },
  themeSwatchLocked: { opacity: 0.6 },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
