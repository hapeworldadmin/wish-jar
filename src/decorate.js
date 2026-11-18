import { mulberry32 } from "./layout.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

export function paintSky(root) {
  const rand = mulberry32(20261121);
  for (let i = 0; i < 46; i += 1) {
    const star = document.createElement("span");
    const large = i % 11 === 0;
    star.className = large ? "star star-lg" : "star";
    star.style.left = `${4 + rand() * 92}%`;
    star.style.top = `${rand() * 58}%`;
    star.style.setProperty("--d", `${2.4 + rand() * 4.2}s`);
    star.style.setProperty("--delay", `${-rand() * 7}s`);
    star.style.setProperty("--size", `${large ? 2.4 + rand() : 1 + rand() * 1.5}px`);
    root.appendChild(star);
  }
}

export function paintFireflies(root) {
  const rand = mulberry32(21);
  for (let i = 0; i < 14; i += 1) {
    const fly = document.createElement("span");
    const green = i % 4 === 0;
    fly.className = green ? "firefly firefly-green" : "firefly";
    fly.style.left = `${8 + rand() * 84}%`;
    fly.style.top = `${18 + rand() * 58}%`;
    fly.style.setProperty("--d", `${7 + rand() * 8}s`);
    fly.style.setProperty("--delay", `${-rand() * 10}s`);
    fly.style.setProperty("--dx", `${-30 + rand() * 70}px`);
    fly.style.setProperty("--dy", `${-50 - rand() * 70}px`);
    root.appendChild(fly);
  }
}

export function paintMeadow(group) {
  if (!group) return;
  const rand = mulberry32(1121);
  for (let i = 0; i < 90; i += 1) {
    const x = 20 + rand() * 1400;
    const y = 230 + rand() * 360;
    const height = 16 + rand() * 38;
    const lean = -14 + rand() * 28;
    const path = el("path", {
      d: `M ${x} ${y} C ${x + lean * 0.3} ${y - height * 0.45}, ${x + lean} ${y - height * 0.75}, ${x + lean * 1.1} ${y - height}`,
      fill: "none",
      stroke: rand() > 0.45 ? "#1f7a45" : "#0e4e2c",
      "stroke-width": rand() > 0.7 ? 2.2 : 1.4,
      "stroke-linecap": "round",
      opacity: 0.45 + rand() * 0.45,
    });
    group.appendChild(path);
  }

  const blossoms = [
    ["#8ec4f5", "#fff3c4"],
    ["#d7ecff", "#ffe7a0"],
    ["#fffaf2", "#f0c56a"],
    ["#f6d4dc", "#fff6df"],
    ["#b7e3c4", "#fff8d8"],
  ];

  for (let i = 0; i < 64; i += 1) {
    const x = 30 + rand() * 1380;
    const y = 280 + rand() * 300;
    const [petal, heart] = blossoms[i % blossoms.length];
    const scale = 0.7 + rand() * 1.15;
    const dab = el("ellipse", {
      cx: x,
      cy: y + 3,
      rx: 8 * scale,
      ry: 3.2 * scale,
      fill: "#0c3d24",
      opacity: 0.28,
    });
    const bloom = el("ellipse", {
      cx: x,
      cy: y,
      rx: 4.2 * scale,
      ry: 3.1 * scale,
      fill: petal,
      opacity: 0.92,
    });
    const center = el("ellipse", {
      cx: x,
      cy: y,
      rx: 1.5 * scale,
      ry: 1.15 * scale,
      fill: heart,
    });
    group.append(dab, bloom, center);
  }
}
