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
    const fl = $("#f-lang"); if (fl) fl.value = lang;
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
      <div id="cd"></div>
      <h1 class="cond">${esc(e.artists)}<span class="vh"> – ${esc(t("hero.live", { a: "" }).trim())}</span></h1>
      <a class="pill" href="reservieren.html#${e.date}">${t("cta.reserve")}</a>`;
  }

  /* Countdown bis Türöffnung (23 Uhr) */
  let cdTimer = null;
  function renderCountdown() {
    const box = $("#cd"), e = upcoming[0];
    if (!box || !e) return;
    const start = toDate(e.date); start.setHours(23, 0, 0, 0);
    const diff = start - Date.now();
    if (diff <= 0) { box.innerHTML = Date.now() - start < 5 * 3600e3 ? `<span class="tonight">${t("cd.tonight")}</span>` : ""; return; }
    const dd = Math.floor(diff / 864e5), hh = Math.floor(diff % 864e5 / 36e5), mm = Math.floor(diff % 36e5 / 6e4);
    const cell = (v, k) => `<div><b>${String(v).padStart(2, "0")}</b><span>${t(k)}</span></div>`;
    box.innerHTML = (dd === 0 && hh < 12) ? `<span class="tonight">${t("cd.tonight")}</span>`
      : `<div class="countdown" role="timer" aria-label="${t("cd.label")}">${cell(dd, "cd.d")}${cell(hh, "cd.h")}${cell(mm, "cd.m")}</div>`;
  }
  function startCountdown() { renderCountdown(); clearInterval(cdTimer); cdTimer = setInterval(renderCountdown, 30000); }

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
      `<li><button type="button" aria-pressed="${state.zones.has(k)}" data-zone="${k}"><i style="background:${z.color}"></i><b>${t("zone." + k)}</b><em>${t("zone.from", { p: money(z.min) })}, ${t("zone.persons", { a: z.seats[0], b: z.seats[1] })}</em></button></li>`).join("");
  }

  /* ---------- Plan (Querformat am Desktop, Hochformat am Handy) ---------- */
  const LAYOUT = {
    desk: { vb: [1000, 700], room: [20, 20, 960, 660], door: [880, 672, 80, 16], doorL: [920, 662], dj: [420, 36, 160, 70],
            floor: [160, 150, 680, 400], floorL: [500, 200], bar: [400, 300, 200, 90], wc: [36, 600, 110, 64], coat: [780, 600, 90, 64], fs: 18, ls: 14 },
    mob:  { vb: [600, 760], room: [10, 10, 580, 740], door: [500, 742, 80, 16], doorL: [540, 728], dj: [240, 24, 120, 56],
            floor: [100, 120, 400, 465], floorL: [300, 165], bar: [215, 315, 170, 80], wc: [20, 688, 100, 52], coat: [380, 688, 100, 52], fs: 24, ls: 18 }
  };
  const mqMob = window.matchMedia("(max-width:700px)");
  const mode = () => (mqMob.matches ? "mob" : "desk");
  const geo = (l, m) => (m === "mob" && l.m ? { x: l.m[0], y: l.m[1], w: l.m[2], h: l.m[3] } : { x: l.x, y: l.y, w: l.w, h: l.h });

  function svgEl(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function drawPlan(svg, interactive) {
    const m = mode(), Lo = LAYOUT[m], res = interactive ? reserved() : new Set();
    svg.setAttribute("viewBox", `0 0 ${Lo.vb[0]} ${Lo.vb[1]}`);
    svg.innerHTML = "";
    const pid = "led-" + (svg.id || "p");
    const defs = svgEl("defs", {}), pat = svgEl("pattern", { id: pid, width: 50, height: 50, patternUnits: "userSpaceOnUse" });
    pat.append(svgEl("rect", { width: 50, height: 50, fill: "#080a10" }), svgEl("path", { d: "M50 0H0V50", fill: "none", stroke: "#1a2a3a", "stroke-width": 1 }));
    defs.append(pat); svg.append(defs);
    const R = (a, cls, extra) => svgEl("rect", Object.assign({ x: a[0], y: a[1], width: a[2], height: a[3], class: cls, rx: 6 }, extra || {}));
    const T = (x, y, txt, cls) => svgEl("text", { x, y, "text-anchor": "middle", class: cls, style: `font-size:${Lo.ls}px` }, txt);
    svg.append(R(Lo.room, "room"));
    svg.append(svgEl("rect", { x: Lo.door[0], y: Lo.door[1], width: Lo.door[2], height: Lo.door[3], fill: "#0b0c10" }));
    svg.append(T(Lo.doorL[0], Lo.doorL[1], t("plan.entry"), "flabel"));
    svg.append(R(Lo.dj, "feature"), T(Lo.dj[0] + Lo.dj[2] / 2, Lo.dj[1] + Lo.dj[3] / 2 + 6, t("plan.dj"), "flabel"));
    svg.append(R(Lo.floor, "floor", { fill: `url(#${pid})` }), T(Lo.floorL[0], Lo.floorL[1], t("plan.floor"), "flabel"));
    svg.append(R(Lo.bar, "barisland", { rx: 10 }), T(Lo.bar[0] + Lo.bar[2] / 2, Lo.bar[1] + Lo.bar[3] / 2 + 6, t("plan.bar"), "barlabel"));
    svg.append(R(Lo.wc, "feature"), T(Lo.wc[0] + Lo.wc[2] / 2, Lo.wc[1] + Lo.wc[3] / 2 + 6, t("plan.wc"), "flabel"));
    svg.append(R(Lo.coat, "feature"), T(Lo.coat[0] + Lo.coat[2] / 2, Lo.coat[1] + Lo.coat[3] / 2 + 6, t("plan.coat"), "flabel"));
    const g = svgEl("g", { id: interactive ? "tables" : "" });
    C.lounges.forEach(l => {
      const z = C.zones[l.zone], q = geo(l, m), taken = res.has(l.n);
      const el = svgEl("g", { class: "tbl" + (taken ? " reserved" : "") + (interactive && state.lounge === l.n ? " selected" : "") + (state.zones.has(l.zone) || !interactive ? "" : " dim") });
      el.dataset.n = l.n;
      if (interactive) {
        el.setAttribute("tabindex", taken ? "-1" : "0");
        el.setAttribute("role", "button");
        el.setAttribute("aria-pressed", String(state.lounge === l.n));
        el.setAttribute("aria-label", `${t("lounge")} ${l.n}, ${t("zone." + l.zone)}, ${t("pick.persons", { a: z.seats[0], b: z.seats[1] })}, ${t("zone.from", { p: money(z.min) })}${taken ? ", " + t("taken") : ""}`);
      }
      const box = (cls, pad) => svgEl("rect", { x: q.x - q.w / 2 - pad, y: q.y - q.h / 2 - pad, width: q.w + pad * 2, height: q.h + pad * 2, rx: 6 + pad, class: cls });
      const shape = box("shape", 0); shape.setAttribute("fill", z.color); shape.setAttribute("stroke", z.color);
      el.append(box("ring", 5), shape, svgEl("text", { x: q.x, y: q.y + Lo.fs / 3, "text-anchor": "middle", fill: z.text, style: `font-size:${Lo.fs}px` }, String(l.n)));
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
      tip.style.left = (r.left - b.left + r.width / 2) + "px";
      tip.style.top = (r.top - b.top) + "px";
      tip.classList.add("on");
    };
    svg.addEventListener("pointerover", e => { const el = hit(e); if (el && e.pointerType === "mouse") show(el); });
    svg.addEventListener("pointerout", e => { if (hit(e)) tip.classList.remove("on"); });
    svg.addEventListener("focusin", e => { const el = hit(e); if (el) show(el); });
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
  function validate() {
    let ok = true, first = null;
    const fail = (el, m) => { setErr(el, m); ok = false; first = first || el; };
    const name = $("#f-name"), phone = $("#f-phone"), email = $("#f-email"), table = $("#f-table"), acc = $("#f-accept");
    [name, phone, email, table].forEach(clearErr);
    if (!table.value) fail(table, t("err.noLounge"));
    if (name.value.trim().length < 2) fail(name, t("err.required"));
    if (!/^[0-9 +().\-\/]{7,25}$/.test(phone.value.trim())) fail(phone, phone.value.trim() ? t("err.phone") : t("err.required"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) fail(email, email.value.trim() ? t("err.email") : t("err.required"));
    $("#acceptWrap").classList.toggle("bad", !acc.checked);
    if (!acc.checked) { ok = false; first = first || acc; }
    if (first) first.focus();
    return ok;
  }
  function showMsg(type, html) { const m = $("#msg"); m.className = "msg " + type; m.innerHTML = html; }

  function initForm() {
    const form = $("#resForm"), send = $("#send");
    $("#f-date").addEventListener("change", e => setDate(e.target.value));
    $("#f-table").addEventListener("change", e => selectLounge(parseInt(e.target.value, 10) || null, false));
    ["#f-name", "#f-phone", "#f-email"].forEach(s => $(s).addEventListener("input", e => clearErr(e.target)));
    $("#f-accept").addEventListener("change", e => $("#acceptWrap").classList.toggle("bad", !e.target.checked));

    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      $("#msg").className = "msg";
      if (!validate()) { showMsg("err", esc(t("err.fields"))); return; }
      const l = loungeBy(state.lounge), z = C.zones[l.zone], e = eventOn(state.date);
      const data = new FormData(form);
      data.set("table", l.n);
      data.append("zone", t("zone." + l.zone));
      data.append("min_spend", money(z.min));
      data.append("event_title", e ? `${e.artists} – ${e.title}` : t("clubnight"));
      send.disabled = true; send.textContent = t("f.sending");
      try {
        const r = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || "send");
        showMsg("ok", esc(t("ok.sent", { n: l.n, d: shortDate(toDate(state.date)) })));
        form.reset(); $("#f-lang").value = lang; $("#f-date").value = state.date;
        state.lounge = null; renderTables(); renderPick(); renderLoungeSelect(); stamp();
      } catch (err) {
        showMsg("err", esc(t("err.send", { phone: "079 208 63 89" })));
      } finally {
        send.disabled = false; send.textContent = t("f.submit");
      }
    });

    $("#sendWa").addEventListener("click", () => {
      const l = loungeBy(state.lounge);
      if (!l) { setErr($("#f-table"), t("err.noLounge")); $("#f-table").focus(); return; }
      const msg = $("#f-msg").value.trim();
      const text = t("wa.text", {
        d: shortDate(toDate(state.date)) + " – " + dateLabel(state.date),
        n: l.n, z: t("zone." + l.zone), g: $("#f-guests").value, t: $("#f-arrival").value,
        name: $("#f-name").value.trim() || "–", phone: $("#f-phone").value.trim() || "–",
        msg: msg ? "\n" + msg : ""
      });
      window.open("https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  }
  function stamp() { $("#f-ts").value = Date.now(); }

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
    if (isHome) { renderHero(); startCountdown(); renderCards(); const mp = $("#miniPlan"); if (mp) drawPlan(mp, false); }
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
  if (isRes) { initPlan(); initForm(); stamp(); }
})();
