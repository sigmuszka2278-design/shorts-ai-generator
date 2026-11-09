"""Scenariusz filmu – jedno źródło prawdy dla lektora, napisów, obrazu i dźwięku."""

TITLE = "CO BY SIĘ STAŁO, GDYBYŚ WPADŁ DO CZARNEJ DZIURY?!"
FPS = 30
DURATION = 30.0
WIDTH, HEIGHT = 1080, 1920

# (start, koniec, tekst lektora, fragmenty napisów, słowa wyróżnione kolorem)
SEGMENTS = [
    (0.0, 4.0,
     "Co by się stało, gdybyś zbliżył się do czarnej dziury? To bardziej niesamowite, niż myślisz!",
     ["Co by się stało,", "gdybyś zbliżył się", "do czarnej dziury?", "To bardziej niesamowite,", "niż myślisz!"],
     {"czarnej", "dziury?", "niesamowite,"}),
    (4.0, 9.0,
     "Jej grawitacja jest tak silna, że nawet światło nie może uciec zza horyzontu zdarzeń!",
     ["Jej grawitacja", "jest tak silna,", "że nawet światło", "nie może uciec", "zza horyzontu zdarzeń!"],
     {"grawitacja", "światło", "uciec", "horyzontu", "zdarzeń!"}),
    (9.0, 15.0,
     "Dla odległego obserwatora twój zegar wyglądałby, jakby chodził coraz wolniej!",
     ["Dla odległego", "obserwatora", "twój zegar wyglądałby,", "jakby chodził", "coraz wolniej!"],
     {"zegar", "wolniej!"}),
    (15.0, 21.0,
     "A gdy przekroczysz horyzont zdarzeń, nie ma już drogi powrotnej!",
     ["A gdy przekroczysz", "horyzont zdarzeń,", "nie ma już", "drogi powrotnej!"],
     {"horyzont", "zdarzeń,", "powrotnej!"}),
    (21.0, 26.0,
     "Co dzieje się dalej? Nasza fizyka nie potrafi jeszcze opisać wszystkiego, co kryje wnętrze czarnej dziury!",
     ["Co dzieje się dalej?", "Nasza fizyka", "nie potrafi jeszcze", "opisać wszystkiego,", "co kryje wnętrze", "czarnej dziury!"],
     {"dalej?", "fizyka", "wnętrze"}),
    (26.0, 30.0,
     "A ty? Odważyłbyś się zobaczyć czarną dziurę z bliska?",
     ["A ty?", "Odważyłbyś się", "zobaczyć czarną dziurę", "z bliska?"],
     {"ty?", "Odważyłbyś", "bliska?"}),
]

# Momenty przejść (s) – dynamiczne cięcia co 3–5 s
TRANSITIONS = [4.0, 9.0, 12.0, 15.0, 18.0, 21.0, 23.5, 26.0]
