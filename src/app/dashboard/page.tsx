"use client";

import { useState, useEffect } from 'react';
import { getTypeColor, darkenHex } from '@/lib/pokemonColors';
import CroppedSprite from '@/components/CroppedSprite';
import Spinner from '@/components/Spinner';
import TeamPin from '@/components/TeamPin';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Pokemon {
  id: number;
  name: string;
  caughtAt: string;
}

export default function DashboardPage() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [pokeMeta, setPokeMeta] = useState<Record<string, { sprite?: string; types?: string[] }>>({});
  const [linksMap, setLinksMap] = useState<Record<string, string>>({});
  const [badges, setBadges] = useState<Array<{ id: number; gymId: number; name: string; badge_filename?: string; capturedAt: string }>>([]);
  const [team, setTeam] = useState<{ id: number; name: string; pin: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPokemon();
    fetchBadges();
    // fetch current team info
    (async () => {
      try {
        const r = await fetch('/api/me/team', { credentials: 'include' });
        if (!r.ok) return;
        const jd = await r.json();
        setTeam(jd);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const fetchBadges = async () => {
    try {
      const r = await fetch('/api/team/badges', { credentials: 'include' });
      if (r.ok) {
        const jd = await r.json();
        setBadges(Array.isArray(jd) ? jd : []);
      }
    } catch {}
  };

  const fetchPokemon = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pokemon', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPokemon(Array.isArray(data) ? data : []);
        // fetch metadata for unique pokemon names
        const rawNames = (Array.isArray(data) ? data : []).map((d: unknown) => ((d as Record<string, unknown>)['name'] as string | undefined));
        const names = Array.from(new Set(rawNames.filter((n): n is string => typeof n === 'string')));
        names.forEach(async (name: string) => {
          if (!name || pokeMeta[name]) return;
          try {
            const r = await fetch(`/api/poke-meta?name=${encodeURIComponent(name)}`);
            if (!r.ok) return;
            const jd = await r.json();
            setPokeMeta((s) => ({ ...s, [name]: { sprite: jd.sprite, types: jd.types } }));
          } catch (e) {
            // ignore
          }
        });
        // load links map from public json (best-effort)
        try {
          const r = await fetch('/pokemon-links.json');
          if (r.ok) {
            const jm = await r.json();
            setLinksMap(jm || {});
          }
        } catch (e) {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-[#0b2545] text-white p-4 sm:p-6 overflow-x-hidden">
  <header className="max-w-4xl mx-auto flex items-center justify-between mb-6 px-2 sm:px-0">
        <div className="flex items-center gap-3">
          <img src="/pokehuntlogo.png" alt="Pokéhunt" className="h-8 sm:h-10" />
          <p className="text-sm text-yellow-300 hidden sm:block font-pkmndpb">A Trainer&apos;s Journey</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleLogout} className="bg-yellow-400 text-slate-900 p-2" aria-label="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" aria-hidden>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5M21 12H9" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
            </svg>
          </Button>
        </div>
      </header>

  <main className="max-w-4xl mx-auto px-2 sm:px-0">
        {/* Team info card */}
        {team && (
          <div className="mb-4">
            <Card className="bg-slate-800/60 border border-slate-700">
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="text-xs sm:text-sm text-slate-300">Team</div>
                        <div className="font-semibold text-white text-sm sm:text-base">{team.name}</div>
                        <div className="text-xs text-slate-400">ID: {team.id}</div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-300">PIN</div>
                        <div className="mt-1 sm:mt-0"><TeamPin pin={team.pin} /></div>
                      </div>
                    </div>
                  </CardContent>
            </Card>
          </div>
        )}
        <Card className="bg-slate-800/60 border border-slate-700">
          <CardHeader>
            <CardTitle>Caught Pokémon</CardTitle>
          </CardHeader>
              <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Spinner size={36} /></div>
            ) : pokemon.length > 0 ? (
              <ul className="divide-y divide-slate-700/40">
                  {pokemon.map((p) => (
                  <li key={p.id} className="p-2 sm:p-3 flex items-center justify-between bg-transparent min-h-14">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 min-w-[40px] min-h-[40px] rounded flex items-center justify-center overflow-hidden bg-transparent">
                        {pokeMeta[p.name]?.sprite ? (
                          <CroppedSprite src={pokeMeta[p.name].sprite || ''} alt={p.name} size={48} />
                        ) : (
                          <div className="w-[70%] h-[70%] rounded-full border border-slate-600/40 animate-pulse flex items-center justify-center">
                            <img src="/icons/pokeball.svg" alt="pokéball" className="w-4 h-4 sm:w-5 sm:h-5 opacity-90" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold whitespace-nowrap truncate max-w-[10rem] sm:max-w-[16rem] text-sm sm:text-base">
                          {linksMap[p.name] ? (
                            // eslint-disable-next-line @next/next/no-html-link-for-pages
                            <a href={linksMap[p.name]} target="_blank" rel="noopener noreferrer" className="underline text-white">{p.name}</a>
                          ) : (
                            p.name
                          )}
                        </div>
                        <div className="text-[0.68rem] text-slate-400">{new Date(p.caughtAt).toLocaleString()}</div>
                        {pokeMeta[p.name]?.types && (
                          <div className="flex items-center gap-2 mt-1">
                            {pokeMeta[p.name]?.types?.map((t) => {
                              const bg = getTypeColor(t);
                              const border = darkenHex(bg, 0.25);
                              return (
                                <span key={t} style={{ background: `#${bg}`, border: `2px solid #${border}`, textTransform: 'uppercase' }} className="text-white text-[0.6rem] px-2 py-0.5 rounded-full font-bold">{t}</span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-yellow-300 font-mono">ID: {p.id}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No Pokémon caught yet. Go catch some!</p>
            )}
          </CardContent>
        </Card>
      
      {/* Badges panel */}
      <div className="mt-6">
        <Card className="bg-slate-800/60 border border-slate-700">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {badges.length === 0 ? (
              <p>No badges yet. Visit a gym to earn badges!</p>
            ) : (
              <ul className="flex gap-3 flex-wrap">
                {badges.map((b) => (
                  <li key={b.id} className="w-20 h-20 sm:w-28 sm:h-28 bg-transparent flex flex-col items-center justify-center">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 relative">
                      {b.badge_filename ? (
                        <CroppedSprite src={`/badges/${b.badge_filename}`} alt={b.name} size={64} />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-yellow-400/30 flex items-center justify-center">🏅</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-1 text-center truncate max-w-[68px] sm:max-w-[96px]">{b.name}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </main>
    </div>
  );
}
