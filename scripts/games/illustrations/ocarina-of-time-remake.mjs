// Generates the original, language-neutral step illustrations for
// content/games/the-legend-of-zelda-ocarina-of-time-remake.json into
// public/guides/the-legend-of-zelda-ocarina-of-time-remake/*.svg.
//
//   node scripts/games/illustrations/ocarina-of-time-remake.mjs
//
// These are explanatory diagrams drawn from scratch in the app's palette — not
// game screenshots. Text is kept to numbers and proper nouns so one file works
// for both EN and PT; the step's own description carries the explanation.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(
  __dirname,
  "../../../public/guides/the-legend-of-zelda-ocarina-of-time-remake"
);

const C = {
  bg: "#11171d",
  panel: "#18212a",
  line: "#2a3541",
  text: "#e8eef2",
  muted: "#8d9ba8",
  teal: "#3ec6cc",
  yellow: "#f5c84b",
  red: "#ef5a5a",
  green: "#48c78e",
  blue: "#5b9cf5",
  purple: "#a77bf3",
  orange: "#f29545",
  water: "#2f7fd1",
};

const W = 640;
const H = 360;
const FONT = `font-family="Geist, 'Segoe UI', Roboto, sans-serif"`;

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" rx="20" fill="${C.bg}"/>
${body}
${watermark()}
</svg>
`;
}

// Small pencil + "Xplore" mark so it's clear this is an illustration.
function watermark() {
  return `<g opacity=".55" transform="translate(${W - 92} ${H - 26})">
  <path d="M0 10 L8 2 L11 5 L3 13 L0 13 Z" fill="${C.muted}"/>
  <text x="17" y="12" ${FONT} font-size="11" fill="${C.muted}" letter-spacing=".5">Xplore</text>
</g>`;
}

// Three numbered panels joined by arrows — the "do this, then this" layout.
function panels(contents) {
  const pw = 180;
  const ph = 250;
  const gap = 30;
  const x0 = (W - (pw * 3 + gap * 2)) / 2;
  const y0 = 46;
  return contents
    .map((draw, i) => {
      const x = x0 + i * (pw + gap);
      const arrow =
        i < contents.length - 1
          ? `<path d="M${x + pw + 7} ${y0 + ph / 2} h16 m-6 -6 l6 6 l-6 6" stroke="${C.teal}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          : "";
      return `<g>
  <rect x="${x}" y="${y0}" width="${pw}" height="${ph}" rx="16" fill="${C.panel}" stroke="${C.line}"/>
  <circle cx="${x + 24}" cy="${y0 + 24}" r="13" fill="${C.teal}"/>
  <text x="${x + 24}" y="${y0 + 29}" ${FONT} font-size="14" font-weight="700" fill="${C.bg}" text-anchor="middle">${i + 1}</text>
  <g transform="translate(${x} ${y0})">${draw(pw, ph)}</g>
</g>${arrow}`;
    })
    .join("\n");
}

// --- reusable icons (drawn around their own origin) -------------------------
const sword = (x, y, s = 1, rot = -35) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <rect x="-4" y="-46" width="8" height="52" rx="2" fill="#cfd8e0"/>
  <path d="M-4 -46 L0 -56 L4 -46 Z" fill="#cfd8e0"/>
  <rect x="-16" y="6" width="32" height="6" rx="3" fill="${C.blue}"/>
  <rect x="-3.5" y="12" width="7" height="18" rx="2" fill="#6b4b2e"/>
  <circle cy="33" r="4" fill="${C.yellow}"/>
</g>`;

const bomb = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <circle r="15" fill="#2c4a8a"/>
  <circle r="15" fill="none" stroke="#5b7fc9" stroke-width="2"/>
  <rect x="-5" y="-21" width="10" height="7" rx="2" fill="#8d9ba8"/>
  <path d="M0 -21 q6 -10 14 -6" stroke="${C.muted}" stroke-width="2" fill="none"/>
  <circle cx="15" cy="-28" r="4" fill="${C.orange}"/><circle cx="15" cy="-28" r="2" fill="${C.yellow}"/>
</g>`;

