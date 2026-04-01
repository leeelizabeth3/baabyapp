// src/components/UI.js
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';

export const COLORS = {
  yellow: '#FFE070',
  yellowDark: '#E8A020',
  coral: '#C87820',
  bg: '#F5EDD8',
  white: '#FFFFFF',
  text: '#4A3520',
  textLight: '#8A7050',
  textMid: '#6A5030',
  border: '#EAD9C0',
  tagBg: '#F5C842',
  tagText: '#7A4A10',
};

// ── AppHeader ──────────────────────────────────
export function AppHeader({ title = '🐝 아기 성장보고서', subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
    </View>
  );
}

// ── SectionTitle ───────────────────────────────
export function SectionTitle({ children }) {
  return (
    <View style={styles.secTitleWrap}>
      <Text style={styles.secTitle}>{children}</Text>
    </View>
  );
}

// ── Card (white rounded box) ───────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── PrimaryButton ──────────────────────────────
export function PrimaryButton({ onPress, children, color = COLORS.yellowDark, textColor = COLORS.text, style, loading }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: color }, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.primaryBtnText, { color: textColor }]}>{children}</Text>
      }
    </TouchableOpacity>
  );
}

// ── SecondaryButton ────────────────────────────
export function SecondaryButton({ onPress, children, style }) {
  return (
    <TouchableOpacity style={[styles.secondaryBtn, style]} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.secondaryBtnText}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── FormField ─────────────────────────────────
export function FormField({ label, children, style }) {
  return (
    <View style={[styles.formField, style]}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      {children}
    </View>
  );
}

// ── StyledInput ───────────────────────────────
export function StyledInput({ multiline, numberOfLines, ...props }) {
  return (
    <TextInput
      style={[styles.input, multiline && { minHeight: numberOfLines ? numberOfLines * 22 + 16 : 70, textAlignVertical: 'top' }]}
      placeholderTextColor="#B0A080"
      multiline={multiline}
      numberOfLines={numberOfLines}
      editable={true}
      pointerEvents="auto"
      underlineColorAndroid="transparent"
      {...props}
    />
  );
}

// ── RowField ──────────────────────────────────
export function RowFields({ children }) {
  return <View style={styles.rowFields}>{children}</View>;
}

// ── Tag badge ─────────────────────────────────
export function Tag({ children, bg = COLORS.tagBg, color = COLORS.tagText }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{children}</Text>
    </View>
  );
}

// ── Empty state ───────────────────────────────
export function EmptyState({ emoji, title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
    </View>
  );
}

// ── Picker Row (select replacement) ───────────
export function PickerRow({ label, value, options, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pickerChip, value === opt.value && styles.pickerChipActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.pickerChipText, value === opt.value && styles.pickerChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFE070',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5A3A10',
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 12, color: '#8A6830', marginTop: 2 },
  secTitleWrap: {
    backgroundColor: '#F5C842',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  secTitle: { fontSize: 13, fontWeight: '700', color: '#7A4A10' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  primaryBtn: {
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 6,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#7DC87A',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  formField: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: '#8A7050', fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#EAD9C0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#4A3520',
    backgroundColor: '#FFFDF5',
  },
  rowFields: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  tagText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#8A7050', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#A09070', textAlign: 'center', lineHeight: 20 },
  pickerChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#EAD9C0', backgroundColor: '#FFFDF5',
  },
  pickerChipActive: { backgroundColor: '#F5C842', borderColor: '#E8A020' },
  pickerChipText: { fontSize: 12, fontWeight: '500', color: '#8A7050' },
  pickerChipTextActive: { color: '#5A3A10', fontWeight: '700' },
});
