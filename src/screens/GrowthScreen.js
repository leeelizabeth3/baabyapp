// src/screens/GrowthScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

import { AppHeader, Card, SectionTitle, PrimaryButton, COLORS } from '../components/UI';
import { WHO_WEIGHT, WHO_HEIGHT, WHO_HEAD, getPercentile, getZone, PCT_MARKS } from '../data/whoData';
import { getGrowthRecords, saveGrowthRecord, deleteGrowthRecord, getBabyProfile, saveBabyProfile } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const MONTHS = Array.from({ length: 13 }, (_, i) => i);
const MONTH_OPTIONS = MONTHS.map(m => ({ label: `${m}개월`, value: String(m) }));

export default function GrowthScreen() {
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState('entry');
  const [babyName, setBabyName] = useState('');
  const [gender, setGender] = useState('girl');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [measDate, setMeasDate] = useState(new Date().toISOString().split('T')[0]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [head, setHead] = useState('');
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getBabyProfile().then(p => { setBabyName(p.name || ''); setGender(p.gender || 'girl'); });
      getGrowthRecords().then(setRecords);
    }, [])
  );

  const updateProfile = async (field, val) => {
    const profile = { name: babyName, gender };
    profile[field] = val;
    await saveBabyProfile(profile);
  };

  const calcPercentiles = () => {
    if (!selectedMonth) { Alert.alert('개월 수를 선택해주세요!'); return; }
    const mo = parseInt(selectedMonth);
    const h = parseFloat(height), w = parseFloat(weight), hc = parseFloat(head);
    if (isNaN(h) && isNaN(w) && isNaN(hc)) {
      Alert.alert('최소 한 가지 측정값을 입력해주세요!'); return;
    }
    const pH  = !isNaN(h)  ? getPercentile(h,  mo, gender, WHO_HEIGHT) : null;
    const pW  = !isNaN(w)  ? getPercentile(w,  mo, gender, WHO_WEIGHT) : null;
    const pHC = !isNaN(hc) ? getPercentile(hc, mo, gender, WHO_HEAD)   : null;

    const all = [pH, pW, pHC].filter(p => p !== null);
    let icon, title, body;
    if (all.some(p => p < 3 || p > 97)) {
      icon = '⚠️'; title = '소아과 상담을 권장해요';
      body = 'P3 미만 또는 P97 초과 수치가 있어요. KKH·NUH 소아과에서 상담받아 보세요.';
    } else if (all.some(p => p < 15)) {
      icon = '💙'; title = '조금 작은 편이에요';
      body = '평균보다 작지만 정상 범위 안에 있어요. 꾸준한 수유와 영양이 중요해요!';
    } else if (all.some(p => p > 85)) {
      icon = '🌟'; title = '씩씩하게 자라고 있어요!';
      body = '또래보다 큰 편이에요. 건강하게 성장하고 있답니다.';
    } else {
      icon = '💚'; title = '아주 잘 자라고 있어요! 🎉';
      body = 'WHO 기준 정상 범위(P15~P85) 안에 있어요. 건강하게 쑥쑥 크고 있네요!';
    }
    setResult({
      mo, h: isNaN(h) ? null : h, w: isNaN(w) ? null : w, hc: isNaN(hc) ? null : hc,
      pH, pW, pHC, icon, title, body,
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
    Alert.alert('저장 완료! 📋', '기록이 저장되었어요!');
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
      <AppHeader title="📈 성장 추적" subtitle="WHO 기준 백분위수" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Baby profile */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileAvatar}>👶</Text>
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
                <Text>👧</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, gender === 'boy' && styles.genderBtnBoyActive]}
                onPress={() => { setGender('boy'); updateProfile('gender', 'boy'); }}
              >
                <Text>👦</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Sub-tabs */}
        <View style={styles.subTabRow}>
          {[['entry','📏 측정 입력'], ['history','📋 기록'], ['chart','📈 그래프']].map(([key, label]) => (
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
              <Text style={styles.whoChipText}>✅ WHO Child Growth Standards 기준</Text>
            </View>

            <Card>
              <Text style={styles.entrySubtitle}>📅 측정 정보</Text>
              {/* Month selector */}
              <Text style={styles.fieldLabel}>개월 수</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {MONTH_OPTIONS.map(m => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.chip, selectedMonth === m.value && styles.chipActive]}
                      onPress={() => setSelectedMonth(m.value)}
                    >
                      <Text style={[styles.chipText, selectedMonth === m.value && styles.chipActiveText]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

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
                <MeasField emoji="📐" label="키" value={height} onChange={setHeight} unit="cm" />
                <MeasField emoji="⚖️" label="몸무게" value={weight} onChange={setWeight} unit="kg" />
                <MeasField emoji="🧠" label="머리둘레" value={head} onChange={setHead} unit="cm" />
              </View>

              <PrimaryButton onPress={calcPercentiles}>백분위수 계산하기 →</PrimaryButton>
            </Card>

            {/* Result */}
            {result && (
              <>
                <View style={styles.pctRow}>
                  <PctCard emoji="📐" label="키" value={result.h} unit="cm" pct={result.pH} />
                  <PctCard emoji="⚖️" label="몸무게" value={result.w} unit="kg" pct={result.pW} />
                  <PctCard emoji="🧠" label="머리둘레" value={result.hc} unit="cm" pct={result.pHC} />
                </View>

                <Card style={styles.interpCard}>
                  <View style={styles.interpRow}>
                    <Text style={styles.interpIcon}>{result.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.interpTitle}>{result.title}</Text>
                      <Text style={styles.interpBody}>{result.body}</Text>
                    </View>
                  </View>
                </Card>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>📋 기록 저장하기</Text>
                </TouchableOpacity>

                <View style={styles.disclaimer}>
                  <Text style={styles.disclaimerText}>
                    ⚠️ WHO 기준 참고용. P3 미만 또는 P97 초과 시 KKH·NUH 소아과 상담 권장.
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        {/* ── HISTORY ── */}
        {subTab === 'history' && (
          records.length === 0
            ? <View style={{ marginTop: 40 }}>
                <Text style={{ textAlign: 'center', fontSize: 48 }}>📏</Text>
                <Text style={{ textAlign: 'center', color: '#A09070', marginTop: 12, fontSize: 14 }}>
                  아직 저장된 기록이 없어요{'\n'}첫 번째 측정을 입력해보세요!
                </Text>
              </View>
            : records.map(r => (
                <Card key={r.id} style={styles.recCard}>
                  <View style={styles.recRow}>
                    <View style={styles.recBadge}>
                      <Text style={styles.recAge}>{r.month}</Text>
                      <Text style={styles.recUnit}>개월</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recDate}>{r.date} · {r.sex === 'girl' ? '👧' : '👦'} {r.name}</Text>
                      <View style={styles.recVals}>
                        {r.h !== null && <RecVal icon="📐" val={`${r.h}cm`} pct={r.pH} />}
                        {r.w !== null && <RecVal icon="⚖️" val={`${r.w}kg`} pct={r.pW} />}
                        {r.hc !== null && <RecVal icon="🧠" val={`${r.hc}cm`} pct={r.pHC} />}
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
        {subTab === 'chart' && (
          <>
            <GrowthChart title="⚖️ 몸무게" table={WHO_WEIGHT} field="w" gender={gender} records={records} color="#E8823A" unit="kg" />
            <GrowthChart title="📐 키" table={WHO_HEIGHT} field="h" gender={gender} records={records} color="#7DC87A" unit="cm" />
            <GrowthChart title="🧠 머리둘레" table={WHO_HEAD} field="hc" gender={gender} records={records} color="#7AB8DC" unit="cm" />
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                WHO P3·P15·P50(평균)·P85·P97 기준선 / 빨간 점 = 우리 아기
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────

function MeasField({ emoji, label, value, onChange, unit }) {
  return (
    <View style={measStyles.wrap}>
      <Text style={measStyles.emoji}>{emoji}</Text>
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
  emoji: { fontSize: 20, marginBottom: 3 },
  label: { fontSize: 10, color: '#8A7050', fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10,
    width: '100%', padding: 8, fontSize: 18, fontWeight: '700',
    textAlign: 'center', backgroundColor: '#FFFDF5', color: '#4A3520',
  },
  unit: { fontSize: 10, color: '#A09070', marginTop: 3 },
});

function PctCard({ emoji, label, value, unit, pct }) {
  const zone = pct !== null ? getZone(pct) : 'normal';
  const barColor = zone === 'low' ? '#7AB8DC' : zone === 'high' ? '#F08050' : '#7DC87A';
  const textColor = zone === 'low' ? '#2A70A0' : zone === 'high' ? '#C05020' : '#2A8030';
  return (
    <View style={pctStyles.card}>
      <Text style={pctStyles.emoji}>{emoji}</Text>
      <Text style={pctStyles.label}>{label}</Text>
      <Text style={pctStyles.val}>{value !== null ? value : '--'}</Text>
      <Text style={pctStyles.unit}>{unit}</Text>
      <View style={pctStyles.barTrack}>
        <View style={[pctStyles.barFill, { width: pct !== null ? `${Math.min(100, pct)}%` : '0%', backgroundColor: barColor }]} />
      </View>
      <Text style={[pctStyles.pctText, { color: textColor }]}>{pct !== null ? `P${pct}` : '--'}</Text>
    </View>
  );
}
const pctStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 13, padding: 10,
    alignItems: 'center', marginHorizontal: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  emoji: { fontSize: 20, marginBottom: 3 },
  label: { fontSize: 10, color: '#A09070', fontWeight: '600', marginBottom: 2 },
  val: { fontSize: 18, fontWeight: '800', color: '#4A3520', lineHeight: 22 },
  unit: { fontSize: 10, color: '#8A7050', marginBottom: 6 },
  barTrack: { width: '100%', height: 5, backgroundColor: '#F0EBE0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: 13, fontWeight: '800' },
});

function RecVal({ icon, val, pct }) {
  return (
    <View style={{ marginRight: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#4A3520' }}>{icon} {val}</Text>
      {pct !== null && <Text style={{ fontSize: 11, color: '#8A7050' }}>P{pct}</Text>}
    </View>
  );
}

function GrowthChart({ title, table, field, gender, records, color, unit }) {
  const months = Array.from({ length: 13 }, (_, i) => i);

  const p50 = months.map(m => table[gender][m][2]);
  const p15 = months.map(m => table[gender][m][1]);
  const p85 = months.map(m => table[gender][m][3]);

  // User data (null → undefined for gaps)
  const userData = months.map(m => {
    const r = [...records].reverse().find(rec => rec.month === m && rec[field] !== null);
    return r ? r[field] : undefined;
  });

  // Build chart datasets — only showing P15, P50, P85, and baby for clarity
  const allVals = [...p15, ...p50, ...p85, ...userData.filter(v => v !== undefined)];
  const minVal = Math.min(...allVals) - 1;
  const maxVal = Math.max(...allVals) + 1;

  const chartData = {
    labels: months.map(m => m === 0 || m % 3 === 0 ? `${m}m` : ''),
    datasets: [
      { data: p85, color: () => 'rgba(180,140,80,0.5)', strokeWidth: 1 },
      { data: p50, color: () => color, strokeWidth: 2 },
      { data: p15, color: () => 'rgba(180,140,80,0.5)', strokeWidth: 1 },
      {
        data: userData.map(v => v ?? p50[0]), // fill nulls with p50 for chart (won't render without data)
        color: (opacity = 1) => `rgba(200,50,30,${opacity})`,
        strokeWidth: 0,
      },
    ],
  };

  return (
    <View style={chartStyles.section}>
      <Text style={chartStyles.title}>{title}</Text>
      <View style={chartStyles.wrap}>
        <LineChart
          data={chartData}
          width={SW - 52}
          height={200}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(90,60,20,${opacity})`,
            labelColor: (opacity = 1) => `rgba(140,110,70,${opacity})`,
            propsForDots: { r: '4', strokeWidth: '0' },
            propsForBackgroundLines: { strokeDasharray: '4', stroke: '#F0EAD8' },
          }}
          bezier
          withDots={false}
          style={{ borderRadius: 12 }}
          fromZero={false}
          yAxisSuffix={` ${unit}`}
        />
        {/* Overlay our baby's dots manually */}
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
  profileAvatar: { fontSize: 36 },
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
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#EAD9C0', backgroundColor: '#FFFDF5' },
  chipActive: { backgroundColor: '#F5C842', borderColor: '#E8A020' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#8A7050' },
  chipActiveText: { color: '#5A3A10', fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: '#EAD9C0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#4A3520', backgroundColor: '#FFFDF5' },
  measRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  pctRow: { flexDirection: 'row', marginBottom: 12 },
  interpCard: {},
  interpRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  interpIcon: { fontSize: 24 },
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
  recVals: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  recDel: { padding: 6 },
});
