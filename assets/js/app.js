/* Face Club – Seitenlogik. Inhalte kommen aus config.js, Texte aus i18n.js. */
(function () {
  "use strict";
  const C = window.FC_CONFIG, L = window.FC_I18N;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Sprache ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function detectLang() {
    const saved = store.get("fc-lang");
    if (saved && L[saved]) return saved;
    const langs = (navigator.languages || [navigator.language || "de"]).map(l => l.toLowerCase());
    for (const l of langs) {
      if (/^(sr|hr|bs|sh|cnr)\b/.test(l)) return "bks";
      if (/^de\b/.test(l)) return "de";
      if (/^en\b/.test(l)) return "en";
    }
    return "de";
  }
  let lang = detectLang();
  const t = (key, vars) => {
    let s = (L[lang] && L[lang][key]) ?? L.de[key] ?? key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- Datum ---------- */
  const toDate = d => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const dm = d => String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + ".";
  const longDate = d => {
    const day = L[lang].days[d.getDay()], mon = L[lang].months[d.getMonth()];
    return lang === "en" ? `${day}, ${d.getDate()} ${mon}` : cap(`${day}, ${d.getDate()}. ${mon}`);
  };
  const shortDate = d => cap(L[lang].daysShort[d.getDay()]) + " " + dm(d);
  const money = n => C.currency + " " + n.toLocaleString("de-CH");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = C.events.filter(e => toDate(e.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const eventOn = date => C.events.find(e => e.date === date);

  /* Kommende Samstage + angekündigte Events */
  const dates = (() => {
    const set = new Set(upcoming.map(e => e.date));
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    for (let i = 0; i < (C.saturdaysAhead || 8); i++) { set.add(iso(d)); d.setDate(d.getDate() + 7); }
    return Array.from(set).sort();
  })();

  const state = { date: dates[0], lounge: null, zones: new Set(Object.keys(C.zones)) };
  const reserved = () => new Set((C.reserved && C.reserved[state.date]) || []);
  const loungeBy = n => C.lounges.find(l => l.n === n);

  /* ---------- Statische Texte ---------- */
  function applyStatic() {
    document.documentElement.lang = L[lang].htmlLang;
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $$("[data-i18n-ph]").forEach(el => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    $$(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    const box = $("#heroEvent"), e = upcoming[0];
    if (!e) {
      box.innerHTML = `<p class="kicker">${t("hero.none.kicker")}</p><h1 class="cond">${t("hero.none.title")}</h1><a class="pill" href="reservieren.html">${t("cta.reserve")}</a>`;
      return;
    }
    const d = toDate(e.date);
    box.innerHTML = `<p class="kicker">${longDate(d)} – ${esc(e.title)}${e.soldOut ? ` <span class="soldout">${t("card.soldout")}</span>` : ""}</p>
      <h1 class="cond">${esc(e.artists)}<span class="vh"> – ${esc(t("hero.live", { a: "" }).trim())}</span></h1>
      <a class="pill" href="reservieren.html#${e.date}">${t("cta.reserve")}</a>`;
  }

  /* ---------- Event-Karten ---------- */
  function renderCards() {
    const up = upcoming.map(e => {
      const d = toDate(e.date);
      const pic = e.poster
        ? `<div class="pic sq"><img src="${e.poster}" alt="Flyer ${esc(e.artists)}" loading="lazy" width="800" height="800">${e.soldOut ? `<span class="soldout">${t("card.soldout")}</span>` : ""}</div>`
        : `<div class="pic type"><b class="cond">${esc(e.artists)}</b><span>${shortDate(d)}</span></div>`;
      return `<article class="card">${pic}<h3>${esc(e.artists)}</h3><p>${longDate(d)} – ${esc(e.title)}</p>
        <a class="pill" href="reservieren.html#${e.date}">${t("cta.reserve")}</a></article>`;
    }).join("");
    const past = C.past.map(p => {
      const d = toDate(p.date);
      return `<article class="card past"><div class="pic"><img src="${p.poster}" alt="Flyer ${esc(p.artists)}" loading="lazy" width="720" height="900"></div>
        <h3>${esc(p.artists)}</h3><p>${t("card.past")}, ${d.getDate()}. ${L[lang].months[d.getMonth()]} ${d.getFullYear()}</p></article>`;
    }).join("");
    $("#track").innerHTML = up + past;
    updateArrows();
  }
  function updateArrows() {
    const tr = $("#track");
    $("#prev").disabled = tr.scrollLeft < 5;
    $("#next").disabled = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 5;
  }
  function initCarousel() {
    const tr = $("#track");
    const step = () => (($(".card", tr) || {}).offsetWidth || 320) + 20;
    $("#prev").addEventListener("click", () => tr.scrollBy({ left: -step(), behavior: "smooth" }));
    $("#next").addEventListener("click", () => tr.scrollBy({ left: step(), behavior: "smooth" }));
    tr.addEventListener("scroll", updateArrows, { passive: true });
    tr.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { e.preventDefault(); tr.scrollBy({ left: step(), behavior: "smooth" }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); tr.scrollBy({ left: -step(), behavior: "smooth" }); }
    });
    window.addEventListener("resize", updateArrows);
  }

  /* ---------- Datum-Auswahl ---------- */
  function dateLabel(x) { const e = eventOn(x); return e ? e.artists : t("clubnight"); }
  function renderDates() {
    $("#dates").innerHTML = dates.map(x => {
      const d = toDate(x), e = eventOn(x);
      return `<button type="button" class="date-btn${e ? " has-event" : ""}" data-date="${x}" aria-pressed="${x === state.date}">
        <b>${shortDate(d)}</b><span>${esc(dateLabel(x))}</span></button>`;
    }).join("");
    $("#f-date").innerHTML = dates.map(x => `<option value="${x}">${shortDate(toDate(x))} – ${esc(dateLabel(x))}</option>`).join("");
    $("#f-date").value = state.date;
  }
  function setDate(x) {
    if (!dates.includes(x)) return;
    state.date = x;
    if (state.lounge && reserved().has(state.lounge)) state.lounge = null;
    $$("#dates .date-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.date === x)));
    $("#f-date").value = x;
    const btn = $(`#dates .date-btn[data-date="${x}"]`);
    if (btn) btn.scrollIntoView({ block: "nearest", inline: "nearest" });
    renderLoungeSelect(); renderTables(); renderPick();
  }

  /* ---------- Zonen ---------- */
  function renderZones() {
    $("#zones").innerHTML = Object.entries(C.zones).map(([k, z]) =>
      `<li><button type="button" aria-pressed="${state.zones.has(k)}" data-zone="${k}"><i style="background:${z.color}"></i><b>${t("zone." + k)}</b><em>${t("zone.from", { p: money(z.min) })}, ${t("zone.persons", { a: z.seats[0], b: z.seats[1] })}</em></button></li>`).join("") + `<li class="free"><i></i><em>${t("plan.high")}</em></li>`;
  }

  /* ---------- Plan nach dem 360°-Rundgang (Querformat 1100 × 640, am Handy gedreht) ---------- */
  const PW = 1100, PH = 640;
  const FEATURES = [
    // Räume
    { t: "rect", c: "hall",  x: 250, y: 20,  w: 830, h: 600, rx: 14 },
    { t: "rect", c: "room2", x: 20,  y: 140, w: 240, h: 360, rx: 12 },
    { t: "rect", c: "glass", x: 244, y: 250, w: 14,  h: 140, rx: 3 },
    // erhöhte Lounge-Podeste entlang der Wände
    { t: "rect", c: "deck",  x: 340, y: 30,  w: 680, h: 78,  rx: 10 },
    { t: "rect", c: "deck",  x: 340, y: 532, w: 680, h: 80,  rx: 10 },
    { t: "circle", c: "podium", x: 312, y: 552, r: 58 },
    // Bars, Bühne
    { t: "ellipse", c: "bar", x: 650, y: 320, rx: 125, ry: 72 },
    { t: "rect", c: "bar2",  x: 262, y: 36,  w: 58,  h: 150, rx: 8 },
    { t: "rect", c: "stage", x: 1012, y: 200, w: 56, h: 240, rx: 8 },
    { t: "rect", c: "screen", x: 1072, y: 210, w: 6, h: 220, rx: 3 },
    // Stehtische (nicht reservierbar)
    ...[[420,190],[515,172],[800,182],[885,212],[420,452],[520,470],[800,458],[885,428],[360,320],[950,320],
        [140,230],[205,330],[140,430]].map(([x, y]) => ({ t: "circle", c: "high", x, y, r: 10 })),
    // Ringleuchten in der Lounge-Bar
    ...[[165,218],[205,290],[150,375],[200,452]].map(([x, y]) => ({ t: "circle", c: "ring", x, y, r: 20 }))
  ];
  const LABELS = [
    { k: "plan.bar",   x: 650,  y: 326, c: "lbl-bar" },
    { k: "plan.bar2",  x: 291,  y: 116, c: "lbl", small: true },
    { k: "plan.dj",    x: 1040, y: 326, c: "lbl-stage" },
    { k: "plan.floor", x: 860,  y: 326, c: "lbl" },
    { k: "plan.room2", x: 150,  y: 166, c: "lbl", px: 230, py: 872 },
    { k: "plan.vip",   x: 312,  y: 482, c: "lbl-vip", small: true, px: 432, py: 800 }
  ];
  const mqMob = window.matchMedia("(max-width:700px)");
  const isPortrait = () => mqMob.matches;
  // Drehung 90° gegen den Uhrzeigersinn: Bühne oben, Lounge-Bar unten
  const rp = (x, y) => (isPortrait() ? [y, PW - x] : [x, y]);
  const rr = (x, y, w, h) => (isPortrait() ? [y, PW - x - w, h, w] : [x, y, w, h]);

  function svgEl(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function drawPlan(svg, interactive) {
    const port = isPortrait(), res = interactive ? reserved() : new Set();
    const fs = port ? 26 : 20, ls = port ? 22 : 15;
    svg.setAttribute("viewBox", port ? `0 0 ${PH} ${PW}` : `0 0 ${PW} ${PH}`);
    svg.innerHTML = "";
    const id = svg.id || "p";
    svg.insertAdjacentHTML("afterbegin", `<defs>
      <pattern id="${id}-grid" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#0a0e2a"/><path d="M40 0H0V40" fill="none" stroke="#1b2350" stroke-width="1"/></pattern>
      <radialGradient id="${id}-room2" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1a1240"/><stop offset="1" stop-color="#0c0a22"/></radialGradient>
      <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`);
    const fill = { hall: `url(#${id}-grid)`, room2: `url(#${id}-room2)` };
    FEATURES.forEach(f => {
      let el;
      if (f.t === "rect") { const [x, y, w, h] = rr(f.x, f.y, f.w, f.h); el = svgEl("rect", { x, y, width: w, height: h, rx: f.rx || 0 }); }
      else if (f.t === "circle") { const [x, y] = rp(f.x, f.y); el = svgEl("circle", { cx: x, cy: y, r: f.r }); }
      else { const [x, y] = rp(f.x, f.y); el = svgEl("ellipse", { cx: x, cy: y, rx: port ? f.ry : f.rx, ry: port ? f.rx : f.ry }); }
      el.setAttribute("class", "pf-" + f.c);
      if (fill[f.c]) el.setAttribute("fill", fill[f.c]);
      if (f.c === "bar" || f.c === "screen" || f.c === "ring") el.setAttribute("filter", `url(#${id}-glow)`);
      svg.append(el);
    });
    LABELS.forEach(l => {
      const [x, y] = port && l.px ? [l.px, l.py] : rp(l.x, l.y);
      svg.append(svgEl("text", { x, y: y + 5, "text-anchor": "middle", class: "pl " + l.c, style: `font-size:${l.small ? ls - 2 : ls}px` }, t(l.k)));
    });
    const g = svgEl("g", { id: interactive ? "tables" : "" });
    C.lounges.forEach(l => {
      const z = C.zones[l.zone], taken = res.has(l.n);
      const [x, y, w, h] = rr(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h);
      const el = svgEl("g", { class: "tbl" + (taken ? " reserved" : "") + (interactive && state.lounge === l.n ? " selected" : "") + (state.zones.has(l.zone) || !interactive ? "" : " dim") });
      el.dataset.n = l.n;
      if (interactive) {
        el.setAttribute("tabindex", taken ? "-1" : "0");
        el.setAttribute("role", "button");
        el.setAttribute("aria-pressed", String(state.lounge === l.n));
        el.setAttribute("aria-label", `${t("lounge")} ${l.n}, ${t("zone." + l.zone)}, ${t("pick.persons", { a: z.seats[0], b: z.seats[1] })}, ${t("zone.from", { p: money(z.min) })}${taken ? ", " + t("taken") : ""}`);
      }
      el.append(
        svgEl("rect", { x: x - 5, y: y - 5, width: w + 10, height: h + 10, rx: 12, class: "ring" }),
        svgEl("rect", { x, y, width: w, height: h, rx: 9, class: "shape", fill: z.color, stroke: z.color }),
        svgEl("text", { x: x + w / 2, y: y + h / 2 + fs / 3, "text-anchor": "middle", fill: z.text, style: `font-size:${fs}px` }, String(l.n))
      );
      g.append(el);
    });
    svg.append(g);
  }
  function renderTables() {
    const svg = $("#plan"); if (!svg) return;
    drawPlan(svg, true);
    $("#planNote").hidden = reserved().size === 0;
  }
  function initPlan() {
    const svg = $("#plan"), tip = $("#tip"), box = $("#planBox");
    const hit = e => e.target.closest && e.target.closest(".tbl");
    svg.addEventListener("click", e => { const el = hit(e); if (el && !el.classList.contains("reserved")) selectLounge(+el.dataset.n, true); });
    svg.addEventListener("keydown", e => {
      const el = hit(e);
      if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); if (!el.classList.contains("reserved")) selectLounge(+el.dataset.n, true); }
    });
    const show = el => {
      const l = loungeBy(+el.dataset.n), z = C.zones[l.zone], taken = el.classList.contains("reserved");
      tip.innerHTML = `<b>${t("lounge")} ${l.n}</b> – ${t("zone." + l.zone)}<br>${taken ? t("taken") : t("zone.from", { p: money(z.min) }) + ", " + t("zone.persons", { a: z.seats[0], b: z.seats[1] })}`;
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      const half = (tip.offsetWidth || 180) / 2 + 8;
      tip.style.left = Math.min(Math.max(r.left - b.left + r.width / 2, half), b.width - half) + "px";
      tip.style.top = (r.top - b.top) + "px";
      tip.classList.add("on");
    };
    svg.addEventListener("pointerover", e => { const el = hit(e); if (el && e.pointerType === "mouse") show(el); });
    svg.addEventListener("pointerout", e => { if (hit(e)) tip.classList.remove("on"); });
    const canHover = window.matchMedia("(hover:hover)").matches;
    svg.addEventListener("focusin", e => { const el = hit(e); if (el && canHover) show(el); });
    svg.addEventListener("focusout", () => tip.classList.remove("on"));
  }
  function selectLounge(n, fromPlan) {
    state.lounge = n;
    $("#f-table").value = n ? String(n) : "";
    clearErr($("#f-table"));
    renderTables(); renderPick();
    if (fromPlan && window.matchMedia("(max-width:960px)").matches) $("#step3").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPick() {
    const box = $("#pick"), l = loungeBy(state.lounge);
    if (!l) {
      box.innerHTML = `<div class="in"><p class="big" style="color:var(--chrome)">${t("pick.none.title")}</p><p class="none">${t("pick.none.text")}</p></div>`;
      return;
    }
    const z = C.zones[l.zone], d = toDate(state.date);
    box.innerHTML = `<div class="ph"><img src="${z.photo}" alt="" loading="lazy"></div>
      <div class="in">
        <p class="big">${t("lounge")} ${l.n}</p>
        <p class="zone"><i style="background:${z.color}"></i>${t("zone." + l.zone)}</p>
        <dl>
          <dt>${t("pick.date")}</dt><dd>${shortDate(d)} – ${esc(dateLabel(state.date))}</dd>
          <dt>${t("pick.seats")}</dt><dd>${t("pick.persons", { a: z.seats[0], b: z.seats[1] })}</dd>
          <dt>${t("pick.min")}</dt><dd class="minv">${money(z.min)}</dd>
        </dl>
      </div>`;
    const gi = $("#f-guests"); gi.max = z.seats[1]; if (+gi.value > z.seats[1]) gi.value = z.seats[1];
  }

  function renderLoungeSelect() {
    const res = reserved();
    $("#f-table").innerHTML = `<option value="">${t("f.choose")}</option>` + Object.entries(C.zones).map(([k, z]) =>
      `<optgroup label="${t("zone." + k)} – ${t("zone.from", { p: money(z.min) })}">` +
      C.lounges.filter(l => l.zone === k).map(l => `<option value="${l.n}" ${res.has(l.n) ? "disabled" : ""}>${t("lounge")} ${l.n}${res.has(l.n) ? " (" + t("taken") + ")" : ""}</option>`).join("") +
      `</optgroup>`).join("");
    $("#f-table").value = state.lounge ? String(state.lounge) : "";
  }

  /* ---------- Formular ---------- */
  function setErr(input, msg) {
    const f = input.closest(".f"); if (!f) return;
    f.classList.add("bad"); input.setAttribute("aria-invalid", "true");
    const em = $(".em", f); if (em) em.textContent = msg;
  }
  function clearErr(input) {
    const f = input.closest(".f"); if (!f) return;
    f.classList.remove("bad"); input.removeAttribute("aria-invalid");
    const em = $(".em", f); if (em) em.textContent = "";
  }
  function waText() {
    const l = loungeBy(state.lounge), msg = $("#f-msg").value.trim();
    return t("wa.text", {
      d: shortDate(toDate(state.date)) + " – " + dateLabel(state.date),
      n: l.n, z: t("zone." + l.zone), g: $("#f-guests").value, t: $("#f-arrival").value,
      name: $("#f-name").value.trim(), msg: msg ? "\n" + msg : ""
    });
  }

  function initForm() {
    $("#f-date").addEventListener("change", e => setDate(e.target.value));
    $("#f-table").addEventListener("change", e => selectLounge(parseInt(e.target.value, 10) || null, false));
    $("#f-name").addEventListener("input", e => clearErr(e.target));
    $("#resForm").addEventListener("submit", ev => {
      ev.preventDefault();
      const tbl = $("#f-table"), name = $("#f-name");
      clearErr(tbl); clearErr(name);
      if (!state.lounge) { setErr(tbl, t("err.noLounge")); $("#plan").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (name.value.trim().length < 2) { setErr(name, t("err.required")); name.focus(); return; }
      window.open("https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(waText()), "_blank", "noopener");
    });
  }

  /* ---------- Delegierte Klicks: Datum vorwählen, Zonen ---------- */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-date]");
    if (a) setDate(a.dataset.date);
    const zb = e.target.closest("#zones button");
    if (zb) {
      const k = zb.dataset.zone;
      if (state.zones.has(k) && state.zones.size > 1) state.zones.delete(k); else state.zones.add(k);
      $$("#zones button").forEach(b => b.setAttribute("aria-pressed", String(state.zones.has(b.dataset.zone))));
      renderTables();
    }
    const lb = e.target.closest(".lang button");
    if (lb && lb.dataset.lang !== lang) { lang = lb.dataset.lang; store.set("fc-lang", lang); renderAll(); }
  });

  /* ---------- Mobile-Button ---------- */
  function initSticky() {
    const cta = $("#stickyCta");
    if (!("IntersectionObserver" in window)) { cta.classList.remove("off"); return; }
    const vis = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(x => x.isIntersecting ? vis.add(x.target.id) : vis.delete(x.target.id));
      cta.classList.toggle("off", vis.size > 0);
    });
    ["hero", "lounges"].forEach(id => { const n = document.getElementById(id); if (n) io.observe(n); });
  }

  const isHome = !!$("#heroEvent"), isRes = !!$("#resForm");
  function renderAll() {
    applyStatic();
    if (isHome) { renderHero(); renderCards(); const mp = $("#miniPlan"); if (mp) drawPlan(mp, false); }
    if (isRes) { renderDates(); renderZones(); renderLoungeSelect(); renderTables(); renderPick(); }
  }
  mqMob.addEventListener("change", () => { if (isRes) renderTables(); const mp = $("#miniPlan"); if (mp) drawPlan(mp, false); });

  /* ---------- Intro (wie auf dem bisherigen Auftritt) ---------- */
  function initIntro() {
    const root = document.documentElement, el = $("#intro");
    if (!root.classList.contains("intro") || !el) return;
    const start = Date.now(), MIN = 1500, MAX = 3500;
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      el.classList.add("leave");
      const end = () => { root.classList.remove("intro"); el.remove(); };
      el.addEventListener("animationend", end, { once: true });
      setTimeout(end, 900);
      try { sessionStorage.setItem("fc-intro", "1"); } catch (e) {}
    };
    const ready = () => setTimeout(finish, Math.max(0, MIN - (Date.now() - start)));
    if (document.readyState === "complete") ready(); else window.addEventListener("load", ready, { once: true });
    setTimeout(finish, MAX);
    el.addEventListener("click", finish);
  }

  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  if (isRes) {
    const h = decodeURIComponent(location.hash.slice(1));
    if (dates.includes(h)) state.date = h;
  }
  renderAll();
  if (isHome) { initIntro(); initCarousel(); initSticky(); }
  if (isRes) { initPlan(); initForm(); }
})();
