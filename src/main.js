import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "./styles.css";

import { paintFireflies } from "./decorate.js";
import { fallbackPayload } from "./data/fallback-wishes.js";
import { layoutPapers } from "./layout.js";
import { usableImage } from "../lib/printImages.js";
import { sanitizeWishHtml, stripTags } from "../lib/sanitize.js";

const READ_KEY = "acs-epseen-read-wishes";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const jar = document.querySelector("#jar");
const jarHit = document.querySelector("#jar-hit");
const lid = document.querySelector("#lid");
const lettersEl = document.querySelector("#letters");
const countEl = document.querySelector("#count");
const hint = document.querySelector("#hint");
const pick = document.querySelector("#pick");
const subhint = document.querySelector("#subhint");
const app = document.querySelector("#app") || document.querySelector(".app");
const welcome = document.querySelector("#welcome");
const enterBtn = document.querySelector("#enter");
const veil = document.querySelector("#veil");
const card = document.querySelector("#card");
const cardTitle = document.querySelector("#card-title");
const wishLead = document.querySelector("#wish-lead");
const fromLine = document.querySelector("#from-line");
const fromDate = document.querySelector("#from-date");
const panel = document.querySelector("#panel");
const panelCard = document.querySelector("#panel-card");
const panelTitle = document.querySelector("#panel-title");
const panelBody = document.querySelector("#panel-body");
const closePanelBtn = document.querySelector("#close-panel");
const aboutBtn = document.querySelector("#about");
const cardBody = document.querySelector("#card-body");
const cardGallery = document.querySelector("#card-gallery");
const cardScroll = document.querySelector("#card-scroll");
const posEl = document.querySelector("#pos");
const closeBtn = document.querySelector("#close-letter");
const flyer = document.querySelector("#flyer");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const leave = document.querySelector("#leave");
let padletUrl = "https://padlet.com/agnesimmanuela/dear-acs-epseen-s025aby02lplxtpcx9li";
let toldFallback = false;

const state = {
  wishes: sortWishes(fallbackPayload.wishes.map(normalizeWish).filter(Boolean)),
  open: false,
  activeId: null,
  read: loadRead(),
  source: "fallback",
};

let motion = 0;

function stopCardMotion() {
  card.getAnimations().forEach((animation) => animation.cancel());
}

paintFireflies(document.querySelector("#fireflies"));
render();
bind();
refresh();

function loadRead() {
  try {
    const raw = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveRead() {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...state.read]));
  } catch {
    /* private mode can refuse storage; the seal still shows this visit */
  }
}

function sortWishes(list) {
  return [...list].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (da !== db) return da < db ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
}

function normalizeWish(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").slice(0, 80);
  if (!id) return null;
  const link = typeof raw.link === "string" && /^https:\/\//i.test(raw.link) ? raw.link : "";
  const images = [];
  const candidates = Array.isArray(raw.images) ? raw.images : [];
  for (const candidate of candidates) {
    const url = usableImage(candidate);
    if (url && !images.includes(url)) images.push(url);
  }
  const single = usableImage(raw.image);
  if (single && !images.includes(single)) images.unshift(single);
  return {
    id,
    title: stripTags(raw.title || "A wish").slice(0, 500) || "A wish",
    html: sanitizeWishHtml(raw.html || "").slice(0, 20000),
    author: typeof raw.author === "string" ? raw.author.replace(/^\s+|\s+$/g, "") : "",
    image: images[0] || null,
    images,
    date: typeof raw.date === "string" ? raw.date : null,
    link,
  };
}

function countText() {
  const total = state.wishes.length;
  const read = state.wishes.filter((wish) => state.read.has(wish.id)).length;
  const base =
    total === 0 ? "The jar is waiting" : total === 1 ? "1 wish inside" : `${total} wishes inside`;
  return read ? `${base} · ${read} read` : base;
}

function formatSignDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function clip(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function render() {
  countEl.textContent = countText();
  renderLetters();
  syncJar();
  document.body.dataset.wishesSource = state.source;
}

function renderLetters() {
  const stars = lettersEl.querySelector(".jar-stars");
  lettersEl.replaceChildren();
  if (stars) lettersEl.appendChild(stars);
  const papers = layoutPapers(state.wishes);
  for (const paper of papers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `paper p${paper.palette}${state.read.has(paper.wish.id) ? " is-read" : ""}`;
    button.dataset.wishId = paper.wish.id;
    button.style.setProperty("--x", `${paper.x}%`);
    button.style.setProperty("--y", `${paper.y}%`);
    button.style.setProperty("--rot", `${paper.rot.toFixed(2)}deg`);
    button.style.setProperty("--s", `${paper.size.toFixed(2)}%`);
    button.style.setProperty("--lit", paper.lit.toFixed(2));
    button.style.zIndex = String(paper.z);
    button.tabIndex = state.open ? 0 : -1;
    const who = paper.wish.author ? ` from ${paper.wish.author}` : "";
    button.setAttribute("aria-label", `Open wish${who}: ${clip(paper.wish.title, 90)}`);
    button.innerHTML = '<span class="dogear"></span><span class="crease"></span><span class="seal"></span>';
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.open) return;
      openLetter(paper.wish.id);
    });
    lettersEl.appendChild(button);
  }
}

function syncJar() {
  jar.classList.toggle("is-open", state.open);
  document.body.classList.toggle("jar-open", state.open);
  const label = state.open
    ? "Close the jar"
    : `Open the wishes jar. ${countText()}`;
  jarHit.setAttribute("aria-label", `Open the wishes jar. ${countText()}`);
  jarHit.tabIndex = state.open ? -1 : 0;
  jarHit.setAttribute("aria-hidden", state.open ? "true" : "false");
  lid.setAttribute("aria-label", label);
  lid.setAttribute("aria-expanded", String(state.open));
  lid.tabIndex = state.open ? 0 : -1;
  lid.setAttribute("aria-hidden", state.open ? "false" : "true");
  const hasWishes = state.wishes.length > 0;
  hint.hidden = state.open;
  pick.hidden = !state.open || !hasWishes;
  subhint.hidden = !state.open || !hasWishes;
  for (const paper of lettersEl.querySelectorAll(".paper")) {
    paper.tabIndex = state.open ? 0 : -1;
  }
}

function setJarOpen(open) {
  if (state.open === open) return;
  state.open = open;
  syncJar();
  if (open) {
    pick.focus();
  }
}

function showJarScene() {
  document.body.classList.remove("is-welcome");
  if (welcome) welcome.hidden = true;
  if (app) app.inert = false;
  jarHit?.focus({ preventScroll: true });
}

function bind() {
  if (document.body.classList.contains("is-welcome") && app) {
    app.inert = true;
  }
  enterBtn?.addEventListener("click", showJarScene);
  jarHit.addEventListener("click", () => setJarOpen(true));
  lid.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.open) setJarOpen(true);
    else if (veil.hidden) setJarOpen(false);
  });
  pick.addEventListener("click", pickWish);
  leave.addEventListener("click", () => openPanel("leave"));
  aboutBtn.addEventListener("click", () => openPanel("about"));
  closePanelBtn.addEventListener("click", closePanel);
  panel.addEventListener("click", (event) => {
    if (event.target === panel) closePanel();
  });
  panelCard.addEventListener("click", (event) => event.stopPropagation());
  closeBtn.addEventListener("click", () => closeLetter());
  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  veil.addEventListener("click", (event) => {
    if (event.target === veil) closeLetter();
  });
  card.addEventListener("click", (event) => event.stopPropagation());
cardGallery.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) event.target.remove();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!panel.hidden) closePanel();
      else if (!veil.hidden) closeLetter();
      else if (state.open) setJarOpen(false);
      return;
    }
    if (veil.hidden) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  });
}

function trapFocus(event) {
  const nodes = [...veil.querySelectorAll("button, a[href], [tabindex]")].filter(
    (node) => !node.hidden && node.tabIndex >= 0,
  );
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function pickWish() {
  if (!state.wishes.length) return;
  const unread = state.wishes.filter((wish) => !state.read.has(wish.id));
  const pool = unread.length ? unread : state.wishes;
  let choice = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && choice.id === state.activeId) {
    const alternatives = pool.filter((wish) => wish.id !== state.activeId);
    choice = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  openLetter(choice.id);
}

function step(delta) {
  if (!state.wishes.length || !state.activeId) return;
  const index = state.wishes.findIndex((wish) => wish.id === state.activeId);
  const next = (index + delta + state.wishes.length) % state.wishes.length;
  openLetter(state.wishes[next].id, { unfold: false });
}

function markRead(id) {
  if (state.read.has(id)) return;
  state.read.add(id);
  saveRead();
  lettersEl.querySelector(`[data-wish-id="${CSS.escape(id)}"]`)?.classList.add("is-read");
  countEl.textContent = countText();
}

function envelopeFrame(target) {
  const rect = target?.getBoundingClientRect();
  if (rect && rect.width > 0) {
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      rot: target.style?.getPropertyValue("--rot") || "-8deg",
    };
  }
  const jarRect = jar.getBoundingClientRect();
  return {
    left: jarRect.left + jarRect.width * 0.32,
    top: jarRect.top + jarRect.height * 0.48,
    width: jarRect.width * 0.36,
    height: jarRect.width * 0.29,
    rot: "-8deg",
  };
}

