"use client";

import React from 'react';

export default function Spinner({ size = 24 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="#FFD54A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
