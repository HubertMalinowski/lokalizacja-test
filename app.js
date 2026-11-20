const LICZBA_CELOW_W_RUNDZIE = 3;
const STORAGE_IDS_KEY = "ochota_wylosowane_ids_v4";
const STORAGE_WYBRANY_KEY = "ochota_wybrany_indeks_v4";

let wszystkieCele = [];
let CELE = [];
let wybranyIndeks = Number(localStorage.getItem(STORAGE_WYBRANY_KEY) || 0);
let numerZadaniaZdjecia = 0;

function zbudujLinkCalejTrasy(cele) {
  if (!cele || cele.length === 0) return "#";

  const ostatni = cele[cele.length - 1];
  const posrednie = cele.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    destination: `${ostatni.lat},${ostatni.lon}`,
    travelmode: "walking"
  });

  if (posrednie.length > 0) {
    params.set(
      "waypoints",
      posrednie.map((c) => `${c.lat},${c.lon}`).join("|")
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function losujUnikalne(lista, ile) {
  const kopia = [...lista];
  for (let i = kopia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopia[i], kopia[j]] = [kopia[j], kopia[i]];
  }
  return kopia.slice(0, Math.min(ile, kopia.length));
}

function zapiszStan() {
  localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(CELE.map((c) => c.id)));
  localStorage.setItem(STORAGE_WYBRANY_KEY, String(wybranyIndeks));
}

function wybierzCel(idx) {
  if (idx < 0 || idx >= CELE.length) return;
  wybranyIndeks = idx;
  localStorage.setItem(STORAGE_WYBRANY_KEY, String(wybranyIndeks));
  aktualizujUI();
}

function wylosujNowaTrase() {
  CELE = losujUnikalne(wszystkieCele, LICZBA_CELOW_W_RUNDZIE);
  wybranyIndeks = 0;
  zapiszStan();
  zbudujPrzelaczniki();
  aktualizujUI();
}

function zbudujPrzelaczniki() {
  const tabsBar = document.getElementById("tabsBar");
  tabsBar.innerHTML = "";

  CELE.forEach((cel, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn";
    btn.id = `tab-${idx}`;
    btn.innerHTML = `<span class="tab-icon" aria-hidden="true">${ikonaCelu(cel.nazwa)}</span><span class="tab-label">${idx + 1}. ${escapeHTML(cel.nazwa)}</span>`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", "targetBox");
    btn.addEventListener("click", () => wybierzCel(idx));
    btn.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = (idx + (event.key === "ArrowRight" ? 1 : -1) + CELE.length) % CELE.length;
      wybierzCel(next);
      document.getElementById(`tab-${next}`).focus();
    });
    tabsBar.appendChild(btn);
  });
}

async function pobierzUrlZWikimedia(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime");
  url.searchParams.set("iiurlwidth", "800");

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`Błąd HTTP Wikimedia API: ${resp.status}`);
  }

  const data = await resp.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || "";
    if (!mime.startsWith("image/") || mime.includes("svg")) continue;
    const imgUrl = info.thumburl || info.url;
    if (imgUrl) return imgUrl;
  }

  throw new Error(`Brak wyników graficznych dla zapytania: "${query}"`);
}

function ustawKomunikatZdjecia(html, isError = false) {
  const statusEl = document.getElementById("photoStatus");
  statusEl.innerHTML = html;
  statusEl.className = isError ? "photo-status error" : "photo-status";
  statusEl.style.display = "block";
}

async function ustawZdjecie(cel) {
  const taskId = ++numerZadaniaZdjecia;
  const photoBox = document.getElementById("photoBox");
  const photoEl = document.getElementById("targetPhoto");

  photoBox.style.display = "flex";
  photoEl.onload = null;
  photoEl.onerror = null;
  photoEl.style.display = "none";
  photoEl.removeAttribute("src");

  let zrodloUrl = cel.zdjecie || "";

  if (!zrodloUrl && cel.wikiQuery) {
    ustawKomunikatZdjecia(`Szukam zdjęcia w Wikimedia Commons dla: <code>${escapeHTML(cel.wikiQuery)}</code>...`);
    try {
      zrodloUrl = await pobierzUrlZWikimedia(cel.wikiQuery);
    } catch (err) {
      if (taskId !== numerZadaniaZdjecia) return;
      ustawKomunikatZdjecia(
        `<strong>Problem z pobraniem zdjęcia:</strong> ${escapeHTML(err.message)}`,
        true
      );
      return;
    }
  }

  if (taskId !== numerZadaniaZdjecia) return;

  if (!zrodloUrl) {
    ustawKomunikatZdjecia(
      `<strong>Brak zdjęcia:</strong> obiekt w <code>cele.json</code> nie ma pola <code>zdjecie</code> ani <code>wikiQuery</code>.`,
      true
    );
    return;
  }

  const safeUrl = escapeHTML(zrodloUrl);
  ustawKomunikatZdjecia(`Pobieranie obrazu z: <a href="${safeUrl}" target="_blank" rel="noopener">${safeUrl}</a>`);

  photoEl.onload = () => {
    if (taskId !== numerZadaniaZdjecia) return;
    document.getElementById("photoStatus").style.display = "none";
    photoEl.style.display = "block";
  };

  photoEl.onerror = () => {
    if (taskId !== numerZadaniaZdjecia) return;
    photoEl.style.display = "none";
    ustawKomunikatZdjecia(
      `<strong>Nie udało się załadować obrazka</strong> (błąd sieci, blokada lub niepoprawny URL).<br>Link: <a href="${safeUrl}" target="_blank" rel="noopener">${safeUrl}</a>`,
      true
    );
  };

  photoEl.alt = cel.nazwa;
  photoEl.src = zrodloUrl;
}

