/** Co widać na ekranie podczas każdego segmentu narracji (klucz = pole `visual` w scenariuszu). */

export type KenBurns = "in" | "out" | "left" | "right" | "up" | "down";

export interface PhotoShot {
  img: string; // klucz z public/mrozek/credits.json
  kb: KenBurns;
  focus?: [number, number]; // punkt zainteresowania (0–1)
  fit?: "cover" | "contain";
  /** udział w czasie segmentu (dla kilku zdjęć) */
  share?: number;
}

export type Plate =
  | { type: "press" }
  | { type: "books"; books: { title: string; meta: string }[]; note?: string }
  | { type: "book"; title: string; meta: string; lines?: string[] }
  | { type: "baltazar" }
  | { type: "awards" };

export type VisualSpec =
  | { kind: "talk"; bw?: boolean }
  | { kind: "photos"; shots: PhotoShot[]; place: string; date?: string }
  | { kind: "strip"; img: string; place: string; date?: string }
  | { kind: "split"; plate: Plate };

export const VISUALS: Record<string, VisualSpec> = {
  talk: { kind: "talk" },
  talkbw: { kind: "talk", bw: true },
  borzecin: { kind: "photos", place: "Borzęcin, Małopolska", date: "1930", shots: [{ img: "borzecin", kb: "in", focus: [0.4, 0.45] }] },
  krakow1933: { kind: "photos", place: "Kraków, Rynek Główny", date: "1933", shots: [{ img: "krakow1933", kb: "right", focus: [0.5, 0.5] }] },
  war: { kind: "photos", place: "Borzęcin", date: "1939", shots: [{ img: "borzecin2", kb: "out", focus: [0.6, 0.45] }] },
  matura: { kind: "photos", place: "I LO im. B. Nowodworskiego, Kraków", date: "1949", shots: [{ img: "nowodworek", kb: "left", focus: [0.5, 0.5] }] },
  press: { kind: "split", plate: { type: "press" } },
  books1953: {
    kind: "split",
    plate: {
      type: "books",
      books: [
        { title: "Opowiadania z Trzmielowej Góry", meta: "1953" },
        { title: "Półpancerze praktyczne", meta: "1953" },
      ],
      note: "pierwsze książki",
    },
  },
  slon: { kind: "photos", place: "Daniel Mróz – ilustracja do „Słonia”", date: "1957", shots: [{ img: "slon", kb: "up", fit: "contain", focus: [0.5, 0.4] }] },
  wesele: { kind: "split", plate: { type: "book", title: "Wesele w Atomicach", meta: "opowiadania · 1959" } },
  policja: {
    kind: "split",
    plate: { type: "book", title: "Policja", meta: "dramat · 1958", lines: ["debiut dramatopisarski", "prapremiera: Teatr Dramatyczny, Warszawa"] },
  },
  tango: { kind: "strip", img: "tangostrip", place: "„Tango” w Paryżu, 1967 – fot. Roger Pic" },
  emigranci: {
    kind: "split",
    plate: { type: "book", title: "Emigranci", meta: "dramat · 1974", lines: ["AA – intelektualista", "XX – robotnik", "piwnica, noc sylwestrowa"] },
  },
  chiavari: { kind: "photos", place: "Chiavari, Liguria", date: "1963", shots: [{ img: "chiavari", kb: "left", focus: [0.5, 0.55] }] },
  paris: { kind: "photos", place: "Paryż", date: "1968", shots: [{ img: "paris", kb: "in", focus: [0.45, 0.5] }] },
  prague: { kind: "photos", place: "Praga, sierpień 1968", date: "28 VIII 1968", shots: [{ img: "prague", kb: "right", focus: [0.5, 0.5] }] },
  mexico: {
    kind: "photos",
    place: "Meksyk → Kraków",
    date: "1989–1996",
    shots: [
      { img: "mexico", kb: "left", focus: [0.5, 0.5], share: 0.55 },
      { img: "pastel1998", kb: "up", fit: "contain", focus: [0.5, 0.45], share: 0.45 },
    ],
  },
  baltazar: { kind: "split", plate: { type: "baltazar" } },
  tangoworld: {
    kind: "photos",
    place: "„Tango” w Klużu · spotkanie z czytelnikami, Warszawa",
    shots: [
      { img: "tangocluj", kb: "in", fit: "contain", focus: [0.45, 0.4], share: 0.5 },
      { img: "signing2006", kb: "in", focus: [0.35, 0.3], share: 0.5 },
    ],
  },
  awards: { kind: "split", plate: { type: "awards" } },
  nice: { kind: "photos", place: "Nicea", date: "2008–2013", shots: [{ img: "nice", kb: "out", focus: [0.4, 0.5] }] },
  sarkofag: {
    kind: "photos",
    place: "Panteon Narodowy, Kraków",
    date: "17 IX 2013",
    shots: [
      { img: "church", kb: "up", focus: [0.5, 0.35], share: 0.45 },
      { img: "sarkofag", kb: "in", focus: [0.48, 0.55], share: 0.55 },
    ],
  },
};
