"use client";

import React, { useState } from 'react';

export default function TeamPin({ pin }: { pin: string | null }) {
  const [visible, setVisible] = useState(false);
  const display = pin ? (visible ? pin : pin.replace(/.(?=.?$)/g, '•')) : '—';
  return (
    <div className="flex items-center justify-end space-x-2">
      <div className="font-mono text-sm">{display}</div>
      <button aria-label={visible ? 'Hide PIN' : 'Show PIN'} onClick={() => setVisible((s) => !s)} className="p-1 rounded hover:bg-slate-700/50">
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M17.94 17.94A10 10 0 0 1 6.06 6.06" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 1l22 22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S3.73 15.89 2 12c1.73-3.89 6-7 10-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
