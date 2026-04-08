// src/components/SproutMascot.js
// 새싹 캐릭터 — 앱 정체성 마스코트
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * SproutMascot
 * @param {number} size   - 너비 기준 크기 (기본 80)
 * @param {'happy'|'sleeping'|'excited'} expression
 */
export default function SproutMascot({ size = 80, expression = 'happy' }) {
  const h = size * 1.18;

  const eyes = {
    happy: (
      <>
        {/* 왼쪽 눈 */}
        <Circle cx="40" cy="57" r="3.5" fill="#3D2810" />
        <Circle cx="41.3" cy="55.8" r="1.1" fill="#FFF" />
        {/* 오른쪽 눈 */}
        <Circle cx="60" cy="57" r="3.5" fill="#3D2810" />
        <Circle cx="61.3" cy="55.8" r="1.1" fill="#FFF" />
      </>
    ),
    sleeping: (
      <>
        {/* 반달 눈 (감은 눈) */}
        <Path d="M 36.5 57 Q 40 53.5 43.5 57" stroke="#3D2810" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Path d="M 56.5 57 Q 60 53.5 63.5 57" stroke="#3D2810" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>
    ),
    excited: (
      <>
        {/* 반짝 눈 ✦ */}
        <Path d="M 40 53 L 41 57 L 44 56 L 41 58 L 40 62 L 39 58 L 36 56 L 39 57 Z" fill="#3D2810" />
        <Path d="M 60 53 L 61 57 L 64 56 L 61 58 L 60 62 L 59 58 L 56 56 L 59 57 Z" fill="#3D2810" />
      </>
    ),
  };

  const mouth = {
    happy: (
      <Path d="M 39 68 Q 50 78 61 68" stroke="#3D2810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    ),
    sleeping: (
      <Ellipse cx="50" cy="71" rx="4" ry="2.5" fill="#3D2810" opacity="0.3" />
    ),
    excited: (
      <Path d="M 38 67 Q 50 80 62 67" stroke="#3D2810" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    ),
  };

  return (
    <Svg width={size} height={h} viewBox="0 0 100 118">
      {/* ── 흙 ─────────────────────────────────── */}
      <Ellipse cx="50" cy="113" rx="18" ry="6" fill="#C49860" />
      <Ellipse cx="50" cy="111" rx="14" ry="4" fill="#D4AA70" />

      {/* ── 줄기 ────────────────────────────────── */}
      <Rect x="44" y="86" width="12" height="26" rx="6" fill="#9B7040" />

      {/* ── 옆 잎사귀 (큰 잎) ───────────────────── */}
      <Ellipse cx="17" cy="72" rx="23" ry="9" fill="#4A9E42" transform="rotate(-38 17 72)" />
      <Ellipse cx="83" cy="72" rx="23" ry="9" fill="#4A9E42" transform="rotate(38 83 72)" />
      {/* 잎 중심선 */}
      <Path d="M 14 64 Q 26 72 22 80" stroke="#3A8032" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M 86 64 Q 74 72 78 80" stroke="#3A8032" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── 몸통 (큰 원) ────────────────────────── */}
      <Circle cx="50" cy="60" r="31" fill="#72C86E" />
      {/* 하이라이트 */}
      <Circle cx="50" cy="56" r="26" fill="#90DA8D" />

      {/* ── 머리 위 새싹 잎 ─────────────────────── */}
      {/* 왼쪽 새싹 */}
      <Ellipse cx="36" cy="30" rx="7" ry="16" fill="#4A9E42" transform="rotate(-22 36 30)" />
      {/* 오른쪽 새싹 */}
      <Ellipse cx="64" cy="30" rx="7" ry="16" fill="#4A9E42" transform="rotate(22 64 30)" />
      {/* 가운데 새싹 (앞) */}
      <Ellipse cx="50" cy="22" rx="7.5" ry="17" fill="#5BB857" />
      {/* 새싹 광택 */}
      <Ellipse cx="48" cy="16" rx="2.5" ry="5" fill="#7CCC78" opacity="0.6" />

      {/* ── 얼굴 ────────────────────────────────── */}
      {/* 볼터치 */}
      <Ellipse cx="30" cy="65" rx="7" ry="4.5" fill="#FFB5C5" opacity="0.6" />
      <Ellipse cx="70" cy="65" rx="7" ry="4.5" fill="#FFB5C5" opacity="0.6" />

      {/* 눈 */}
      {eyes[expression] || eyes.happy}

      {/* 입 */}
      {mouth[expression] || mouth.happy}

      {expression === 'sleeping' && (
        /* 잠자는 표시 z z */
        <>
          <Path d="M 68 38 L 72 38 L 68 43 L 74 43" stroke="#A0C898" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M 73 32 L 76 32 L 73 36 L 77 36" stroke="#A0C898" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}