async function flyEnvelope(target, direction) {
  if (!flyer || reduceMotion) return;
  const from = envelopeFrame(target);
  const width = Math.min(150, window.innerWidth * 0.42);
  const height = width * (390 / 480);
  const center = {
    left: window.innerWidth / 2 - width / 2,
    top: window.innerHeight * 0.34,
    width,
    height,
    rot: "0deg",
  };
  const start = direction === "out" ? from : center;
  const end = direction === "out" ? { ...center, opacity: 0 } : from;
  flyer.hidden = false;
  const anim = flyer.animate(
    [
      {
        left: `${start.left}px`,
        top: `${start.top}px`,
        width: `${start.width}px`,
        height: `${start.height}px`,
        transform: `rotate(${start.rot})`,
        opacity: 1,
      },
      {
        left: `${end.left}px`,
        top: `${end.top}px`,
        width: `${end.width}px`,
        height: `${end.height}px`,
        transform: `rotate(${end.rot || "0deg"})`,
        opacity: end.opacity ?? 1,
      },
    ],
    { duration: direction === "out" ? 640 : 480, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
  );
  try {
    await anim.finished;
  } catch {
    /* replaced */
  }
  flyer.hidden = true;
  anim.cancel();
}

function openPanel(kind) {
  const blocks = {
    leave: {
      title: "Leave a wish",
      lines: ["Write to ACS and Epseen on the Padlet. New wishes appear in this jar on their own."],
      link: "Open the Padlet",
    },
    about: {
      title: "About the jar",
      lines: [
        "A jar of wishes for Angeline (ACS) and Epseen.",
        "Saturday, 21 November 2026.",
      ],
    },
    empty: {
      title: "The jar is waiting",
      lines: ["No wishes yet. Be the first to leave one."],
      link: "Leave a wish",
    },
    error: {
      title: "Saved wishes",
      lines: ["The live Padlet could not be reached just now, so the jar is showing the wishes it already saved."],
    },
  };
  const block = blocks[kind];
  panelTitle.textContent = block.title;
  panelBody.replaceChildren();
  for (const line of block.lines) {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    panelBody.appendChild(paragraph);
  }
  if (block.link) {
    const paragraph = document.createElement("p");
    const anchor = document.createElement("a");
    anchor.className = "panel-link";
    anchor.href = padletUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = block.link;
    paragraph.appendChild(anchor);
    panelBody.appendChild(paragraph);
  }
  panel.hidden = false;
  document.body.classList.add("panel-open");
  if (veil.hidden) app.inert = true;
  panelTitle.focus({ preventScroll: true });
}

function closePanel() {
  if (panel.hidden) return;
  panel.hidden = true;
  document.body.classList.remove("panel-open");
  if (veil.hidden) app.inert = false;
}

function fillCard(wish) {
  cardTitle.textContent = "Dear ACS & Epseen,";
  const lead = (wish.title || "").trim();
  const showLead = lead && lead !== "A wish";
  wishLead.hidden = !showLead;
  wishLead.textContent = showLead ? lead : "";
  const name = wish.author ? wish.author : "a friend";
  fromLine.textContent = `From: ${name}`;
  const when = formatSignDate(wish.date);
  fromDate.textContent = when;
  fromDate.hidden = !when;
  cardBody.innerHTML = sanitizeWishHtml(wish.html || "");
  cardGallery.replaceChildren();
  const photos = wish.images?.length ? wish.images : wish.image ? [wish.image] : [];
  photos.forEach((src, index) => {
    const img = document.createElement("img");
    img.className = "card-photo";
    img.alt = photos.length > 1 ? `Photo ${index + 1} shared with this wish` : "Photo shared with this wish";
    img.decoding = "async";
    img.src = src;
    cardGallery.appendChild(img);
  });
  const index = state.wishes.findIndex((item) => item.id === wish.id);
  posEl.textContent = `${index + 1} of ${state.wishes.length}`;
}

async function openLetter(id, { unfold = true } = {}) {
  const wish = state.wishes.find((item) => item.id === id);
  if (!wish) return;
  motion += 1;
  stopCardMotion();
  if (!state.open) setJarOpen(true);
  const wasClosed = veil.hidden;
  state.activeId = id;
  markRead(id);
  fillCard(wish);
  lettersEl.querySelectorAll(".is-lifted").forEach((node) => node.classList.remove("is-lifted"));
  lettersEl.querySelector(`[data-wish-id="${CSS.escape(id)}"]`)?.classList.add("is-lifted");
  veil.hidden = false;
  app.inert = true;
  document.body.classList.add("reading");
  cardScroll.scrollTop = 0;

  const sourcePaper = lettersEl.querySelector(`[data-wish-id="${CSS.escape(id)}"]`);
  if (!reduceMotion && wasClosed && unfold) {
    card.style.opacity = "0";
    if (sourcePaper) sourcePaper.style.visibility = "hidden";
    await flyEnvelope(sourcePaper, "out");
    if (sourcePaper) sourcePaper.style.visibility = "";
    card.style.opacity = "";
    card.animate(
      [
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 220, easing: "ease-out", fill: "both" },
    );
  } else if (!reduceMotion && !wasClosed) {
    card.animate(
      [
        { opacity: 0.35, transform: "translateY(8px) scale(0.985)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "ease-out", fill: "both" },
    );
  }
  cardTitle.focus({ preventScroll: true });
}

async function closeLetter() {
  if (veil.hidden) return;
  const token = ++motion;
  const id = state.activeId;
  stopCardMotion();
  const sourcePaper = id ? lettersEl.querySelector(`[data-wish-id="${CSS.escape(id)}"]`) : null;
  if (!reduceMotion) {
    const anim = card.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "scale(0.96)" },
      ],
      { duration: 180, easing: "ease-in", fill: "forwards" },
    );
    try {
      await anim.finished;
    } catch {
      /* a newer open or close replaced this one */
    }
    if (token === motion) await flyEnvelope(sourcePaper, "back");
  }
  if (token !== motion) return;
  veil.hidden = true;
  app.inert = false;
  document.body.classList.remove("reading");
  state.activeId = null;
  lettersEl.querySelectorAll(".is-lifted").forEach((node) => node.classList.remove("is-lifted"));
  const paper = id ? lettersEl.querySelector(`[data-wish-id="${CSS.escape(id)}"]`) : null;
  if (paper) paper.focus();
  else if (state.open) pick.focus();
}

