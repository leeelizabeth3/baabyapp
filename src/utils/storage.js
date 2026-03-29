// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ALBUM: 'babyAlbum_v1',
  GROWTH: 'babyGrowth_v1',
  BABY_PROFILE: 'babyProfile_v1',
};

// ── Baby Profile ──────────────────────────────
export async function getBabyProfile() {
  try {
    const json = await AsyncStorage.getItem(KEYS.BABY_PROFILE);
    return json ? JSON.parse(json) : { name: '', gender: 'girl' };
  } catch { return { name: '', gender: 'girl' }; }
}

export async function saveBabyProfile(profile) {
  try {
    await AsyncStorage.setItem(KEYS.BABY_PROFILE, JSON.stringify(profile));
  } catch (e) { console.error(e); }
}

// ── Album ─────────────────────────────────────
export async function getAlbum() {
  try {
    const json = await AsyncStorage.getItem(KEYS.ALBUM);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function saveAlbumRecord(record) {
  try {
    const album = await getAlbum();
    const idx = album.findIndex(r => r.month === record.month && r.name === record.name);
    if (idx >= 0) album[idx] = record;
    else album.push(record);
    album.sort((a, b) => a.month - b.month);
    await AsyncStorage.setItem(KEYS.ALBUM, JSON.stringify(album));
    return album;
  } catch (e) { console.error(e); return []; }
}

export async function deleteAlbumRecord(id) {
  try {
    const album = await getAlbum();
    const updated = album.filter(r => r.id !== id);
    await AsyncStorage.setItem(KEYS.ALBUM, JSON.stringify(updated));
    return updated;
  } catch (e) { console.error(e); return []; }
}

// ── Growth Records ────────────────────────────
export async function getGrowthRecords() {
  try {
    const json = await AsyncStorage.getItem(KEYS.GROWTH);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function saveGrowthRecord(record) {
  try {
    const records = await getGrowthRecords();
    records.unshift(record);
    await AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(records));
    return records;
  } catch (e) { console.error(e); return []; }
}

export async function deleteGrowthRecord(id) {
  try {
    const records = await getGrowthRecords();
    const updated = records.filter(r => r.id !== id);
    await AsyncStorage.setItem(KEYS.GROWTH, JSON.stringify(updated));
    return updated;
  } catch (e) { console.error(e); return []; }
}
