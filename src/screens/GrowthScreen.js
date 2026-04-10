// src/screens/GrowthScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';

import { AppHeader, Card, SectionTitle, PrimaryButton, COLORS } from '../components/UI';
import { WHO_WEIGHT, WHO_HEIGHT, WHO_HEAD, getPercentile, getZone, PCT_MARKS, CHART_MONTHS, nearestChartMonth, formatAge } from '../data/whoData';
import { MILESTONES } from '../data/milestones';
import { getGrowthRecords, saveGrowthRecord, deleteGrowthRecord, getBabyProfile, saveBabyProfile, getMilestoneChecks, toggleMilestoneCheck } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => i); // 0~4세
const MONTH_OFFSETS = Array.from({ length: 12 }, (_, i) => i); // 0~11개월

export default function GrowthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState('entry');
  const [babyName, setBabyName] = useState('');
  const [gender, setGender] = useState('girl');
  const [ageYear, setAgeYear] = useState(null);
  const [ageMonthOff, setAgeMonthOff] = useState(0);
  const [measDate, setMeasDate] = useState(new Date().toISOString().split('T')[0]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [head, setHead] = useState('');
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [milestoneMonth, setMilestoneMonth] = useState(0);
  const [checks, setChecks] = useState({});

  useFocusEffect(
    useCallback(() => {
      getBabyProfile().then(p => { setBabyName(p.name || ''); setGender(p.gender || 'girl'); });
      getGrowthRecords().then(setRecords);
      getMilestoneChecks().then(setChecks);
    }, [])
  );

  const updateProfile = async (field, val) => {
    const profile = { name: babyName, gender };
    profile[field] = val;
    await saveBabyProfile(profile);
  };

  const calcPercentiles = () => {
    if (ageYear === null) { Alert.alert('나이를 선택해주세요!'); return; }
    const mo = Math.min(ageYear * 12 + ageMonthOff, 48);
    const h = parseFloat(height), w = parseFloat(weight), hc = parseFloat(head);
    if (isNaN(h) && isNaN(w) && isNaN(hc)) {
      Alert.alert('최소 한 가지 측정값을 입력해주세요!'); return;
    }
    const pH  = !isNaN(h)  ? getPercentile(h,  mo, gender, WHO_HEIGHT) : null;
    const pW  = !isNaN(w)  ? getPercentile(w,  mo, gender, WHO_WEIGHT) : null;
    const pHC = !isNaN(hc) ? getPercentile(hc, mo, gender, WHO_HEAD)   : null;

    const all = [pH, pW, pHC].filter(p => p !== null);
    let icon, iconColor, title, body;
    if (all.some(p => p < 3 || p > 97)) {
      icon = 'warning-outline'; iconColor = '#E8823A'; title = '소아과 상담을 권장해요';
      body = 'P3 미만 또는 P97 초과 수치가 있어요. 소아과에서 상담받아 보세요.';
    } else if (all.some(p => p < 15)) {
      icon = 'heart-outline'; iconColor = '#7AB8DC'; title = '조금 작은 편이에요';
      body = '평균보다 작지만 정상 범위 안에 있어요. 꾸준한 영양 섭취가 중요해요!';
    } else if (all.some(p => p > 85)) {
      icon = 'star-outline'; iconColor = '#F5A623'; title = '씩씩하게 자라고 있어요!';
      body = '또래보다 큰 편이에요. 건강하게 성장하고 있답니다.';
    } else {
      icon = 'leaf-outline'; iconColor = '#7DC87A'; title = '아주 잘 자라고 있어요!';
      body = 'WHO 기준 정상 범위(P15~P85) 안에 있어요. 건강하게 쑥쑥 크고 있네요!';
    }
    setResult({
      mo, h: isNaN(h) ? null : h, w: isNaN(w) ? null : w, hc: isNaN(hc) ? null : hc,
      pH, pW, pHC, icon, iconColor, title, body,
      feedingRec: getFeedingRec(mo, isNaN(w) ? null : w),
    });
  };

  const handleSave = async () => {
    if (!result) return;
    const record = {
      id: Date.now(),
      month: result.mo, sex: gender,
      name: babyName || '아기',
      date: measDate,
      h: result.h, w: result.w, hc: result.hc,
      pH: result.pH, pW: result.pW, pHC: result.pHC,
    };
    const updated = await saveGrowthRecord(record);
    setRecords(updated);
    Alert.alert('저장 완료!', '기록이 저장되었어요!');
  };

  const handleDelete = async (id) => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = await deleteGrowthRecord(id);
          setRecords(updated);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="성장 추적" subtitle="WHO 기준 백분위수 · 0~4세" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Baby profile */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={40} color="#C8A870" />
            </View>
            <TextInput
              style={styles.profileName}
              value={babyName}
              onChangeText={v => { setBabyName(v); updateProfile('name', v); }}
              placeholder="아기 이름"
              placeholderTextColor="#B0A080"
            />
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'girl' && styles.genderBtnGirlActive]}
                onPress={() => { setGender('girl'); updateProfile('gender', 'girl'); }}
              >
                <Ionicons name="female" size={16} color="#E8506A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'boy' && styles.genderBtnBoyActive]}
                onPress={() => { setGender('boy'); updateProfile('gender', 'boy'); }}
              >
                <Ionicons name="male" size={16} color="#3A7EC8" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Sub-tabs */}
        <View style={styles.subTabRow}>
          {[['entry','입력'], ['history','기록'], ['chart','그래프'], ['milestone','발달']].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.subTab, subTab === key && styles.subTabActive]}
              onPress={() => setSubTab(key)}
            >
              <Text style={[styles.subTabText, subTab === key && styles.subTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ENTRY ── */}
        {subTab === 'entry' && (
          <>
            <View style={styles.whoChip}>
              <Text style={styles.whoChipText}>WHO Child Growth Standards 기준</Text>
            </View>

            <Card>
              <Text style={styles.entrySubtitle}>측정 정보</Text>
              {/* Age selector: Year + Month */}
              <Text style={styles.fieldLabel}>나이 선택 (0~4세)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {YEAR_OPTIONS.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.chip, ageYear === y && styles.chipActive]}
                      onPress={() => { setAgeYear(y); setAgeMonthOff(0); }}
                    >
                      <Text style={[styles.chipText, ageYear === y && styles.chipActiveText]}>
                        {y}세
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {ageYear !== null && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 4 }]}>+개월</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {MONTH_OFFSETS.filter(m => ageYear * 12 + m <= 48).map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.chip, ageMonthOff === m && styles.chipActive]}
                          onPress={() => setAgeMonthOff(m)}
                        >
                          <Text style={[styles.chipText, ageMonthOff === m && styles.chipActiveText]}>
                            +{m}개월
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={styles.ageDisplay}>
                    <Text style={styles.ageDisplayText}>
                      선택된 나이: {formatAge(Math.min(ageYear * 12 + ageMonthOff, 48))} ({Math.min(ageYear * 12 + ageMonthOff, 48)}개월)
                    </Text>
                  </View>
                </>
              )}

              <Text style={styles.fieldLabel}>측정일</Text>
              <TextInput
                style={styles.input}
                value={measDate}
                onChangeText={setMeasDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#B0A080"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>측정값</Text>
              <View style={styles.measRow}>
                <MeasField icon="resize-outline" label="키" value={height} onChange={setHeight} unit="cm" />
                <MeasField icon="scale-outline" label="몸무게" value={weight} onChange={setWeight} unit="kg" />
                <MeasField icon="fitness-outline" label="머리둘레" value={head} onChange={setHead} unit="cm" />
              </View>

              <PrimaryButton onPress={calcPercentiles}>백분위수 계산하기 →</PrimaryButton>
            </Card>

            {/* Result */}
            {result && (
              <>
                <View style={styles.pctRow}>
                  <PctCard icon="resize-outline" label="키" value={result.h} unit="cm" pct={result.pH} />
                  <PctCard icon="scale-outline" label="몸무게" value={result.w} unit="kg" pct={result.pW} />
                  <PctCard icon="fitness-outline" label="머리둘레" value={result.hc} unit="cm" pct={result.pHC} />
                </View>

                <Card style={styles.interpCard}>
                  <View style={styles.interpRow}>
                    <Ionicons name={result.icon} size={24} color={result.iconColor} style={styles.interpIcon} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.interpTitle}>{result.title}</Text>
                      <Text style={styles.interpBody}>{result.body}</Text>
                    </View>
                  </View>
                </Card>

                {/* 수유 권장량 - 0세(0~12개월)만 표시 */}
                {result.mo <= 12 && (
                <Card style={styles.feedCard}>
                  <Text style={styles.feedTitle}>수유 권장량</Text>
                  {result.w && <Text style={styles.feedBasis}>체중 {result.w}kg 기준</Text>}
                  <View style={styles.feedRow}>
                    <View style={styles.feedItem}>
                      <Ionicons name="sunny-outline" size={20} color="#F5A623" style={styles.feedItemIcon} />
                      <Text style={styles.feedItemLabel}>하루 총 수유량</Text>
                      <Text style={styles.feedItemValue}>{result.feedingRec.dailyTotal}</Text>
                    </View>
                    <View style={styles.feedDivider} />
                    <View style={styles.feedItem}>
                      <Ionicons name="water-outline" size={20} color="#70B8D8" style={styles.feedItemIcon} />
                      <Text style={styles.feedItemLabel}>1회 수유량</Text>
                      <Text style={styles.feedItemValue}>{result.feedingRec.perFeed}</Text>
                    </View>
                    <View style={styles.feedDivider} />
                    <View style={styles.feedItem}>
                      <Ionicons name="repeat-outline" size={20} color="#A07880" style={styles.feedItemIcon} />
                      <Text style={styles.feedItemLabel}>하루 횟수</Text>
                      <Text style={styles.feedItemValue}>{result.feedingRec.freq}</Text>
                    </View>
                  </View>
                  {result.feedingRec.note && (
                    <View style={styles.feedNoteRow}>
                      <Ionicons name="information-circle-outline" size={14} color="#6A8A50" />
                      <Text style={styles.feedNote}> {result.feedingRec.note}</Text>
                    </View>
                  )}
                  <Text style={styles.feedDisclaimer}>* 모유/분유 공통 참고값. 아기마다 차이가 있어요.</Text>
                </Card>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>기록 저장하기</Text>
                </TouchableOpacity>

                <View style={styles.disclaimer}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                    <Ionicons name="warning-outline" size={13} color="#8A7040" style={{ marginTop: 2 }} />
                    <Text style={[styles.disclaimerText, { flex: 1 }]}>
                      WHO 기준 참고용 (0~4세). P3 미만 또는 P97 초과 시 소아과 상담 권장.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {/* ── HISTORY ── */}
        {subTab === 'history' && (
          records.length === 0
            ? <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Ionicons name="resize-outline" size={48} color="#D4B896" />
                <Text style={{ textAlign: 'center', color: '#A09070', marginTop: 12, fontSize: 14 }}>
                  아직 저장된 기록이 없어요{'\n'}첫 번째 측정을 입력해보세요!
                </Text>
              </View>
            : records.map(r => (
                <Card key={r.id} style={styles.recCard}>
                  <View style={styles.recRow}>
                    <View style={styles.recBadge}>
                      <Text style={styles.recAge}>{r.month < 24 ? r.month : Math.floor(r.month / 12)}</Text>
                      <Text style={styles.recUnit}>{r.month < 24 ? '개월' : '세'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.recDateRow}>
                        <Text style={styles.recDate}>{r.date} · </Text>
                        <Ionicons name={r.sex === 'girl' ? 'female' : 'male'} size={13} color={r.sex === 'girl' ? '#E8506A' : '#3A7EC8'} />
                        <Text style={styles.recDate}> {r.name} · {formatAge(r.month)}</Text>
                      </View>
                      <View style={styles.recVals}>
                        {r.h !== null && <RecVal icon="resize-outline" val={`${r.h}cm`} pct={r.pH} />}
                        {r.w !== null && <RecVal icon="scale-outline" val={`${r.w}kg`} pct={r.pW} />}
                        {r.hc !== null && <RecVal icon="fitness-outline" val={`${r.hc}cm`} pct={r.pHC} />}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.recDel}>
                      <Text style={{ color: '#CCC', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
        )}

        {/* ── CHART ── */}
        {subTab === 'chart' && (() => {
          // Determine chart range from records: ceil up to nearest year, min 12 months
          const maxRec = records.length > 0 ? Math.max(...records.map(r => r.month)) : 0;
          const chartMaxMonth = records.length > 0
            ? Math.max(12, Math.ceil(maxRec / 12) * 12)
            : 12;
          return (
          <>
            <GrowthChart title="몸무게" table={WHO_WEIGHT} field="w" gender={gender} records={records} color="#E8823A" unit="kg" maxChartMonth={chartMaxMonth} />
            <GrowthChart title="키" table={WHO_HEIGHT} field="h" gender={gender} records={records} color="#7DC87A" unit="cm" maxChartMonth={chartMaxMonth} />
            <GrowthChart title="머리둘레" table={WHO_HEAD} field="hc" gender={gender} records={records} color="#7AB8DC" unit="cm" maxChartMonth={chartMaxMonth} />
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                WHO P3·P15·P50(평균)·P85·P97 기준선 (0~{chartMaxMonth / 12}세) / 빨간 점 = 우리 아기
              </Text>
            </View>
          </>
          );
        })()}

        {/* ── MILESTONE ── */}
        {subTab === 'milestone' && (() => {
          const ms = MILESTONES[milestoneMonth];
          const totalItems = ms.checkItems.length;
          const checkedCount = ms.checkItems.filter(item => checks[`${milestoneMonth}_${item.id}`]).length;
          const allDone = checkedCount === totalItems;

          const handleToggle = async (itemId) => {
            const updated = await toggleMilestoneCheck(milestoneMonth, itemId);
            setChecks({ ...updated });
          };

          return (
            <>
              {/* 월령 선택 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {Array.from({ length: 13 }, (_, i) => i).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, milestoneMonth === m && styles.chipActive]}
                      onPress={() => setMilestoneMonth(m)}
                    >
                      <Text style={[styles.chipText, milestoneMonth === m && styles.chipActiveText]}>
                        {m}개월
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* 월령 헤더 */}
              <Card style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 32 }}>{ms.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.msTitle}>{ms.stage}</Text>
                    <Text style={styles.msProgress}>{checkedCount}/{totalItems} 달성</Text>
                  </View>
                  {allDone && <Ionicons name="trophy-outline" size={24} color="#F5A623" />}
                </View>

                {/* 진행 바 */}
                <View style={styles.msBarTrack}>
                  <View style={[styles.msBarFill, { width: `${(checkedCount / totalItems) * 100}%` }]} />
                </View>

                {/* 체크리스트 */}
                <Text style={[styles.fieldLabel, { marginTop: 14, marginBottom: 8 }]}>
                  발달 체크리스트 (WHO/AAP 기준)
                </Text>
                {ms.checkItems.map(item => {
                  const done = !!checks[`${milestoneMonth}_${item.id}`];
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.msCheckRow, done && styles.msCheckRowDone]}
                      onPress={() => handleToggle(item.id)}
                    >
                      <View style={[styles.msCheckBox, done && styles.msCheckBoxDone]}>
                        {done && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                      </View>
                      <Text style={[styles.msCheckText, done && styles.msCheckTextDone]}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </Card>

              {/* 달성 축하 배너 */}
              {allDone && (
                <Card style={styles.msCelebCard}>
                  <View style={styles.msCelebTitleRow}>
                    <Ionicons name="gift-outline" size={18} color="#C87820" />
                    <Text style={styles.msCelebTitle}> {ms.stage} 마일스톤 완료!</Text>
                  </View>
                  <Text style={styles.msCelebBody}>
                    모든 발달 항목을 달성했어요!{'\n'}기념 카드로 특별한 순간을 남겨보세요.
                  </Text>
                  <TouchableOpacity
                    style={styles.msCelebBtn}
                    onPress={() => navigation.navigate('CardMaker', { milestoneMonth, babyName })}
                  >
                    <Text style={styles.msCelebBtnText}>기념 카드 만들기</Text>
                  </TouchableOpacity>
                </Card>
              )}

              {/* 육아 팁 */}
              <Card>
                <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>이번 달 육아 팁</Text>
                {ms.tips.map((tip, i) => (
                  <Text key={i} style={styles.msTipText}>{tip}</Text>
                ))}
              </Card>

              {/* 놀이 추천 */}
              <Card style={{ marginTop: 14 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 12 }]}>이번 달 놀이 & 장난감 추천</Text>
                {ms.play.map((item, i) => (
                  <View key={i} style={[styles.playCard, item.isToy && styles.playCardToy]}>
                    <View style={styles.playHeader}>
                      <Text style={styles.playEmoji}>{item.emoji}</Text>
                      <Text style={[styles.playTitle, item.isToy && styles.playTitleToy]}>{item.title}</Text>
                    </View>
                    <Text style={styles.playDesc}>{item.desc}</Text>
                  </View>
                ))}
              </Card>

              <View style={styles.disclaimer}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                  <Ionicons name="warning-outline" size={13} color="#8A7040" style={{ marginTop: 2 }} />
                  <Text style={[styles.disclaimerText, { flex: 1 }]}>
                    WHO/AAP 기준 참고용. 아기마다 발달 속도가 달라요. 걱정되면 소아과에서 상담하세요.
                  </Text>
                </View>
              </View>
            </>
          );
        })()}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────

function getFeedingRec(month, weightKg) {
  // 24개월 이상: 유아식/식사 권장
  if (month >= 36) {
    return {
      dailyTotal: '유아식 3회 + 간식 2회',
      perFeed: '밥 80~120g',
      freq: '식사 3회 + 간식 2회',
      note: '우유 400~500ml, 균형 잡힌 유아식',
    };
  }
  if (month >= 24) {
    return {
      dailyTotal: '유아식 3회 + 간식',
      perFeed: '밥·죽 100~130g',
      freq: '3끼 + 간식 1~2회',
      note: '생우유 500ml 이하, 유아식으로 전환',
    };
  }
  if (month >= 13) {
    return {
      dailyTotal: '이유식 3회 + 수유',
      perFeed: '이유식 150~200g',
      freq: '이유식 3회 + 수유 2~3회',
      note: '완료기 이유식 — 가족식 형태로 전환',
    };
  }
  // 0~12개월: 기존 수유 권장량
  const table = [
    { perFeed: '60~90ml',   freq: '8~12회', lo: 150, hi: 180 }, // 0
    { perFeed: '90~120ml',  freq: '7~8회',  lo: 150, hi: 180 }, // 1
    { perFeed: '120~150ml', freq: '6~7회',  lo: 140, hi: 170 }, // 2
    { perFeed: '150~180ml', freq: '5~6회',  lo: 130, hi: 160 }, // 3
    { perFeed: '150~200ml', freq: '5~6회',  lo: 120, hi: 150 }, // 4
    { perFeed: '180~210ml', freq: '5회',    lo: 120, hi: 140 }, // 5
    { perFeed: '200~240ml', freq: '4~5회',  lo: 100, hi: 120 }, // 6
    { perFeed: '200~240ml', freq: '3~4회',  lo: 100, hi: 120 }, // 7
    { perFeed: '200~240ml', freq: '3~4회',  lo:  90, hi: 110 }, // 8
    { perFeed: '200~240ml', freq: '3~4회',  lo:  90, hi: 110 }, // 9
    { perFeed: '200~240ml', freq: '3~4회',  lo:  80, hi: 100 }, // 10
    { perFeed: '200~240ml', freq: '3~4회',  lo:  80, hi: 100 }, // 11
    { perFeed: '180~240ml', freq: '3~4회',  lo:  80, hi: 100 }, // 12
  ];
  const rec = table[Math.min(12, month)];
  const cap = month <= 5 ? 1000 : 1200;
  let dailyTotal;
  if (weightKg && !isNaN(weightKg)) {
    const lo = Math.min(Math.round(weightKg * rec.lo), cap);
    const hi = Math.min(Math.round(weightKg * rec.hi), cap);
    dailyTotal = `${lo}~${hi}ml`;
  } else {
    const fallback = ['480~700','630~900','700~1000','750~1000','750~1000','900~1000',
                      '600~900','600~900','600~900','550~850','550~850','500~800','480~750'];
    dailyTotal = fallback[Math.min(12, month)] + 'ml';
  }
  const note = month >= 6 ? '이유식과 병행해요'
    : month >= 4 ? '이유식 시작을 준비할 시기예요'
    : null;
  return { dailyTotal, perFeed: rec.perFeed, freq: rec.freq, note };
}

function MeasField({ icon, label, value, onChange, unit }) {
  return (
    <View style={measStyles.wrap}>
      <Ionicons name={icon} size={20} color="#8A7050" style={measStyles.icon} />
      <Text style={measStyles.label}>{label}</Text>
      <TextInput
        style={measStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder="--"
        placeholderTextColor="#B0A080"
        keyboardType="decimal-pad"
      />
      <Text style={measStyles.unit}>{unit}</Text>
    </View>
  );
}
const measStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  icon: { marginBottom: 3 },
  label: { fontSize: 10, color: '#8A7050', fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    width: '100%', padding: 8, fontSize: 18, fontWeight: '700',
    textAlign: 'center', backgroundColor: '#FFFDF5', color: '#4A3520',
  },
  unit: { fontSize: 10, color: '#A09070', marginTop: 3 },
});

function PctCard({ icon, label, value, unit, pct }) {
  const zone = pct !== null ? getZone(pct) : 'normal';
  const barColor = zone === 'low' ? '#7AB8DC' : zone === 'high' ? '#F08050' : '#7DC87A';
  const textColor = zone === 'low' ? '#2A70A0' : zone === 'high' ? '#C05020' : '#2A8030';
  return (
    <View style={pctStyles.card}>
      <Ionicons name={icon} size={20} color="#8A7050" style={pctStyles.icon} />
      <Text style={pctStyles.label}>{label}</Text>
      <Text style={pctStyles.val}>{value !== null ? value : '--'}</Text>
      <Text style={pctStyles.unit}>{unit}</Text>
      <View style={pctStyles.barTrack}>
        <View style={[pctStyles.barFill, { width: pct !== null ? `${Math.min(100, pct)}%` : '0%', backgroundColor: barColor }]} />
      </View>
      <Text style={[pctStyles.pctText, { color: textColor }]}>{pct !== null ? `P${pct}` : '--'}</Text>
      {pct !== null && (
        <Text style={[pctStyles.topText, { color: textColor }]}>상위 {100 - pct}%</Text>
      )}
    </View>
  );
}
const pctStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 13, padding: 10,
    alignItems: 'center', marginHorizontal: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  icon: { marginBottom: 3 },
  label: { fontSize: 10, color: '#A09070', fontWeight: '600', marginBottom: 2 },
  val: { fontSize: 18, fontWeight: '800', color: '#4A3520', lineHeight: 22 },
  unit: { fontSize: 10, color: '#8A7050', marginBottom: 6 },
  barTrack: { width: '100%', height: 5, backgroundColor: '#F0EBE0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: 13, fontWeight: '800' },
  topText: { fontSize: 10, fontWeight: '600', opacity: 0.8, marginTop: 1 },
});

function RecVal({ icon, val, pct }) {
  return (
    <View style={{ marginRight: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Ionicons name={icon} size={13} color="#8A7050" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#4A3520' }}>{val}</Text>
      </View>
      {pct !== null && (
        <Text style={{ fontSize: 11, color: '#8A7050' }}>P{pct} · 상위 {100 - pct}%</Text>
      )}
    </View>
  );
}

function GrowthChart({ title, table, field, gender, records, color, unit, maxChartMonth }) {
  // 0~1세(12개월 이하)면 1개월 단위, 그 이상이면 3개월 단위
  const isMonthly = maxChartMonth <= 12;
  const visibleMonths = isMonthly
    ? Array.from({ length: 13 }, (_, i) => i) // 0~12개월 매달
    : CHART_MONTHS.filter(m => m <= maxChartMonth);

  const p50 = visibleMonths.map(m => table[gender][m][2]);
  const p15 = visibleMonths.map(m => table[gender][m][1]);
  const p85 = visibleMonths.map(m => table[gender][m][3]);

  // Map user records to chart month
  const userData = visibleMonths.map(cm => {
    const r = [...records].reverse().find(rec => {
      const mapped = isMonthly ? rec.month : nearestChartMonth(rec.month);
      return mapped === cm && rec[field] !== null;
    });
    return r ? r[field] : null;
  });

  const allVals = [...p15, ...p50, ...p85];
  const minVal = Math.min(...allVals) - 1;
  const maxVal = Math.max(...allVals) + 1;

  // Chart dimensions (must match LineChart props below)
  const chartW = SW - 52;
  const chartH = 200;
  const leftPad = 54;
  const rightPad = 12;
  const topPad = 16;
  const bottomPad = 30;
  const plotW = chartW - leftPad - rightPad;
  const plotH = chartH - topPad - bottomPad;

  const toX = (idx) => leftPad + (idx / (visibleMonths.length - 1)) * plotW;
  const toY = (val) => topPad + (1 - (val - minVal) / (maxVal - minVal)) * plotH;

  const chartData = {
    labels: isMonthly
      ? visibleMonths.map(m => `${m}`)   // "0","1","2"…"12"
      : visibleMonths.map(m => m % 12 === 0 ? `${m / 12}세` : ''),
    datasets: [
      { data: p85, color: () => 'rgba(180,140,80,0.5)', strokeWidth: 1 },
      { data: p50, color: () => color, strokeWidth: 2 },
      { data: p15, color: () => 'rgba(180,140,80,0.5)', strokeWidth: 1 },
    ],
  };

  return (
    <View style={chartStyles.section}>
      <Text style={chartStyles.title}>{title}</Text>
      <View style={chartStyles.wrap}>
        <View>
          <LineChart
            data={chartData}
            width={chartW}
            height={chartH}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(90,60,20,${opacity})`,
              labelColor: (opacity = 1) => `rgba(140,110,70,${opacity})`,
              propsForDots: { r: '0' },
              propsForBackgroundLines: { strokeDasharray: '4', stroke: '#F0EAD8' },
              propsForLabels: { fontSize: isMonthly ? 8 : 11 },
            }}
            bezier
            withDots={false}
            style={{ borderRadius: 12 }}
            fromZero={false}
            yAxisSuffix={` ${unit}`}
          />
          {/* Overlay real baby data dots only */}
          <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={chartW} height={chartH}>
            {userData.map((val, idx) => val !== null ? (
              <Circle
                key={idx}
                cx={toX(idx)}
                cy={toY(val)}
                r={5}
                fill="rgba(200,50,30,1)"
                stroke="#fff"
                strokeWidth={1.5}
              />
            ) : null)}
          </Svg>
        </View>
        <Text style={chartStyles.legendText}>
          — P50 (평균) · — P15/P85 기준선 · 우리 아기 ●
        </Text>
      </View>
    </View>
  );
}
const chartStyles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '800', color: '#5A3A10', marginBottom: 10 },
  wrap: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  legendText: { fontSize: 10, color: '#A09070', textAlign: 'center', marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EDD8' },
  scroll: { padding: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5EDD8', alignItems: 'center', justifyContent: 'center' },
  profileName: {
    flex: 1, fontSize: 18, fontWeight: '700', color: '#4A3520',
    borderBottomWidth: 1.5, borderBottomColor: '#EAD9C0', paddingBottom: 4,
  },
  genderRow: { flexDirection: 'row', gap: 6 },
  genderBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    borderColor: '#EAD9C0', alignItems: 'center', justifyContent: 'center',
  },
  genderBtnGirlActive: { backgroundColor: '#FFE8F0', borderColor: '#F2A0C0' },
  genderBtnBoyActive: { backgroundColor: '#E8F0FF', borderColor: '#90B8F0' },
  subTabRow: {
    flexDirection: 'row', backgroundColor: '#FFF0B0',
    borderRadius: 12, padding: 4, gap: 3, marginBottom: 16,
  },
  subTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  subTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  subTabText: { fontSize: 11, fontWeight: '500', color: '#8A7050' },
  subTabTextActive: { color: '#C87820', fontWeight: '700' },
  whoChip: {
    backgroundColor: '#DFF0D8', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 14,
  },
  whoChipText: { fontSize: 11, fontWeight: '600', color: '#3A7040' },
  entrySubtitle: { fontSize: 13, fontWeight: '700', color: '#5A3A10', marginBottom: 12 },
  fieldLabel: { fontSize: 11, color: '#8A7050', fontWeight: '600', marginBottom: 5 },
  ageDisplay: {
    backgroundColor: '#FFF8E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: '#EAD9C0', marginBottom: 12,
  },
  ageDisplayText: { fontSize: 13, fontWeight: '700', color: '#C87820', textAlign: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#EAD9C0', backgroundColor: '#FFFDF5' },
  chipActive: { backgroundColor: '#F5C842', borderColor: '#E8A020' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#8A7050' },
  chipActiveText: { color: '#5A3A10', fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#4A3520', backgroundColor: '#FFFDF5' },
  measRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  pctRow: { flexDirection: 'row', marginBottom: 12 },
  interpCard: {},
  interpRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  interpIcon: {},
  interpTitle: { fontSize: 14, fontWeight: '700', color: '#3A3020', marginBottom: 3 },
  interpBody: { fontSize: 12, color: '#7A6050', lineHeight: 18 },
  saveBtn: {
    backgroundColor: '#F08050', borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', marginVertical: 10,
    shadowColor: '#D05830', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disclaimer: { backgroundColor: '#FFFBE8', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#F0DFA0' },
  disclaimerText: { fontSize: 11.5, color: '#8A7040', lineHeight: 18 },
  recCard: { marginBottom: 10 },
  recRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  recBadge: {
    backgroundColor: '#FFF0B0', borderRadius: 10, padding: 10,
    alignItems: 'center', minWidth: 46,
  },
  recAge: { fontSize: 17, fontWeight: '800', color: '#C87820' },
  recUnit: { fontSize: 9, color: '#8A7050' },
  recDate: { fontSize: 11, color: '#A09070', marginBottom: 5 },
  recDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  recVals: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  recDel: { padding: 6 },
  feedCard: { marginBottom: 10 },
  feedTitle: { fontSize: 15, fontWeight: '800', color: '#5A3A10', marginBottom: 2 },
  feedBasis: { fontSize: 11, color: '#A09070', marginBottom: 12 },
  feedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  feedItem: { flex: 1, alignItems: 'center', gap: 3 },
  feedItemIcon: { marginBottom: 0 },
  feedItemLabel: { fontSize: 10, color: '#A09070', fontWeight: '600', textAlign: 'center' },
  feedItemValue: { fontSize: 13, fontWeight: '800', color: '#C87820', textAlign: 'center' },
  feedDivider: { width: 1, height: 44, backgroundColor: '#F0E5D0' },
  feedNote: { fontSize: 12, color: '#6A8A50', fontWeight: '600', marginBottom: 6 },
  feedNoteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  feedDisclaimer: { fontSize: 10, color: '#B0A080' },
  // Milestone styles
  msTitle: { fontSize: 16, fontWeight: '800', color: '#5A3A10' },
  msProgress: { fontSize: 12, color: '#C87820', fontWeight: '600', marginTop: 2 },
  msBarTrack: { height: 7, backgroundColor: '#F0EBE0', borderRadius: 4, overflow: 'hidden' },
  msBarFill: { height: '100%', backgroundColor: '#F5C842', borderRadius: 4 },
  msCheckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F5EDD8',
  },
  msCheckRowDone: { opacity: 0.65 },
  msCheckBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#D0C0A0', backgroundColor: '#FFFDF5',
    alignItems: 'center', justifyContent: 'center',
  },
  msCheckBoxDone: { backgroundColor: '#7DC87A', borderColor: '#5AB060' },
  msCheckText: { flex: 1, fontSize: 13.5, color: '#4A3520', fontWeight: '500' },
  msCheckTextDone: { textDecorationLine: 'line-through', color: '#A09070' },
  msCelebCard: { backgroundColor: '#FFF8E0', borderWidth: 2, borderColor: '#F5C842', marginBottom: 14 },
  msCelebTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  msCelebTitle: { fontSize: 17, fontWeight: '800', color: '#C87820' },
  msCelebBody: { fontSize: 13, color: '#7A6050', lineHeight: 20, marginBottom: 14 },
  msCelebBtn: {
    backgroundColor: '#F08050', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#D05830', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  msCelebBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  msTipText: { fontSize: 12.5, color: '#6A5A40', lineHeight: 22 },
  playCard: {
    backgroundColor: '#FFFDF5', borderRadius: 10, padding: 11,
    marginBottom: 8, borderWidth: 1, borderColor: '#EDE0C8',
  },
  playCardToy: {
    backgroundColor: '#FFF8E0', borderColor: '#F5C842',
  },
  playHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  playEmoji: { fontSize: 18 },
  playTitle: { fontSize: 13, fontWeight: '800', color: '#5A3A10' },
  playTitleToy: { color: '#C87820' },
  playDesc: { fontSize: 12, color: '#7A6050', lineHeight: 19 },
});
