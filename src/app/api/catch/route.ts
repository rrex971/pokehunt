
import { NextRequest, NextResponse } from 'next/server';
import getPool from '@/db/db';
import { getSession } from '@/lib/session';
import { createHash } from 'crypto';

const POKEMON_LIST = [
  "Mega Houndoom",
  "Mega Charizard-X",
  "Volcarona",
  "Arcanine",
  "Torkoal",
  "Ninetales",
  "Darmanitan",
  "Typhlosion",
  "Emboar",
  "Pyroar",
  "Mega Gyarados",
  "Lapras",
  "Vaporeon",
  "Starmie",
  "Kingdra",
  "Crawdaunt",
  "Milotic",
  "Whiscash",
  "Mantine",
  "Kabutops",
  "Gastrodon",
  "Breloom",
  "Ludicolo",
  "Mega Sceptile",
  "Mega Venusaur",
  "Roserade",
  "Chesnaught",
  "Tsareena",
  "Lilligant",
  "Meganium",
  "Torterra",
  "Exeggutor-Alola",
  "Vileplume",
  "Victreebel",
  "Cradily",
  "Mega Manectric",
  "Mega Ampharos",
  "Electivire",
  "Luxray",
  "Magnezone",
  "Rotom",
  "Raichu",
  "Zebstrika",
  "Eelektross",
  "Heliolisk",
  "Togedemaru",
  "Mega Lopunny",
  "Mega Audino",
  "Tauros",
  "Snorlax",
  "Furret",
  "Ambipom",
  "Exploud",
  "Zangoose",
  "PorygonZ",
  "Stoutland",
  "Drampa",
  "Bewear",
  "Mega Aerodactyl",
  "Gigalith",
  "Rhyperior",
  "Lycanroc",
  "Golem-Alola",
  "Rampardos",
  "Barbaracle",
  "Minior",
  "Aurorus",
  "Magcargo",
  "Mega Camerupt",
  "Mega Swampert",
  "Nidoking",
  "Nidoqueen",
  "Mamoswine",
  "Hippowdon",
  "Diggersby",
  "Mudsdale",
  "Sandslash",
  "Donphan",
  "Mega Abomasnow",
  "Mega Glalie",
  "Froslass",
  "Weavile",
  "Cloyster",
  "Cryogonal",
  "Sandslash-Alola",
  "Crabominable",
  "Glaceon",
  "Walrein",
  "Rotom-Frost",
  "Beartic",
  "Mega Pidgeot",
  "Hawlucha",
  "Staraptor",
  "Mandibuzz",
  "Sigilyph",
  "Salamence",
  "Archeops",
  "Drifblim",
  "Talonflame",
  "Skarmory",
  "Gliscor",
  "Mega Pinsir",
  "Mega Scizor",
  "Scolipede",
  "Venomoth",
  "Yanmega",
  "Durant",
  "Ninjask",
  "Escavalier",
  "Galvantula",
  "Golisopod",
  "Vikavolt",
  "Accelgor",
  "Leavanny",
  "Forretress",
  "Mega Beedrill",
  "Crobat",
  "Salazzle",
  "Skuntank",
  "Swalot",
  "Seviper",
  "Weezing",
  "Dragalge",
  "Mega Heracross",
  "Mega Medicham",
  "Primeape",
  "Gallade",
  "Conkeldurr",
  "Infernape",
  "Mienshao",
  "Toxicroak",
  "Machamp",
  "Hariyama",
  "Passimian",
  "Mega Slowbro",
  "Mr. Mime",
  "Jynx",
  "Espeon",
  "Reuniclus",
  "Gothitelle",
  "Meowstic",
  "Bruxish",
  "Mega Banette",
  "Mega Sableye",
  "Gengar",
  "Mismagius",
  "Dusknoir",
  "Chandelure",
  "Cofagrigus",
  "Dhelmise",
  "Golurk",
  "Jellicent",
  "Mega Garchomp",
  "Mega Altaria",
  "Dragonite",
  "Haxorus",
  "Druddigon",
  "Flygon",
  "Noivern",
  "Goodra",
  "Mega Absol",
  "Mega Sharpedo",
  "Krookodile",
  "Drapion",
  "Zoroark",
  "Umbreon",
  "Honchkrow",
  "Pangoro",
  "Scrafty",
  "Shiftry",
  "Hydreigon",
  "Mega Aggron",
  "Mega Steelix",
  "Metagross",
  "Excadrill",
  "Bronzong",
  "Klinklang",
  "Dugtrio-Alola",
  "Lucario",
  "Ferrothorn",
  "Bisharp",
  "Mega Gardevoir",
  "Sylveon",
  "Mimikyu",
  "Clefable",
  "Granbull",
  "Klefki",
  "Togekiss",
  "Ninetales-Alola",
  "Florges",
  "Comfey",
  "Whimsicott",
  "Primarina",
  "Rillaboom",
  "Cinderace",
  "Inteleon",
  "Falinks",
  "Barraskewda",
  "Indeedee",
  "Grimmsnarl",
  "Sirfetch'd",
  "Morpeko",
  "Copperajah",
  "Meowscarada",
  "Skeledirge",
  "Quaquaval",
  "Lokix",
  "Pawmot",
  "Tinkaton",
  "Ceruledge",
  "Armarouge",
  "Brambleghast",
  "Clodsire",
  "Dudunsparce",
  "Pikachu",
  "Greninja",
  "Tyranitar",
  "Malamar",
];
const SECRET_KEY = process.env.QR_SECRET_KEY as string;

function verifyPokemonHash(pokemonName: string, hash: string): boolean {
  const expectedHash = createHash('sha256').update(pokemonName + SECRET_KEY).digest('hex');
  return hash === expectedHash;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.teamId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { pokemonHash } = await req.json();
  if (!pokemonHash) {
    return NextResponse.json({ message: 'Missing Pokemon data' }, { status: 400 });
  }

  let caughtPokemon: string | null = null;
  for (const pokemonName of POKEMON_LIST) {
    if (verifyPokemonHash(pokemonName, pokemonHash)) {
      caughtPokemon = pokemonName;
      break;
    }
  }

  if (caughtPokemon) {
    const pool = await getPool();
    
    try {
      // Prevent duplicate catches for the same team and pokemon name
      const checkResult = await pool.query(
        'SELECT id FROM pokemon WHERE "teamId" = $1 AND name = $2',
        [session.teamId, caughtPokemon]
      );

      if (checkResult.rows.length > 0) {
        // Already caught
        return NextResponse.json(
          { message: `Already caught ${caughtPokemon}`, name: caughtPokemon },
          { status: 409 }
        );
      }

      await pool.query(
        'INSERT INTO pokemon ("teamId", name) VALUES ($1, $2)',
        [session.teamId, caughtPokemon]
      );

      return NextResponse.json({
        message: `Successfully caught ${caughtPokemon}`,
        name: caughtPokemon
      });
    } catch (err) {
      console.error('Database error:', err);
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ message: 'Invalid Pokemon' }, { status: 400 });
  }
}
