// src/screens/AlbumScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Modal, Dimensions, Alert, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { AppHeader, EmptyState, COLORS } from '../components/UI';
import { getAlbum, deleteAlbumRecord } from '../utils/storage';

const { width: SW } = Dimensions.get('window');

const MONTH_EMOJIS = ['🍼','🌱','🌸','🌼','🌻','🌾','🍂','🍁','❄️','⛄','🌈','🌙','🎂'];

// iOS documentDirectory UUID가 앱 재시작마다 바뀔 수 있어서
// 저장된 경로에서 파일명만 추출해 현재 경로로 재조합
async function resolveUri(record) {
  if (!record.uri) return null;
  const fileName = record.fileName || record.uri.split('/').pop();
  const uri = FileSystem.documentDirectory + fileName;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}

export default function AlbumScreen() {
  const insets = useSafeAreaInsets();
  const [album, setAlbum] = useState([]);
  const [resolvedUris, setResolvedUris] = useState({});
  const [lightboxUri, setLightboxUri] = useState(null);
  const [lightboxRecord, setLightboxRecord] = useState(null);

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
      Alert.alert('저장 완료! 📸', '사진첩에 저장되었어요!');
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  // Group by month
  const byMonth = {};
  album.forEach(r => {
    if (!byMonth[r.month]) byMonth[r.month] = [];
    byMonth[r.month].push(r);
  });
  const sortedMonths = Object.keys(byMonth).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="📖 앨범" subtitle="매달 성장보고서 모음" />

      {album.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="아직 앨범이 비어있어요!"
          subtitle={"카드 만들기에서 성장보고서를 저장하면\n여기에 쌓여요 🎨"}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Month timeline strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
            {sortedMonths.map(mo => (
              <TouchableOpacity key={mo} style={styles.timelinePill}>
                <Text style={styles.timelinePillText}>{MONTH_EMOJIS[parseInt(mo)] || '🍼'} {mo}개월</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {sortedMonths.map(mo => (
            <View key={mo} style={styles.monthSection}>
              <View style={styles.monthLabel}>
                <Text style={styles.monthEmoji}>{MONTH_EMOJIS[parseInt(mo)] || '🍼'}</Text>
                <Text style={styles.monthText}>{mo}개월</Text>
              </View>
              {byMonth[mo].map(record => (
                <TouchableOpacity
                  key={record.id}
                  style={styles.thumb}
                  onPress={() => { setLightboxUri(resolvedUris[record.id]); setLightboxRecord(record); }}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: resolvedUris[record.id] }} style={styles.thumbImg} resizeMode="cover" />
                  <View style={styles.thumbOverlay}>
                    <Text style={styles.thumbName}>{record.name} {record.month}개월</Text>
                    <Text style={styles.thumbDate}>{record.date}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.thumbDelete}
                    onPress={() => handleDelete(record.id)}
                  >
                    <Text style={{ color: '#fff', fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => { setLightboxUri(null); setLightboxRecord(null); }}>
        <TouchableOpacity style={styles.lbBg} activeOpacity={1} onPress={() => { setLightboxUri(null); setLightboxRecord(null); }}>
          <View style={styles.lbInner} onStartShouldSetResponder={() => true}>
            {lightboxUri ? (
              <Image source={{ uri: lightboxUri }} style={styles.lbImg} resizeMode="contain" />
            ) : null}
            <View style={styles.lbButtons}>
              <TouchableOpacity style={styles.lbBtn} onPress={() => handleDownload(lightboxUri)}>
                <Text style={styles.lbBtnText}>💾 사진첩에 저장</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.lbBtn, { backgroundColor: '#DDD', marginLeft: 10 }]} onPress={() => { setLightboxUri(null); setLightboxRecord(null); }}>
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
  scroll: { padding: 16 },
  timeline: { marginBottom: 16 },
  timelinePill: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  timelinePillText: { fontSize: 13, fontWeight: '600', color: '#C87820' },
  monthSection: { marginBottom: 24 },
  monthLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  monthEmoji: { fontSize: 26 },
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
  lbBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  lbInner: { width: '100%', maxWidth: 440 },
  lbImg: { width: '100%', height: SW * 1.15, borderRadius: 20 },
  lbButtons: { flexDirection: 'row', marginTop: 14, justifyContent: 'center' },
  lbBtn: {
    flex: 1, paddingVertical: 13, backgroundColor: '#7DC87A', borderRadius: 12, alignItems: 'center',
  },
  lbBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
