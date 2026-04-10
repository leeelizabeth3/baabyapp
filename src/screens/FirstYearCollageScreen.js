// src/screens/FirstYearCollageScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, Dimensions, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/UI';
import {
  getFirstYearPhotos, saveFirstYearPhoto,
  getFirstYearProfile, saveFirstYearProfile,
  getBabyProfile,
} from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;

const MONTH_LABELS = [
  'Newborn', '1개월', '2개월', '3개월', '4개월', '5개월',
  '6개월', '7개월', '8개월', '9개월', '10개월', '11개월',
];

const BG_COLORS = [
  '#F5EDD8', '#FFF0E0', '#EAFAEA', '#E3F2FD',
  '#FCE4EC', '#F3E5F5', '#FFF9C4', '#F0F4F0',
];

const LAYOUTS = [
  { key: 'clock',    label: '시계형' },
  { key: 'polaroid', label: '폴라로이드' },
  { key: 'grid',     label: '그리드' },
];

// ── Clock Layout ─────────────────────────────────────────────
function ClockLayout({ uris, babyName, birthdate, onPick }) {
  const CELL   = (CARD_W - 16) / 4;
  const PHOTO  = Math.floor(CELL - 14);
  const CENTER = Math.floor(CELL * 1.5);

  function Slot({ month }) {
    const uri = uris[String(month)];
    return (
      <TouchableOpacity
        onPress={() => onPick(month)}
        style={{ width: CELL, alignItems: 'center', paddingVertical: 5 }}
        activeOpacity={0.75}
      >
        <View style={[cSt.circle, { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2 }]}>
          {uri
            ? <Image source={{ uri }} style={{ width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2 }} />
            : <Ionicons name="add" size={18} color="#C0B090" />}
        </View>
        <Text style={[cSt.label, { fontSize: CELL > 80 ? 10 : 9 }]}>{MONTH_LABELS[month]}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ padding: 8 }}>
      <View style={cSt.row}>
        {[0, 1, 2, 3].map(m => <Slot key={m} month={m} />)}
      </View>
      <View style={cSt.row}>
        <View>{[11, 10].map(m => <Slot key={m} month={m} />)}</View>
        <View style={[cSt.centerPanel, { width: CELL * 2 }]}>
          <Text style={[cSt.centerName, { fontSize: Math.min(18, CELL * 0.42) }]} numberOfLines={2}>
            {babyName || '아기 이름'}
          </Text>
          <TouchableOpacity
            onPress={() => onPick('center')}
            style={[cSt.centerCircle, { width: CENTER, height: CENTER, borderRadius: CENTER / 2 }]}
            activeOpacity={0.8}
          >
            {uris['center']
              ? <Image source={{ uri: uris['center'] }} style={{ width: CENTER, height: CENTER, borderRadius: CENTER / 2 }} />
              : <Ionicons name="person" size={36} color="#C0B090" />}
          </TouchableOpacity>
          <Text style={cSt.centerTitle}>FIRST YEAR</Text>
          {birthdate ? <Text style={cSt.centerDate}>Since {birthdate}</Text> : null}
        </View>
        <View>{[4, 5].map(m => <Slot key={m} month={m} />)}</View>
      </View>
      <View style={cSt.row}>
        {[9, 8, 7, 6].map(m => <Slot key={m} month={m} />)}
      </View>
    </View>
  );
}

