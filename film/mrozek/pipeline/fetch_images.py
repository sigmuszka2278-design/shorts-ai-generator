"""Pobiera fotografie z Wikimedia Commons i zapisuje ich opis licencyjny do public/mrozek/credits.json.

Pobierane są miniatury w standardowych szerokościach (thumb.wikimedia.org) – API i oryginały
Wikimedia mocno limitują ruch automatyczny. Adres miniatury wynika z MD5 nazwy pliku.
Autor, licencja i data zostały odczytane ze stron plików na Commons (pole `page`).

Użycie:  python film/mrozek/pipeline/fetch_images.py [klucz ...]
"""
import hashlib
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "public", "mrozek", "img")
CREDITS = os.path.join(ROOT, "public", "mrozek", "credits.json")
UA = "ClaudeCode-EduFilm/1.0 (https://claude.ai/code; educational documentary)"
_ca = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=_ca) if os.path.exists(_ca) else ssl.create_default_context()

# klucz: (plik na Commons, szerokość miniatury < szerokość oryginału, opis, autor, licencja, data)
IMAGES = {
    "portrait1960": ("Sławomir Mrożek 1960.jpg", 330, "Sławomir Mrożek, 1960", "Autor nieznany", "Public domain", "1960"),
    "signing2006": ("Sławomir Mrożek.jpg", 500, "Sławomir Mrożek podpisuje książki, Warszawa 2006", "Michał Kobyliński", "CC BY-SA 2.5", "2006"),
    "pastel1998": ("Mrożek.jpg", 1280, "Portret Sławomira Mrożka, pastel, 1998", "Edward Knapczyk", "CC BY-SA 4.0", "1998"),
    "signature": ("Sławomir Mrożek faksymile.png", 500, "Podpis Sławomira Mrożka (faksymile)", "Sławomir Mrożek", "Public domain", ""),
    "borzecin": ("Borzęcin kościół.jpg", 1920, "Borzęcin, kościół parafialny", "Jerzy Opioła", "CC BY-SA 3.0", "2012"),
    "borzecin2": ("Borzęcin Dolny kościół.jpg", 1280, "Borzęcin Dolny", "Jerzy Opioła", "CC BY-SA 4.0", "2015"),
    "krakow1933": ("Kraków, 1933.05.17 12.jpg", 1920, "Kraków, 17 maja 1933", "Autor nieznany", "Public domain", "1933"),
    "nowodworek": ("Bartłomiej Nowodworski High School, 9 Na Groblach square, Kraków, Poland.jpg", 1920,
                   "I LO im. Bartłomieja Nowodworskiego w Krakowie", "Zygmunt Put", "CC BY-SA 4.0", "2020"),
    "slon": ("Ilustration by Daniel Mróz 1957.jpg", 1280, "Daniel Mróz, ilustracja do „Słonia” (1957)", "Daniel Mróz", "CC BY-SA 3.0", "1957"),
    "tangostrip": ("Tango, texte de Slawomir Mrozek - btv1b10601854j (01 of 29).jpg", 3840,
                   "„Tango”, Paryż – fotografie Rogera Pica (BnF)", "Roger Pic", "Public domain", "1967"),
    "tangocluj": ("Julia Bereczky and György Barkó in Mrożek's Tango, Cluj-Napoca, September 1985.png", 500,
                  "„Tango”, Państwowy Teatr Węgierski w Klużu, 1985", "Autor nieznany", "Public domain", "1985"),
    "chiavari": ("Chiavari-1954.jpg", 960, "Chiavari, Liguria", "Autor nieznany", "CC BY 3.0", "lata 50."),
    "paris": ("Boekenstalletjes langs de Seine in Parijs, Bestanddeelnr 255-9957.jpg", 1920,
              "Paryż, bukiniści nad Sekwaną, 1960", "Willem van de Poll / Nationaal Archief", "CC0", "1960"),
    "prague": ("1968 tank na Vinohradské.jpg", 960, "Praga, sierpień 1968", "„Pueblo” (autor nieznany z nazwiska)", "Public domain", "1968"),
    "mexico": ("Hacienda pulquera - Tlaxcala - panoramio (3).jpg", 1920, "Hacjenda w stanie Tlaxcala, Meksyk", "diego_cue", "CC BY-SA 3.0", "2014"),
    "nice": ("Nice, Quai des États-Unis and Promenade des Anglais FRANCE.jpg", 1920, "Nicea, Promenade des Anglais", "Lspigon", "Public domain", "2006"),
    "church": ("Saints Peter and Paul Church. Kraków, Poland.jpg", 1920, "Kościół św. Piotra i Pawła w Krakowie", "Ввласенко", "CC BY-SA 3.0", "2022"),
    "sarkofag": ("Slawomir Mrozek sarkofag krypta kosciola sw Piotra i Pawla w Krakowie.jpg", 1920,
                 "Sarkofag Sławomira Mrożka, Panteon Narodowy w Krakowie", "Uuuxxxyyyzzz", "CC BY-SA 4.0", "2017"),
}


def thumb_url(title: str, width: int) -> str:
    name = title.replace(" ", "_")
    h = hashlib.md5(name.encode("utf-8")).hexdigest()
    q = urllib.parse.quote(name)
    suffix = ".png" if name.lower().endswith(".png") else ""
    return f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{width}px-{q}{suffix}"


def page_url(title: str) -> str:
    return "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(title.replace(" ", "_"))


def download(url: str) -> bytes:
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, context=CTX, timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            wait = 15 * (attempt + 1)
            print(f"  429 – czekam {wait}s")
            time.sleep(wait)
    raise RuntimeError("Wikimedia: zbyt wiele żądań")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    credits = {}
    only = set(sys.argv[1:])
    for key, (title, width, label, author, lic, date) in IMAGES.items():
        fname = key + (".png" if title.lower().endswith(".png") else ".jpg")
        path = os.path.join(OUT, fname)
        if (not only and not os.path.exists(path)) or key in only:
            data = download(thumb_url(title, width))
            if data[:1] == b"<":
                print("BŁĄD:", key)
                continue
            open(path, "wb").write(data)
            print("OK", key)
            time.sleep(2)
        credits[key] = {"file": fname, "label": label, "title": title, "page": page_url(title),
                        "author": author, "license": lic, "date": date}
    json.dump(credits, open(CREDITS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
