// src/screens/CardMakerScreen.js
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, Dimensions, Platform, Modal, Share,
  Animated, PanResponder,
} from 'react-native';


import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, Pattern, Rect, Circle, Path, Polygon } from 'react-native-svg';
import {
  AppHeader, SectionTitle, Card, PrimaryButton, SecondaryButton,
  FormField, StyledInput, RowFields, COLORS,
} from '../components/UI';
import { THEME_LIST, THEMES } from '../data/themes';
import { saveAlbumRecord, getBabyProfile, saveBabyProfile } from '../utils/storage';
import { canUseTheme, isThemeFree, isPremium } from '../utils/purchase';
import PremiumScreen from './PremiumScreen';
const FONTS = {
  cute: 'GamjaFlower_400Regular',
  melody: 'HiMelody_400Regular',
  cuteFont: 'CuteFont_400Regular',
};

const FONT_OPTIONS = [
  { key: null,                     label: '테마 기본', sample: '아기 성장', premium: false },
  { key: 'GamjaFlower_400Regular', label: '감자꽃체',  sample: '아기 성장', premium: false },
  { key: 'CuteFont_400Regular',    label: '귀여운체',  sample: '아기 성장', premium: false },
  { key: 'HiMelody_400Regular',    label: '멜로디체',  sample: '아기 성장', premium: true },
  { key: 'Gaegu_400Regular',       label: '개구체',    sample: '아기 성장', premium: true },
  { key: 'Jua_400Regular',         label: '주아체',    sample: '아기 성장', premium: true },
];

const PATTERN_OPTIONS = [
  { key: 'none',    label: '없음' },
  { key: 'dots',    label: '도트' },
  { key: 'waves',   label: '물결' },
  { key: 'stripes', label: '줄무늬' },
  { key: 'hex',     label: '육각형' },
  { key: 'stars',   label: '별' },
];
const PHOTO_SIZE_OPTIONS = [
  { key: 'medium', label: '보통', size: 130, premium: false },
  { key: 'large',  label: '크게', size: 170, premium: true },
];

const STICKER_CATEGORIES = [
  { key: 'pastel', label: '🎨 파스텔', items: [
    { source: require('../../assets/stickers/Cutechickwithbabybottle.png'), size: 95 },
    { source: require('../../assets/stickers/unicorn.png'), size: 95 },
    { source: require('../../assets/stickers/bathbear.png'), size: 95 },
    { source: require('../../assets/stickers/sunflower.png'), size: 95 },
    { source: require('../../assets/stickers/rainbow.png'), size: 100 },
    { source: require('../../assets/stickers/sun.png'), size: 100 },
    { source: require('../../assets/stickers/dolphin.png'), size: 100 },
    { source: require('../../assets/stickers/bunnyrattle.png'), size: 100 },
     { source: require('../../assets/stickers/babybottle.png'), size: 100 },
     { source: require('../../assets/stickers/pacifier.png'), size: 100 },
     { source: require('../../assets/stickers/stroller.png'), size: 100 },
  ]},
  { 
  key: 'baby',   
  label: '👶 아기',  
  items: [
    '🍼','👶','🧸','🎀','🛁','🧷','💤','🤍',
    '👣','🫶','🧼','🪥','🧦','🛏️','🧻','🍼','🥛','🍌'
  ] 
},

{ 
  key: 'nature', 
  label: '🌸 자연',  
  items: [
    '🌸','🌻','🌈','☀️','⭐','🌟','🌿','🍀',
    '🌼','🌷','🌺','🌙','☁️','🌊','🍃','🌞'
  ] 
},

{ 
  key: 'party',  
  label: '🎉 축하',  
  items: [
    '🎊','🎉','🎈','🎁','🎂','✨','💕','💛',
    '💖','💝','🪅','🥳','🍰','🕯️','🎀','💐'
  ] 
},

{ 
  key: 'animal', 
  label: '🐣 동물',  
  items: [
    '🐣','🐥','🦋','🐰','🐻','🦊','🐸','🐤',
    '🐶','🐱','🐼','🐯','🐹','🐨','🐧','🦄'
  ] 
}
];