const cSt = StyleSheet.create({
  row: { flexDirection: 'row' },
  circle: {
    borderWidth: 3, borderColor: '#fff', backgroundColor: '#EDE0C8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  label: { color: '#7A6040', fontWeight: '700', marginTop: 3, textAlign: 'center' },
  centerPanel: { alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 8 },
  centerName: {
    fontWeight: '900', color: '#5A3A10', textAlign: 'center',
    fontFamily: 'GamjaFlower_400Regular', letterSpacing: 0.5,
  },
  centerCircle: {
    borderWidth: 4, borderColor: '#fff', backgroundColor: '#EDE0C8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  centerTitle: {
    fontSize: 11, fontWeight: '900', color: '#C87820',
    letterSpacing: 2, textAlign: 'center', fontFamily: 'Jua_400Regular',
  },
  centerDate: { fontSize: 9, color: '#8A7050', fontWeight: '600', textAlign: 'center' },
});

// ── Polaroid Layout ───────────────────────────────────────────
function PolaroidLayout({ uris, babyName, birthdate, onPick }) {
  const cellW   = Math.floor((CARD_W - 20) / 3);
  const photoSz = Math.floor(cellW - 12);
  const heroSz  = Math.floor(CARD_W * 0.44);

  return (
    <View style={{ padding: 10 }}>
      {/* Header */}
      <View style={pSt.header}>
        <Text style={pSt.heroName}>{babyName || '아기 이름'}</Text>
        <Text style={pSt.heroTitle}>FIRST YEAR</Text>
        {birthdate ? <Text style={pSt.heroDate}>Since {birthdate}</Text> : null}
      </View>

      {/* Hero polaroid */}
      <TouchableOpacity onPress={() => onPick('center')} style={[pSt.heroPol, { alignSelf: 'center', marginBottom: 14 }]} activeOpacity={0.85}>
        <View style={[pSt.photo, { width: heroSz, height: heroSz }]}>
          {uris['center']
            ? <Image source={{ uri: uris['center'] }} style={{ width: heroSz, height: heroSz }} resizeMode="cover" />
            : <Ionicons name="person" size={48} color="#C0B090" />}
        </View>
        <Text style={pSt.polLabel}>대표 사진</Text>
      </TouchableOpacity>

      {/* 3×4 month polaroids */}
      <View style={pSt.grid}>
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => (
          <TouchableOpacity key={m} onPress={() => onPick(m)} style={[pSt.polCard, { width: cellW }]} activeOpacity={0.85}>
            <View style={[pSt.photo, { width: photoSz, height: photoSz }]}>
              {uris[String(m)]
                ? <Image source={{ uri: uris[String(m)] }} style={{ width: photoSz, height: photoSz }} resizeMode="cover" />
                : <Ionicons name="add" size={20} color="#C0B090" />}
            </View>
            <Text style={pSt.polLabel}>{MONTH_LABELS[m]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pSt = StyleSheet.create({
  header: {
    alignItems: 'center', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 10, marginBottom: 12,
  },
  heroName: { fontSize: 22, fontWeight: '900', color: '#5A3A10', fontFamily: 'GamjaFlower_400Regular', letterSpacing: 1 },
  heroTitle: { fontSize: 13, fontWeight: '900', color: '#C87820', letterSpacing: 3, fontFamily: 'Jua_400Regular' },
  heroDate: { fontSize: 11, color: '#8A7050', fontWeight: '600', marginTop: 2 },
  heroPol: {
    backgroundColor: '#fff', padding: 6, paddingBottom: 28, borderRadius: 2,
    shadowColor: '#000', shadowOffset: { width: 1, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  polCard: {
    backgroundColor: '#fff', padding: 5, paddingBottom: 22, alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  photo: { backgroundColor: '#EDE0C8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  polLabel: { fontSize: 9, color: '#7A6040', fontWeight: '600', textAlign: 'center', marginTop: 4 },
});

// ── Grid Layout ───────────────────────────────────────────────
function GridLayout({ uris, babyName, birthdate, onPick }) {
  const cellSz = CARD_W / 4;

  return (
    <View>
      {/* Hero banner */}
      <TouchableOpacity onPress={() => onPick('center')} activeOpacity={0.85}>
        <View style={[gSt.hero, { width: CARD_W, height: Math.floor(CARD_W * 0.36) }]}>
          {uris['center']
            ? <Image source={{ uri: uris['center'] }} style={{ width: CARD_W, height: Math.floor(CARD_W * 0.36) }} resizeMode="cover" />
            : (
              <View style={[gSt.heroEmpty, { width: CARD_W, height: Math.floor(CARD_W * 0.36) }]}>
                <Ionicons name="person-outline" size={36} color="#C0B090" />
                <Text style={gSt.heroEmptyTxt}>대표 사진 추가</Text>
              </View>
            )}
        </View>
      </TouchableOpacity>

      {/* 4×3 grid */}
      <View style={gSt.grid}>
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => (
          <TouchableOpacity key={m} onPress={() => onPick(m)} style={[gSt.cell, { width: cellSz, height: cellSz }]} activeOpacity={0.85}>
            {uris[String(m)]
              ? <Image source={{ uri: uris[String(m)] }} style={{ width: cellSz, height: cellSz }} resizeMode="cover" />
              : (
                <View style={[gSt.empty, { width: cellSz, height: cellSz }]}>
                  <Ionicons name="add" size={18} color="#C0B090" />
                </View>
              )}
            <View style={gSt.badge}>
              <Text style={gSt.badgeTxt}>{m === 0 ? 'N' : `${m}m`}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={gSt.footer}>
        <Text style={gSt.footerName}>{babyName || '아기 이름'}</Text>
        <Text style={gSt.footerSub}>FIRST YEAR{birthdate ? `  ·  Since ${birthdate}` : ''}</Text>
      </View>
    </View>
  );
}

const gSt = StyleSheet.create({
  hero: { overflow: 'hidden' },
  heroEmpty: { backgroundColor: '#EDE0C8', alignItems: 'center', justifyContent: 'center' },
  heroEmptyTxt: { fontSize: 12, color: '#C0B090', marginTop: 6, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  empty: { backgroundColor: '#EDE0C8', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 5,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  badgeTxt: { fontSize: 8, color: '#fff', fontWeight: '700' },
  footer: {
    alignItems: 'center', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  footerName: { fontSize: 20, fontWeight: '900', color: '#5A3A10', fontFamily: 'GamjaFlower_400Regular' },
  footerSub: { fontSize: 10, fontWeight: '900', color: '#C87820', letterSpacing: 2, fontFamily: 'Jua_400Regular', marginTop: 2 },
});

// ── Main Screen ───────────────────────────────────────────────
export default function FirstYearCollageScreen({ embedded = false }) {
  const insets      = useSafeAreaInsets();
  const collageRef  = useRef(null);

  const [uris,      setUris]      = useState({});
  const [babyName,  setBabyName]  = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [bgColor,   setBgColor]   = useState('#F5EDD8');
  const [saving,    setSaving]    = useState(false);
  const [layout,    setLayout]    = useState('clock');

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [fileNames, profile, babyProf] = await Promise.all([
        getFirstYearPhotos(), getFirstYearProfile(), getBabyProfile(),
      ]);
      if (!active) return;

      if (profile.name)       setBabyName(profile.name);
      else if (babyProf.name) setBabyName(babyProf.name);
      if (profile.birthdate)       setBirthdate(profile.birthdate);
      else if (babyProf.birthdate) setBirthdate(babyProf.birthdate);
      if (profile.bgColor) setBgColor(profile.bgColor);

      const resolved = {};
      await Promise.all(
        Object.entries(fileNames).map(async ([key, fileName]) => {
          const uri = FileSystem.documentDirectory + fileName;
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) resolved[key] = uri;
        })
      );
      if (active) setUris(resolved);
    })();
    return () => { active = false; };
  }, []));

  const pickPhoto = async (slotKey) => {
    const { status, accessPrivileges } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && accessPrivileges !== 'limited') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;

    const srcUri  = result.assets[0].uri;
    const fileName = `firstyear_${slotKey}_${Date.now()}.jpg`;
    const dest    = FileSystem.documentDirectory + fileName;
    await FileSystem.copyAsync({ from: srcUri, to: dest });
    await saveFirstYearPhoto(String(slotKey), fileName);
    setUris(prev => ({ ...prev, [String(slotKey)]: dest }));
  };

  const updateProfile = async (field, val) => {
    const current = await getFirstYearProfile();
    await saveFirstYearProfile({ ...current, [field]: val });
  };

  const handleSave = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '사진 저장 권한이 필요해요.'); return; }
    setSaving(true);
    try {
      const uri = await captureRef(collageRef, { format: 'jpg', quality: 0.95 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '콜라주가 사진첩에 저장됐어요!');
    } catch (e) {
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
      console.error(e);
    }
    setSaving(false);
  };

  const layoutProps = { uris, babyName, birthdate, onPick: pickPhoto };

  return (
    <View style={[styles.container, !embedded && { paddingTop: insets.top }]}>
      {!embedded && <AppHeader title="첫 돌 콜라주" subtitle="12개월 성장 사진을 한눈에" />}

      {/* Layout picker */}
      <View style={styles.layoutRow}>
        {LAYOUTS.map(l => (
          <TouchableOpacity
            key={l.key}
            onPress={() => setLayout(l.key)}
            style={[styles.layoutBtn, layout === l.key && styles.layoutBtnOn]}
          >
            <Text style={[styles.layoutTxt, layout === l.key && styles.layoutTxtOn]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Collage card (captured) */}
        <View
          ref={collageRef}
          collapsable={false}
          style={[styles.card, { width: CARD_W, backgroundColor: bgColor }]}
        >
          {layout === 'clock'    && <ClockLayout    {...layoutProps} />}
          {layout === 'polaroid' && <PolaroidLayout {...layoutProps} />}
          {layout === 'grid'     && <GridLayout     {...layoutProps} />}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Text style={styles.ctrlLabel}>아기 이름</Text>
          <TextInput
            style={styles.ctrlInput}
            value={babyName}
            onChangeText={v => { setBabyName(v); updateProfile('name', v); }}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#B0A080"
          />
          <Text style={[styles.ctrlLabel, { marginTop: 12 }]}>생년월일</Text>
          <TextInput
            style={styles.ctrlInput}
            value={birthdate}
            onChangeText={v => { setBirthdate(v); updateProfile('birthdate', v); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#B0A080"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={[styles.ctrlLabel, { marginTop: 14 }]}>배경 색상</Text>
          <View style={styles.colorRow}>
            {BG_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorChip, { backgroundColor: c }, bgColor === c && styles.colorChipOn]}
                onPress={() => { setBgColor(c); updateProfile('bgColor', c); }}
              />
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnTxt}>{saving ? '저장 중...' : '사진첩에 저장하기'}</Text>
        </TouchableOpacity>

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={14} color="#8A7040" style={{ marginRight: 6 }} />
          <Text style={styles.hintTxt}>동그라미를 탭하면 각 월령 사진을 추가할 수 있어요</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EDD8' },
  scroll: { padding: 20, alignItems: 'center' },
  layoutRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  layoutBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D4B896', backgroundColor: '#fff',
  },
  layoutBtnOn:  { backgroundColor: '#C87820', borderColor: '#C87820' },
  layoutTxt:    { fontSize: 13, fontWeight: '700', color: '#8A7050' },
  layoutTxtOn:  { color: '#fff' },
  card: {
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8, marginBottom: 20,
  },
  controls: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, marginBottom: 14,
  },
  ctrlLabel: { fontSize: 11, color: '#8A7050', fontWeight: '700', marginBottom: 6 },
  ctrlInput: {
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#4A3520', backgroundColor: '#FFFDF5',
  },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: 'transparent' },
  colorChipOn: { borderColor: '#C87820', transform: [{ scale: 1.2 }] },
  saveBtn: {
    width: '100%', backgroundColor: '#F08050', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D05830', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4, marginBottom: 12,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  hint: {
    width: '100%', backgroundColor: '#FFFBE8', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#F0DFA0',
    flexDirection: 'row', alignItems: 'center',
  },
  hintTxt: { fontSize: 12, color: '#8A7040', flex: 1, lineHeight: 18 },
});
