// src/screens/CelebrationScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, Dimensions, Platform, Share, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Ellipse, Rect, Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import {
  AppHeader, SectionTitle, Card, PrimaryButton, SecondaryButton,
  FormField, StyledInput, COLORS,
} from '../components/UI';
import { getBabyProfile } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
// 파일 상단에 폰트 상수 추가
const FONTS = {
  cute: 'GamjaFlower_400Regular',   // 귀여움
  melody: 'HiMelody_400Regular',    // 손글씨 감성
  cuteFont: 'CuteFont_400Regular',  // 아기자기
};
// ── 날짜 계산 헬퍼 ─────────────────────────────
function calcMilestones(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  birth.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day100 = new Date(birth); day100.setDate(birth.getDate() + 99);
  const day200 = new Date(birth); day200.setDate(birth.getDate() + 199);
  const dol = new Date(birth); dol.setFullYear(birth.getFullYear() + 1);

  const diff = (d) => Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  return [
    { label: '100일', emoji: '🎂', date: day100, daysLeft: diff(day100) },
    { label: '200일', emoji: '🌟', date: day200, daysLeft: diff(day200) },
    { label: '돌', emoji: '🎉', date: dol, daysLeft: diff(dol) },
  ];
}

function formatDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const INVITE_THEMES = {
  yellow: { bg: '#FFFDF5', accent: '#C8860A', accentLight: '#FDEEB0', titleColor: '#8B5E0A', flower: '🌼', sub: '#B8A060' },
  pink: { bg: '#FDF5F7', accent: '#C8506A', accentLight: '#FFD0DC', titleColor: '#A03050', flower: '🌸', sub: '#C08090' },
  sky: { bg: '#F5F9FD', accent: '#3A7EC8', accentLight: '#C8E4FF', titleColor: '#2A5EA0', flower: '🩵', sub: '#7AAAD0' },
};

