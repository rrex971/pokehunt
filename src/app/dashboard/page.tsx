"use client";

import { useState, useEffect } from 'react';
import { getTypeColor, darkenHex } from '@/lib/pokemonColors';
import CroppedSprite from '@/components/CroppedSprite';
import Spinner from '@/components/Spinner';
import TeamPin from '@/components/TeamPin';
import TypeIcon from '@/components/TypeIcon';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Helper to format UTC timestamps to IST
function formatIST(utcDateString: string) {
  // Parse timestamp components manually to avoid timezone interpretation issues
  // PostgreSQL returns: "2025-11-04T12:34:56.789Z" or "2025-11-04 12:34:56.789"
  const cleanStr = utcDateString.replace(' ', 'T').replace(/\.\d+/, '');
  
  // Parse components
  const [datePart, timePart] = cleanStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00:00').split(':').map(Number);
  
  // Create UTC timestamp
  const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  
  // Add 5 hours 30 minutes for IST
  const istTimestamp = utcTimestamp + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istTimestamp);
  
  // Format using UTC methods
  const istDay = String(istDate.getUTCDate()).padStart(2, '0');
  const istMonth = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const istYear = istDate.getUTCFullYear();
  let istHours = istDate.getUTCHours();
  const istMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = istHours >= 12 ? 'PM' : 'AM';
  istHours = istHours % 12 || 12;
  
  return `${istDay}/${istMonth}/${istYear}, ${istHours}:${istMinutes} ${ampm}`;
}

interface Pokemon {
  id: number;
  name: string;
  caughtAt: string;
}

