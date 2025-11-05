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
          
          // Set status to success first
          setStatus('success');
          
          // Fetch gym type after successful capture
          if (data.name || data.gymId) {
            fetch('/api/gyms', {
              credentials: 'include'
            })
              .then(r => r.ok ? r.json() : null)
              .then((gyms: { id: number; slug: string; name: string }[] | null) => {
                if (gyms) {
                  const matched = gyms.find((g) => g.name === data.name || g.id === data.gymId);
                  if (matched?.slug) {
                    setGymType(matched.slug);
                  }
                }
              })
              .catch(() => {
                // Gym type fetch failed, will show fallback emoji
              });
          }

          setTimeout(() => router.push('/dashboard'), 3000);
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
            setTimeout(() => router.push('/dashboard'), 2200);
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
          <div className="flex flex-col items-center gap-4">
            <div className="pokeball-bounce" aria-hidden>
              <Image src="/icons/pokeball.svg" alt="Pokeball" width={80} height={80} unoptimized />
            </div>
            <div className="text-center text-lg opacity-90">Processing gym...</div>
          </div>
        ) : null}        {status === 'error' ? (
          <div className="error-message text-center text-red-300">{message}</div>
        ) : null}

        {status === 'success' && gymName ? (
          <div className="flex flex-col items-center gap-4 relative">
            <div className="glow-lines" aria-hidden />

            {gymType ? (
              <div className="scale-in z-10" style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-12%)' }}>
                <TypeIcon type={gymType} size={80} withGlow />
              </div>
            ) : (
              <div className="pokeball-placeholder scale-in z-10" aria-hidden>
                <Image src="/icons/pokeball.svg" alt="Pokeball" width={120} height={120} unoptimized />
              </div>
            )}

            <div className="text-[0.72rem] uppercase tracking-wide text-white/80">you conquered</div>
            <div className="pokemon-name scale-in text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-300">{gymName}</div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .pokeball-bounce {
          animation: bounce 0.6s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

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

        .pokeball-placeholder {
          filter: drop-shadow(0 12px 30px rgba(0,0,0,0.6));
        }

        .glow-lines {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          z-index: 5;
          display: block;
          top: -40%;
          left: 50%;
          transform: translateX(-50%);
          background: conic-gradient(from 0deg, rgba(255,255,150,0.04), rgba(255,255,150,0.12), rgba(255,255,150,0.04));
          filter: blur(16px) saturate(1.2);
          opacity: 0.95;
          animation: spin 4s linear infinite;
        }

        @keyframes spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .scale-in { animation: none; transform: none; opacity: 1; }
          .glow-lines { animation: none; }
          .pokeball-bounce { animation: none; }
        }

        .error-message {
          transition: transform 160ms ease, opacity 160ms ease;
          font-weight: 700;
        }

        .shake {
          animation: shake 640ms cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