function aktualizujUI() {
  if (!CELE.length) return;

  if (wybranyIndeks < 0 || wybranyIndeks >= CELE.length) {
    wybranyIndeks = 0;
  }

  CELE.forEach((_, idx) => {
    const btn = document.getElementById(`tab-${idx}`);
    if (btn) {
      btn.classList.toggle("active", idx === wybranyIndeks);
      btn.setAttribute("aria-selected", String(idx === wybranyIndeks));
      btn.tabIndex = idx === wybranyIndeks ? 0 : -1;
    }
  });

  const cel = CELE[wybranyIndeks];
  document.getElementById("targetName").textContent = cel.nazwa;
  document.getElementById("targetDesc").textContent = cel.opis || "";
  document.getElementById("targetLocation").textContent =
    cel.dzielnica ? `${cel.dzielnica}, Warszawa` : "Ochota, Warszawa";
  document.getElementById("targetIcon").innerHTML = ikonaCelu(cel.nazwa);
  document.getElementById("featureGrid").innerHTML = zbudujCechy(cel);
  ustawZdjecie(cel);

  const fullRouteLink = document.getElementById("fullRouteLink");
  fullRouteLink.href = zbudujLinkCalejTrasy(CELE);
  fullRouteLink.style.display = "flex";
}

async function pobierzListeCelow() {
  // Najpierw próbujemy pliku z bieżącej lokalizacji (działa na GitHub Pages
  // i na lokalnym serwerze). Jeśli strona jest otwarta jako file:// albo
  // plik nie został opublikowany, pobieramy kopię z publicznego repozytorium.
  const adresy = [
    new URL("cele.json", window.location.href).href,
    "https://raw.githubusercontent.com/HubertMalinowski/lokalizacja-test/main/cele.json"
  ];
  let ostatniBlad;

  for (const adres of [...new Set(adresy)]) {
    try {
      const response = await fetch(adres, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status} (${adres})`);
      const cele = await response.json();
      if (!Array.isArray(cele) || cele.length === 0) {
        throw new Error(`Plik nie zawiera listy celów (${adres})`);
      }
      return cele;
    } catch (err) {
      ostatniBlad = err;
      console.warn(`Nie udało się pobrać ${adres}`, err);
    }
  }

  throw ostatniBlad || new Error("Nie udało się pobrać pliku cele.json");
}

async function zaladujCele() {
  try {
    wszystkieCele = await pobierzListeCelow();

    const zapisaneIdsRaw = localStorage.getItem(STORAGE_IDS_KEY);
    let odtworzone = null;

    if (zapisaneIdsRaw) {
      const zapisaneIds = JSON.parse(zapisaneIdsRaw);
      if (Array.isArray(zapisaneIds) && zapisaneIds.length > 0) {
        const mapa = new Map(wszystkieCele.map((c) => [c.id, c]));
        const dopasowane = zapisaneIds.map((id) => mapa.get(id)).filter(Boolean);
        if (dopasowane.length === zapisaneIds.length) {
          odtworzone = dopasowane;
        }
      }
    }

    if (odtworzone) {
      CELE = odtworzone;
      if (wybranyIndeks >= CELE.length) {
        wybranyIndeks = 0;
      }
    } else {
      CELE = losujUnikalne(wszystkieCele, LICZBA_CELOW_W_RUNDZIE);
      wybranyIndeks = 0;
      zapiszStan();
    }

    zbudujPrzelaczniki();
    aktualizujUI();
  } catch (err) {
    document.getElementById("targetName").textContent = "Błąd wczytywania trasy";
    document.getElementById("targetDesc").textContent =
      `Nie udało się pobrać cele.json. Otwórz stronę przez serwer (np. GitHub Pages) i sprawdź połączenie z internetem. Szczegóły: ${err.message}`;
    document.getElementById("photoBox").style.display = "none";
    document.getElementById("fullRouteLink").style.display = "none";
    console.error(err);
  }
}

document.getElementById("rerollBtn").addEventListener("click", wylosujNowaTrase);

zaladujCele();