export default function DashboardPage() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [pokeMeta, setPokeMeta] = useState<Record<string, { sprite?: string; types?: string[] }>>({});
  const [linksMap, setLinksMap] = useState<Record<string, string>>({});
  const [badges, setBadges] = useState<Array<{ id: number; gymId: number; slug: string; name: string; capturedAt: string }>>([]);
  const [team, setTeam] = useState<{ id: number; name: string; pin: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [exportedPaste, setExportedPaste] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [teamBuilderSearch, setTeamBuilderSearch] = useState('');

  useEffect(() => {
    prefetchAllPokemonMetadata();
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

  const prefetchAllPokemonMetadata = async () => {
    try {
      const res = await fetch('/api/admin/prefetch-pokemon', { 
        method: 'POST',
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metadata) {
          setPokeMeta(data.metadata);
        }
      }
    } catch (err) {
      console.error('Failed to prefetch Pokemon metadata:', err);
    }
  };

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
        // fetch metadata for unique pokemon names only if not cached
        const rawNames = (Array.isArray(data) ? data : []).map((d: unknown) => ((d as Record<string, unknown>)['name'] as string | undefined));
        const names = Array.from(new Set(rawNames.filter((n): n is string => typeof n === 'string')));
        names.forEach((name: string) => {
          if (!name) return;
          
          // Skip if already cached
          setPokeMeta((s) => {
            if (s[name]) return s; // Already cached
            
            // Fetch if not cached
            fetch(`/api/poke-meta?name=${encodeURIComponent(name)}`)
              .then(r => {
                if (!r.ok) return;
                return r.json();
              })
              .then(jd => {
                if (jd) {
                  setPokeMeta((prev) => ({ ...prev, [name]: { sprite: jd.sprite, types: jd.types } }));
                }
              })
              .catch(() => {
                // ignore
              });
            
            return s;
          });
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

  const togglePokemonInTeam = (name: string) => {
    setSelectedTeam((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, name];
    });
  };

  const exportToPokepaste = async () => {
    if (selectedTeam.length === 0) return;
    setExporting(true);
    setExportedPaste('');
    
    try {
      const pastePromises = selectedTeam.map(async (name) => {
        const link = linksMap[name];
        if (!link) return `${name}\n\n`;
        
        try {
          // Use our proxy endpoint to avoid CORS issues
          const res = await fetch('/api/pokepaste-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ url: link }),
          });
          
          if (!res.ok) return `${name}\n\n`;
          
          const data = await res.json();
          return (data.content || name) + '\n\n';
        } catch {
          return `${name}\n\n`;
        }
      });
      
      const results = await Promise.all(pastePromises);
      setExportedPaste(results.join(''));
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!exportedPaste) return;
    try {
      await navigator.clipboard.writeText(exportedPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = exportedPaste;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            <div className="flex items-center justify-between">
              <CardTitle>Caught Pokémon</CardTitle>
              <Button 
                onClick={() => setShowTeamBuilder(true)} 
                className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 text-sm"
                disabled={pokemon.length === 0}
              >
                Build Team
              </Button>
            </div>
          </CardHeader>
              <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Spinner size={36} /></div>
            ) : pokemon.length > 0 ? (
              <ul className="divide-y divide-slate-700/40">
                  {pokemon.map((p) => (
                  <li key={p.id} className="px-0 py-2 sm:py-3 flex items-center justify-between bg-transparent min-h-14">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 min-w-[40px] min-h-[40px] rounded flex items-center justify-center overflow-hidden bg-transparent flex-shrink-0">
                        {pokeMeta[p.name]?.sprite ? (
                          <CroppedSprite src={pokeMeta[p.name].sprite || ''} alt={p.name} size={48} />
                        ) : (
                          <div className="w-[70%] h-[70%] rounded-full border border-slate-600/40 animate-pulse flex items-center justify-center">
                            <img src="/icons/pokeball.svg" alt="pokéball" className="w-4 h-4 opacity-90" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold whitespace-nowrap truncate text-xs sm:text-sm">
                          {linksMap[p.name] ? (
                            // eslint-disable-next-line @next/next/no-html-link-for-pages
                            <a href={linksMap[p.name]} target="_blank" rel="noopener noreferrer" className="underline text-white">{p.name}</a>
                          ) : (
                            p.name
                          )}
                        </div>
                        <div className="text-[0.6rem] sm:text-[0.68rem] text-slate-400">
                          {formatIST(p.caughtAt)}
                        </div>
                        {pokeMeta[p.name]?.types && (
                          <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                            {pokeMeta[p.name]?.types?.map((t) => {
                              const bg = getTypeColor(t);
                              const border = darkenHex(bg, 0.25);
                              return (
                                <span key={t} style={{ background: `#${bg}`, border: `1.5px solid #${border}` }} className="text-white text-[0.5rem] sm:text-[0.55rem] px-1.5 sm:px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                                  <TypeIcon type={t} size={12} />
                                  <span className="uppercase leading-none">{t}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-[0.6rem] sm:text-xs text-yellow-300 font-mono ml-2 flex-shrink-0">ID: {p.id}</div>
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
              <p className="text-sm">No badges yet. Visit a gym to earn badges!</p>
            ) : (
              <ul className="flex gap-2 sm:gap-3 flex-wrap">
                {badges.map((b) => (
                  <li key={b.id} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-transparent flex flex-col items-center justify-center">
                    {b.slug ? (
                      <div className="mb-0.5 sm:mb-1">
                        <TypeIcon type={b.slug} size={32} withGlow />
                      </div>
                    ) : (
                      <div className="mb-0.5 sm:mb-1 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-400/30 flex items-center justify-center">🏅</div>
                    )}
                    <div className="text-[0.6rem] sm:text-xs text-slate-300 mt-0.5 sm:mt-1 text-center truncate w-full px-1">{b.name}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </main>

      {/* Team Builder Modal */}
      {showTeamBuilder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800/90 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-slate-700 backdrop-blur-lg animate-modal-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Team Builder</h3>
              <Button size="sm" onClick={() => {
                setShowTeamBuilder(false);
                setSelectedTeam([]);
                setExportedPaste('');
                setCopied(false);
                setTeamBuilderSearch('');
              }}>Close</Button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-300 mb-2">
                Select up to 6 Pokémon for your team ({selectedTeam.length}/6)
              </p>
              <div className="flex gap-2 flex-wrap min-h-[3rem] p-3 bg-slate-900/50 rounded border border-slate-600">
                {selectedTeam.length === 0 ? (
                  <span className="text-slate-500 text-sm">No Pokémon selected</span>
                ) : (
                  selectedTeam.map((name, idx) => (
                    <div key={idx} className="bg-yellow-400/20 border border-yellow-400/40 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <span>{name}</span>
                      <button
                        onClick={() => togglePokemonInTeam(name)}
                        className="text-yellow-300 hover:text-yellow-100"
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 text-slate-200">Available Pokémon</h4>
              <Input
                type="text"
                placeholder="Search Pokémon..."
                value={teamBuilderSearch}
                onChange={(e) => setTeamBuilderSearch(e.target.value)}
                className="mb-3 border-slate-700 focus:border-slate-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-900/30 rounded border border-slate-700">
                {pokemon
                  .filter((p) => 
                    !teamBuilderSearch || 
                    p.name.toLowerCase().includes(teamBuilderSearch.toLowerCase())
                  )
                  .map((p) => {
                  const isSelected = selectedTeam.includes(p.name);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePokemonInTeam(p.name)}
                      disabled={!isSelected && selectedTeam.length >= 6}
                      className={`p-2 rounded flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-yellow-400/30 border-2 border-yellow-400'
                          : 'bg-slate-800/60 border border-slate-600 hover:bg-slate-700/60'
                      } ${!isSelected && selectedTeam.length >= 6 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="w-10 h-10 min-w-[40px] rounded flex items-center justify-center overflow-hidden bg-transparent">
                        {pokeMeta[p.name]?.sprite ? (
                          <CroppedSprite src={pokeMeta[p.name].sprite || ''} alt={p.name} size={40} />
                        ) : (
                          <div className="text-lg">❓</div>
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{p.name}</div>
                        {pokeMeta[p.name]?.types && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {pokeMeta[p.name]?.types?.slice(0, 2).map((t) => {
                              const bg = getTypeColor(t);
                              return (
                                <span key={t} style={{ background: `#${bg}` }} className="text-white text-[0.5rem] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                  <TypeIcon type={t} size={14} />
                                  <span className="uppercase">{t}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-yellow-300 text-xl">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button
                onClick={exportToPokepaste}
                disabled={selectedTeam.length === 0 || exporting}
                className="bg-blue-600 hover:bg-blue-500 text-white w-full sm:w-auto"
              >
                {exporting ? 'Exporting...' : 'Export to Pokepaste'}
              </Button>
              {exportedPaste && (
                <Button
                  onClick={copyToClipboard}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="truncate">Copy to Clipboard</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {exportedPaste && (
              <div className="bg-slate-900/60 rounded border border-slate-600 p-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">Pokepaste Export</h4>
                </div>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{exportedPaste}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        :global(.animate-fade-in) {
          animation: fade-in 0.2s ease-out forwards;
        }

        :global(.animate-modal-in) {
          animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
