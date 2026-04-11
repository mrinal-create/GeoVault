let allCountries = [];      
let searchResults = null;   
let selectedCountry = null; 
let regionFilter = "ALL";   
let popFilter = "none";     
let sortKey = "population"; 
let showFavorites = false;  
let favorites = new Set();   
let searchTimer = null;     

// Load any saved favorites from the browser
try {
  const saved = localStorage.getItem("gv-favorites");
  if (saved) favorites = new Set(JSON.parse(saved));
} catch (e) {}

function saveFavorites() {
  localStorage.setItem("gv-favorites", JSON.stringify([...favorites]));
}

function formatNum(n) {
  if (typeof n !== "number") return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toLocaleString();
}


function parseCountry(c) {
  const currencies = c.currencies
    ? Object.entries(c.currencies).map(([code, info]) => `${info.name} (${code})`).join(", ")
    : "N/A";

  const languages = c.languages
    ? Object.values(c.languages).join(", ")
    : "N/A";

  return {
    name:       c.name?.common    || "Unknown",
    official:   c.name?.official  || "",
    flag:       c.flags?.png      || c.flags?.svg || "",
    region:     c.region          || "Unknown",
    subregion:  c.subregion       || "N/A",
    capital:    c.capital?.[0]    || "N/A",
    area:       c.area            || 0,
    population: c.population      || 0,
    currencies,
    languages,
    cca2:       c.cca2            || "",
  };
}


//  API 

const API_BASE   = "https://restcountries.com/v3.1";
const API_FIELDS = "name,flags,region,subregion,capital,area,population,currencies,languages,cca2";


function showError(msg) {
  document.getElementById("loading").innerHTML = `
    <div class="gv-no-results">
      ${msg}<br><br>
      <button onclick="fetchAllCountries()" style="
        margin-top:12px; padding:8px 20px; border-radius:20px;
        border:1px solid #00E5FF; background:none; color:#00E5FF;
        font-family:'JetBrains Mono', monospace; font-size:12px;
        letter-spacing:1px; cursor:pointer; text-transform:uppercase">
        ↻ RETRY
      </button>
    </div>`;
}

async function fetchAllCountries() {
  if (window.location.protocol === "file:") {
    showError(
      "Cannot fetch data when opened as a local file.<br>" +
      "Please serve this file via a local server:<br><br>" +
      "<code style='font-size:11px; color:#00E5FF'>npx serve .</code>" +
      "&nbsp;&nbsp;or&nbsp;&nbsp;" +
      "<code style='font-size:11px; color:#00E5FF'>python -m http.server</code>"
    );
    return;
  }

  const loadingEl = document.getElementById("loading");
  loadingEl.innerHTML = '<div class="gv-spinner"></div>Loading countries...';
  loadingEl.style.display = "flex";

  try {
    const response = await fetch(`${API_BASE}/all?fields=${API_FIELDS}`);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty or invalid response from API");

    allCountries = data.map(parseCountry);
    loadingEl.style.display = "none";
    updateUI();

  } catch (err) {
    console.error("GeoVault: failed to load countries —", err);
    const reason = err.message === "Failed to fetch"
      ? "<strong style='color:#FF6B6B'>Network Request Blocked.</strong><br>This is typically caused by an ad-blocker flagging the API. Try disabling your tracker-blocker for this page."
      : err.message;
    showError(`Failed to load countries.<br><br><small style='color:#7E96AF; line-height:1.5'>${reason}</small>`);
  }
}


