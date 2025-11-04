"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TypeIcon from '@/components/TypeIcon';

export default function GymCatchingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [gymName, setGymName] = useState<string | null>(null);
  const [gymType, setGymType] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);

  useEffect(() => {
    async function doCapture() {
      const params = new URLSearchParams(window.location.search);
      const gymHash = params.get('p');

      if (!gymHash) {
        setStatus('error');
        setMessage('Missing gym data');
        setTimeout(() => router.push('/dashboard'), 1500);
        return;
      }

      try {
        const res = await fetch('/api/gym-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ gymHash }),
        });

        const data = await res.json();
        if (res.ok) {
          setGymName(data.name || null);
          setMessage(data.message || 'Badge earned!');
          setStatus('success');
          // set gym type (used for displaying the type icon). We no longer use badge SVGs.
          try {
            const gymsRes = await fetch('/api/gyms');
            if (gymsRes.ok) {
              const gyms: { id: number; slug: string; name: string }[] = await gymsRes.json();
              const matched = gyms.find((g) => g.name === data.name || g.id === data.gymId);
              if (matched && matched.slug) setGymType(matched.slug);
            }
          } catch {}

          setTimeout(() => router.push('/dashboard'), 1800);
        } else {
          if (res.status === 409) {
            setStatus('error');
            setMessage(data.message || 'Already captured');
            const el = document.querySelector('.error-message') as HTMLElement | null;
            if (el) {
              el.classList.remove('shake');
              void el.offsetWidth;
              el.classList.add('shake');
            }
            try { (navigator as Navigator & { vibrate?: (pattern: number | number[]) => void }).vibrate?.(200); } catch {}
            setTimeout(() => router.push('/dashboard'), 1800);
          } else {
            setStatus('error');
            setMessage(data.message || 'Failed to capture');
            setTimeout(() => router.push('/dashboard'), 1400);
          }
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error');
        setTimeout(() => router.push('/dashboard'), 1400);
      }
    }

    doCapture();
  }, [router]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-900 to-blue-800 text-white flex items-center justify-center z-50">
  <div className="flex flex-col items-center gap-6 px-4">
        {status === 'loading' ? (
          <div className="text-center opacity-90">Recording gym...</div>
        ) : null}

        {status === 'error' ? (
          <div className="text-center text-red-300">{message}</div>
        ) : null}

        {status === 'success' && gymName ? (
          <div className="flex flex-col items-center gap-4 relative">
            <div className="glow-lines" aria-hidden />

            {gymType && (
              <div className="scale-in z-10 mb-2">
                <TypeIcon type={gymType} size={48} withGlow />
              </div>
            )}

            {gymType ? (
              <div className="scale-in z-10" style={{ transform: 'translateY(-6%)' }}>
                <TypeIcon type={gymType} size={64} withGlow />
              </div>
            ) : (
              <div className="emoji scale-in z-10" aria-hidden>🏅</div>
            )}

            <div className="text-[0.72rem] uppercase tracking-wide text-white/80">you completed</div>
            <div className="pokemon-name scale-in text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-300">{gymName}</div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .scale-in {
          transform: scale(0);
          opacity: 0;
          animation: scaleIn 0.9s cubic-bezier(.2,.9,.3,1) forwards;
        }

        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.28); opacity: 1; }
          100% { transform: scale(1.18); opacity: 1; }
        }

        .emoji { font-size: 6rem; filter: drop-shadow(0 12px 30px rgba(0,0,0,0.6)); }
        .sprite { width: 220px; height: 220px; image-rendering: pixelated; }
        .glow-lines { position: absolute; width: 320px; height: 320px; border-radius: 50%; z-index: 5; display: block; top: -40%; left: 50%; transform: translateX(-50%); background: conic-gradient(from 0deg, rgba(255,255,150,0.04), rgba(255,255,150,0.12), rgba(255,255,150,0.04)); filter: blur(16px) saturate(1.2); opacity: 0.95; animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .scale-in { animation: none; transform: none; opacity: 1; } .glow-lines { animation: none; } }
        .error-message { transition: transform 160ms ease, opacity 160ms ease; font-weight: 700; }
        .shake { animation: shake 640ms cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%,90%{transform:translateX(-1px);}20%,80%{transform:translateX(2px);}30%,50%,70%{transform:translateX(-4px);}40%,60%{transform:translateX(4px);} }
      `}</style>
    </div>
  );
}