async function refresh() {
  try {
    const response = await fetch("/api/wishes", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const wishes = sortWishes((data.wishes || []).map(normalizeWish).filter(Boolean));
    if (!wishes.length) throw new Error("empty");
    state.source = data.source === "fallback" ? "fallback" : "padlet";
    if (typeof data.padletUrl === "string" && data.padletUrl.startsWith("https://")) {
      padletUrl = data.padletUrl;
    }
    const same =
      wishes.length === state.wishes.length &&
      wishes.every((wish, index) => {
        const current = state.wishes[index];
        return (
          wish.id === current.id &&
          wish.title === current.title &&
          wish.html === current.html &&
          wish.image === current.image &&
          (wish.images || []).join() === (current.images || []).join() &&
          wish.author === current.author
        );
      });
    state.wishes = wishes;
    document.body.dataset.wishesSource = state.source;
    if (!same) {
      renderLetters();
      syncJar();
    }
    countEl.textContent = countText();
    if (!state.wishes.length) openPanel("empty");
    else if (state.source === "fallback" && !toldFallback && veil.hidden && panel.hidden) {
      toldFallback = true;
      openPanel("error");
    }
    if (state.activeId) {
      const still = state.wishes.find((wish) => wish.id === state.activeId);
      if (still) fillCard(still);
      else closeLetter();
    }
  } catch (error) {
    document.body.dataset.wishesSource = "fallback";
    state.source = "fallback";
    if (!toldFallback && veil.hidden && panel.hidden) {
      toldFallback = true;
      openPanel("error");
    }
    console.info("Showing the saved wishes.", error);
  }
}
