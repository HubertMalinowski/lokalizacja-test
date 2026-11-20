function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&",
    "<": "<",
    ">": ">",
    '"': """,
    "'": "'"
  }[char]));
}

const svgIcon = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICON = {
  tree: svgIcon('<path d="m12 2 6 9h-3l4 6H5l4-6H6zM12 17v5"/>'),
  building: svgIcon('<path d="M3 21V8l9-5 9 5v13M8 21v-8h8v8M3 10h18"/>'),
  shopping: svgIcon('<path d="M4 8h16l-1 13H5L4 8ZM9 9V6a3 3 0 0 1 6 0v3"/>'),
  place: svgIcon('<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'),
  hill: svgIcon('<path d="m2 20 7-12 4 6 3-4 6 10H2Z"/>'),
  waves: svgIcon('<path d="M2 8c2 0 2 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2M2 15c2 0 2 2 5 2s3-2 5-2 3 2 5 2 3-2 5-2"/>'),
  walk: svgIcon('<circle cx="14" cy="4" r="2"/><path d="m6 21 4-6 2-5-4 2-3 4m7-6 3 4 5 2m-9 0 5 5"/>'),
  activity: svgIcon('<path d="m3 17 6-8 4 4 3-6 5 10M4 21h16"/>'),
  fort: svgIcon('<path d="M3 21V9l3-2V4h3v3l3-2 3 2V4h3v3l3 2v12H3ZM10 21v-7h4v7"/>')
};

function ikonaCelu(nazwa) {
  const n = (nazwa || "").toLowerCase();
  if (/park|ogród|zieleni|skwer|las/.test(n)) return ICON.tree;
  if (/fort|twierd|bastion/.test(n)) return ICON.fort;
  if (/centrum handlow|\bch\b|sklep|galeria/.test(n)) return ICON.shopping;
  if (/górk|wzniesien/.test(n)) return ICON.hill;
  return ICON.place;
}

function zbudujCechy(cel) {
  const opis = `${cel.nazwa || ""} ${cel.opis || ""}`.toLowerCase();
  const reguly = [
    [/górk|wzniesieni|wzgórz/, ICON.hill, "Wzniesienia"],
    [/stok|narc[iy]arsk/, ICON.activity, "Sport zimowy"],
    [/staw|jezior|wodn/, ICON.waves, "Akweny"],
    [/ścież|spacer|biegow/, ICON.walk, "Spacery i ścieżki"],
    [/basen|pływalni/, ICON.waves, "Basen"],
    [/rekreac|trawnik|park|teren zielon/, ICON.tree, "Rekreacja"],
    [/fort|fortyfikac|obronn/, ICON.fort, "Historia i fortyfikacje"],
    [/zakup|handlow|sklep/, ICON.shopping, "Zakupy"],
    [/zabyt|historycz|dawn/, ICON.building, "Historia miejsca"]
  ];

  const trafienia = reguly.filter(([regex]) => regex.test(opis)).slice(0, 6);
  if (!trafienia.length) {
    return `<div class="feature-empty">Poznaj to miejsce podczas spaceru</div>`;
  }

  return trafienia
    .map(([, ico, label]) => `<div class="feature">${ico}<span>${label}</span></div>`)
    .join("");
}