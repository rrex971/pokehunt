
import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/db';
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
  "Mega Blastoise",
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
  "Mega swampert",
  "Nidoking",
  "Nidoqueen",
  "Mamoswine",
  "Hippowdon",
  "Diggersby",
  "Mudsdale",
  "Sandslash",
  "Donphan",
  "Mega abomasnow",
  "Mega glalie",
  "Frosslass",
  "Weavile",
  "Cloyster",
  "Cryogonal",
  "Sandslash alola",
  "Crabominable",
  "Glaceon",
  "Walrein",
  "Rotom frost",
  "Beartic",
  "Mega pidgeot",
  "Hawlucha",
  "Staraptor",
  "Mandibuzz",
  "Sigylyph",
  "Salamence",
  "Archeops",
  "Drifblim",
  "Talonflame",
  "Skarmory",
  "Gliscor",
  "Mega pinsir",
  "Mega scizor",
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
  "Mega beedrill",
  "Crobat",
  "Salazzle",
  "Skuntank",
  "Swalot",
  "Seviper",
  "Weezing",
  "Dragalge",
  "Mega heracross",
  "Mega medicham",
  "Primeape",
  "Gallade",
  "Conkeldurr",
  "Infernape",
  "Mienshao",
  "Toxicroak",
  "Machamp",
  "Hariyama",
  "Passimian",
  "Mega alakazam",
  "Mega slowbro",
  "Mr.Mime",
  "Jynx",
  "Espeon",
  "Reuniclus",
  "Gothitelle",
  "Meowstik",
  "Bruxish",
  "Mega banette",
  "Mega sableye",
  "Gengar",
  "Mismagius",
  "Dusknoir",
  "Chandelure",
  "Cofagrigus",
  "Dhelmise",
  "Golurk",
  "Jellicent",
  "Mega garchomp",
  "Mega Altaria",
  "Dragonite",
  "Haxorus",
  "Druddigon",
  "Flygon",
  "Noivern",
  "Goodra",
  "Mega absol",
  "Mega sharpedo",
  "Krookodile",
  "Drapion",
  "Zoroark",
  "Umbreon",
  "Honchkrow",
  "Pangoro",
  "Scrafty",
  "Shiftry",
  "Hydreigon",
  "Mega aggron",
  "Mega steelix",
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
    // Prevent duplicate catches for the same team and pokemon name
    return new Promise<NextResponse>((resolve) => {
      db.get('SELECT id FROM pokemon WHERE teamId = ? AND name = ?', [session.teamId, caughtPokemon], (err, row) => {
        if (err) {
          resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
          return;
        }
        if (row) {
          // Already caught
          resolve(NextResponse.json({ message: `Already caught ${caughtPokemon}`, name: caughtPokemon }, { status: 409 }));
          return;
        }

        db.run('INSERT INTO pokemon (teamId, name) VALUES (?, ?)', [session.teamId, caughtPokemon], function (err2) {
          if (err2) {
            resolve(NextResponse.json({ message: 'Internal server error' }, { status: 500 }));
            return;
          }
          resolve(NextResponse.json({ message: `Successfully caught ${caughtPokemon}`, name: caughtPokemon }));
        });
      });
    });
  } else {
    return NextResponse.json({ message: 'Invalid Pokemon' }, { status: 400 });
  }
}
