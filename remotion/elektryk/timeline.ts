/** Timeline of the 60 s contest short. Times in seconds. */
export const FPS = 30;
export const TOTAL_SECONDS = 60;

export interface Line {
  /** text shown in subtitles */
  text: string;
  /** optional pronunciation for TTS */
  say?: string;
}

export interface Segment {
  id: string;
  start: number;
  end: number;
  voiceStart: number;
  lines: Line[];
}

export const SEGMENTS: Segment[] = [
  { id: "hook", start: 0, end: 3, voiceStart: 0.8, lines: [{ text: "Co by było, gdyby nikt tego nie naprawił?" }] },
  {
    id: "bez",
    start: 3,
    end: 8,
    voiceStart: 3.2,
    lines: [{ text: "Region bez elektryków?" }, { text: "Ciemne bloki, stojące fabryki, rozładowane auta." }],
  },
  {
    id: "region",
    start: 8,
    end: 18,
    voiceStart: 8.5,
    lines: [
      { text: "Ale Dolny Śląsk rośnie!" },
      { text: "Nowe osiedla, fabryki, fotowoltaika, ładowarki aut elektrycznych i pompy ciepła." },
      { text: "Bez elektryka nic z tego nie ruszy." },
    ],
  },
  {
    id: "dzien",
    start: 18,
    end: 30,
    voiceStart: 18.3,
    lines: [
      { text: "Jak wygląda dzień elektryka?" },
      { text: "Rano plan i schemat." },
      { text: "Potem montaż gniazdek i oświetlenia, szukanie usterek i pomiary." },
      { text: "Na koniec test, czy wszystko działa bezpiecznie." },
    ],
  },
  {
    id: "umiejetnosci",
    start: 30,
    end: 42,
    voiceStart: 30.3,
    lines: [
      { text: "Co trzeba umieć? Precyzja." },
      { text: "Logiczne myślenie, bo każda usterka to zagadka." },
      { text: "Bezpieczeństwo zawsze na pierwszym miejscu." },
      { text: "I praca w zespole." },
    ],
  },
  {
    id: "start",
    start: 42,
    end: 52,
    voiceStart: 42.3,
    lines: [
      { text: "Jak zacząć? Technikum – technik elektryk," },
      { text: "albo szkoła branżowa – elektryk." },
      { text: "Do tego praktyki u fachowców, a potem uprawnienia SEP.", say: "Do tego praktyki u fachowców, a potem uprawnienia es e pe." },
    ],
  },
  {
    id: "finał",
    start: 52,
    end: 60,
    voiceStart: 52.8,
    lines: [
      { text: "Region z elektrykami? Świeci, działa, rozwija się." },
      { text: "Elektryk – zawód, który włącza przyszłość!" },
    ],
  },
];
