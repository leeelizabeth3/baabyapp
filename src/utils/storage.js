// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ALBUM: 'babyAlbum_v1',
  GROWTH: 'babyGrowth_v1',
  BABY_PROFILE: 'babyProfile_v1',
  MILESTONE_CHECKS: 'milestoneChecks_v1',
  FIRST_YEAR_PHOTOS: 'firstYearPhotos_v1',
  FIRST_YEAR_PROFILE: 'firstYearProfile_v1',
  JOURNAL: 'babyJournal_v1',
};

// ── Baby Profile ──────────────────────────────
export async function getBabyProfile() {
  try {
    const json = await AsyncStorage.getItem(KEYS.BABY_PROFILE);
    return json ? JSON.parse(json) : { name: '', gender: 'girl', birthdate: '' };
  } catch { return { name: '', gender: 'girl', birthdate: '' }; }
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

// ── Milestone Checks ──────────────────────────
// checks: { "4_c0": true, "4_c2": true, ... }  (month_itemId)
export async function getMilestoneChecks() {
  try {
    const json = await AsyncStorage.getItem(KEYS.MILESTONE_CHECKS);
    return json ? JSON.parse(json) : {};
  } catch { return {}; }
}

export async function toggleMilestoneCheck(month, itemId) {
  try {
    const checks = await getMilestoneChecks();
    const key = `${month}_${itemId}`;
    if (checks[key]) delete checks[key];
    else checks[key] = true;
    await AsyncStorage.setItem(KEYS.MILESTONE_CHECKS, JSON.stringify(checks));
    return checks;
  } catch (e) { console.error(e); return {}; }
}

// ── First Year Collage ─────────────────────────
// photos: { "0": "firstyear_0_xxx.jpg", "center": "firstyear_center_xxx.jpg", ... }
export async function getFirstYearPhotos() {
  try {
    const json = await AsyncStorage.getItem(KEYS.FIRST_YEAR_PHOTOS);
    return json ? JSON.parse(json) : {};
  } catch { return {}; }
}

export async function saveFirstYearPhoto(slotKey, fileName) {
  try {
    const photos = await getFirstYearPhotos();
    photos[String(slotKey)] = fileName;
    await AsyncStorage.setItem(KEYS.FIRST_YEAR_PHOTOS, JSON.stringify(photos));
    return photos;
  } catch (e) { console.error(e); return {}; }
}

export async function getFirstYearProfile() {
  try {
    const json = await AsyncStorage.getItem(KEYS.FIRST_YEAR_PROFILE);
    return json ? JSON.parse(json) : { name: '', birthdate: '', bgColor: '#F5EDD8' };
  } catch { return { name: '', birthdate: '', bgColor: '#F5EDD8' }; }
}

export async function saveFirstYearProfile(profile) {
  try {
    await AsyncStorage.setItem(KEYS.FIRST_YEAR_PROFILE, JSON.stringify(profile));
  } catch (e) { console.error(e); }
}

// ── Journal ────────────────────────────────────
// entries: [{ id, date, title, text, mood }, ...]  sorted newest first
export async function getJournalEntries() {
  try {
    const json = await AsyncStorage.getItem(KEYS.JOURNAL);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function saveJournalEntry(entry) {
  try {
    const entries = await getJournalEntries();
    entries.unshift(entry);
    entries.sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(KEYS.JOURNAL, JSON.stringify(entries));
    return entries;
  } catch (e) { console.error(e); return []; }
}

export async function updateJournalEntry(updated) {
  try {
    const entries = await getJournalEntries();
    const idx = entries.findIndex(e => e.id === updated.id);
    if (idx >= 0) entries[idx] = updated;
    entries.sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(KEYS.JOURNAL, JSON.stringify(entries));
    return entries;
  } catch (e) { console.error(e); return []; }
}

export async function deleteJournalEntry(id) {
  try {
    const entries = await getJournalEntries();
    const updated = entries.filter(e => e.id !== id);
    await AsyncStorage.setItem(KEYS.JOURNAL, JSON.stringify(updated));
    return updated;
  } catch (e) { console.error(e); return []; }
}
