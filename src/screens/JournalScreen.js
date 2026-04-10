// src/screens/JournalScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppHeader } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';
import {
  getJournalEntries, saveJournalEntry, updateJournalEntry, deleteJournalEntry,
} from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const MOODS = ['😊', '😴', '😢', '😡', '🥰', '😮', '🤒', '🎉'];
const ACCENT = '#C87820';
const BG = '#FFF8E0';
const CARD_BG = '#FFFDF5';
const BORDER = '#F0E0A0';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const key = e.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

// 저장된 파일명 → 현재 documentDirectory 경로로 복원
async function resolvePhotoUri(fileName) {
  if (!fileName) return null;
  const uri = FileSystem.documentDirectory + fileName;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}

async function resolvePhotoUris(fileNames = []) {
  const results = await Promise.all(fileNames.map(resolvePhotoUri));
  return results.filter(Boolean);
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ date: todayStr(), title: '', text: '', mood: '😊', photos: [] });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewEntry, setViewEntry] = useState(null);
  const [viewPhotoUris, setViewPhotoUris] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  // formPhotoUris: local URIs for photos currently in form (resolved)
  const [formPhotoUris, setFormPhotoUris] = useState([]);

  useFocusEffect(useCallback(() => {
    getJournalEntries().then(setEntries);
  }, []));

  // ── 사진 선택 ─────────────────────────────────
  async function pickPhoto() {
    const { status, accessPrivileges } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && accessPrivileges !== 'limited') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const newFileNames = [];
    const newUris = [];
    for (const asset of result.assets) {
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `journal_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const dest = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      newFileNames.push(fileName);
      newUris.push(dest);
    }

    setForm(f => ({ ...f, photos: [...f.photos, ...newFileNames] }));
    setFormPhotoUris(prev => [...prev, ...newUris]);
  }

  function removeFormPhoto(index) {
    setForm(f => {
      const photos = [...f.photos];
      photos.splice(index, 1);
      return { ...f, photos };
    });
    setFormPhotoUris(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  // ── 일지 열기 ─────────────────────────────────
  function openNew() {
    setEditing(null);
    setForm({ date: todayStr(), title: '', text: '', mood: '😊', photos: [] });
    setFormPhotoUris([]);
    setModalVisible(true);
  }

  async function openEdit(entry) {
    setViewEntry(null);
    setEditing(entry);
    const uris = await resolvePhotoUris(entry.photos || []);
    setForm({ date: entry.date, title: entry.title, text: entry.text, mood: entry.mood, photos: entry.photos || [] });
    setFormPhotoUris(uris);
    setModalVisible(true);
  }

  async function openView(entry) {
    const uris = await resolvePhotoUris(entry.photos || []);
    setViewPhotoUris(uris);
    setViewEntry(entry);
  }

  // ── 저장 ──────────────────────────────────────
  async function handleSave() {
    if (!form.text.trim()) {
      Alert.alert('내용을 입력해 주세요');
      return;
    }
    if (editing) {
      const updated = await updateJournalEntry({ ...editing, ...form });
      setEntries(updated);
    } else {
      const entry = { id: Date.now().toString(), ...form };
      const updated = await saveJournalEntry(entry);
      setEntries(updated);
    }
    setModalVisible(false);
  }

  // ── 삭제 ──────────────────────────────────────
  async function handleDelete(id) {
    Alert.alert('일지 삭제', '이 일지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          const updated = await deleteJournalEntry(id);
          setEntries(updated);
          setViewEntry(null);
        },
      },
    ]);
  }

  // ── 카드 썸네일용 URI 훅 ──────────────────────
  function EntryCard({ entry }) {
    const [thumbUri, setThumbUri] = useState(null);
    useCallback(() => {
      if (entry.photos?.[0]) resolvePhotoUri(entry.photos[0]).then(setThumbUri);
    }, [entry.photos?.[0]])();

    React.useEffect(() => {
      if (entry.photos?.[0]) resolvePhotoUri(entry.photos[0]).then(setThumbUri);
    }, [entry.photos?.[0]]);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openView(entry)} activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <Text style={styles.cardMood}>{entry.mood}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardDate}>{formatDisplay(entry.date)}</Text>
            {entry.title ? <Text style={styles.cardTitle}>{entry.title}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color="#CCA878" />
          </TouchableOpacity>
        </View>
        {thumbUri && (
          <Image source={{ uri: thumbUri }} style={styles.cardThumb} resizeMode="cover" />
        )}
        <Text style={styles.cardText} numberOfLines={3}>{entry.text}</Text>
        {(entry.photos?.length || 0) > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="camera-outline" size={13} color={ACCENT} />
            <Text style={styles.photoCount}>사진 {entry.photos.length}장</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const groups = groupByMonth(entries);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <AppHeader title="육아 일지" subtitle="소중한 순간을 기록해요" />

      {/* Entry list */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={64} color="#D4B896" />
            <Text style={styles.emptyText}>아직 작성한 일지가 없어요{'\n'}첫 번째 일지를 써볼까요?</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
              <Text style={styles.emptyBtnText}>일지 쓰기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map(([monthKey, monthEntries]) => (
            <View key={monthKey}>
              <Text style={styles.monthLabel}>{monthLabel(monthKey)}</Text>
              {monthEntries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={openNew} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ 새 일지</Text>
      </TouchableOpacity>

      {/* Write / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.modalBox} keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.modalTitle}>{editing ? '일지 수정' : '새 일지'}</Text>

            {/* Date picker */}
            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={14} color="#6B4200" />
                <Text style={styles.dateLabel}>{formatDisplay(form.date)}</Text>
              </View>
              <Text style={styles.dateChange}>변경</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(form.date)}
                mode="date"
                display="spinner"
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) {
                    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    setForm(f => ({ ...f, date: s }));
                  }
                }}
              />
            )}

            {/* Mood */}
            <View style={styles.moodRow}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.moodBtn, form.mood === m && styles.moodBtnActive]}
                  onPress={() => setForm(f => ({ ...f, mood: m }))}
                >
                  <Text style={styles.moodEmoji}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <TextInput
              style={styles.titleInput}
              placeholder="제목 (선택)"
              placeholderTextColor="#C0A878"
              value={form.title}
              onChangeText={v => setForm(f => ({ ...f, title: v }))}
              maxLength={50}
            />

            {/* Text */}
            <TextInput
              style={styles.textInput}
              placeholder="오늘 아기와 있었던 일을 기록해 보세요..."
              placeholderTextColor="#C0A878"
              value={form.text}
              onChangeText={v => setForm(f => ({ ...f, text: v }))}
              multiline
              textAlignVertical="top"
            />

            {/* Photo section */}
            <View style={styles.photoSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {formPhotoUris.map((uri, idx) => (
                  <View key={idx} style={styles.photoThumbWrap}>
                    <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeFormPhoto(idx)}>
                      <Ionicons name="close" size={11} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto}>
                  <Ionicons name="camera-outline" size={22} color="#A08040" />
                  <Text style={styles.photoAddText}>사진 추가</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Buttons */}
            <View style={[styles.modalBtns, { marginBottom: 8 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Modal */}
      <Modal visible={!!viewEntry} animationType="fade" transparent>
        <View style={styles.viewOverlay}>
          <View style={styles.viewBox}>
            {viewEntry && (
              <>
                <View style={styles.viewHeader}>
                  <Text style={styles.viewMood}>{viewEntry.mood}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewDate}>{formatDisplay(viewEntry.date)}</Text>
                    {viewEntry.title ? <Text style={styles.viewTitle}>{viewEntry.title}</Text> : null}
                  </View>
                </View>
                <ScrollView style={styles.viewScroll} showsVerticalScrollIndicator={false}>
                  {/* Photos */}
                  {viewPhotoUris.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.viewPhotoScroll}>
                      {viewPhotoUris.map((uri, idx) => (
                        <TouchableOpacity key={idx} onPress={() => setLightbox(uri)} activeOpacity={0.85}>
                          <Image source={{ uri }} style={styles.viewPhotoThumb} resizeMode="cover" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <Text style={styles.viewText}>{viewEntry.text}</Text>
                </ScrollView>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setViewEntry(null)}>
                    <Text style={styles.cancelBtnText}>닫기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={() => openEdit(viewEntry)}>
                    <Text style={styles.saveBtnText}>수정</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade">
        <TouchableOpacity style={styles.lbBg} activeOpacity={1} onPress={() => setLightbox(null)}>
          <Image source={{ uri: lightbox }} style={styles.lbImg} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  headerWrap: { position: 'relative' },
  fab: {
    position: 'absolute', alignSelf: 'center', left: 24, right: 24,
    backgroundColor: '#C87820', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#C87820', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64 },
  emptyText: { fontSize: 15, color: '#9A7840', textAlign: 'center', marginTop: 12, lineHeight: 24 },
  emptyBtn: { marginTop: 20, backgroundColor: ACCENT, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 24 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: ACCENT, marginTop: 16, marginBottom: 6, marginLeft: 2 },
  card: {
    backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1.5,
    borderColor: BORDER, padding: 14, marginBottom: 10,
    shadowColor: '#C8A050', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  cardMood: { fontSize: 28, marginRight: 10 },
  cardMeta: { flex: 1 },
  cardDate: { fontSize: 12, color: '#A08040' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#6B4200', marginTop: 2 },
  cardThumb: { width: '100%', height: 160, borderRadius: 10, marginBottom: 8 },
  cardText: { fontSize: 14, color: '#5A4020', lineHeight: 20 },
  photoCount: { fontSize: 12, color: ACCENT, marginTop: 4 },
  deleteBtn: { fontSize: 18, padding: 2 },
  // Write modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#FFFDF5', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#6B4200', textAlign: 'center', marginBottom: 14 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF3C8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  dateLabel: { fontSize: 14, color: '#6B4200', fontWeight: '600' },
  dateChange: { fontSize: 13, color: ACCENT, fontWeight: '600' },
  moodRow: { flexDirection: 'row', marginBottom: 10, gap: 6 },
  moodBtn: { borderRadius: 8, padding: 4, borderWidth: 1.5, borderColor: 'transparent' },
  moodBtnActive: { borderColor: ACCENT, backgroundColor: '#FFF0C0' },
  moodEmoji: { fontSize: 24 },
  titleInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15,
    color: '#5A4020', marginBottom: 8, backgroundColor: '#FFFBE8',
  },
  textInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#5A4020', height: 140, backgroundColor: '#FFFBE8', marginBottom: 10,
  },
  // Photos
  photoSection: { marginBottom: 14 },
  photoScroll: { flexDirection: 'row' },
  photoThumbWrap: { position: 'relative', marginRight: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
    borderRadius: 10, backgroundColor: '#E05050', alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoAddBtn: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E0',
  },
  photoAddIcon: { fontSize: 22 },
  photoAddText: { fontSize: 11, color: '#A08040', marginTop: 2 },
  // Buttons
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#9A7840', fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, borderRadius: 12, backgroundColor: ACCENT, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // View modal
  viewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  viewBox: { backgroundColor: '#FFFDF5', borderRadius: 20, padding: 20, width: '100%', maxHeight: '85%' },
  viewHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  viewMood: { fontSize: 36, marginRight: 12 },
  viewDate: { fontSize: 13, color: '#A08040' },
  viewTitle: { fontSize: 17, fontWeight: '700', color: '#6B4200', marginTop: 4 },
  viewScroll: { maxHeight: 400, marginBottom: 16 },
  viewPhotoScroll: { marginBottom: 10 },
  viewPhotoThumb: { width: SW * 0.6, height: 180, borderRadius: 12, marginRight: 8 },
  viewText: { fontSize: 15, color: '#5A4020', lineHeight: 24 },
  // Lightbox
  lbBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lbImg: { width: SW, height: SW * 1.3 },
});