const stars = (x, y) => `<g transform="translate(${x} ${y})" fill="${C.yellow}">
  ${[[-18, 0], [0, -10], [18, 0]]
    .map(([dx, dy]) => `<path transform="translate(${dx} ${dy}) scale(.6)" d="M0 -10 L3 -3 L10 -3 L4 2 L6 10 L0 5 L-6 10 L-4 2 L-10 -3 L-3 -3 Z"/>`)
    .join("")}
</g>`;

const impact = (x, y, color = C.yellow) => `<g transform="translate(${x} ${y})" stroke="${color}" stroke-width="3" stroke-linecap="round">
  ${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `<line x1="${(Math.cos(r) * 8).toFixed(1)}" y1="${(Math.sin(r) * 8).toFixed(1)}" x2="${(Math.cos(r) * 16).toFixed(1)}" y2="${(Math.sin(r) * 16).toFixed(1)}"/>`;
    })
    .join("")}
</g>`;

const shot = (x1, y1, x2, y2, color = C.teal) =>
  `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="5" fill="${color}"/></g>`;

const slingshot = (x, y) => `<g transform="translate(${x} ${y})" stroke="#9a6a3d" stroke-width="6" stroke-linecap="round" fill="none">
  <path d="M0 26 V4 M0 4 L-12 -14 M0 4 L12 -14"/>
  <path d="M-12 -14 Q0 -2 12 -14" stroke="${C.muted}" stroke-width="2"/>
</g>`;

