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
    $("#f-lang").value = lang;
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    const box = $("#heroEvent"), e = upcoming[0];
    if (!e) {
      box.innerHTML = `<p class="kicker">${t("hero.none.kicker")}</p><h1 class="cond">${t("hero.none.title")}</h1><a class="pill" href="#events">${t("hero.none.cta")}</a>`;
      return;
    }
    const d = toDate(e.date);
    box.innerHTML = `<p class="kicker">${longDate(d)} – ${esc(e.title)}${e.soldOut ? ` <span class="soldout">${t("card.soldout")}</span>` : ""}</p>
      <h1 class="cond">${esc(e.artists)}<span class="vh"> – ${esc(t("hero.live", { a: "" }).trim())}</span></h1>
      <a class="pill" href="#reservation" data-date="${e.date}">${t("cta.reserve")}</a>`;
  }

  /* ---------- Event-Karten ---------- */
  function renderCards() {
    const up = upcoming.map(e => {
      const d = toDate(e.date);
      const pic = e.poster
        ? `<div class="pic sq"><img src="${e.poster}" alt="Flyer ${esc(e.artists)}" loading="lazy" width="800" height="800">${e.soldOut ? `<span class="soldout">${t("card.soldout")}</span>` : ""}</div>`
        : `<div class="pic type"><b class="cond">${esc(e.artists)}</b><span>${shortDate(d)}</span></div>`;
      return `<article class="card">${pic}<h3>${esc(e.artists)}</h3><p>${longDate(d)} – ${esc(e.title)}</p>
        <a class="pill" href="#reservation" data-date="${e.date}">${t("cta.reserve")}</a></article>`;
    }).join("");
    const nextFree = dates.find(x => !eventOn(x));
    const weekly = `<article class="card"><div class="pic type cyan"><b class="cond">${t("card.weekly.title")}</b><span>${t("card.weekly.text")}</span></div>
      <h3>${t("clubnight")}</h3><p>${t("info.hoursText")}</p>
      <a class="pill" href="#reservation" ${nextFree ? `data-date="${nextFree}"` : ""}>${t("card.weekly.cta")}</a></article>`;
    const ig = `<article class="card"><div class="pic type light"><b class="cond">${t("card.ig.title")}</b><span>${t("card.ig.text")}</span></div>
      <h3>@faceclubofficial</h3><p>Instagram</p>
      <a class="pill ghost" href="https://www.instagram.com/faceclubofficial/" target="_blank" rel="noopener">${t("card.ig.cta")}</a></article>`;
    const past = C.past.map(p => {
      const d = toDate(p.date);
      return `<article class="card past"><div class="pic"><img src="${p.poster}" alt="Flyer ${esc(p.artists)}" loading="lazy" width="720" height="900"></div>
        <h3>${esc(p.artists)}</h3><p>${t("card.past")}, ${d.getDate()}. ${L[lang].months[d.getMonth()]} ${d.getFullYear()}</p></article>`;
    }).join("");
    $("#track").innerHTML = up + weekly + ig + past;
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

  /* ---------- Plan ---------- */
  function renderTables() {
    const g = $("#tables"); g.innerHTML = "";
    const res = reserved();
    C.lounges.forEach(l => {
      const z = C.zones[l.zone], taken = res.has(l.n);
      const el = document.createElementNS(NS, "g");
      el.setAttribute("class", "tbl" + (taken ? " reserved" : "") + (state.lounge === l.n ? " selected" : "") + (state.zones.has(l.zone) ? "" : " dim"));
      el.setAttribute("tabindex", taken ? "-1" : "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-pressed", String(state.lounge === l.n));
      el.dataset.n = l.n;
      el.setAttribute("aria-label", `${t("lounge")} ${l.n}, ${t("zone." + l.zone)}, ${t("pick.persons", { a: z.seats[0], b: z.seats[1] })}, ${t("zone.from", { p: money(z.min) })}${taken ? ", " + t("taken") : ""}`);
      const rect = (cls, pad) => {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", l.x - l.w / 2 - pad); r.setAttribute("y", l.y - l.h / 2 - pad);
        r.setAttribute("width", l.w + pad * 2); r.setAttribute("height", l.h + pad * 2);
        r.setAttribute("rx", 6 + pad); r.setAttribute("class", cls); return r;
      };
      const ring = rect("ring", 5), shape = rect("shape", 0);
      shape.setAttribute("fill", z.color); shape.setAttribute("stroke", z.color);
      const tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", l.x); tx.setAttribute("y", l.y + 6); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("fill", z.text);
      tx.textContent = l.n;
      el.append(ring, shape, tx);
      g.appendChild(el);
    });
    $("#planNote").hidden = res.size === 0;
  }
  function initPlan() {
    const g = $("#tables"), tip = $("#tip"), box = $("#planBox");
    g.addEventListener("click", e => { const el = e.target.closest(".tbl"); if (el && !el.classList.contains("reserved")) selectLounge(+el.dataset.n, true); });
    g.addEventListener("keydown", e => {
      const el = e.target.closest(".tbl");
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
    g.addEventListener("pointerover", e => { const el = e.target.closest(".tbl"); if (el && e.pointerType === "mouse") show(el); });
    g.addEventListener("pointerout", e => { if (e.target.closest(".tbl")) tip.classList.remove("on"); });
    g.addEventListener("focusin", e => { const el = e.target.closest(".tbl"); if (el) show(el); });
    g.addEventListener("focusout", () => tip.classList.remove("on"));
  }
  function selectLounge(n, fromPlan) {
    state.lounge = n;
    $("#f-table").value = n ? String(n) : "";
    clearErr($("#f-table"));
    renderTables(); renderPick();
    if (fromPlan && window.matchMedia("(max-width:960px)").matches) $("#pick").scrollIntoView({ behavior: "smooth", block: "center" });
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
    ["hero", "reservation"].forEach(id => io.observe(document.getElementById(id)));
  }

  function renderAll() {
    applyStatic(); renderHero(); renderCards(); renderDates(); renderZones();
    renderLoungeSelect(); renderTables(); renderPick();
  }

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

  $("#year").textContent = new Date().getFullYear();
  initIntro();
  renderAll(); initCarousel(); initPlan(); initForm(); initSticky(); stamp();
})();
