import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "./styles.css";

import { paintFireflies, paintMeadow, paintSky } from "./decorate.js";
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
const app = document.querySelector(".app");
const veil = document.querySelector("#veil");
const card = document.querySelector("#card");
const cardTitle = document.querySelector("#card-title");
const cardMeta = document.querySelector("#card-meta");
const cardBody = document.querySelector("#card-body");
const cardGallery = document.querySelector("#card-gallery");
const cardScroll = document.querySelector("#card-scroll");
const posEl = document.querySelector("#pos");
const closeBtn = document.querySelector("#close-letter");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const leave = document.querySelector("#leave");

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

paintSky(document.querySelector("#stars"));
paintFireflies(document.querySelector("#fireflies"));
paintMeadow(document.querySelector("#meadow-life"));
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
    author: stripTags(raw.author || "").slice(0, 80),
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

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function bind() {
  jarHit.addEventListener("click", () => setJarOpen(true));
  lid.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.open) setJarOpen(true);
    else if (veil.hidden) setJarOpen(false);
  });
  pick.addEventListener("click", pickWish);
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
      if (!veil.hidden) closeLetter();
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

function fillCard(wish) {
  cardTitle.textContent = wish.title || "A wish";
  const who = wish.author || "A friend";
  const when = formatDate(wish.date);
  cardMeta.textContent = when ? `${who} · ${when}` : who;
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

  if (!reduceMotion && wasClosed && unfold) {
    card.animate(
      [
        { transform: "translateY(28vh) scale(0.18, 0.1) rotate(-8deg)", opacity: 0.2 },
        { transform: "translateY(8vh) scale(0.62, 0.45) rotate(-2deg)", opacity: 1, offset: 0.48 },
        { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1 },
      ],
      { duration: 720, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
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
  if (!reduceMotion) {
    const anim = card.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: "translateY(26vh) scale(0.16, 0.1) rotate(-7deg)", opacity: 0 },
      ],
      { duration: 460, easing: "cubic-bezier(.4,0,.8,1)", fill: "forwards" },
    );
    try {
      await anim.finished;
    } catch {
      /* a newer open or close replaced this one */
    }
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
      leave.href = data.padletUrl;
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
    if (state.activeId) {
      const still = state.wishes.find((wish) => wish.id === state.activeId);
      if (still) fillCard(still);
      else closeLetter();
    }
  } catch (error) {
    document.body.dataset.wishesSource = "fallback";
    console.info("Showing the saved wishes.", error);
  }
}