async function searchCountries(query) {
  if (!query.trim()) {
    searchResults = null; 
    updateUI();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/name/${encodeURIComponent(query.trim())}?fields=${API_FIELDS}`);
    const data = response.ok ? await response.json() : [];
    searchResults = Array.isArray(data) ? data.map(parseCountry) : [];
  } catch {
    searchResults = [];
  }

  updateUI();
}


//  FILTERING & SORTING 

function getFilteredCountries() {
  const base = searchResults ?? allCountries;

  return base
    .filter(c => {
      if (showFavorites && !favorites.has(c.name))            return false;
      if (regionFilter !== "ALL" && c.region !== regionFilter) return false;
      if (popFilter === "1m"   && c.population < 1_000_000)   return false;
      if (popFilter === "100m" && c.population < 100_000_000) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "name")       return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      if (sortKey === "population") return b.population - a.population;
      return b.area - a.area;
    });
}


//  RENDER 

function createCardHTML(country, index) {
  const isSelected  = selectedCountry?.name === country.name;
  const isFav       = favorites.has(country.name);
  const fallbackFlag = `https://flagcdn.com/w320/${country.cca2.toLowerCase()}.png`;
  const lazyAttr    = index > 12 ? 'loading="lazy"' : "";

  return `
    <div class="gv-card${isSelected ? " selected" : ""}" data-name="${country.name}">
      <div class="gv-card-header">
        <div class="gv-card-title">
          <img class="gv-card-flag" src="${country.flag}" alt="${country.name}" ${lazyAttr}
               onerror="this.onerror=null; this.src='${fallbackFlag}'">
          <span class="gv-card-name">${country.name}</span>
        </div>
        <span class="gv-card-badge">${country.region}</span>
      </div>
      <div class="gv-card-stats">
        <div>
          <div class="gv-stat-label">POPULATION</div>
          <div class="gv-stat-value${isSelected ? " cyan" : ""}">${formatNum(country.population)}</div>
        </div>
        <div>
          <div class="gv-stat-label">AREA</div>
          <div class="gv-stat-value">${formatNum(country.area)} km²</div>
        </div>
        <div>
          <div class="gv-stat-label">REGION</div>
          <div class="gv-stat-value">${country.region}</div>
        </div>
      </div>
      <div class="gv-card-footer">
        <span class="gv-card-langs">${country.languages}</span>
        <button class="gv-fav-btn${isFav ? " favorited" : ""}" data-fav-name="${country.name}">
          ${isFav ? "♥" : "♡"}
        </button>
      </div>
    </div>`;
}


function updateGrid() {
  if (allCountries.length === 0) return; 

  const countries = getFilteredCountries();
  const grid = document.getElementById("country-grid");

  grid.innerHTML = countries.length
    ? countries.map(createCardHTML).join("")
    : '<div class="gv-no-results">No countries found</div>';
}


function updatePanel() {
  const panel = document.getElementById("detail-panel");

  if (!selectedCountry) {
    panel.style.display = "none";
    return;
  }

  const c = selectedCountry;
  panel.style.display = "";

  
  const flagEl = document.getElementById("panel-flag");
  flagEl.onerror = () => { flagEl.onerror = null; flagEl.src = `https://flagcdn.com/w320/${c.cca2.toLowerCase()}.png`; };
  flagEl.src = c.flag;
  flagEl.alt = c.name;

  
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set("panel-name",       c.name);
  set("panel-capital",    c.capital);
  set("panel-subregion",  `Subregion · ${c.subregion}`);
  set("panel-pop",        c.population.toLocaleString());
  set("panel-area",       `${c.area.toLocaleString()} km²`);
  set("panel-region",     c.region);
  set("panel-langs",      c.languages);
  set("panel-sub2",       c.subregion);
  set("panel-currencies", c.currencies);
  set("panel-cap2",       c.capital);
}


function updateStatusBar() {
  const count     = allCountries.length;
  const totalPop  = allCountries.reduce((sum, c) => sum + c.population, 0);
  const totalArea = allCountries.reduce((sum, c) => sum + c.area, 0);

  document.getElementById("nav-count").textContent    = `${count} COUNTRIES · REST COUNTRIES API`;
  document.getElementById("status-left").textContent  = `${count} COUNTRIES · LIVE`;
  document.getElementById("status-right").textContent = `COUNTRIES ${count} · WORLD POP ${formatNum(totalPop)} · LAND AREA ${formatNum(totalArea)} KM²`;
}

function updateUI() {
  updateGrid();
  updatePanel();
  updateStatusBar();
}


//  EVENT LISTENERS 

// close the detail panel
document.getElementById("panel-close").addEventListener("click", () => {
  selectedCountry = null;
  updateUI();
});

// Search box → wait 400ms after the user stops typing, then search
document.getElementById("search-input").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchCountries(e.target.value), 400);
});

// Filter (region / population / favorites)
document.getElementById("filters").addEventListener("click", e => {
  const btn = e.target.closest(".gv-pill");
  if (!btn) return;

  if (btn.dataset.region) {
    regionFilter = btn.dataset.region;
    showFavorites = false;
    document.querySelectorAll("[data-region]").forEach(el => el.classList.toggle("active", el.dataset.region === regionFilter));
    document.querySelector("[data-fav]").classList.remove("fav-active");

  } else if (btn.dataset.pop) {
    popFilter = popFilter === btn.dataset.pop ? "none" : btn.dataset.pop;
    document.querySelectorAll("[data-pop]").forEach(el => el.classList.toggle("active", el.dataset.pop === popFilter));

  } else if (btn.dataset.fav) {
    showFavorites = !showFavorites;
    btn.classList.toggle("fav-active", showFavorites);
    document.querySelectorAll("[data-region]").forEach(el => el.classList.toggle("active", !showFavorites && el.dataset.region === regionFilter));
  }

  updateUI();
});

// Sort buttons (Name / Population / Area)
document.querySelector(".gv-sort-row").addEventListener("click", e => {
  const btn = e.target.closest(".gv-sort-btn");
  if (!btn) return;
  sortKey = btn.dataset.sort;
  document.querySelectorAll(".gv-sort-btn").forEach(el => el.classList.toggle("active", el.dataset.sort === sortKey));
  updateUI();
});

// Clicks inside the country grid (card or favorite button)
document.getElementById("country-grid").addEventListener("click", e => {
  // Favorite button
  const favBtn = e.target.closest(".gv-fav-btn");
  if (favBtn) {
    e.stopPropagation();
    const name = favBtn.dataset.favName;
    favorites.has(name) ? favorites.delete(name) : favorites.add(name);
    saveFavorites();
    updateUI();
    return;
  }

  // Country card → open / close 
  const card = e.target.closest(".gv-card");
  if (card) {
    const name = card.dataset.name;
    const country = getFilteredCountries().find(c => c.name === name);
    selectedCountry = selectedCountry?.name === name ? null : country;
    updateUI();
  }
});

// Light / Dark theme toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  const app    = document.getElementById("app");
  const isDark = app.classList.contains("dark");
  app.classList.toggle("dark",  !isDark);
  app.classList.toggle("light",  isDark);
  document.getElementById("icon-sun").style.display  = isDark ? "none" : "";
  document.getElementById("icon-moon").style.display = isDark ? ""     : "none";
  document.getElementById("theme-label").textContent = isDark ? "DARK" : "LIGHT";
});

fetchAllCountries();