const boomerang = (x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <path d="M-16 6 Q0 -18 16 6 L10 9 Q0 -6 -10 9 Z" fill="${C.yellow}" stroke="#b8902b" stroke-width="1.5"/>
</g>`;

const bow = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke-linecap="round">
  <path d="M-6 -24 Q14 0 -6 24" stroke="#9a6a3d" stroke-width="5"/>
  <line x1="-6" y1="-24" x2="-6" y2="24" stroke="${C.muted}" stroke-width="1.5"/>
</g>`;

const goggles = (x, y) => `<g transform="translate(${x} ${y})">
  <rect x="-34" y="-4" width="68" height="6" rx="3" fill="#6b4b2e"/>
  <circle cx="-15" cy="0" r="14" fill="#271d3d" stroke="${C.purple}" stroke-width="4"/>
  <circle cx="15" cy="0" r="14" fill="#271d3d" stroke="${C.purple}" stroke-width="4"/>
  <circle cx="-19" cy="-4" r="3.5" fill="${C.purple}" opacity=".8"/><circle cx="11" cy="-4" r="3.5" fill="${C.purple}" opacity=".8"/>
</g>`;

const hammer = (x, y, rot = -30) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <rect x="-3.5" y="-6" width="7" height="50" rx="2" fill="#6b4b2e"/>
  <rect x="-20" y="-24" width="40" height="22" rx="4" fill="#8d9ba8"/>
  <rect x="-20" y="-24" width="8" height="22" rx="2" fill="#b7c3cd"/>
</g>`;

const ocarina = (x, y) => `<g transform="translate(${x} ${y})">
  <ellipse rx="18" ry="12" fill="${C.blue}"/><rect x="14" y="-5" width="12" height="9" rx="3" fill="${C.blue}"/>
  <circle cx="-6" cy="-3" r="2" fill="${C.bg}"/><circle cx="2" cy="-4" r="2" fill="${C.bg}"/><circle cx="-2" cy="4" r="2" fill="${C.bg}"/>
  <path d="M30 -18 v-14 l10 -3 v14" stroke="${C.yellow}" stroke-width="2.5" fill="none"/>
  <circle cx="28" cy="-17" r="3.5" fill="${C.yellow}"/><circle cx="38" cy="-20" r="3.5" fill="${C.yellow}"/>
</g>`;

const triforce = (x, y, s = 1, color = C.yellow) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">
  <path d="M0 -14 L8 0 H-8 Z"/><path d="M-8 0 L0 14 H-16 Z"/><path d="M8 0 L16 14 H0 Z"/>
</g>`;

// --- illustrations ----------------------------------------------------------
const drawings = {
  // Queen Gohma: eye turns red → slingshot it → strike while she's down.
  "queen-gohma": svg(
    panels([
      (w) => `
        <ellipse cx="${w / 2}" cy="130" rx="62" ry="40" fill="#3b4a2a"/>
        <ellipse cx="${w / 2}" cy="130" rx="44" ry="30" fill="#f2efe6"/>
        <circle cx="${w / 2}" cy="130" r="22" fill="${C.red}"/>
        <circle cx="${w / 2}" cy="130" r="9" fill="#2a0b0b"/>
        <circle cx="${w / 2 - 6}" cy="124" r="4" fill="#fff" opacity=".8"/>
        <g stroke="${C.red}" stroke-width="3" stroke-linecap="round" opacity=".7">
          <line x1="${w / 2}" y1="72" x2="${w / 2}" y2="82"/><line x1="${w / 2 - 70}" y1="130" x2="${w / 2 - 80}" y2="130"/><line x1="${w / 2 + 70}" y1="130" x2="${w / 2 + 80}" y2="130"/>
        </g>`,
      (w) => `
        ${slingshot(40, 190)}
        ${shot(52, 172, w / 2 + 22, 110)}
        <ellipse cx="${w / 2 + 30}" cy="104" rx="34" ry="24" fill="#3b4a2a"/>
        <circle cx="${w / 2 + 30}" cy="104" r="15" fill="${C.red}"/>
        ${impact(w / 2 + 30, 104)}`,
      (w) => `
        <ellipse cx="${w / 2}" cy="170" rx="56" ry="20" fill="#3b4a2a"/>
        <ellipse cx="${w / 2}" cy="166" rx="30" ry="12" fill="#f2efe6"/>
        <path d="M${w / 2 - 14} 166 h28" stroke="#2a0b0b" stroke-width="4" stroke-linecap="round"/>
        ${stars(w / 2, 132)}
        ${sword(w / 2 + 34, 118, 0.9, -40)}`,
    ])
  ),

  // King Dodongo: wait for the inhale → bomb in the mouth → strike.
  "king-dodongo": svg(
    panels([
      (w) => `
        <path d="M30 190 Q30 110 90 100 Q150 92 160 150 L160 190 Z" fill="#7a5a3a"/>
        <path d="M100 128 Q140 120 160 150 L160 176 Q130 160 100 168 Z" fill="#2a1410"/>
        <circle cx="78" cy="122" r="7" fill="${C.yellow}"/>
        <g stroke="${C.teal}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85">
          <path d="M176 136 h-10"/><path d="M176 150 h-14"/><path d="M176 164 h-10"/>
        </g>`,
      (w) => `
        <path d="M30 190 Q30 110 90 100 Q150 92 160 150 L160 190 Z" fill="#7a5a3a"/>
        <path d="M100 128 Q140 120 160 150 L160 176 Q130 160 100 168 Z" fill="#2a1410"/>
        <circle cx="78" cy="122" r="7" fill="${C.yellow}"/>
        ${bomb(136, 152, 0.85)}
        <path d="M120 70 Q150 80 140 120" stroke="${C.teal}" stroke-width="2.5" stroke-dasharray="2 7" fill="none" stroke-linecap="round"/>`,
      (w) => `
        <path d="M24 196 Q40 150 92 150 Q150 150 164 196 Z" fill="#7a5a3a"/>
        <circle cx="70" cy="168" r="6" fill="${C.yellow}"/>
        ${impact(118, 120, C.orange)}
        ${stars(92, 128)}
        ${sword(132, 96, 0.9, -40)}`,
    ])
  ),

  // Barinade: boomerang the ceiling tentacles → clear the jellyfish → strike.
  barinade: svg(
    panels([
      (w) => `
        <rect x="20" y="52" width="${w - 40}" height="10" rx="5" fill="#5a2f3f"/>
        ${[50, 90, 130].map((x) => `<path d="M${x} 62 Q${x + 8} 92 ${w / 2} 130" stroke="#c05a7a" stroke-width="5" fill="none"/>`).join("")}
        <ellipse cx="${w / 2}" cy="150" rx="34" ry="24" fill="#8a3f5c"/>
        ${boomerang(46, 100, 20)}
        ${impact(62, 84)}`,
      (w) => `
        <ellipse cx="${w / 2}" cy="140" rx="30" ry="22" fill="#8a3f5c"/>
        ${[[50, 100], [130, 96], [44, 176], [140, 180]]
          .map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M-12 0 Q0 -16 12 0 Z" fill="#7fd1e8" opacity=".85"/><path d="M-8 0 v8 M0 0 v10 M8 0 v8" stroke="#7fd1e8" stroke-width="2"/></g>`)
          .join("")}
        ${boomerang(128, 98, -20)}
        ${impact(130, 96)}`,
      (w) => `
        <ellipse cx="${w / 2}" cy="160" rx="38" ry="26" fill="#8a3f5c"/>
        <circle cx="${w / 2}" cy="156" r="10" fill="${C.yellow}" opacity=".9"/>
        ${stars(w / 2, 118)}
        ${sword(w / 2 + 40, 116, 0.9, -40)}`,
    ])
  ),

  // Forest Temple: the four Poe Sisters each hold a flame for the elevator.
  "poe-sisters": svg(`
  <rect x="40" y="40" width="${W - 80}" height="280" rx="18" fill="${C.panel}" stroke="${C.line}"/>
  <rect x="${W / 2 - 54}" y="158" width="108" height="64" rx="10" fill="#26303b" stroke="${C.teal}" stroke-width="2"/>
  <path d="M${W / 2 - 30} 196 h60 M${W / 2} 176 v40" stroke="${C.teal}" stroke-width="2" opacity=".5"/>
  ${[
    ["Joelle", C.red, 140, 104],
    ["Beth", C.blue, 500, 104],
    ["Amy", C.green, 140, 272],
    ["Meg", C.purple, 500, 272],
  ]
    .map(
      ([name, color, x, y]) => `
  <g>
    <path d="M${x} ${y - 30} Q${x + 18} ${y - 6} ${x + 10} ${y + 12} Q${x} ${y + 22} ${x - 10} ${y + 12} Q${x - 18} ${y - 6} ${x} ${y - 30} Z" fill="${color}"/>
    <path d="M${x} ${y - 12} Q${x + 8} ${y + 2} ${x + 4} ${y + 10} Q${x} ${y + 14} ${x - 4} ${y + 10} Q${x - 8} ${y + 2} ${x} ${y - 12} Z" fill="#fff" opacity=".55"/>
    <text x="${x}" y="${y + 40}" ${FONT} font-size="15" font-weight="600" fill="${C.text}" text-anchor="middle">${name}</text>
    <path d="M${x + (x < W / 2 ? 40 : -40)} ${y} L${W / 2 + (x < W / 2 ? -62 : 62)} ${y < 190 ? 172 : 208}" stroke="${color}" stroke-width="2.5" stroke-dasharray="3 7" stroke-linecap="round"/>
  </g>`
    )
    .join("")}
  `),

  // Water Temple: Zelda's Lullaby at a Triforce symbol sets one of 3 levels.
  "water-temple-levels": svg(`
  <rect x="40" y="40" width="${W - 80}" height="280" rx="18" fill="${C.panel}" stroke="${C.line}"/>
  <path d="M200 300 V90 h40 V300 Z" fill="#26303b"/>
  <path d="M140 300 V170 h60 V300 Z M240 300 V130 h60 V300 Z" fill="#202934"/>
  <rect x="64" y="200" width="${W - 128}" height="100" fill="${C.water}" opacity=".35"/>
  <path d="M64 200 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t32 0" stroke="${C.water}" stroke-width="3" fill="none"/>
  ${[
    ["1", 114, 270],
    ["2", 114, 200],
    ["3", 114, 112],
  ]
    .map(
      ([n, x, y]) => `
  <line x1="64" y1="${y}" x2="${W - 64}" y2="${y}" stroke="${C.teal}" stroke-width="1.5" stroke-dasharray="4 6" opacity=".7"/>
  <circle cx="${x - 26}" cy="${y}" r="13" fill="${C.teal}"/>
  <text x="${x - 26}" y="${y + 5}" ${FONT} font-size="14" font-weight="700" fill="${C.bg}" text-anchor="middle">${n}</text>`
    )
    .join("")}
  ${triforce(220, 112, 1)}
  ${triforce(170, 200, 1)}
  ${triforce(270, 270, 1)}
  ${ocarina(430, 170)}
  <path d="M396 176 Q340 190 300 196" stroke="${C.yellow}" stroke-width="2.5" stroke-dasharray="3 7" fill="none" stroke-linecap="round"/>
  `),

  // Morpha: Longshot the nucleus out of the water → slash it.
  morpha: svg(
    panels([
      (w) => `
        <rect x="16" y="120" width="${w - 32}" height="110" rx="10" fill="${C.water}" opacity=".35"/>
        <path d="M60 230 Q50 150 90 110 Q130 150 120 230 Z" fill="${C.water}" opacity=".6"/>
        <circle cx="90" cy="130" r="16" fill="${C.red}"/><circle cx="85" cy="125" r="5" fill="#fff" opacity=".6"/>`,
      (w) => `
        <rect x="16" y="150" width="${w - 32}" height="80" rx="10" fill="${C.water}" opacity=".35"/>
        <circle cx="128" cy="110" r="16" fill="${C.red}"/>
        <line x1="34" y1="190" x2="112" y2="118" stroke="#b7c3cd" stroke-width="3" stroke-dasharray="6 4"/>
        <path d="M112 118 l-12 2 l4 -12 Z" fill="#b7c3cd"/>
        <rect x="22" y="188" width="18" height="14" rx="3" fill="#8d9ba8"/>
        <path d="M128 132 Q120 170 104 190" stroke="${C.teal}" stroke-width="2.5" stroke-dasharray="2 7" fill="none" stroke-linecap="round"/>`,
      (w) => `
        <rect x="16" y="170" width="${w - 32}" height="60" rx="10" fill="${C.water}" opacity=".35"/>
        <circle cx="${w / 2 - 10}" cy="150" r="16" fill="${C.red}"/>
        ${impact(w / 2 - 10, 150)}
        ${sword(w / 2 + 34, 118, 0.9, -40)}`,
    ])
  ),

  // Bongo Bongo: Lenses of Truth → stun both hands → hit the eye.
  "bongo-bongo": svg(
    panels([
      (w) => `
        ${goggles(w / 2, 110)}
        <ellipse cx="${w / 2}" cy="190" rx="54" ry="16" fill="#3a2f22"/>
        <ellipse cx="${w / 2}" cy="186" rx="40" ry="10" fill="#5a4a36"/>
        <circle cx="${w / 2}" cy="160" r="14" fill="${C.purple}" opacity=".35"/>
        <circle cx="${w / 2}" cy="160" r="6" fill="${C.purple}" opacity=".6"/>`,
      (w) => `
        ${bow(34, 140)}
        ${[[120, 96], [124, 184]]
          .map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M-22 10 Q-24 -16 0 -18 Q22 -18 22 4 L18 14 Z" fill="#6f5a8f"/>${[-14, -5, 4, 13].map((dx) => `<rect x="${dx - 3}" y="-30" width="6" height="16" rx="3" fill="#6f5a8f"/>`).join("")}</g>`)
          .join("")}
        ${shot(44, 132, 104, 100)}
        ${shot(44, 148, 106, 182)}
        ${stars(124, 62)}`,
      (w) => `
        <circle cx="${w / 2 + 10}" cy="140" r="34" fill="#f2efe6"/>
        <circle cx="${w / 2 + 10}" cy="140" r="18" fill="${C.red}"/>
        <circle cx="${w / 2 + 10}" cy="140" r="7" fill="#2a0b0b"/>
        ${bow(28, 140)}
        ${shot(40, 140, w / 2 - 6, 140)}
        ${impact(w / 2 + 10, 140)}`,
    ])
  ),

  // Twinrova: catch one sister's blast with the Mirror Shield → fire it at the other.
  twinrova: svg(`
  <rect x="40" y="40" width="${W - 80}" height="280" rx="18" fill="${C.panel}" stroke="${C.line}"/>
  ${[
    [140, C.blue, "#9fd3ff"],
    [500, C.red, "#ffb38a"],
  ]
    .map(
      ([x, color, glow]) => `
  <g>
    <circle cx="${x}" cy="110" r="34" fill="${color}" opacity=".18"/>
    <path d="M${x - 22} 128 Q${x} 70 ${x + 22} 128 Z" fill="#3d3550"/>
    <circle cx="${x}" cy="96" r="14" fill="#c9b9a0"/>
    <path d="M${x - 26} 84 L${x} 54 L${x + 26} 84 Z" fill="${color}"/>
    <circle cx="${x}" cy="150" r="10" fill="${glow}"/>
  </g>`
    )
    .join("")}
  <g transform="translate(${W / 2} 230)">
    <path d="M-34 -40 H34 V6 Q34 34 0 48 Q-34 34 -34 6 Z" fill="#b7c3cd" stroke="${C.yellow}" stroke-width="4"/>
    <path d="M-20 -26 H20 V4 Q20 22 0 32 Q-20 22 -20 4 Z" fill="#dce7ef"/>
    <circle cy="0" r="9" fill="${C.blue}" opacity=".7"/>
  </g>
  <path d="M152 160 Q220 220 280 226" stroke="#9fd3ff" stroke-width="4" stroke-dasharray="3 8" fill="none" stroke-linecap="round"/>
  <path d="M360 214 Q430 190 488 160" stroke="#9fd3ff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M488 160 l-14 0 l6 -11" stroke="#9fd3ff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${impact(500, 150, "#9fd3ff")}
  <circle cx="200" cy="300" r="13" fill="${C.teal}"/><text x="200" y="305" ${FONT} font-size="14" font-weight="700" fill="${C.bg}" text-anchor="middle">1</text>
  <circle cx="440" cy="300" r="13" fill="${C.teal}"/><text x="440" y="305" ${FONT} font-size="14" font-weight="700" fill="${C.bg}" text-anchor="middle">2</text>
  `),

  // Volvagia: hammer its head when it pops out of a lava pit.
  volvagia: svg(
    panels([
      (w) => `
        ${[[50, 150], [130, 150], [90, 200]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="28" ry="10" fill="${C.orange}"/><ellipse cx="${x}" cy="${y}" rx="18" ry="5" fill="${C.yellow}"/>`).join("")}`,
      (w) => `
        ${[[50, 150], [90, 200]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="28" ry="10" fill="${C.orange}"/>`).join("")}
        <ellipse cx="130" cy="150" rx="28" ry="10" fill="${C.orange}"/>
        <path d="M112 150 Q114 106 136 100 Q156 100 152 124 L148 150 Z" fill="#b8402f"/>
        <circle cx="140" cy="112" r="4" fill="${C.yellow}"/>`,
      (w) => `
        <ellipse cx="${w / 2}" cy="190" rx="28" ry="10" fill="${C.orange}"/>
        <path d="M${w / 2 - 18} 190 Q${w / 2 - 16} 150 ${w / 2 + 6} 146 Q${w / 2 + 26} 146 ${w / 2 + 22} 170 L${w / 2 + 18} 190 Z" fill="#b8402f"/>
        ${impact(w / 2 + 4, 140)}
        ${hammer(w / 2 + 30, 100, -35)}`,
    ])
  ),
};

mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(drawings)) {
  writeFileSync(path.join(OUT, `${name}.svg`), content, "utf8");
}
console.log(`✓ Wrote ${Object.keys(drawings).length} illustrations → ${path.relative(process.cwd(), OUT)}`);
