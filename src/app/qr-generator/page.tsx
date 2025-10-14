"use client";

import { useState } from 'react';
import { createHash } from 'crypto';

const POKEMON_LIST = ["Bulbasaur", "Charmander", "Squirtle", "Pikachu", "Jigglypuff", "Meowth", "Psyduck", "Snorlax", "Dragonite", "Mewtwo"];
const SECRET_KEY = process.env.NEXT_PUBLIC_QR_SECRET_KEY as string;

export default function QrGenerator() {
  const [selectedPokemon, setSelectedPokemon] = useState(POKEMON_LIST[0]);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const generateUrl = () => {
    const hash = createHash('sha256').update(selectedPokemon + SECRET_KEY).digest('hex');
    const url = `${window.location.origin}/catch?p=${hash}`;
    setGeneratedUrl(url);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Code URL Generator</h1>
      <div className="flex space-x-2">
        <select
          value={selectedPokemon}
          onChange={(e) => setSelectedPokemon(e.target.value)}
          className="p-2 border rounded"
        >
          {POKEMON_LIST.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button onClick={generateUrl} className="p-2 bg-blue-500 text-white rounded">
          Generate URL
        </button>
      </div>
      {generatedUrl && (
        <div className="mt-4 p-2 border rounded bg-gray-100">
          <p>Generated URL:</p>
          <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {generatedUrl}
          </a>
        </div>
      )}
    </div>
  );
}
