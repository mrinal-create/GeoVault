// MILESTONE 2: FETCH & DISPLAY DATA 

let allCountries = []; 
const API_BASE = "https://restcountries.com/v3.1";
const API_FIELDS = "name,flags,region,population,area,languages,cca2";


function formatNum(n) {
  if (typeof n !== "number") return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toLocaleString();
}


function parseCountry(c) {
  return {
    name:       c.name?.common || "Unknown",
    flag:       c.flags?.png || c.flags?.svg || "",
    region:     c.region || "Unknown",
    area:       c.area || 0,
    population: c.population || 0,
    languages:  c.languages ? Object.values(c.languages).join(", ") : "N/A",
    cca2:       c.cca2 || "",
  };
}

// 1. Fetch Data and Handle Loading States
async function fetchAllCountries() {
  const loadingEl = document.getElementById("loading");
  
  // Show Loading State
  loadingEl.innerHTML = '<div class="gv-spinner"></div>Loading countries...';
  loadingEl.style.display = "flex";

  try {
    const response = await fetch(`${API_BASE}/all?fields=${API_FIELDS}`);
    if (!response.ok) throw new Error("API Network Error");

    const data = await response.json();
    allCountries = data.map(parseCountry);
    
    // Sort alphabetically by default for the initial display
    allCountries.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

    // Hide Loading State
    loadingEl.style.display = "none";
    
    // Render Data to the screen
    renderGrid(allCountries);

  } catch (err) {
    console.error("GeoVault Error:", err);
    loadingEl.innerHTML = `<div class="gv-no-results">Failed to load data from API. Please check your connection.</div>`;
  }
}

// 2. Dynamically Display Data on the Webpage
function renderGrid(countries) {
  const grid = document.getElementById("country-grid");
  grid.innerHTML = ""; 

  countries.forEach((country, index) => {
    const fallbackFlag = `https://flagcdn.com/w320/${country.cca2.toLowerCase()}.png`;
    
    // Lazy load images that are not instantly visible on screen
    const lazyAttr = index > 12 ? 'loading="lazy"' : "";

    // HTML for the card
    const cardHTML = `
      <div class="gv-card">
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
            <div class="gv-stat-value cyan">${formatNum(country.population)}</div>
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
          <button class="gv-fav-btn" title="Milestone 3 Feature">♡</button>
        </div>
      </div>`;
      
    
    grid.innerHTML += cardHTML;
  });

  // 3. Update Status Bar Counters dynamically
  const totalPop = countries.reduce((sum, c) => sum + c.population, 0);
  const totalArea = countries.reduce((sum, c) => sum + c.area, 0);

  document.getElementById("nav-count").textContent = `${countries.length} COUNTRIES · REST COUNTRIES API`;
  document.getElementById("status-left").textContent = `${countries.length} COUNTRIES · LIVE`;
  document.getElementById("status-right").textContent = `COUNTRIES ${countries.length} · WORLD POP ${formatNum(totalPop)} · LAND AREA ${formatNum(totalArea)} KM²`;
}

fetchAllCountries();

