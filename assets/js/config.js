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
    vip:     { color: "#8b6cff", text: "#ffffff", min: 1500, seats: [8, 12], photo: "assets/club-vip-moet.jpg" },
    premium: { color: "#4fddeb", text: "#04121a", min: 800,  seats: [6, 10], photo: "assets/club-lounge.jpg" },
    lounge:  { color: "#ff7ab8", text: "#2a0618", min: 500,  seats: [4, 8],  photo: "assets/club-lounge.jpg" }
  },

  /* Lounges nach dem 360°-Rundgang: Mittelpunkt x/y, Grösse w/h im Plan (1100 × 640).
     Nordwand 1–7, Südwand 8–14, VIP-Podest 15, Lounge-Bar 16–19.
     Auf dem Handy wird der Plan automatisch ins Hochformat gedreht. */
  lounges: [
    { n: 1,  zone: "premium", x: 400, y: 68,  w: 84, h: 50 },
    { n: 2,  zone: "premium", x: 495, y: 68,  w: 84, h: 50 },
    { n: 3,  zone: "premium", x: 590, y: 68,  w: 84, h: 50 },
    { n: 4,  zone: "premium", x: 685, y: 68,  w: 84, h: 50 },
    { n: 5,  zone: "premium", x: 780, y: 68,  w: 84, h: 50 },
    { n: 6,  zone: "vip",     x: 875, y: 68,  w: 84, h: 50 },
    { n: 7,  zone: "vip",     x: 970, y: 68,  w: 84, h: 50 },
    { n: 8,  zone: "premium", x: 400, y: 572, w: 84, h: 50 },
    { n: 9,  zone: "premium", x: 495, y: 572, w: 84, h: 50 },
    { n: 10, zone: "premium", x: 590, y: 572, w: 84, h: 50 },
    { n: 11, zone: "premium", x: 685, y: 572, w: 84, h: 50 },
    { n: 12, zone: "premium", x: 780, y: 572, w: 84, h: 50 },
    { n: 13, zone: "vip",     x: 875, y: 572, w: 84, h: 50 },
    { n: 14, zone: "vip",     x: 970, y: 572, w: 84, h: 50 },
    { n: 15, zone: "vip",     x: 312, y: 552, w: 78, h: 50 },
    { n: 16, zone: "lounge",  x: 52,  y: 200, w: 50, h: 62 },
    { n: 17, zone: "lounge",  x: 52,  y: 275, w: 50, h: 62 },
    { n: 18, zone: "lounge",  x: 52,  y: 350, w: 50, h: 62 },
    { n: 19, zone: "lounge",  x: 52,  y: 425, w: 50, h: 62 }
  ]
};