// ── 100일 알림 스케줄 ──────────────────────────
async function schedule100DayNotification(babyName, birthdateStr) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const birth = new Date(birthdateStr);
    const day100 = new Date(birth);
    day100.setDate(day100.getDate() + 99); // 생후 1일이 0일이므로 99일 더함
    day100.setHours(9, 0, 0, 0);

    const now = new Date();
    if (day100 <= now) return; // 이미 지난 경우

    // 기존 백일 알림 취소 후 재등록
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎂 ${babyName || '아기'} 백일이에요!`,
        body: '오늘 백일을 축하해요! 특별한 백일카드를 만들어보세요 🍼',
        sound: true,
      },
      trigger: { type: 'date', date: day100 },
    });
  } catch (e) {
    console.log('알림 설정 실패:', e.message);
  }
}

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = SW; // Full-width for Instagram sharing

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

function ThemeDropdown({ value, onChange, userIsPremium, onPressLocked }) {
  const [open, setOpen] = useState(false);
  const selected = THEME_LIST.find(t => t.key === value) || THEME_LIST[0];
  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownBtn, { borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10, backgroundColor: '#FFFDF5', paddingHorizontal: 12, paddingVertical: 10 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ width: 36, height: 32, borderRadius: 8, backgroundColor: selected.swatchColors[0], alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{selected.swatchIcon}</Text>
          </View>
          <Text style={styles.dropdownBtnText}>{selected.name}</Text>
        </View>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.dropdownList, { width: 290, maxHeight: 420 }]}>
            <Text style={styles.dropdownListTitle}>🎨 테마 선택</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {THEME_LIST.map(theme => {
                const locked = !isThemeFree(theme.key) && !userIsPremium;
                const active = value === theme.key;
                return (
                  <TouchableOpacity
                    key={theme.key}
                    style={[styles.dropdownItem, active && styles.dropdownItemActive, { gap: 10 }]}
                    onPress={() => {
                      if (locked) { setOpen(false); onPressLocked(); }
                      else { onChange(theme.key); setOpen(false); }
                    }}
                  >
                    <View style={{ width: 44, height: 38, borderRadius: 9, backgroundColor: theme.swatchColors[0], alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{theme.swatchIcon}</Text>
                    </View>
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive, { flex: 1 }]}>{theme.name}</Text>
                    {locked && <Text style={{ fontSize: 14 }}>🔒</Text>}
                    {active && !locked && <Text style={styles.dropdownItemCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const MINI_PATTERNS = {
  dots:    (c) => <Pattern id="pp" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><Circle cx="5" cy="5" r="1.5" fill={c} /></Pattern>,
  waves:   (c) => <Pattern id="pp" x="0" y="0" width="30" height="10" patternUnits="userSpaceOnUse"><Path d="M0 5 Q7.5 0 15 5 Q22.5 10 30 5" fill="none" stroke={c} strokeWidth="1.5" /></Pattern>,
  stripes: (c) => <Pattern id="pp" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><Rect x="0" y="0" width="5" height="10" fill={c} /></Pattern>,
  hex:     (c) => <Pattern id="pp" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><Polygon points="8,1 14,5 14,11 8,15 2,11 2,5" fill="none" stroke={c} strokeWidth="1" /></Pattern>,
  stars:   (c) => <Pattern id="pp" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><Circle cx="4" cy="4" r="1" fill={c} /><Circle cx="14" cy="12" r="0.7" fill={c} /><Circle cx="9" cy="16" r="0.8" fill={c} /></Pattern>,
};

function PatternSwatch({ patternKey, label, active, onPress }) {  const previewColor = '#B0A0C8';
  return (
    <TouchableOpacity onPress={onPress} style={[styles.fontChip, active && styles.fontChipActive]}>
      <View style={{ width: 52, height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: '#F0EEF8', marginBottom: 4, alignItems: 'center', justifyContent: 'center' }}>
        {patternKey && patternKey !== 'none' ? (
          <Svg width="52" height="34">
            <Defs>{MINI_PATTERNS[patternKey]?.(previewColor)}</Defs>
            <Rect width="52" height="34" fill="url(#pp)" />
          </Svg>
        ) : patternKey === null ? (
          <Text style={{ fontSize: 18 }}>🎨</Text>
        ) : null}
      </View>
      <Text style={[styles.fontChipLabel, active && styles.fontChipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── 드래그 가능한 스티커 ──────────────────────────
function StickerItem({ sticker, onTransformChange, onGestureActive }) {
  const pan = useRef(new Animated.ValueXY({ x: sticker.x, y: sticker.y })).current;
  const scaleAnim = useRef(new Animated.Value(sticker.scale || 1)).current;
  const rotationAnim = useRef(new Animated.Value(sticker.rotation || 0)).current;

  const lastScale = useRef(sticker.scale || 1);
  const lastRotation = useRef(sticker.rotation || 0);
  const initialDistance = useRef(null);
  const initialAngle = useRef(null);
  const isMultiTouch = useRef(false);

  const getDistance = (touches) => {
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getAngle = (touches) =>
    Math.atan2(touches[1].pageY - touches[0].pageY, touches[1].pageX - touches[0].pageX) * 180 / Math.PI;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        onGestureActive?.(false);
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        isMultiTouch.current = false;
        initialDistance.current = null;
        initialAngle.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          if (!isMultiTouch.current) {
            isMultiTouch.current = true;
            initialDistance.current = getDistance(touches);
            initialAngle.current = getAngle(touches);
          } else {
            const dist = getDistance(touches);
            const newScale = Math.max(0.3, Math.min(4, lastScale.current * (dist / initialDistance.current)));
            scaleAnim.setValue(newScale);
            const deltaAngle = getAngle(touches) - initialAngle.current;
            rotationAnim.setValue(lastRotation.current + deltaAngle);
          }
        } else if (!isMultiTouch.current) {
          pan.x.setValue(gestureState.dx);
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        onGestureActive?.(true);
        if (isMultiTouch.current) {
          lastScale.current = scaleAnim._value;
          lastRotation.current = rotationAnim._value;
          initialDistance.current = null;
          initialAngle.current = null;
          isMultiTouch.current = false;
        } else {
          pan.flattenOffset();
        }
        onTransformChange(sticker.id, pan.x._value, pan.y._value, lastScale.current, lastRotation.current);
      },
      onPanResponderTerminate: () => {
        onGestureActive?.(true);
        pan.flattenOffset();
        lastScale.current = scaleAnim._value;
        lastRotation.current = rotationAnim._value;
      },
    })
  ).current;

  const rotateStr = rotationAnim.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Animated.View
      style={[stickerStyles.item, {
        transform: [
          ...pan.getTranslateTransform(),
          { scale: scaleAnim },
          { rotate: rotateStr },
        ]
      }]}
      {...panResponder.panHandlers}
    >
      {sticker.source
        ? <Image source={sticker.source} style={{ width: sticker.size || 64, height: sticker.size || 64 }} resizeMode="contain" />
        : <Text style={stickerStyles.emoji}>{sticker.emoji}</Text>
      }
    </Animated.View>
  );
}

const stickerStyles = StyleSheet.create({
  item: { position: 'absolute', zIndex: 20 },
  emoji: { fontSize: 34 },
});

const IMAGE_STICKERS = []; // STICKER_CATEGORIES 파스텔 카테고리로 통합됨

export default function CardMakerScreen({ route }) {
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
  const [selectedFont, setSelectedFont] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState('none');
  const [photoSize, setPhotoSize] = useState('medium');
  const [placedStickers, setPlacedStickers] = useState([]);
  const [stickerCategory, setStickerCategory] = useState('pastel');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [cardLayout, setCardLayout] = useState('boxed');

  useFocusEffect(useCallback(() => {
    isPremium().then(setUserIsPremium);
    // 저장된 생년월일 불러오기
    getBabyProfile().then(profile => {
      if (profile.birthdate && !birthdate) setBirthdate(profile.birthdate);
      if (profile.name && !name) setName(profile.name);
    });
    // 발달 마일스톤에서 넘어온 경우 월령 자동 세팅
    if (route?.params?.milestoneMonth !== undefined) {
      setMonth(String(route.params.milestoneMonth));
    }
  }, [route?.params?.milestoneMonth]));
  const ageInfo = useMemo(() => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    // 생후 1일 = 태어난 날, 한국식 계산
    const daysOld = diffDays + 1;
    const weeksOld = Math.floor(diffDays / 7);
    // 달력 기준 개월수 계산 (30.4375 나누기 방식은 부정확)
    const rawMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    const monthsOld = Math.min(12, today.getDate() >= birth.getDate() ? rawMonths : rawMonths - 1);
    let corrected = null;
    if (isPremature && prematureWeeks) {
      const premWeeks = parseInt(prematureWeeks) || 0;
      const correctedDiffDays = Math.max(0, diffDays - premWeeks * 7);
      const correctedBirth = new Date(birth.getTime() + premWeeks * 7 * 24 * 60 * 60 * 1000);
      correctedBirth.setHours(0, 0, 0, 0);
      const correctedRawMonths = (today.getFullYear() - correctedBirth.getFullYear()) * 12 + (today.getMonth() - correctedBirth.getMonth());
      const correctedMonths = Math.min(12, Math.max(0, today.getDate() >= correctedBirth.getDate() ? correctedRawMonths : correctedRawMonths - 1));
      // 이번 달 시작일(교정기준) 이후 며칠인지로 주 계산
      // setMonth는 월말일 overflow 발생 가능 → Date 생성자로 직접 계산 후 말일 클램프
      const tYear = correctedBirth.getFullYear();
      const tMonth = correctedBirth.getMonth() + correctedMonths;
      const lastDayOfMonth = new Date(tYear, tMonth + 1, 0).getDate();
      const monthStart = new Date(tYear, tMonth, Math.min(correctedBirth.getDate(), lastDayOfMonth));
      monthStart.setHours(0, 0, 0, 0);
      const daysIntoMonth = Math.floor((today - monthStart) / (1000 * 60 * 60 * 24));
      const weeksInMonth = Math.max(0, Math.floor(daysIntoMonth / 7));
      corrected = {
        days: correctedDiffDays + 1,
        weeks: weeksInMonth,
        months: correctedMonths,
      };
    }
    return { days: daysOld, weeks: weeksOld, months: monthsOld, corrected };
  }, [birthdate, isPremature, prematureWeeks]);

  const t = THEMES[selectedTheme] || THEMES['honeybee'];

  const pickImage = async () => {
    const { status, accessPrivileges } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && accessPrivileges !== 'limited') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const generateCard = () => {
    setCardVisible(true);
  };

  const addSticker = useCallback((stickerData) => {
    setPlacedStickers(prev => {
      const n = prev.length;
      const x = 16 + (n % 7) * 16;
      const y = 16 + Math.floor(n / 7) * 18;
      return [...prev, { id: Date.now() + n, x, y, scale: 1, rotation: 0, ...stickerData }];
    });
  }, []);

  const removeSticker = useCallback((id) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateStickerTransform = useCallback((id, x, y, scale, rotation) => {
    setPlacedStickers(prev => prev.map(s => s.id === id ? { ...s, x, y, scale, rotation } : s));
  }, []);

  const saveCard = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const tmpUri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });

      // Copy to permanent app documents directory (persists across restarts)
      const fileName = `baby_card_${Date.now()}.png`;
      const permanentUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: tmpUri, to: permanentUri });

      // Verify the file was actually written before saving the record
      const fileInfo = await FileSystem.getInfoAsync(permanentUri);
      if (!fileInfo.exists) throw new Error('파일 저장에 실패했어요.');

      // Try saving to photo library (optional — don't fail if denied)
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.createAssetAsync(tmpUri);
        }
      } catch (_) { }

      await saveAlbumRecord({
        id: Date.now(),
        name: name || '아기',
        month: parseInt(month),
        date: dateStart || new Date().toISOString().split('T')[0],
        theme: selectedTheme,
        uri: permanentUri,
        fileName: fileName,
      });

      Alert.alert('저장 완료! 🎉', '앨범에 저장되었어요!');
    } catch (e) {
      Alert.alert('오류', '저장 중 오류가 발생했어요: ' + e.message);
    }
    setSaving(false);
  };

  const shareCard = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const tmpUri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.share(
        Platform.OS === 'ios'
          ? { url: tmpUri }
          : { message: '아기 성장보고서', title: '아기 성장보고서' },
        { dialogTitle: '카드 공유하기' }
      );
    } catch (e) {
      if (e.message !== 'The user canceled the action') {
        Alert.alert('오류', '공유 중 오류가 발생했어요: ' + e.message);
      }
    }
    setSaving(false);
  };

  // Build display strings
  const hwStr = [
    (heightStart || heightEnd) ? `키 ${heightStart || '?'}cm${heightEnd ? ' → ' + heightEnd + 'cm' : ''}` : null,
    (weightStart || weightEnd) ? `몸무게 ${weightStart || '?'}kg${weightEnd ? ' → ' + weightEnd + 'kg' : ''}` : null,
  ].filter(Boolean).join('\n') || '키 49cm → 54cm\n몸무게 3.0kg → 4.0kg';

  const dateStr = dateStart && dateEnd
    ? `${dateStart.replace(/-/g, '.')} ~ ${dateEnd.replace(/-/g, '.')}`
    : dateStart ? dateStart.replace(/-/g, '.') : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader subtitle="카드 만들기 · 앨범 · 성장 추적" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>

        {/* ── 아기 나이 계산기 ── */}
        <View style={styles.sec}>
          <SectionTitle>🧮 아기 나이 계산기</SectionTitle>
          <Card>
            <RowFields>
              <View style={[styles.inlineField, { flex: 1 }]}>
                <Text style={styles.inlineLabel}>이름</Text>
                <StyledInput
                  value={name}
                  onChangeText={async (text) => {
                    setName(text);
                    const profile = await getBabyProfile();
                    await saveBabyProfile({ ...profile, name: text });
                  }}
                  placeholder="예: 제니"
                  style={{ flex: 1 }}
                />
              </View>
              <View style={[styles.inlineField, { flex: 1 }]}>
                <Text style={styles.inlineLabel}>생년월일</Text>
                <TouchableOpacity style={[styles.dateBtnInline, { flex: 1 }]} onPress={() => setShowBirthPicker(true)}>
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
                    onChange={async (event, date) => {
                      setShowBirthPicker(false);
                      if (date) {
                        const dateStr = date.toISOString().split('T')[0];
                        setBirthdate(dateStr);
                        // 저장 + 100일 알림 예약
                        const profile = await getBabyProfile();
                        await saveBabyProfile({ ...profile, birthdate: dateStr, name: name || profile.name });
                        await schedule100DayNotification(name, dateStr);
                      }
                    }}
                  />
                )}
              </View>
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
              return (
                <>
                  <View style={styles.ageBadgeRow}>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeNum}>{ageInfo.days}<Text style={styles.ageBadgeLabel}> 일</Text></Text>
                    </View>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeNum}>{ageInfo.weeks}<Text style={styles.ageBadgeLabel}> 주</Text></Text>
                    </View>
                    <View style={[styles.ageBadge, styles.ageBadgeMain]}>
                      <Text style={[styles.ageBadgeNum, styles.ageBadgeNumMain]}>{ageInfo.months}<Text style={[styles.ageBadgeLabel, styles.ageBadgeLabelMain]}> 개월</Text></Text>
                    </View>
                  </View>

                  {ageInfo.corrected && (
                    <View style={styles.correctedBox}>
                      <Text style={styles.correctedTitle}>👶 교정나이</Text>
                      <Text style={styles.correctedValue}>
                        {ageInfo.corrected.months}개월 {ageInfo.corrected.weeks}주
                      </Text>
                      <Text style={styles.correctedSub}>
                        실제 {ageInfo.months}개월 — 조산 {prematureWeeks}주 보정
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </Card>
        </View>

        {/* ── 기본 정보 ── */}
        <View style={styles.sec}>
          <SectionTitle>👶 기본 정보</SectionTitle>
          <Card>
            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>개월 수</Text>
              <View style={{ flex: 1 }}>
                <MonthDropdown value={month} onChange={setMonth} />
              </View>
            </View>
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
              <FormField label="시작 키(cm)" style={{ flex: 1 }}>
                <StyledInput value={heightStart} onChangeText={setHeightStart} placeholder="49" keyboardType="decimal-pad" />
              </FormField>
              <FormField label="끝 키(cm)" style={{ flex: 1 }}>
                <StyledInput value={heightEnd} onChangeText={setHeightEnd} placeholder="54" keyboardType="decimal-pad" />
              </FormField>
            </RowFields>
            <RowFields>
              <FormField label="시작 몸무게(kg)" style={{ flex: 1 }}>
                <StyledInput value={weightStart} onChangeText={setWeightStart} placeholder="3.0" keyboardType="decimal-pad" />
              </FormField>
              <FormField label="끝 몸무게(kg)" style={{ flex: 1 }}>
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
              <StyledInput value={sleep} onChangeText={setSleep} placeholder={"평균 15시간\n3시간에 한 번 깨서 맘마타임"} multiline numberOfLines={2} />
            </FormField>
            <FormField label="🍼 맘마">
              <StyledInput value={feeding} onChangeText={setFeeding} placeholder={"압타밀 1단계\n유축수유 60~100ml × 8회"} multiline numberOfLines={2} />
            </FormField>
            <FormField label="🧷 기저귀">
              <StyledInput value={diaper} onChangeText={setDiaper} placeholder="하기스 네이처메이드 1단계" />
            </FormField>
            <FormField label="💉 접종내역">
              <StyledInput value={vaccine} onChangeText={setVaccine} placeholder="B형 간염 1차 (01/26)" />
            </FormField>
            <FormField label="❤️ 좋아해요">
              <StyledInput value={likes} onChangeText={setLikes} placeholder={"타이니 모빌\n트립트랩 뉴본"} multiline />
            </FormField>
            <FormField label="😤 싫어해요">
              <StyledInput value={dislikes} onChangeText={setDislikes} placeholder={"아기침대에서 자기\n목욕하기"} multiline />
            </FormField>
            <FormField label="✨ 특이사항">
              <StyledInput value={special} onChangeText={setSpecial} placeholder={"양쪽 팔, 왼쪽 발 몽고반점\n황달 겪음\n취미: 딸꾹질하기 토하기"} multiline />
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

            {/* Photo size picker */}
            <View style={[styles.fontPickerSection, { marginTop: 14 }]}>
              <Text style={styles.fontPickerLabel}>📐 사진 크기</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PHOTO_SIZE_OPTIONS.map(opt => {
                  const locked = opt.premium && !userIsPremium;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, { flex: 1, alignItems: 'center' }, photoSize === opt.key && styles.chipActive]}
                      onPress={() => locked ? setShowPremium(true) : setPhotoSize(opt.key)}
                    >
                      <Text style={[styles.chipText, photoSize === opt.key && styles.chipTextActive]}>
                        {opt.label}{locked ? ' 🔒' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </Card>
        </View>

        {/* ── 테마 선택 ── */}
        <View style={styles.sec}>
          <SectionTitle>🎨 테마 선택</SectionTitle>
          <Card>
            <ThemeDropdown
              value={selectedTheme}
              onChange={setSelectedTheme}
              userIsPremium={userIsPremium}
              onPressLocked={() => setShowPremium(true)}
            />

            {/* 폰트 선택 */}
            <View style={styles.fontPickerSection}>
              <Text style={styles.fontPickerLabel}>✏️ 폰트</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {FONT_OPTIONS.map(opt => {
                  const active = selectedFont === opt.key;
                  const locked = opt.premium && !userIsPremium;
                  return (
                    <TouchableOpacity
                      key={String(opt.key)}
                      onPress={() => locked ? setShowPremium(true) : setSelectedFont(opt.key)}
                      style={[styles.fontChip, active && styles.fontChipActive]}
                    >
                      <View style={{ position: 'relative' }}>
                        <Text style={[styles.fontChipSample, { fontFamily: opt.key || undefined, opacity: locked ? 0.4 : 1 }]}>{opt.sample}</Text>
                        {locked && <Text style={{ position: 'absolute', top: -4, right: -4, fontSize: 12 }}>🔒</Text>}
                      </View>
                      <Text style={[styles.fontChipLabel, active && styles.fontChipLabelActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 배경 패턴 선택 */}
            <View style={styles.fontPickerSection}>
              <Text style={styles.fontPickerLabel}>🌀 배경 패턴</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {PATTERN_OPTIONS.map(opt => {
                  const locked = opt.key !== 'none' && !userIsPremium;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => locked ? setShowPremium(true) : setSelectedPattern(opt.key)}
                      style={[styles.fontChip, selectedPattern === opt.key && styles.fontChipActive]}
                    >
                      <View style={{ width: 52, height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: '#F0EEF8', marginBottom: 4, alignItems: 'center', justifyContent: 'center' }}>
                        {opt.key !== 'none' ? (
                          <Svg width="52" height="34">
                            <Defs>{MINI_PATTERNS[opt.key]?.('#B0A0C8')}</Defs>
                            <Rect width="52" height="34" fill="url(#pp)" />
                          </Svg>
                        ) : null}
                        {locked && (
                          <View style={[styles.lockOverlay, { borderRadius: 6 }]}>
                            <Text style={{ fontSize: 14 }}>🔒</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.fontChipLabel, selectedPattern === opt.key && styles.fontChipLabelActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 카드 레이아웃 */}
            <View style={styles.fontPickerSection}>
              <Text style={styles.fontPickerLabel}>📋 카드 레이아웃</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'boxed',   label: '박스형',   desc: '□' },
                  { key: 'minimal', label: '박스없음',   desc: '—' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.layoutChip, cardLayout === opt.key && styles.layoutChipActive]}
                    onPress={() => setCardLayout(opt.key)}
                  >
                    <Text style={[styles.layoutChipDesc, cardLayout === opt.key && { color: '#C87820' }]}>{opt.desc}</Text>
                    <Text style={[styles.fontChipLabel, cardLayout === opt.key && styles.fontChipLabelActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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

        {/* ── 스티커 ── */}
        <View style={styles.sec}>
          <SectionTitle>🎀 스티커</SectionTitle>
          <Card>
            {/* 카테고리 탭 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
              {STICKER_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, stickerCategory === cat.key && styles.chipActive]}
                  onPress={() => setStickerCategory(cat.key)}
                >
                  <Text style={[styles.chipText, stickerCategory === cat.key && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 스티커 팔레트 (이미지 + 이모지 통합) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
              {STICKER_CATEGORIES.find(c => c.key === stickerCategory)?.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.stickerPickBtn}
                  onPress={() => typeof item === 'string' ? addSticker({ emoji: item }) : addSticker({ source: item.source, size: item.size })}
                  activeOpacity={0.7}
                >
                  {typeof item === 'string'
                    ? <Text style={styles.stickerPickEmoji}>{item}</Text>
                    : <Image source={item.source} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  }
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 추가된 스티커 목록 */}
            {placedStickers.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.stickerPlacedLabel}>추가된 스티커 — 탭하면 삭제</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {placedStickers.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.stickerPlacedChip}
                      onPress={() => removeSticker(s.id)}
                    >
                      <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                      <Text style={styles.stickerRemoveX}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.stickerHint}>💡 드래그: 위치 이동 · 두 손가락 핀치: 크기 조절 · 두 손가락 회전: 방향 변경</Text>
              </View>
            )}
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
              themeName={selectedTheme}
              fontOverride={selectedFont}
              patternOverride={selectedPattern}
              name={name || '아기'}
              month={month}
              dateStr={dateStr}
              hwStr={hwStr}
              clothes={clothes || '배냇저고리 / 60'}
              vaccine={vaccine || 'B형 간염 1차 (01/26)'}
              sleep={sleep || '평균 15시간\n3시간에 한 번 깨서 맘마타임'}
              feeding={feeding || '압타밀 1단계\n유축수유 60~100ml × 8회'}
              diaper={diaper || '하기스 네이처메이드 1단계'}
              dislikes={dislikes || '아기침대에서 자기\n목욕하기'}
              likes={likes || '타이니 모빌\n트립트랩 뉴본'}
              special={special || '양쪽 팔, 왼쪽 발 몽고반점\n황달 겪음\n취미: 딸꾹질하기 토하기'}
              photoUri={photoUri}
              photoSize={photoSize}
              stickers={placedStickers}
              onStickerMove={updateStickerTransform}
              onStickerGestureActive={setScrollEnabled}
              cardLayout={cardLayout}
            />
            <SecondaryButton onPress={saveCard} style={saving ? { opacity: 0.7 } : {}}>
              {saving ? '저장 중...' : '💾 사진첩 & 앨범에 저장하기'}
            </SecondaryButton>
            <SecondaryButton onPress={shareCard} style={[{ marginTop: 8, backgroundColor: '#4A90D9', borderColor: '#2E70B8' }, saving ? { opacity: 0.7 } : {}]}>
              {saving ? '처리 중...' : '📤 인스타·카카오톡·페이스북 공유'}
            </SecondaryButton>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Baby Card Component ───────────────────────
function CardPattern({ pattern, width }) {
  if (!pattern) return null;
  const { type, color, opacity, size = 18, r = 2.2 } = pattern;
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height="100%">
      <Defs>
        {type === 'dots' && (
          <Pattern id="p" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
            <Circle cx={size / 2} cy={size / 2} r={r} fill={color} opacity={opacity} />
          </Pattern>
        )}
        {type === 'stripes' && (
          <Pattern id="p" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect x="0" y="0" width={size / 2} height={size} fill={color} opacity={opacity} />
          </Pattern>
        )}
        {type === 'waves' && (
          <Pattern id="p" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <Path d="M0 10 Q15 0 30 10 Q45 20 60 10" fill="none" stroke={color} strokeWidth="1.5" opacity={opacity} />
          </Pattern>
        )}
        {type === 'hex' && (
          <Pattern id="p" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <Polygon points="14,2 24,8 24,20 14,26 4,20 4,8" fill="none" stroke={color} strokeWidth="1" opacity={opacity} />
          </Pattern>
        )}
        {type === 'stars' && (
          <Pattern id="p" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <Circle cx="8" cy="8" r="1.2" fill={color} opacity={opacity} />
            <Circle cx="28" cy="18" r="0.8" fill={color} opacity={opacity * 0.7} />
            <Circle cx="18" cy="32" r="1" fill={color} opacity={opacity * 0.85} />
            <Circle cx="35" cy="5" r="0.6" fill="#E8D880" opacity={opacity} />
          </Pattern>
        )}
      </Defs>
      <Rect width="100%" height="100%" fill="url(#p)" />
    </Svg>
  );
}
const BabyCard = React.forwardRef(function BabyCard(
  { theme: t, name, month, dateStr, hwStr, clothes, vaccine, sleep, feeding, diaper, dislikes, likes, special, photoUri, themeName, fontOverride, patternOverride, photoSize, stickers, onStickerMove, onStickerGestureActive, cardLayout },
  ref
) {
  const titleFf = fontOverride != null ? fontOverride
    : (t.titleFont || (themeName === 'blossom' ? FONTS.cute : undefined));
  const bodyFf = fontOverride != null ? fontOverride
    : (themeName === 'blossom' ? FONTS.cute : undefined);

  const effectivePattern = (() => {
    if (!patternOverride || patternOverride === 'none') return null;
    const color = t.pillBorder || t.tagBg || '#AAAAAA';
    return {
      dots:    { type: 'dots',    color, opacity: 0.4, size: 18, r: 2.2 },
      waves:   { type: 'waves',   color, opacity: 0.3 },
      stripes: { type: 'stripes', color, opacity: 0.18, size: 18 },
      hex:     { type: 'hex',     color, opacity: 0.25 },
      stars:   { type: 'stars',   color, opacity: 0.35 },
    }[patternOverride] || null;
  })();

  const cardW = SW;

  function InfoBlock({ tag, content, flex }) {
    if (!content) return <View style={{ flex: flex || 1 }} />;

    if (cardLayout === 'minimal') {
      const textColor = t.dark ? 'rgba(255,255,255,0.92)' : (t.titleColor || '#4A3520');
      const labelColor = t.dark ? 'rgba(255,255,255,0.55)' : (t.tagColor || '#8A7050');
      return (
        <View style={{ flex: flex || 1, paddingHorizontal: 4, paddingVertical: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: labelColor, fontFamily: bodyFf, marginBottom: 3, textAlign: 'center' }}>{tag}</Text>
          <Text style={{ fontSize: 11, color: textColor, fontFamily: bodyFf, lineHeight: 16, textAlign: 'center' }}>{content}</Text>
        </View>
      );
    }

    return (
      <View style={[cardStyles.infoBlock, { flex: flex || 1, backgroundColor: t.ibBg, borderColor: t.ibBorder }]}>
        <View style={[cardStyles.infoTag, { backgroundColor: t.tagBg }]}>
          <Text style={[cardStyles.infoTagText, { color: t.tagColor, fontFamily: bodyFf }]}>{tag}</Text>
        </View>
        <Text style={[cardStyles.infoBody, { fontFamily: bodyFf }, t.dark && { color: 'rgba(255,255,255,0.88)' }]}>{content}</Text>
      </View>
    );
  }

  return (
    <View ref={ref} style={[cardStyles.card, { backgroundColor: t.cardBg, width: SW }]}>
      <CardPattern pattern={effectivePattern} width={SW} />
      {/* Corner decos */}
      {/* Title */}
      <Text style={[cardStyles.title, {
        color: t.titleColor,
        fontFamily: titleFf,
        fontWeight: (fontOverride != null || t.titleFont || themeName === 'blossom') ? undefined : '800',
      }]}>
        {name} {month}개월 성장보고서
      </Text>
      {/* Date pill */}
      {dateStr ? (
        <View style={[cardStyles.datePill, { backgroundColor: t.pillBg, borderColor: t.pillBorder }]}>
          <Text style={[cardStyles.datePillText, { color: t.pillColor, fontFamily: bodyFf }]}>{dateStr}</Text>
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
        {(() => {
          const photoSizeVal = PHOTO_SIZE_OPTIONS.find(o => o.key === (photoSize || 'medium'))?.size || 130;
          return (
            <View style={[cardStyles.photoCircle, {
              width: photoSizeVal, height: photoSizeVal, borderRadius: photoSizeVal / 2,
              borderColor: t.photoBorder,
              backgroundColor: t.photoBg[0],
            }]}>
              {photoUri
                ? <Image source={{ uri: photoUri }} style={cardStyles.photoImg} />
                : <Text style={{ fontSize: 44, opacity: 0.5 }}>🍼</Text>
              }
            </View>
          );
        })()}
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

      <Text style={[cardStyles.footer, { color: t.dark ? 'rgba(255,255,255,0.25)' : 'rgba(90,60,20,0.3)', fontFamily: bodyFf }]}>
        Made with BabySteps 🍼
      </Text>

      {/* 스티커 레이어 */}
      {stickers?.map(s => (
        <StickerItem key={s.id} sticker={s} onTransformChange={onStickerMove} onGestureActive={onStickerGestureActive} />
      ))}
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
  title: { fontSize: 23, textAlign: 'center', marginBottom: 6, marginTop: 4 },
  datePill: {
    alignSelf: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, marginBottom: 10,
  },
  datePillText: { fontSize: 12, fontWeight: '500' },
  row: { flexDirection: 'row', marginBottom: 6 },
  infoBlock: {
    borderRadius: 10, padding: 8, borderWidth: 1.5, flex: 1,
    alignItems: 'center',
  },
  infoTag: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'center', marginBottom: 4,
  },
  infoTagText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  infoBody: { fontSize: 11, color: '#4A3520', lineHeight: 17, textAlign: 'center' },
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
  footer: { textAlign: 'center', fontSize: 11, marginTop: 8 },
});

const styles = StyleSheet.create({
  inlineField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    backgroundColor: '#FFFDF5', paddingHorizontal: 10, paddingVertical: 2,
    marginBottom: 10,
  },
  inlineLabel: { fontSize: 11, color: '#A08050', fontWeight: '600', marginRight: 6, flexShrink: 0 },
  dateBtnInline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
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
    paddingHorizontal: 4, paddingVertical: 8,
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
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  themeSwatch: {
    width: '23%', borderRadius: 12, padding: 6, alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', position: 'relative',
  },
  themeSwatchActive: { borderColor: '#5A3A10' },
  swatchPreview: { width: '100%', height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  swatchName: { fontSize: 10, fontWeight: '600', color: '#5A3A10', textAlign: 'center' },
  swatchCheck: {
    position: 'absolute', top: 4, right: 4, width: 16, height: 16,
    backgroundColor: '#5A3A10', borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  cardSection: { marginTop: 20, marginHorizontal: -16 },
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
    flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 8, justifyContent: 'center',
  },
  ageBadge: {
    flex: 1, alignItems: 'center', backgroundColor: '#FFF8E8',
    borderRadius: 10, paddingVertical: 7, borderWidth: 1.5, borderColor: '#EAD9C0',
  },
  ageBadgeMain: { backgroundColor: '#FFF0A0', borderColor: '#E8C020' },
  ageBadgeNum: { fontSize: 16, fontWeight: '800', color: '#7A5020' },
  ageBadgeNumMain: { fontSize: 18, color: '#B07010' },
  ageBadgeLabel: { fontSize: 12, color: '#A08050', fontWeight: '600' },
  ageBadgeLabelMain: { fontSize: 13, color: '#C87820', fontWeight: '700' },
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
  fontPickerSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0E0C0',
  },
  fontPickerLabel: {
    fontSize: 12,
    color: '#A08050',
    fontWeight: '600',
    marginBottom: 8,
  },
  fontChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8D8B0',
    backgroundColor: '#FFF8EE',
    minWidth: 76,
  },
  fontChipActive: {
    borderColor: '#C87820',
    backgroundColor: '#FFF0D0',
  },
  fontChipSample: {
    fontSize: 15,
    marginBottom: 2,
    color: '#333',
  },
  fontChipLabel: {
    fontSize: 10,
    color: '#A08050',
    fontWeight: '500',
  },
  fontChipLabelActive: {
    color: '#C87820',
    fontWeight: '700',
  },
  stickerPickBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  stickerPickEmoji: { fontSize: 32 },
  stickerPlacedLabel: { fontSize: 11, color: '#8A7050', fontWeight: '600' },
  stickerPlacedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF0C0', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E8A020',
  },
  stickerRemoveX: { fontSize: 10, color: '#C06030', fontWeight: '700' },
  stickerHint: { fontSize: 11, color: '#A09070', marginTop: 8, lineHeight: 16 },
  layoutChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EAD9C0', backgroundColor: '#FFFDF5', gap: 2,
  },
  layoutChipActive: { backgroundColor: '#FFF0C0', borderColor: '#E8A020' },
  layoutChipDesc: { fontSize: 18, color: '#A09070' },
});
