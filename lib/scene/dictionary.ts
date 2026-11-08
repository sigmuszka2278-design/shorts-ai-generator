import type { AnimalId, EffectKind, MagicId, Motion, MusicId, ThemeId } from "./types";

/**
 * Polish keyword dictionary used to understand the user's idea.
 * Matching is done on lower-cased text without diacritics; every entry is a
 * word prefix (stem) unless it is listed in `exact`.
 */
export interface KeywordEntry<T extends string> {
  id: T;
  label: string;
  stems: string[];
  exact?: string[];
}

export const ANIMALS: KeywordEntry<AnimalId>[] = [
  { id: "kot", label: "kotek", stems: ["kotek", "kotk", "kotki", "kotow", "kici", "kotecz"], exact: ["kot", "kota", "koty", "kotu", "kotem"] },
  { id: "pies", label: "piesek", stems: ["piesek", "pieske", "piesk", "szczeni", "psiak", "psina"], exact: ["pies", "psa", "psy", "psem", "psu", "psow"] },
  { id: "krolik", label: "króliczek", stems: ["krolik", "kroliczk", "kroliczek", "zajac", "zajacz", "zajecz"] },
  { id: "mis", label: "miś", stems: ["misiu", "misiek", "misia", "misie", "misiow", "niedzwi", "misiem"], exact: ["mis"] },
  { id: "zaba", label: "żabka", stems: ["zaba", "zabk", "zaby", "zabe", "zabo"] },
  { id: "kaczka", label: "kaczuszka", stems: ["kacz", "kurczacz", "kurczak", "ptasz", "ptak"] },
  { id: "jednorozec", label: "jednorożec", stems: ["jednoroz", "pegaz", "kucyk", "konik"] },
  { id: "smok", label: "smoczek", stems: ["smok", "smocz", "dinozaur", "dino"] },
  { id: "panda", label: "panda", stems: ["pand"] },
  { id: "lis", label: "lisek", stems: ["lisek", "liska", "liski", "liskow", "liskiem"], exact: ["lis", "lisa", "lisy", "lisem", "lisow"] },
  { id: "pingwin", label: "pingwinek", stems: ["pingwin"] },
  { id: "swinka", label: "świnka", stems: ["swink", "swini", "prosiacz", "prosiak"] },
];

export const MAGIC: KeywordEntry<MagicId>[] = [
  { id: "rozdzka", label: "magiczna różdżka", stems: ["rozdzk", "czarodziej", "czarow", "czary", "zaklec", "wrozk"] },
  { id: "gwiazda", label: "gwiazdka", stems: ["gwiazd", "gwiezd"] },
  { id: "korona", label: "korona", stems: ["koron", "krol", "ksiezniczk", "ksiaz"] },
  { id: "prezent", label: "prezent", stems: ["prezent", "urodzin", "niespodzian", "paczk"] },
  { id: "krysztal", label: "kryształ", stems: ["krysztal", "diament", "klejnot", "skarb"] },
  { id: "balon", label: "balonik", stems: ["balon"] },
  { id: "serce", label: "serduszko", stems: ["serc", "serdusz", "milosc", "kocha"] },
  { id: "ksiezyc", label: "księżyc", stems: ["ksiezyc", "dobranoc", "kolysank"] },
  { id: "grzybek", label: "grzybek", stems: ["grzyb", "muchomor"] },
  { id: "lizak", label: "lizak", stems: ["lizak", "cukier", "slodycz", "cukierk", "tort", "ciast", "lody", "lodzik"] },
];

export const THEMES: KeywordEntry<ThemeId>[] = [
  { id: "kosmos", label: "kosmos", stems: ["kosmos", "kosmicz", "planet", "rakiet", "astronaut", "galakty", "ufo"] },
  { id: "ocean", label: "ocean", stems: ["ocean", "morz", "podwod", "ryb", "plaz", "wod", "rafa", "syren"] },
  { id: "las", label: "las", stems: ["las", "lesn", "lesie", "drzew", "puszcz"] },
  { id: "zamek", label: "zamek", stems: ["zamek", "zamku", "zamki", "palac", "ksiezniczk", "krolestw", "rycerz"] },
  { id: "cukierkowo", label: "kraina słodyczy", stems: ["cukier", "slodycz", "lizak", "tort", "ciast", "lody", "lodzik", "czekolad"] },
  { id: "noc", label: "noc", stems: ["noc", "nocn", "dobranoc", "sen", "spani", "kolysank", "ksiezyc"] },
  { id: "laka", label: "łąka", stems: ["lak", "lace", "kwiat", "ogrod", "trawa", "farm", "wies", "motyl"] },
  { id: "niebo", label: "niebo", stems: ["nieb", "chmur", "tecz", "slonc", "lata", "lot"] },
];

export const MOTIONS: { id: Motion; label: string; stems: string[] }[] = [
  { id: "jump", label: "skakanie", stems: ["skacz", "skak", "podskak", "skok", "hop"] },
  { id: "wiggle", label: "taniec", stems: ["tancz", "tanie", "tanc", "bujaj", "kiwa"] },
  { id: "float", label: "latanie", stems: ["lata", "lataj", "fruw", "lec", "unos", "plyw", "szybuj"] },
  { id: "spin", label: "wirowanie", stems: ["kreci", "kreca", "wiruj", "obrac", "karuzel"] },
  { id: "roll", label: "turlanie", stems: ["turla", "tocz", "tocza"] },
  { id: "bounce", label: "odbijanie", stems: ["odbij", "skacza", "sprezyn"] },
];

