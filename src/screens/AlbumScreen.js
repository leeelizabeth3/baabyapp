// src/screens/AlbumScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Modal, Dimensions, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, COLORS } from '../components/UI';
import { getAlbum, deleteAlbumRecord } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const GRID_CELL = (SW - 32 - 6) / 2; // 2 cols, 16px side padding, 6px gap

// 계절별 아이콘 + 색상
function getMonthMeta(month) {
  const m = parseInt(month);
  if (m <= 2)  return { icon: 'water-outline',  color: '#70BADB' };
  if (m <= 5)  return { icon: 'flower-outline', color: '#E897C5' };
  if (m <= 8)  return { icon: 'sunny-outline',  color: '#F5A623' };
  return { icon: 'leaf-outline', color: '#C87820' };
}

async function resolveUri(record) {
  if (!record.uri) return null;
  const fileName = record.fileName || record.uri.split('/').pop();
  const uri = FileSystem.documentDirectory + fileName;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}

export default function AlbumScreen() {
  const insets = useSafeAreaInsets();
  const [album,        setAlbum]        = useState([]);
  const [resolvedUris, setResolvedUris] = useState({});
  const [lightboxUri,  setLightboxUri]  = useState(null);
  const [lightboxRec,  setLightboxRec]  = useState(null);
  const [viewMode,     setViewMode]     = useState('list'); // 'list' | 'grid'

  useFocusEffect(
    useCallback(() => {
      getAlbum().then(async (records) => {
        setAlbum(records);
        const uris = {};
        await Promise.all(records.map(async (r) => {
          uris[r.id] = await resolveUri(r);
        }));
        setResolvedUris(uris);
      });
    }, [])
  );

  const openLightbox = (record) => {
    setLightboxUri(resolvedUris[record.id]);
    setLightboxRec(record);
  };

  const closeLightbox = () => { setLightboxUri(null); setLightboxRec(null); };

  const handleDelete = (id) => {
    Alert.alert('삭제하기', '이 카드를 앨범에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = await deleteAlbumRecord(id);
          setAlbum(updated);
          setResolvedUris(prev => { const next = { ...prev }; delete next[id]; return next; });
        },
      },
    ]);
  };

  const handleDownload = async (uri) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('권한 필요', '사진첩 권한이 필요합니다.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '사진첩에 저장되었어요!');
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  // 월별 그룹
  const byMonth = {};
  album.forEach(r => {
    if (!byMonth[r.month]) byMonth[r.month] = [];
    byMonth[r.month].push(r);
  });
  const sortedMonths = Object.keys(byMonth).sort((a, b) => parseInt(a) - parseInt(b));

  // ── 빈 상태
  if (album.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="앨범" subtitle="매달 성장보고서 모음" />
        <View style={styles.emptyWrap}>
          <Ionicons name="images-outline" size={64} color="#D4B896" />
          <Text style={styles.emptyTitle}>아직 앨범이 비어있어요</Text>
          <Text style={styles.emptySub}>카드 만들기에서 성장보고서를 저장하면{'\n'}여기에 쌓여요</Text>
        </View>
      </View>
    );
  }

  // ── 그리드 뷰
  const renderGrid = () => (
    <ScrollView contentContainerStyle={styles.gridScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.gridWrap}>
        {album.map(record => {
          const uri  = resolvedUris[record.id];
          const meta = getMonthMeta(record.month);
          return (
            <TouchableOpacity
              key={record.id}
              style={[styles.gridCell, { width: GRID_CELL, height: GRID_CELL }]}
              onPress={() => openLightbox(record)}
              activeOpacity={0.9}
            >
              {uri
                ? <Image source={{ uri }} style={{ width: GRID_CELL, height: GRID_CELL }} resizeMode="cover" />
                : <View style={[styles.gridEmpty, { width: GRID_CELL, height: GRID_CELL }]}><Ionicons name="image-outline" size={32} color="#DDD" /></View>
              }
              <View style={styles.gridBadge}>
                <Ionicons name={meta.icon} size={9} color={meta.color} />
                <Text style={styles.gridBadgeTxt}>{record.month}개월</Text>
              </View>
              <TouchableOpacity style={styles.gridDelete} onPress={() => handleDelete(record.id)}>
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // ── 리스트 뷰
  const renderList = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* 월별 타임라인 스트립 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
        {sortedMonths.map(mo => {
          const meta = getMonthMeta(mo);
          return (
            <View key={mo} style={styles.timelinePill}>
              <Ionicons name={meta.icon} size={12} color={meta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.timelinePillText, { color: meta.color }]}>{mo}개월</Text>
            </View>
          );
        })}
      </ScrollView>

      {sortedMonths.map(mo => {
        const meta = getMonthMeta(mo);
        return (
          <View key={mo} style={styles.monthSection}>
            <View style={styles.monthLabel}>
              <Ionicons name={meta.icon} size={22} color={meta.color} />
              <Text style={styles.monthText}>{mo}개월</Text>
            </View>
            {byMonth[mo].map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.thumb}
                onPress={() => openLightbox(record)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: resolvedUris[record.id] }} style={styles.thumbImg} resizeMode="cover" />
                <View style={styles.thumbOverlay}>
                  <Text style={styles.thumbName}>{record.name} {record.month}개월</Text>
                  <Text style={styles.thumbDate}>{record.date}</Text>
                </View>
                <TouchableOpacity style={styles.thumbDelete} onPress={() => handleDelete(record.id)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
      <View style={{ height: 30 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="앨범" subtitle="매달 성장보고서 모음" />

      {/* 뷰 모드 토글 */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnOn]}
        >
          <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? '#C87820' : '#A09070'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('grid')}
          style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnOn]}
        >
          <Ionicons name="grid-outline" size={18} color={viewMode === 'grid' ? '#C87820' : '#A09070'} />
        </TouchableOpacity>
        <Text style={styles.countTxt}>{album.length}장</Text>
      </View>

      {viewMode === 'grid' ? renderGrid() : renderList()}

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={closeLightbox}>
        <TouchableOpacity style={styles.lbBg} activeOpacity={1} onPress={closeLightbox}>
          <View style={styles.lbInner} onStartShouldSetResponder={() => true}>
            {lightboxUri && (
              <Image source={{ uri: lightboxUri }} style={styles.lbImg} resizeMode="contain" />
            )}
            <View style={styles.lbButtons}>
              <TouchableOpacity style={styles.lbBtn} onPress={() => handleDownload(lightboxUri)}>
                <Ionicons name="download-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.lbBtnText}>사진첩에 저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.lbBtn, styles.lbBtnClose]} onPress={closeLightbox}>
                <Text style={[styles.lbBtnText, { color: '#555' }]}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EDD8' },

  // 빈 상태
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#8A7050', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#A09070', textAlign: 'center', lineHeight: 20 },

  // 툴바
  toolbar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0E0C0',
  },
  toggleBtn: { padding: 8, borderRadius: 8, marginRight: 4 },
  toggleBtnOn: { backgroundColor: '#FFF3D0' },
  countTxt: { marginLeft: 'auto', fontSize: 12, color: '#A09070', fontWeight: '600' },

  // 그리드
  gridScroll: { padding: 16 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#EDE0C8' },
  gridEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE0C8' },
  gridBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  gridBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '700', marginLeft: 3 },
  gridDelete: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },

  // 리스트
  scroll: { padding: 16 },
  timeline: { marginBottom: 16 },
  timelinePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  timelinePillText: { fontSize: 13, fontWeight: '700' },
  monthSection: { marginBottom: 24 },
  monthLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  monthText: { fontSize: 20, fontWeight: '800', color: '#5A3A10' },
  thumb: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4, backgroundColor: '#fff',
  },
  thumbImg: { width: '100%', height: 220 },
  thumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, backgroundColor: 'rgba(0,0,0,0.38)',
  },
  thumbName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  thumbDate: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  thumbDelete: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },

  // Lightbox
  lbBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lbInner: { width: '100%', maxWidth: 440 },
  lbImg: { width: '100%', height: SW * 1.15, borderRadius: 20 },
  lbButtons: { flexDirection: 'row', marginTop: 14, justifyContent: 'center' },
  lbBtn: { flex: 1, paddingVertical: 13, backgroundColor: '#7DC87A', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  lbBtnClose: { backgroundColor: '#DDD', marginLeft: 10 },
  lbBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
