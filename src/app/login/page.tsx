"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CroppedSprite from '@/components/CroppedSprite';

export default function LoginPage() {
  const [teamId, setTeamId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    // always POST to server so it can set the session cookie
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamId, pin }),
    });

    const data = await res.json();
    if (res.ok && data.isAdmin) {
      router.push('/admin');
    } else if (res.ok) {
      router.push('/dashboard');
    } else {
      setError(data.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-[#0b2545] text-white p-4 sm:p-6 flex items-start sm:items-center justify-center pt-12 sm:pt-6">
      <div className="max-w-sm w-full">
        <header className="mb-3 sm:mb-4 bg-slate-900/40 p-2 sm:p-6 rounded-lg flex flex-col items-center justify-center text-center">
          <div className="mb-1 sm:mb-2">
            <img src="/icons/pokeball.svg" alt="Pokéball" className="w-12 h-12 sm:w-16 sm:h-16" style={{ animation: 'var(--animate-pokeball-spin)' }} />
          </div>
          <img src="/pokehuntlogo.png" alt="Pokéhunt" className="w-32 sm:w-64 h-auto" />
          <p className="text-sm sm:text-base font-bold text-yellow-300 font-pkmndpb mt-1">A Trainer&apos;s Journey</p>
        </header>

        <Card className="bg-slate-800/60 border border-slate-700">
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="teamId">Team ID</Label>
                <Input id="teamId" placeholder="Enter your Team ID" value={teamId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamId(e.target.value)} className="bg-transparent text-white border border-slate-600/40" />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="pin">PIN</Label>
                <Input id="pin" type="password" placeholder="Enter your 4-digit PIN" value={pin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value)} className="bg-transparent text-white border border-slate-600/40" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end">
                <Button onClick={handleLogin} className="bg-yellow-400 text-slate-900 hover:bg-yellow-300">Login</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