export const EFFECTS: { id: EffectKind; label: string; stems: string[] }[] = [
  { id: "rainbow", label: "tęcza", stems: ["tecz"] },
  { id: "confetti", label: "konfetti", stems: ["konfetti", "urodzin", "impreza", "imprez", "zabaw", "swieto", "przyjec"] },
  { id: "sparkles", label: "iskierki", stems: ["magi", "czar", "rozdzk", "brokat", "blysk", "iskr", "swiec"] },
  { id: "bubbles", label: "bańki", stems: ["bank", "babel", "bombel", "mydl"] },
  { id: "stars", label: "deszcz gwiazd", stems: ["gwiazd", "spadajac"] },
  { id: "hearts", label: "serduszka", stems: ["serc", "serdusz", "milosc", "kocha"] },
];

export const BALL_STEMS = ["kul", "pilk", "pilek", "pilecz", "kolecz", "kolka", "kolko", "bomb", "kulecz", "kuleczk"];

export const COLORS: { label: string; stems: string[]; hex: string }[] = [
  { label: "czerwony", stems: ["czerwon"], hex: "#ff4d6d" },
  { label: "pomarańczowy", stems: ["pomarancz"], hex: "#ff9f1c" },
  { label: "żółty", stems: ["zolt", "zloc"], hex: "#ffd60a" },
  { label: "zielony", stems: ["zielon"], hex: "#52d273" },
  { label: "niebieski", stems: ["niebiesk", "blekit", "granat"], hex: "#3a86ff" },
  { label: "fioletowy", stems: ["fiolet", "liliow", "purpur"], hex: "#9b5de5" },
  { label: "różowy", stems: ["rozow"], hex: "#ff70a6" },
  { label: "turkusowy", stems: ["turkus", "mietow"], hex: "#2ec4b6" },
  { label: "złoty", stems: ["zlot"], hex: "#f9c80e" },
  { label: "srebrny", stems: ["srebr"], hex: "#c0d6df" },
];

export const NUMBER_WORDS: Record<string, number> = {
  jeden: 1, jedna: 1, jedno: 1,
  dwa: 2, dwie: 2, dwoje: 2, dwoch: 2,
  trzy: 3, troje: 3, trzech: 3,
  cztery: 4, czworo: 4, czterech: 4,
  piec: 5, piecioro: 5, pieciu: 5,
  szesc: 6, szesciu: 6,
  siedem: 7, siedmiu: 7,
  osiem: 8, osmiu: 8,
  dziewiec: 9, dziewieciu: 9,
  dziesiec: 10, dziesieciu: 10,
  jedenascie: 11, dwanascie: 12,
  dwoma: 2, trzema: 3, czterema: 4, piecioma: 5, szescioma: 6, siedmioma: 7, osmioma: 8, dziewiecioma: 9, dziesiecioma: 10,
  duzo: 8, wiele: 8, mnostwo: 10, tysiac: 12, sto: 12,
};

export const THEME_LABELS: Record<ThemeId, string> = {
  laka: "Słoneczna łąka",
  kosmos: "Kosmos",
  ocean: "Podwodny świat",
  las: "Zaczarowany las",
  zamek: "Bajkowy zamek",
  cukierkowo: "Kraina słodyczy",
  noc: "Gwiaździsta noc",
  niebo: "Wśród chmur",
};

export const ANIMAL_LABELS: Record<AnimalId, string> = Object.fromEntries(
  ANIMALS.map((a) => [a.id, a.label]),
) as Record<AnimalId, string>;

export const MAGIC_LABELS: Record<MagicId, string> = Object.fromEntries(
  MAGIC.map((m) => [m.id, m.label]),
) as Record<MagicId, string>;

export const MUSIC_FOR_THEME: Record<ThemeId, MusicId> = {
  laka: "wesola",
  kosmos: "marzycielska",
  ocean: "marzycielska",
  las: "wesola",
  zamek: "skoczna",
  cukierkowo: "skoczna",
  noc: "marzycielska",
  niebo: "wesola",
};

/** Animal base colours (body, accent). */
export const ANIMAL_COLORS: Record<AnimalId, [string, string]> = {
  kot: ["#ffb347", "#ffe0b2"],
  pies: ["#c68b59", "#f5deb3"],
  krolik: ["#f2f2f7", "#ffb6c1"],
  mis: ["#a0522d", "#deb887"],
  zaba: ["#5fd068", "#c7f9cc"],
  kaczka: ["#ffd93d", "#ff8c42"],
  jednorozec: ["#ffffff", "#c77dff"],
  smok: ["#4cc9f0", "#b5f2ff"],
  panda: ["#ffffff", "#2b2d42"],
  lis: ["#ff7b25", "#fff3e6"],
  pingwin: ["#2b2d42", "#ffffff"],
  swinka: ["#ffafcc", "#ffc8dd"],
};

export const MAGIC_COLORS: Record<MagicId, [string, string]> = {
  rozdzka: ["#ffd60a", "#9b5de5"],
  gwiazda: ["#ffd60a", "#fff3b0"],
  korona: ["#f9c80e", "#ff4d6d"],
  prezent: ["#ff4d6d", "#ffd60a"],
  krysztal: ["#4cc9f0", "#c77dff"],
  balon: ["#ff70a6", "#ffffff"],
  serce: ["#ff4d6d", "#ffb3c6"],
  ksiezyc: ["#ffe66d", "#fff9c4"],
  grzybek: ["#ef233c", "#ffffff"],
  lizak: ["#ff70a6", "#70d6ff"],
};
