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

import { AppHeader } from '../components/UI';
import {
  getFirstYearPhotos, saveFirstYearPhoto,
  getFirstYearProfile, saveFirstYearProfile,
  getBabyProfile,
} from '../utils/storage';

const { width: SW } = Dimensions.get('window');

const MONTH_LABELS = [
  'Newborn', '1개월', '2개월', '3개월', '4개월', '5개월',
  '6개월', '7개월', '8개월', '9개월', '10개월', '11개월',
];

const BG_COLORS = [
  '#F5EDD8', '#FFF0E0', '#EAFAEA', '#E3F2FD',
  '#FCE4EC', '#F3E5F5', '#FFF9C4', '#F0F4F0',
];

// ── Layout map ──────────────────────────────────
// Top row    : [0]  [1]  [2]  [3]
// Middle left: [11] [10]
// Center 2×2 : name / hero photo / FIRST YEAR / date
// Middle right: [4] [5]
// Bottom row : [9]  [8]  [7]  [6]

function MonthSlot({ month, uri, cell, photo, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: cell, alignItems: 'center', paddingVertical: 5 }}
      activeOpacity={0.75}
    >
      <View style={[styles.circle, { width: photo, height: photo, borderRadius: photo / 2 }]}>
        {uri
          ? <Image source={{ uri }} style={{ width: photo, height: photo, borderRadius: photo / 2 }} />
          : <Text style={styles.plus}>+</Text>}
      </View>
      <Text style={[styles.label, { fontSize: cell > 80 ? 10 : 9 }]}>{MONTH_LABELS[month]}</Text>
    </TouchableOpacity>
  );
}

