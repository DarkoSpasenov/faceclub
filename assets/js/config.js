/* =====================================================================
   FACE CLUB – INHALTE PFLEGEN
   Nur diese Datei muss für neue Events, Preise oder vergebene Lounges
   angepasst werden. Datumsformat immer JJJJ-MM-TT.
   ===================================================================== */
window.FC_CONFIG = {

  phone: "+41 79 208 63 89",
  whatsapp: "41792086389",
  email: "info@faceclub.ch",
  currency: "CHF",

  /* Wie viele kommende Samstage im Reservationsformular erscheinen */
  saturdaysAhead: 10,

  /* Angekündigte Events. Ohne Eintrag gilt ein Samstag als "Clubnacht". */
  events: [
    {
      date: "2026-11-14",
      artists: "Jala Brat & Buba Corelli",
      title: "Grand Reopening",
      info: "GOAT Tour Special – presented by Skymusic",
      poster: "assets/event-jala-buba.jpg",
      soldOut: true          // Tickets ausverkauft, Lounges weiterhin auf Anfrage
    }
  ],

  /* Bereits vergebene Lounges pro Datum, z. B. "2026-11-14": [1, 2, 7] */
  reserved: {
    "2026-11-14": []
  },

  /* Vergangene Events mit offiziellem Flyer (neueste zuerst) */
  past: [
    { date: "2026-06-20", artists: "Elena Kitić",       poster: "assets/posters/2026-06-20-elena-kitic.jpg" },
    { date: "2026-06-13", artists: "Voyage",            poster: "assets/posters/2026-06-13-voyage.jpg" },
    { date: "2026-06-06", artists: "Nikolija",          poster: "assets/posters/2026-06-06-nikolija.jpg" },
    { date: "2026-05-30", artists: "Samra",             poster: "assets/posters/2026-05-30-samra.jpg" },
    { date: "2026-05-23", artists: "Zorana Mićanović",  poster: "assets/posters/2026-05-23-zorana-micanovic.jpg" },
    { date: "2026-05-02", artists: "Seka Aleksić",      poster: "assets/posters/2026-05-02-seka-aleksic.jpg" },
    { date: "2026-04-25", artists: "Desingerica",       poster: "assets/posters/2026-04-25-desingerica.jpg" },
    { date: "2026-04-04", artists: "Breskvica",         poster: "assets/posters/2026-04-04-breskvica.jpg" },
    { date: "2026-03-28", artists: "Senidah",           poster: "assets/posters/2026-03-28-senidah.jpg" },
    { date: "2026-01-10", artists: "Dragana Mirković",  poster: "assets/posters/2026-01-10-dragana-mirkovic.jpg" },
    { date: "2025-12-27", artists: "Indira Radić",      poster: "assets/posters/2025-12-27-indira-radic.jpg" },
    { date: "2025-11-15", artists: "Mile Kitić",        poster: "assets/posters/2025-11-15-mile-kitic.jpg" }
  ],

  /* Zonen und Mindestkonsumation – PROVISORISCH, mit dem Club abstimmen */
  zones: {
    vip:     { color: "#7b5cff", text: "#ffffff", min: 1500, seats: [8, 12],  photo: "assets/club-vip-moet.jpg" },
    premium: { color: "#4fddeb", text: "#04121a", min: 800,  seats: [6, 10],  photo: "assets/club-lounge.jpg" },
    lounge:  { color: "#c9cdd3", text: "#05060a", min: 500,  seats: [4, 8],   photo: "assets/club-lounge.jpg" }
  },

  /* Lounges: Mittelpunkt x/y und Grösse w/h auf dem Plan (1000 × 700).
     m = gleiche Lounge auf dem Handy-Plan (Hochformat 600 × 760): [x, y, w, h] */
  lounges: [
    { n: 1,  zone: "vip",     x: 190, y: 75,  w: 110, h: 60, m: [75, 52, 92, 56] },
    { n: 2,  zone: "vip",     x: 330, y: 75,  w: 110, h: 60, m: [180, 52, 92, 56] },
    { n: 3,  zone: "vip",     x: 670, y: 75,  w: 110, h: 60, m: [420, 52, 92, 56] },
    { n: 4,  zone: "vip",     x: 810, y: 75,  w: 110, h: 60, m: [525, 52, 92, 56] },
    { n: 5,  zone: "premium", x: 85,  y: 180, w: 70,  h: 80, m: [52, 175, 64, 74] },
    { n: 6,  zone: "premium", x: 85,  y: 270, w: 70,  h: 80, m: [52, 260, 64, 74] },
    { n: 7,  zone: "premium", x: 85,  y: 360, w: 70,  h: 80, m: [52, 345, 64, 74] },
    { n: 8,  zone: "premium", x: 85,  y: 450, w: 70,  h: 80, m: [52, 430, 64, 74] },
    { n: 9,  zone: "premium", x: 85,  y: 540, w: 70,  h: 80, m: [52, 515, 64, 74] },
    { n: 10, zone: "premium", x: 915, y: 180, w: 70,  h: 80, m: [548, 175, 64, 74] },
    { n: 11, zone: "premium", x: 915, y: 270, w: 70,  h: 80, m: [548, 260, 64, 74] },
    { n: 12, zone: "premium", x: 915, y: 360, w: 70,  h: 80, m: [548, 345, 64, 74] },
    { n: 13, zone: "premium", x: 915, y: 450, w: 70,  h: 80, m: [548, 430, 64, 74] },
    { n: 14, zone: "premium", x: 915, y: 540, w: 70,  h: 80, m: [548, 515, 64, 74] },
    { n: 15, zone: "lounge",  x: 240, y: 620, w: 100, h: 56, m: [110, 640, 86, 56] },
    { n: 16, zone: "lounge",  x: 355, y: 620, w: 100, h: 56, m: [205, 640, 86, 56] },
    { n: 17, zone: "lounge",  x: 470, y: 620, w: 100, h: 56, m: [300, 640, 86, 56] },
    { n: 18, zone: "lounge",  x: 585, y: 620, w: 100, h: 56, m: [395, 640, 86, 56] },
    { n: 19, zone: "lounge",  x: 700, y: 620, w: 100, h: 56, m: [490, 640, 86, 56] }
  ]
};