// ── 돌잔치 전용 카드 ──────────────────────────────
const DolCard = React.forwardRef(function DolCard(
  { babyName, eventDate, eventTime, venue, message, photoUri, parentDad, parentMom, theme },
  ref
) {
  const cardW = SW - 32;
  const cardH = cardW * 1.45;
  const cx = cardW / 2;

  const bgImage =
    theme === 'sky' ? require('../../assets/blue_dol.png') :
      theme === 'yellow' ? require('../../assets/yellow_dol.png') :
        require('../../assets/pink_dol.png');

  const themeColor =
    theme === 'sky' ? '#1E5FA8' :
      theme === 'yellow' ? '#C8860A' :
        '#C07890';

  // 하늘색 테마는 사진 동그랗게·조금 작게, 텍스트 아래로
  const isSky = theme === 'sky';
  const isYellow = theme === 'yellow';
  const isPink = theme === 'pink';   // ← 추가
  const ff = isPink ? 'GamjaFlower_400Regular' : undefined;  // ← 추가
  const photoSize = isSky ? cardW * 0.62 : null;          // 정사각형 → 완전한 원
  const photoTop = isSky ? cardH * 0.23 : cardH * 0.22;
  const photoOffsetX = isSky ? cardW * 0.02 : 0;
  const photoW = isSky ? photoSize : cardW * 0.68;
  const photoH = isSky ? photoSize : cardH * 0.35;  // sky: 가로=세로 → 원
  const titleTop = isSky ? null :
    isYellow ? cardH * 0.10 : cardH * 0.635;  // yellow: 사진 위 맨 위
  const dividerY = isSky ? cardH * 0.745 :
    isYellow ? cardH * 0.60 : cardH * 0.695;
  const dateY = isSky ? cardH * 0.790 :
    isYellow ? cardH * 0.65 : cardH * 0.788;
  const msgY = isSky ? cardH * 0.835 :
    isYellow ? cardH * 0.70 : cardH * 0.745;
  const venueY = isSky ? cardH * 0.876 :
    isYellow ? cardH * 0.74 : cardH * 0.825;
  const parentsY = isSky ? cardH * 0.910 :
    isYellow ? cardH * 0.78 : cardH * 0.865;
  const dotsY = isSky ? cardH * 0.928 :
    isYellow ? cardH * 0.835 : cardH * 0.88;
  const footerY = isSky ? cardH * 0.962 :
    isYellow ? cardH * 0.890 : cardH * 0.935;

  return (
    <View
      ref={ref}
      style={[
        inviteStyles.card,
        {
          width: cardW,
          height: cardH,
          backgroundColor: '#FDF0F3',
          padding: 0,
          overflow: 'hidden',
        },
      ]}
    >
      {/* 배경 이미지 */}
      <Image
        source={bgImage}
        style={{ position: 'absolute', top: 0, left: 0, width: cardW, height: cardH }}
        resizeMode="cover"
      />

      {/* 사진 타원 프레임 + 사진 (native View — SVG 좌표 무관하게 정확히 맞음) */}
      <View style={{
        position: 'absolute',
        top: photoTop,
        left: cx - photoW / 2 + photoOffsetX,
        width: photoW,
        height: photoH,
        borderRadius: 999,
        borderWidth: 3,
        borderColor: themeColor,
        backgroundColor: '#F8F4F0',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Text style={{ fontSize: 49 }}>👶</Text>
        }
      </View>

      {/* SVG — 텍스트 오버레이만 (absolute로 고정해 좌표 일치) */}
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={cardW} height={cardH} viewBox={`0 0 ${cardW} ${cardH}`} pointerEvents="none">

        {/* 구분선 */}
        <Line x1={cardW * 0.22} y1={dividerY} x2={cardW * 0.78} y2={dividerY}
          stroke={themeColor} strokeWidth={0.8} opacity={0.4} />
        <Circle cx={cx} cy={dividerY} r={3} fill={themeColor} opacity={0.5} />

        {/* 날짜·시간 */}
        {(eventDate || eventTime) ? (
          <SvgText x={cx} y={dateY} textAnchor="middle" fontSize={cardW * 0.042}
            fontWeight="700" fontFamily={ff} fill={themeColor} letterSpacing={2}>
            {[eventDate, eventTime].filter(Boolean).join('  ')}
          </SvgText>
        ) : null}

        {/* 메시지 */}
        {message ? (
          <SvgText x={cx} y={msgY} textAnchor="middle" fontFamily={ff} fontSize={cardW * 0.040} fill={themeColor} opacity={0.8}>
            {message}
          </SvgText>
        ) : null}

        {/* 장소 */}
        {venue ? (
          <SvgText x={cx} y={venueY} textAnchor="middle" fontFamily={ff} fontSize={cardW * 0.042} fill={themeColor} opacity={0.8}>
            {venue}
          </SvgText>
        ) : null}

        {/* 부모 이름 */}
        {(parentDad || parentMom) ? (
          <>
            <SvgText x={cx * 0.55} y={parentsY} textAnchor="middle"
              fontSize={cardW * 0.040} fontFamily={ff} fill={themeColor} opacity={0.9} letterSpacing={2}>
              {parentDad ? `아빠 ${parentDad}` : ''}
            </SvgText>
            <SvgText x={cx} y={parentsY} textAnchor="middle" fontFamily={ff}
              fontSize={cardW * 0.040} fill={themeColor}>♡</SvgText>
            <SvgText x={cx * 1.45} y={parentsY} textAnchor="middle" fontFamily={ff}
              fontSize={cardW * 0.040} fill={themeColor} opacity={0.9} letterSpacing={2}>
              {parentMom ? `엄마 ${parentMom}` : ''}
            </SvgText>
          </>
        ) : null}

        {/* 하단 장식 점 */}
        <Circle cx={cx - 16} cy={dotsY} r={2.5} fill={themeColor} opacity={0.4} />
        <Circle cx={cx} cy={dotsY} r={2.5} fill={themeColor} opacity={0.6} />
        <Circle cx={cx + 16} cy={dotsY} r={2.5} fill={themeColor} opacity={0.4} />

        {/* 푸터 */}
        <SvgText x={cx} y={footerY} textAnchor="middle"
          fontSize={cardW * 0.026} fill={themeColor} opacity={0.35}>
          Made with BabySteps 🍼
        </SvgText>
      </Svg>

      {/* 타이틀 - native Text로 한글 정확히 렌더링 (sky 테마 제외) */}
      {!isSky && (
        isYellow ? (
          <Text style={{
            position: 'absolute',
            top: titleTop,
            width: cardW,
            textAlign: 'center',
            fontSize: cardW * 0.068,
            fontWeight: '700',
            fontStyle: 'italic',
            color: themeColor,
            letterSpacing: 3,
            lineHeight: cardW * 0.082,
          }}>
            {'Happy\nBirthday'}
          </Text>
        ) : (
          <Text style={{
            position: 'absolute',
            top: titleTop,
            width: cardW,
            textAlign: 'center',
            fontSize: cardW * 0.074,
            fontFamily: FONTS.cute,   // ← 여기
            color: themeColor,
            letterSpacing: 3,
          }}>
            {`${(babyName || '아기')}의 돌잔치`}
          </Text>
        )
      )}
    </View>
  );
});

// ── InviteCard - 돌잔치 + 핑크 테마만 DolCard 사용 ──────────────────────────────
const InviteCard = React.forwardRef(function InviteCard(props, ref) {
  if (props.type === 'dol') {
    return <DolCard ref={ref} {...props} />;
  }
  // 100일은 기존 카드 그대로
  const { type, babyName, eventDate, eventTime, venue, message, photoUri, theme, parentDad, parentMom } = props;
  const t = INVITE_THEMES[theme] || INVITE_THEMES.yellow;
  const { bg, accent, accentLight, titleColor, flower, sub } = t;
  const cardW = SW - 32;
  const heartW = cardW - 72;
  const heartH = heartW * 0.88;
  const typeLine = ['1', '0', '0', '일'];
  const nameLine = (babyName || '아기').split('');
  return (
    <View ref={ref} style={[inviteStyles.card, { backgroundColor: bg, width: cardW }]}>
      <Text style={inviteStyles.cornerTL}>{flower}</Text>
      <Text style={inviteStyles.cornerTR}>{flower}</Text>
      <Text style={inviteStyles.cornerBL}>{flower}</Text>
      <Text style={inviteStyles.cornerBR}>{flower}</Text>
      <View style={inviteStyles.rightTitle}>
        {typeLine.map((ch, i) => (
          <Text key={i} style={[inviteStyles.rightTitleType, { color: titleColor }]}>{ch}</Text>
        ))}
        <View style={[inviteStyles.rightTitleDivider, { backgroundColor: accent }]} />
        {nameLine.map((ch, i) => (
          <Text key={i} style={[inviteStyles.rightTitleName, { color: accent }]}>{ch}</Text>
        ))}
      </View>
      <Text style={[inviteStyles.subTitle, { color: sub }]}>   100 DAY  CELEBRATION</Text>
      <View style={{ alignItems: 'center', width: '100%', height: heartH + 16, justifyContent: 'center', marginTop: 20, marginBottom: 8 }}>
        <Svg style={{ position: 'absolute' }} width={heartW} height={heartH} viewBox="0 0 200 176">
          <Path
            d="M100 168C42 132 8 98 8 62C8 30 30 12 58 12C76 12 100 32 100 32C100 32 124 12 142 12C170 12 192 30 192 62C192 98 158 132 100 168Z"
            fill={accentLight}
          />
        </Svg>
        <View style={[inviteStyles.photoRound, { borderColor: accent }]}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={inviteStyles.photoImg} />
            : <Text style={{ fontSize: 60 }}>🍼</Text>
          }
        </View>
      </View>
      {(eventDate || eventTime) ? (
        <Text style={[inviteStyles.infoDate, { color: accent }]}>
          {[eventDate, eventTime].filter(Boolean).join('  ')}
        </Text>
      ) : null}
      {venue ? <Text style={inviteStyles.infoVenue}>{venue}</Text> : null}
      {(eventDate || venue) ? (
        <View style={[inviteStyles.divider, { backgroundColor: accent + '40' }]} />
      ) : null}
      {message ? <Text style={[inviteStyles.infoMsg, { color: sub }]}>{message}</Text> : null}
      {(parentDad || parentMom) ? (
        <View style={inviteStyles.parentsRow}>
          {parentDad ? <Text style={[inviteStyles.parentText, { color: accent }]}>아빠 {parentDad}</Text> : null}
          {parentMom ? <Text style={[inviteStyles.parentText, { color: accent }]}>엄마 {parentMom}</Text> : null}
        </View>
      ) : null}
      <Text style={[inviteStyles.footer, { color: sub + '80' }]}>Made with BabySteps 🍼</Text>
    </View>
  );
});
// ── 메인 스크린 ────────────────────────────────
export default function CelebrationScreen() {
  const insets = useSafeAreaInsets();
  const [babyName, setBabyName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [inviteType, setInviteType] = useState('100'); // '100' | 'dol'
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [message, setMessage] = useState('');
  const [parentDad, setParentDad] = useState('');
  const [parentMom, setParentMom] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteTheme, setInviteTheme] = useState('yellow');
  const cardRef = useRef(null);

  useFocusEffect(useCallback(() => {
    getBabyProfile().then(p => {
      if (p.name) setBabyName(p.name);
      if (p.birthdate) setBirthdate(p.birthdate);
    });
  }, []));

  const milestones = calcMilestones(birthdate);

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

  const saveCard = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const tmpUri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') await MediaLibrary.createAssetAsync(tmpUri);
      } catch (_) { }
      Alert.alert('저장 완료! 🎉', '사진첩에 저장되었어요!');
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
          : { message: `${babyName || '아기'} ${inviteType === '100' ? '100일' : '돌'} 초대장`, title: '초대장 공유' },
        { dialogTitle: '초대장 공유하기' }
      );
    } catch (e) {
      if (e.message !== 'The user canceled the action') {
        Alert.alert('오류', '공유 중 오류가 발생했어요: ' + e.message);
      }
    }
    setSaving(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="🎊 기념일" subtitle="카운트다운 · 초대장 만들기" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 카운트다운 ── */}
        <View style={styles.sec}>
          <SectionTitle>🗓 카운트다운</SectionTitle>
          {!birthdate ? (
            <Card>
              <Text style={styles.noBirthText}>
                카드 만들기 탭에서 생년월일을 입력하면{'\n'}카운트다운이 자동으로 표시돼요 🍼
              </Text>
            </Card>
          ) : (
            <View style={styles.countdownRow}>
              {milestones.map((m) => {
                const passed = m.daysLeft < 0;
                const today = m.daysLeft === 0;
                return (
                  <View key={m.label} style={[styles.countdownCard, today && styles.countdownCardToday]}>
                    <Text style={styles.countdownEmoji}>{m.emoji}</Text>
                    <Text style={styles.countdownLabel}>{m.label}</Text>
                    <Text style={styles.countdownDateSmall}>{formatDate(m.date)}</Text>
                    {today ? (
                      <Text style={styles.countdownToday}>오늘이에요!</Text>
                    ) : passed ? (
                      <>
                        <Text style={styles.countdownPassed}>지났어요</Text>
                        <Text style={styles.countdownPassedSub}>{Math.abs(m.daysLeft)}일 전</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.countdownDays}>{m.daysLeft}</Text>
                        <Text style={styles.countdownDaysLabel}>일 남았어요</Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── 초대장 만들기 ── */}
        <View style={styles.sec}>
          <SectionTitle>💌 초대장 만들기</SectionTitle>
          <Card>
            {/* 탭 */}
            <View style={styles.typeTab}>
              <TouchableOpacity
                style={[styles.typeBtn, inviteType === '100' && styles.typeBtnActive100]}
                onPress={() => { setInviteType('100'); setCardVisible(false); }}
              >
                <Text style={[styles.typeBtnText, inviteType === '100' && styles.typeBtnTextActive]}>🎂 100일</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, inviteType === 'dol' && styles.typeBtnActiveDol]}
                onPress={() => { setInviteType('dol'); setCardVisible(false); }}
              >
                <Text style={[styles.typeBtnText, inviteType === 'dol' && styles.typeBtnTextActive]}>🎉 돌잔치</Text>
              </TouchableOpacity>
            </View>

            {/* 테마 선택 */}
            <View style={styles.themeRow}>
              {Object.entries(INVITE_THEMES).map(([key, t]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.themeDot, { backgroundColor: t.accent }, inviteTheme === key && styles.themeDotActive]}
                  onPress={() => { setInviteTheme(key); setCardVisible(false); }}
                >
                  {inviteTheme === key && <Text style={styles.themeDotCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              <Text style={styles.themeHint}>테마 색상</Text>
            </View>

            {/* 아기 이름 */}
            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>아기 이름</Text>
              <StyledInput
                value={babyName}
                onChangeText={setBabyName}
                placeholder="예: 제니"
                style={{ flex: 1 }}
              />
            </View>

            {/* 날짜 */}
            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>날짜</Text>
              <StyledInput
                value={eventDate}
                onChangeText={setEventDate}
                placeholder="예: 2025년 3월 15일 (토)"
                style={{ flex: 1 }}
              />
            </View>

            {/* 시간 */}
            <View style={styles.inlineField}>
              <Text style={styles.inlineLabel}>시간</Text>
              <StyledInput
                value={eventTime}
                onChangeText={setEventTime}
                placeholder="예: 오후 12시"
                style={{ flex: 1 }}
              />
            </View>

            {/* 장소 */}
            <FormField label="📍 장소">
              <StyledInput
                value={venue}
                onChangeText={setVenue}
                placeholder="예: 그랜드 호텔 2층 연회장"
                multiline
              />
            </FormField>

            {/* 메시지 */}
            <FormField label="💬 한마디">
              <StyledInput
                value={message}
                onChangeText={setMessage}
                placeholder={inviteType === '100'
                  ? "예: 소중한 분들과 함께\n제니의 100일을 축하하고 싶어요 🎂"
                  : "예: 사랑하는 분들을 모시고\n제니의 첫 생일을 함께 하고 싶어요 🎉"}
                multiline
              />
            </FormField>

            {/* 부모 이름 */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.inlineField, { flex: 1 }]}>
                <Text style={styles.inlineLabel}>아빠</Text>
                <StyledInput value={parentDad} onChangeText={setParentDad} placeholder="이름" style={{ flex: 1 }} />
              </View>
              <View style={[styles.inlineField, { flex: 1 }]}>
                <Text style={styles.inlineLabel}>엄마</Text>
                <StyledInput value={parentMom} onChangeText={setParentMom} placeholder="이름" style={{ flex: 1 }} />
              </View>
            </View>

            {/* 사진 */}
            <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>아기 사진 선택 (선택)</Text>
                </>
              )}
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ alignSelf: 'center', marginTop: 6 }}>
                <Text style={{ color: '#E06040', fontSize: 13 }}>✕ 사진 삭제</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        <PrimaryButton onPress={() => setCardVisible(true)}>
          ✨ {inviteType === '100' ? '100일' : '돌잔치'} 초대장 만들기!
        </PrimaryButton>

        {/* ── 초대장 미리보기 ── */}
        {cardVisible && (
          <View style={styles.cardSection}>
            <Text style={styles.cardHint}>👇 완성된 초대장</Text>
            <InviteCard
              ref={cardRef}
              type={inviteType}
              theme={inviteTheme}
              babyName={babyName}
              eventDate={eventDate}
              eventTime={eventTime}
              venue={venue}
              message={message}
              photoUri={photoUri}
              parentDad={parentDad}
              parentMom={parentMom}
            />
            <SecondaryButton onPress={saveCard} style={saving ? { opacity: 0.7 } : {}}>
              {saving ? '저장 중...' : '💾 사진첩에 저장하기'}
            </SecondaryButton>
            <SecondaryButton
              onPress={shareCard}
              style={[{ marginTop: 8, backgroundColor: '#4A90D9', borderColor: '#2E70B8' }, saving ? { opacity: 0.7 } : {}]}
            >
              {saving ? '처리 중...' : '📤 인스타·카카오톡·페이스북 공유'}
            </SecondaryButton>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── 초대장 스타일 ──────────────────────────────
const inviteStyles = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
    position: 'relative', overflow: 'hidden', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 24,
  },
  cornerTL: { position: 'absolute', top: 8, left: 8, fontSize: 32, opacity: 0.85 },
  cornerTR: { position: 'absolute', top: 8, right: 8, fontSize: 32, opacity: 0.85 },
  cornerBL: { position: 'absolute', bottom: 8, left: 8, fontSize: 32, opacity: 0.85 },
  cornerBR: { position: 'absolute', bottom: 8, right: 8, fontSize: 32, opacity: 0.85 },
  rightTitle: {
    position: 'absolute', right: 16, top: 44,
    alignItems: 'center', zIndex: 2,
  },
  rightTitleType: { fontSize: 30, fontWeight: '900', lineHeight: 36 },
  rightTitleDivider: { width: 24, height: 1.5, marginVertical: 6 },
  rightTitleName: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  subTitle: {
    fontSize: 11, letterSpacing: 3, fontWeight: '500',
    marginBottom: 4, marginTop: 8, alignSelf: 'flex-start', marginLeft: 8,
  },
  photoRound: {
    width: 165, height: 165, borderRadius: 100, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  photoImg: { width: '100%', height: '100%' },
  infoDate: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 6, letterSpacing: 0.5 },
  infoVenue: { fontSize: 13, color: '#5A4030', textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  divider: { width: 60, height: 1, marginVertical: 10 },
  infoMsg: { fontSize: 12, textAlign: 'center', lineHeight: 20, marginBottom: 8, fontStyle: 'italic' },
  parentsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 8 },
  parentText: { fontSize: 13, fontWeight: '700' },
  footer: { fontSize: 10, marginTop: 4 },
});

// ── 스크린 스타일 ─────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EDD8' },
  scroll: { padding: 16, paddingBottom: 40 },
  sec: { marginBottom: 4 },
  noBirthText: {
    fontSize: 13, color: '#8A7050', textAlign: 'center',
    lineHeight: 22, paddingVertical: 8,
  },
  countdownRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  countdownCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EAD9C0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  countdownCardToday: { borderColor: '#F5A623', backgroundColor: '#FFF8E8' },
  countdownEmoji: { fontSize: 28, marginBottom: 4 },
  countdownLabel: { fontSize: 14, fontWeight: '800', color: '#5A3A10', marginBottom: 2 },
  countdownDateSmall: { fontSize: 10, color: '#A08050', marginBottom: 6 },
  countdownDays: { fontSize: 28, fontWeight: '900', color: '#C87820' },
  countdownDaysLabel: { fontSize: 10, color: '#A08050', fontWeight: '600' },
  countdownToday: { fontSize: 13, fontWeight: '800', color: '#F5A623' },
  countdownPassed: { fontSize: 12, fontWeight: '700', color: '#A09070' },
  countdownPassedSub: { fontSize: 10, color: '#B0A080' },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  themeDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  themeDotActive: {
    borderColor: '#5A3A10',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  themeDotCheck: { color: '#fff', fontSize: 14, fontWeight: '800' },
  themeHint: { fontSize: 11, color: '#A08050', fontWeight: '600', marginLeft: 2 },
  typeTab: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#EAD9C0',
    backgroundColor: '#FFFDF5',
  },
  typeBtnActive100: { backgroundColor: '#FFF0D0', borderColor: '#F5A623' },
  typeBtnActiveDol: { backgroundColor: '#EAE4FF', borderColor: '#7B68EE' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#8A7050' },
  typeBtnTextActive: { color: '#4A3520', fontWeight: '800' },
  inlineField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    backgroundColor: '#FFFDF5', paddingHorizontal: 10, paddingVertical: 2,
    marginBottom: 10,
  },
  inlineLabel: { fontSize: 11, color: '#A08050', fontWeight: '600', marginRight: 6, flexShrink: 0 },
  photoArea: {
    borderWidth: 2, borderColor: '#E8DCC8', borderStyle: 'dashed',
    borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#FFFDF5', marginTop: 4,
  },
  photoPreview: { width: '100%', height: 160, borderRadius: 10 },
  photoIcon: { fontSize: 24, marginBottom: 4 },
  photoText: { fontSize: 13, color: '#8A7050' },
  cardSection: { marginTop: 20 },
  cardHint: { fontSize: 12, color: '#8A7050', textAlign: 'center', marginBottom: 10 },
});