export default function FirstYearCollageScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const collageRef = useRef(null);

  const [uris, setUris] = useState({});       // resolved { "0": "file://...", "center": ... }
  const [babyName, setBabyName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [bgColor, setBgColor] = useState('#F5EDD8');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const [fileNames, profile, babyProf] = await Promise.all([
        getFirstYearPhotos(),
        getFirstYearProfile(),
        getBabyProfile(),
      ]);
      if (!active) return;

      if (profile.name) setBabyName(profile.name);
      else if (babyProf.name) setBabyName(babyProf.name);
      if (profile.birthdate) setBirthdate(profile.birthdate);
      else if (babyProf.birthdate) setBirthdate(babyProf.birthdate);
      if (profile.bgColor) setBgColor(profile.bgColor);

      // Resolve stored filenames → full URIs
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;

    const srcUri = result.assets[0].uri;
    const fileName = `firstyear_${slotKey}_${Date.now()}.jpg`;
    const dest = FileSystem.documentDirectory + fileName;
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
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 저장 권한이 필요해요.');
      return;
    }
    setSaving(true);
    try {
      const uri = await captureRef(collageRef, { format: 'jpg', quality: 0.95 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료! 📸', '콜라주가 사진첩에 저장됐어요!');
    } catch (e) {
      Alert.alert('오류', '저장 중 문제가 발생했어요.');
      console.error(e);
    }
    setSaving(false);
  };

  // Sizing
  const CARD_W = SW - 40;
  const CELL = (CARD_W - 16) / 4;   // 4 columns
  const PHOTO = Math.floor(CELL - 14);
  const CENTER_PHOTO = Math.floor(CELL * 1.5);

  return (
    <View style={[styles.container, !embedded && { paddingTop: insets.top }]}>
      {!embedded && <AppHeader title="🎞 첫 돌 콜라주" subtitle="12개월 성장 사진을 한눈에" />}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Collage Card (captured) ── */}
        <View
          ref={collageRef}
          collapsable={false}
          style={[styles.card, { width: CARD_W, backgroundColor: bgColor }]}
        >
          {/* Top row: 0, 1, 2, 3 */}
          <View style={styles.row}>
            {[0, 1, 2, 3].map(m => (
              <MonthSlot key={m} month={m} uri={uris[String(m)]} cell={CELL} photo={PHOTO} onPress={() => pickPhoto(m)} />
            ))}
          </View>

          {/* Middle section */}
          <View style={styles.row}>
            {/* Left col: 11, 10 */}
            <View>
              {[11, 10].map(m => (
                <MonthSlot key={m} month={m} uri={uris[String(m)]} cell={CELL} photo={PHOTO} onPress={() => pickPhoto(m)} />
              ))}
            </View>

            {/* Center 2-col panel */}
            <View style={[styles.centerPanel, { width: CELL * 2 }]}>
              <Text style={[styles.centerName, { fontSize: Math.min(18, CELL * 0.42) }]} numberOfLines={2}>
                {babyName || '아기 이름'}
              </Text>

              <TouchableOpacity
                onPress={() => pickPhoto('center')}
                style={[styles.centerCircle, { width: CENTER_PHOTO, height: CENTER_PHOTO, borderRadius: CENTER_PHOTO / 2 }]}
                activeOpacity={0.8}
              >
                {uris['center']
                  ? <Image source={{ uri: uris['center'] }} style={{ width: CENTER_PHOTO, height: CENTER_PHOTO, borderRadius: CENTER_PHOTO / 2 }} />
                  : <Text style={{ fontSize: 32 }}>👶</Text>}
              </TouchableOpacity>

              <Text style={styles.centerTitle}>✨ FIRST YEAR ✨</Text>
              {birthdate ? (
                <Text style={styles.centerDate}>Since {birthdate}</Text>
              ) : null}
            </View>

            {/* Right col: 4, 5 */}
            <View>
              {[4, 5].map(m => (
                <MonthSlot key={m} month={m} uri={uris[String(m)]} cell={CELL} photo={PHOTO} onPress={() => pickPhoto(m)} />
              ))}
            </View>
          </View>

          {/* Bottom row: 9, 8, 7, 6 */}
          <View style={styles.row}>
            {[9, 8, 7, 6].map(m => (
              <MonthSlot key={m} month={m} uri={uris[String(m)]} cell={CELL} photo={PHOTO} onPress={() => pickPhoto(m)} />
            ))}
          </View>
        </View>

        {/* ── Controls ── */}
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
                style={[styles.colorChip, { backgroundColor: c }, bgColor === c && styles.colorChipActive]}
                onPress={() => { setBgColor(c); updateProfile('bgColor', c); }}
              />
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '📸 사진첩에 저장하기'}</Text>
        </TouchableOpacity>

        <View style={styles.hint}>
          <Text style={styles.hintText}>💡 동그라미를 탭하면 각 월령 사진을 추가할 수 있어요</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EDD8' },
  scroll: { padding: 20, alignItems: 'center' },

  // Collage card
  card: {
    borderRadius: 18, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
    marginBottom: 20,
  },
  row: { flexDirection: 'row' },

  // Month slot
  circle: {
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: '#EDE0C8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  plus: { fontSize: 22, color: '#C0B090' },
  label: { color: '#7A6040', fontWeight: '700', marginTop: 3, textAlign: 'center' },

  // Center panel
  centerPanel: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
  },
  centerName: {
    fontWeight: '900', color: '#5A3A10',
    textAlign: 'center', fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  centerCircle: {
    borderWidth: 4, borderColor: '#fff',
    backgroundColor: '#EDE0C8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  centerTitle: {
    fontSize: 11, fontWeight: '900', color: '#C87820',
    letterSpacing: 2, textAlign: 'center',
  },
  centerDate: {
    fontSize: 9, color: '#8A7050', fontWeight: '600', textAlign: 'center',
  },

  // Controls
  controls: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    marginBottom: 14,
  },
  ctrlLabel: { fontSize: 11, color: '#8A7050', fontWeight: '700', marginBottom: 6 },
  ctrlInput: {
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#4A3520', backgroundColor: '#FFFDF5',
  },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorChip: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2.5, borderColor: 'transparent',
  },
  colorChipActive: { borderColor: '#C87820', transform: [{ scale: 1.2 }] },

  // Save / hint
  saveBtn: {
    width: '100%', backgroundColor: '#F08050', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#D05830', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  hint: {
    width: '100%', backgroundColor: '#FFFBE8', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#F0DFA0',
  },
  hintText: { fontSize: 12, color: '#8A7040', textAlign: 'center', lineHeight: 18 },
});
