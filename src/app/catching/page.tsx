"use client";
"use client";

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CatchingPage() {
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [pokemonName, setPokemonName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);

  useEffect(() => {
    async function doCatch() {
      const params = new URLSearchParams(window.location.search);
      const pokemonHash = params.get('p');

      if (!pokemonHash) {
        setStatus('error');
        setMessage('Missing pokemon data');
        setTimeout(() => router.push('/dashboard'), 1500);
        return;
      }

      try {
        // Decode the hash to get the Pokemon name early so we can prefetch
        const decoded = atob(pokemonHash);
        const pokemonName = decoded.split(':')[0];
        
        // Start prefetching sprite immediately (don't await)
        const spritePromise = fetch(`/api/poke-meta?name=${encodeURIComponent(pokemonName)}`, {
          credentials: 'include'
        })
          .then(metaRes => metaRes.ok ? metaRes.json() : null)
          .then(metaJson => metaJson?.sprite || null)
          .catch(() => null);

        // Start catch request (parallel with sprite fetch)
        const res = await fetch('/api/catch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pokemonHash }),
        });

        const data = await res.json();
        if (res.ok) {
          setPokemonName(data.name || null);
          setMessage(data.message || 'Caught!');
          
          // Wait for sprite to finish loading
          const sprite = await spritePromise;
          if (sprite) {
            setSpriteUrl(sprite);
          }
          
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 3000);
        } else {
          // handle specific duplicate-catch (409)
          if (res.status === 409) {
            setStatus('error');
            setMessage(data.message || 'Already caught');
            // trigger shake animation by toggling a class on the error container
            const el = document.querySelector('.error-message') as HTMLElement | null;
            if (el) {
              el.classList.remove('shake');
              // force reflow
              void el.offsetWidth;
              el.classList.add('shake');
            }
            // try vibration (best-effort) — use a typed narrow to avoid `any`
            try {
              const nv = navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean | undefined };
              nv.vibrate?.(200);
            } catch {}
            // keep the message visible a bit longer
            setTimeout(() => router.push('/dashboard'), 2200);
          } else {
            setStatus('error');
            setMessage(data.message || 'Failed to catch');
            setTimeout(() => router.push('/dashboard'), 1400);
          }
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error');
        setTimeout(() => router.push('/dashboard'), 1400);
      }
    }

    doCatch();
  }, [router]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-900 to-blue-800 text-white flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 px-4">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="pokeball-bounce" aria-hidden>
              <Image src="/icons/pokeball.svg" alt="Pokeball" width={80} height={80} unoptimized />
            </div>
            <div className="text-center text-lg opacity-90">Catching...</div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="text-center text-red-300">{message}</div>
        ) : null}

        {status === 'success' && pokemonName ? (
          <div className="flex flex-col items-center gap-4 relative">
            <div className="glow-lines" aria-hidden />

            {spriteUrl ? (
              <div className="sprite scale-in z-10" style={{ width: 160, height: 160, position: 'relative', transform: 'translateY(-12%)' }}>
                {(() => {
                  const imgStyle: CSSProperties = { objectFit: 'contain', imageRendering: 'pixelated' };
                  return <Image src={spriteUrl} alt={pokemonName} fill unoptimized style={imgStyle} />;
                })()}
              </div>
            ) : (
              <div className="pokeball-placeholder scale-in z-10" aria-hidden>
                <Image src="/icons/pokeball.svg" alt="Pokeball" width={120} height={120} unoptimized />
              </div>
            )}

            <div className="text-[0.72rem] uppercase tracking-wide text-white/80">you caught a</div>
            <div className="pokemon-name scale-in text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-300">{pokemonName}</div>
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

        .emoji {
          font-size: 6rem;
          filter: drop-shadow(0 12px 30px rgba(0,0,0,0.6));
        }

        .sprite {
          width: 220px;
          height: 220px;
          image-rendering: pixelated;
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

function emojiForName(name: string) {
  const map: Record<string, string> = {
    Bulbasaur: '🌱',
    Charmander: '🔥',
    Squirtle: '💧',
    Pikachu: '⚡️',
    Jigglypuff: '🎤',
    Meowth: '🐱',
    Psyduck: '🦆',
    Snorlax: '😴',
    Dragonite: '🐉',
    Mewtwo: '🔮',
  };
  return map[name] || '🔵';
}
