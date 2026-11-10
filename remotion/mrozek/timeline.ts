import narration from "../../public/mrozek/narration.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export interface Cue {
  text: string;
  start: number;
  end: number;
}

export interface Segment {
  id: string;
  chapter: number;
  visual: string;
  text: string;
  audio: string;
  duration: number;
  cues: Cue[];
}

export interface Chapter {
  n: number;
  title: string;
  years: string;
}

export const CHAPTERS: Chapter[] = [
  { n: 1, title: "Moje dzieciństwo", years: "1930–1939" },
  { n: 2, title: "Wojna i młodość", years: "1939–1949" },
  { n: 3, title: "Jak zostałem pisarzem", years: "1950–1956" },
  { n: 4, title: "Moje najsłynniejsze dzieła", years: "1957–1974" },
  { n: 5, title: "Moje życie na emigracji", years: "1963–1996" },
  { n: 6, title: "Moje życie prywatne", years: "1959–2006" },
  { n: 7, title: "Moje osiągnięcia", years: "1964–2013" },
  { n: 8, title: "Ostatni rozdział mojego życia", years: "2008–2013" },
];

// parametry montażu (sekundy)
const PRE_ROLL = 4.0; // portret wyłania się z ciemności, fortepian
const GAP = 0.25; // pauza między segmentami
const CARD = 2.8; // plansza rozdziału
const CARD_OVERLAP = 1.3; // narracja zaczyna się, gdy plansza jeszcze gaśnie
const BEFORE_END = 1.2; // przejście do czarno-białego portretu
const END_TITLE = 6.5;
const CREDITS = 14;

export interface PlacedSegment extends Segment {
  from: number; // klatka startu dźwięku
  frames: number; // długość dźwięku w klatkach
  visualFrom: number; // klatka startu obrazu (może zaczynać się wcześniej)
  visualTo: number; // klatka końca obrazu
}

export interface PlacedCard {
  chapter: Chapter;
  from: number;
  frames: number;
}

export interface Timeline {
  segments: PlacedSegment[];
  cards: PlacedCard[];
  endTitleFrom: number;
  creditsFrom: number;
  total: number;
  preRoll: number;
}

const f = (s: number) => Math.round(s * FPS);

export function buildTimeline(): Timeline {
  const segs = (narration as { segments: Segment[] }).segments;
  const placed: PlacedSegment[] = [];
  const cards: PlacedCard[] = [];
  let t = PRE_ROLL;
  let chapter = 0;
  for (const s of segs) {
    let visualStart = t;
    if (s.chapter !== chapter && s.chapter >= 1 && s.chapter <= 8) {
      const card = { chapter: CHAPTERS[s.chapter - 1], from: f(t), frames: f(CARD) };
      cards.push(card);
      visualStart = t + CARD - 0.6;
      t += CARD - CARD_OVERLAP;
    } else if (s.chapter === 9 && chapter !== 9) {
      t += BEFORE_END;
      visualStart = t - 0.8;
    }
    chapter = s.chapter;
    if (placed.length === 0) visualStart = 0;
    placed.push({ ...s, from: f(t), frames: f(s.duration), visualFrom: f(visualStart), visualTo: 0 });
    t += s.duration + GAP;
  }
  // obraz trwa do początku obrazu następnego segmentu (+ zakładka na przenikanie)
  for (let i = 0; i < placed.length; i++) {
    const next = placed[i + 1];
    placed[i].visualTo = next ? next.visualFrom + f(0.6) : f(t + 0.8);
  }
  const endTitleFrom = f(t + 0.5);
  const creditsFrom = endTitleFrom + f(END_TITLE);
  return { segments: placed, cards, endTitleFrom, creditsFrom, total: creditsFrom + f(CREDITS), preRoll: f(PRE_ROLL) };
}
