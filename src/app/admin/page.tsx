"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { getTypeColor, darkenHex } from '@/lib/pokemonColors';
import TypeIcon from '@/components/TypeIcon';
import CroppedSprite from '@/components/CroppedSprite';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Helper to format UTC timestamps to IST
function formatIST(utcDateString: string) {
  const date = new Date(utcDateString);
  // Add 5 hours 30 minutes (19800000 ms) for IST
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

interface Team {
  id: number;
  name: string;
  pin: string;
}

export default function AdminPage() {
  const [teamName, setTeamName] = useState('');
  const [teamPin, setTeamPin] = useState('');
  const [newTeam, setNewTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<number, boolean>>({});
  const [viewingTeamId, setViewingTeamId] = useState<number | null>(null);
  const [teamPokemon, setTeamPokemon] = useState<Array<{ id: number; name: string; caughtAt: string }>>([]);
  const [teamBadges, setTeamBadges] = useState<Array<{ id: number; gymId: number; slug: string; name: string; capturedAt: string }>>([]);
  const [linksMap, setLinksMap] = useState<Record<string, string>>({});
  const [teamPokeMeta, setTeamPokeMeta] = useState<Record<string, { sprite?: string; types?: string[] }>>({});
  const [gymsList, setGymsList] = useState<Array<{ id: number; slug: string; name: string; description?: string }>>([]);
  const [showNewPin, setShowNewPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pokemon history modal state
  const [showPokemonHistory, setShowPokemonHistory] = useState(false);
  const [pokemonHistorySearch, setPokemonHistorySearch] = useState('');
  const [pokemonHistory, setPokemonHistory] = useState<Array<{ 
    id: number; 
    name: string; 
    teamId: number; 
    teamName: string; 
    caughtAt: string 
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query ? `/api/teams?q=${encodeURIComponent(query)}` : '/api/teams';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        setError(err?.message || 'Failed to load teams');
        setTeams([]);
      } else {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Network error');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchTeams();
    fetchGyms();
    prefetchAllPokemonMetadata();
  }, [fetchTeams]);

  const prefetchAllPokemonMetadata = async () => {
    try {
      const res = await fetch('/api/admin/prefetch-pokemon', { 
        method: 'POST',
        credentials: 'include' 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metadata) {
          setTeamPokeMeta(data.metadata);
        }
      }
    } catch (err) {
      console.error('Failed to prefetch Pokemon metadata:', err);
    }
  };

  const fetchGyms = useCallback(async () => {
    try {
      const res = await fetch('/api/gyms', { credentials: 'include' });
      if (res.ok) {
        const j = await res.json();
        setGymsList(Array.isArray(j) ? j : []);
      }
    } catch {
      // ignore
    }
  }, []);

  const createTeam = async () => {
    if (!teamName.trim()) return;
    if (teamPin && !/^\d{4}$/.test(teamPin)) {
      setError('PIN must be 4 digits');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, pin: teamPin || undefined }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Failed to create team');
      } else {
        setNewTeam(data);
        setTeamName('');
        setTeamPin('');
        fetchTeams();
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login';
  };

  const fetchPokemonHistory = async (searchName?: string) => {
    setHistoryLoading(true);
    try {
      const url = searchName 
        ? `/api/admin/pokemon-history?name=${encodeURIComponent(searchName)}`
        : '/api/admin/pokemon-history';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPokemonHistory(Array.isArray(data) ? data : []);
      } else {
        setPokemonHistory([]);
      }
    } catch {
      setPokemonHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPokemonHistory = () => {
    setShowPokemonHistory(true);
    setPokemonHistorySearch('');
    fetchPokemonHistory();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-[#0b2545] text-white p-4 sm:p-6 overflow-x-hidden">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-4 sm:mb-6 bg-slate-900/40 p-3 sm:p-4 rounded-lg">
        <div>
          <img src="/pokehuntlogo.png" alt="Pokéhunt" className="h-8 sm:h-10" />
          <p className="text-sm text-yellow-300 hidden sm:block font-pkmndpb">A Trainer&apos;s Journey</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={openPokemonHistory} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-3 py-2 text-sm font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Pokemon History
          </Button>
          <Button onClick={handleLogout} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 p-2" aria-label="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" aria-hidden>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5M21 12H9" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
            </svg>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto text-white-50 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <section className="md:col-span-1">
          <Card className="bg-slate-800/60 border border-slate-700">
            <CardHeader>
              <CardTitle>New Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>Team Name</Label>
                <Input className="w-full bg-transparent border border-slate-600 px-2 py-2 rounded text-white placeholder:text-slate-400 text-sm" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <Label>PIN (4 digits)</Label>
                <Input className="w-full bg-transparent border border-slate-600 px-2 py-2 rounded text-white placeholder:text-slate-400 text-sm" value={teamPin} onChange={(e) => setTeamPin(e.target.value)} placeholder="Leave empty to auto-generate" />
                <div className="flex justify-end">
                  <Button onClick={createTeam} disabled={loading} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 text-sm">Create</Button>
                </div>
                {newTeam && (
                  <div className="mt-4 p-3 rounded bg-slate-800/60 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-yellow-300">New team created</p>
                      <div>
                        <Button size="sm" onClick={() => setShowNewPin((s) => !s)} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">{showNewPin ? 'Hide PIN' : 'Show PIN'}</Button>
                      </div>
                    </div>
                    <p className="font-mono">ID: {newTeam.id}</p>
                    <p className="font-mono">PIN: {showNewPin ? newTeam.pin : '••••'}</p>
                  </div>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </CardContent>
          </Card>
        </section>

  <section className="md:col-span-2">
          <Card className="bg-slate-800/60 border border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Teams</CardTitle>
                  <div className="flex items-center space-x-2">
                  <Input placeholder="Search teams or id" value={query} onChange={(e) => setQuery(e.target.value)} className="bg-transparent border border-slate-600 text-white placeholder:text-slate-400" />
                  <Button onClick={() => fetchTeams()} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">Search</Button>
                </div>
              </div>
            </CardHeader>
              <CardContent>
              {loading ? (
                <p>Loading teams...</p>
              ) : (
                <div className="divide-y">
                  {teams.length === 0 ? (
                    <p className="p-4 text-sm text-slate-300">No teams yet.</p>
                  ) : (
                    teams.map((team) => (
                      <div key={team.id} className="p-2 sm:p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm sm:text-base">{team.name}</div>
                          <div className="text-xs text-slate-400">ID: {team.id}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-xs font-mono text-yellow-200">PIN: {team.pin ? (revealedPins[team.id] ? team.pin : '••••') : '—'}</div>
                          <Button size="sm" onClick={() => setRevealedPins((p) => ({ ...p, [team.id]: !p[team.id] }))} className="bg-slate-700 text-yellow-300 hover:bg-slate-600">{revealedPins[team.id] ? 'Hide' : 'Show'}</Button>
                          <Button onClick={async () => {
                            // Open modal to view team's pokemon
                            setViewingTeamId(team.id);
                            setTeamPokemon([]);
                            setTeamBadges([]);
                            try {
                              const res = await fetch(`/api/pokemon?teamId=${team.id}`, { credentials: 'include' });
                              if (res.ok) {
                                const data = await res.json();
                                setTeamPokemon(Array.isArray(data) ? data : []);
                                // fetch meta for each pokemon only if not already cached
                                (Array.isArray(data) ? data : []).forEach(async (pp: unknown) => {
                                  const name = (pp as Record<string, unknown>)['name'] as string | undefined;
                                  if (!name) return;
                                  
                                  // Skip if already in cache
                                  setTeamPokeMeta((s) => {
                                    if (s[name]) return s; // Already cached
                                    
                                    // Fetch from API if not cached
                                    fetch(`/api/poke-meta?name=${encodeURIComponent(name)}`)
                                      .then(r2 => {
                                        if (!r2.ok) return;
                                        return r2.json();
                                      })
                                      .then(jd => {
                                        if (jd) {
                                          setTeamPokeMeta((prev) => ({ ...prev, [name]: { sprite: jd.sprite, types: jd.types } }));
                                        }
                                      })
                                      .catch(() => {
                                        // ignore individual meta fetch errors
                                      });
                                    
                                    return s;
                                  });
                                });
                              } else {
                                setError('Failed to load team pokemon');
                              }
                            } catch (err: unknown) {
                              setError((err as Error)?.message || 'Network error');
                            }
                            // fetch team badges for admin view
                            try {
                              const r2 = await fetch(`/api/admin/team-badges?teamId=${team.id}`, { credentials: 'include' });
                              if (r2.ok) {
                                const jb = await r2.json();
                                setTeamBadges(Array.isArray(jb) ? jb : []);
                              }
                            } catch {
                              // ignore
                            }
                            // load links map (best-effort)
                            try {
                              const r = await fetch('/pokemon-links.json');
                              if (r.ok) {
                                const jm = await r.json();
                                setLinksMap(jm || {});
                              }
                            } catch {
                              // ignore
                            }
                          }} className="bg-slate-700 text-yellow-300 hover:bg-slate-600">View Pokémon</Button>
                          <Button variant="destructive" onClick={async () => {
                            if (!confirm('Delete team ' + team.name + ' (ID: ' + team.id + ')?')) return;
                            setLoading(true);
                            try {
                              const res = await fetch('/api/teams', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: team.id }),
                                credentials: 'include',
                              });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                setError((data as { message?: string })?.message || 'Failed to delete');
                              } else {
                                fetchTeams();
                              }
                            } catch (err: unknown) {
                              setError((err as Error)?.message || 'Network error');
                            } finally {
                              setLoading(false);
                            }
                          }}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="mt-3 sm:mt-4">
            <Card className="bg-slate-800/60 border border-slate-700">
              <CardHeader>
                <CardTitle>Gyms</CardTitle>
              </CardHeader>
              <CardContent>
                {gymsList.length === 0 ? (
                  <p className="text-sm text-slate-300">No gyms yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-700">
                    {gymsList.map((g) => (
                      <li key={g.id} className="p-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded overflow-hidden bg-transparent flex items-center justify-center">
                            {g.slug ? (
                              <TypeIcon type={g.slug} size={36} withGlow />
                            ) : (
                              <div className="text-2xl">🏅</div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{g.name}</div>
                            <div className="text-xs text-slate-400">{g.slug}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      {/* Modal for viewing team pokemon */}
      {viewingTeamId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 animate-fade-in z-50">
          <div className="bg-slate-800/80 rounded-lg max-w-2xl w-full p-4 border border-slate-700 backdrop-blur-lg animate-modal-in relative z-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Team {viewingTeamId} Pokémon</h3>
              <div className="space-x-2">
                <Button size="sm" onClick={() => { setViewingTeamId(null); setTeamPokemon([]); }}>Close</Button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {teamPokemon.length === 0 ? (
                <p className="text-sm text-slate-300">No Pokémon caught or loading...</p>
              ) : (
                <ul className="divide-y">
                  {teamPokemon.map((p) => (
                    <li key={p.id} className="p-2 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-14 h-14 rounded flex items-center justify-center overflow-hidden bg-transparent">
                          {teamPokeMeta[p.name]?.sprite ? (
                            <CroppedSprite src={teamPokeMeta[p.name].sprite || ''} alt={p.name} size={56} />
                          ) : (
                            <div className="text-2xl">{p.name[0] || '❓'}</div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {linksMap[p.name] ? (
                              // eslint-disable-next-line @next/next/no-html-link-for-pages
                              <a href={linksMap[p.name]} target="_blank" rel="noopener noreferrer" className="underline text-white">{p.name}</a>
                            ) : (
                              p.name
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatIST(p.caughtAt)}
                          </div>
                          {teamPokeMeta[p.name]?.types && (
                            <div className="flex items-center gap-2 mt-1">
                              {teamPokeMeta[p.name]?.types?.map((t) => {
                                const bg = getTypeColor(t);
                                const border = darkenHex(bg, 0.25);
                                return (
                                  <span key={t} style={{ background: `#${bg}`, border: `3px solid #${border}` }} className="text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                    <TypeIcon type={t} size={18} />
                                    <span className="uppercase">{t}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm('Delete ' + p.name + ' (ID: ' + p.id + ')?')) return;
                          try {
                            const res = await fetch('/api/pokemon', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: p.id }),
                              credentials: 'include',
                            });
                            if (res.ok) {
                              setTeamPokemon((arr) => arr.filter((x) => x.id !== p.id));
                              fetchTeams();
                            } else {
                              const d = await res.json().catch(() => ({}));
                              setError((d as { message?: string })?.message || 'Failed to delete');
                            }
                          } catch (err: unknown) {
                            setError((err as Error)?.message || 'Network error');
                          }
                        }}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Team badges panel (admin) */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Gym Badges</h4>
                {teamBadges.length === 0 ? (
                  <p className="text-sm text-slate-300">No badges awarded yet.</p>
                ) : (
                  <ul className="divide-y">
                    {teamBadges.map((b) => (
                      <li key={b.id} className="p-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded overflow-hidden bg-transparent flex items-center justify-center">
                            {b.slug ? (
                              <TypeIcon type={b.slug} size={36} withGlow />
                            ) : (
                              <div className="text-2xl">🏅</div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{b.name}</div>
                            <div className="text-xs text-slate-400">
                              {formatIST(b.capturedAt)}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (!confirm('Delete badge ' + b.name + ' (ID: ' + b.id + ')?')) return;
                            try {
                              const res = await fetch('/api/admin/team-badges', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: b.id }),
                                credentials: 'include',
                              });
                              if (res.ok) {
                                setTeamBadges((arr) => arr.filter((x) => x.id !== b.id));
                              } else {
                                const d = await res.json().catch(() => ({}));
                                setError((d as { message?: string })?.message || 'Failed to delete badge');
                              }
                            } catch (err: unknown) {
                              setError((err as Error)?.message || 'Network error');
                            }
                          }}>Delete</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pokemon History Modal */}
      {showPokemonHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 animate-fade-in z-50">
          <div className="bg-slate-800/95 rounded-lg max-w-4xl w-full p-6 border border-slate-700 backdrop-blur-lg animate-modal-in relative z-50 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Pokémon Catch History</h3>
              <Button size="sm" onClick={() => setShowPokemonHistory(false)}>Close</Button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search Pokémon by name..."
                  value={pokemonHistorySearch}
                  onChange={(e) => setPokemonHistorySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchPokemonHistory(pokemonHistorySearch);
                    }
                  }}
                  className="flex-1 border-slate-700 focus:border-slate-400"
                />
                <Button onClick={() => fetchPokemonHistory(pokemonHistorySearch)}>
                  Search
                </Button>
                {pokemonHistorySearch && (
                  <Button variant="outline" onClick={() => {
                    setPokemonHistorySearch('');
                    fetchPokemonHistory();
                  }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <p className="text-slate-300 text-center py-8">Loading...</p>
              ) : pokemonHistory.length === 0 ? (
                <p className="text-slate-300 text-center py-8">
                  {pokemonHistorySearch ? 'No Pokémon found matching your search.' : 'No Pokémon catches recorded yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {pokemonHistory.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">🔴</div>
                        <div>
                          <div className="font-semibold text-lg">{entry.name}</div>
                          <div className="text-sm text-slate-300">
                            Caught by: <span className="text-yellow-300 font-medium">{entry.teamName}</span> (Team #{entry.teamId})
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatIST(entry.caughtAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {!historyLoading && pokemonHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-300">
                  Showing {pokemonHistory.length} {pokemonHistory.length === 1 ? 'catch' : 'catches'}
                  {pokemonHistorySearch && ` for "${pokemonHistorySearch}"`}
                </p>
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
