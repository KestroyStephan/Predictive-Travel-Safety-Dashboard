// client/app.js

const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
// Change this to match your Backend Key
const CLIENT_API_KEY = "dev-demo-api-key-123"; 

let currentCombinedPayload = null;

// Destination Card
const destNameEl = document.getElementById("dest-name");
const destCodeEl = document.getElementById("dest-code");
const destUpdatedEl = document.getElementById("dest-updated");
const flagImageEl = document.getElementById("flag-image");
const scoreValueEl = document.getElementById("score-value");
const scoreRingWrapperEl = document.getElementById("score-ring-wrapper");
const riskLevelEl = document.getElementById("risk-level");

// General
const advisoryTextEl = document.getElementById("advisory-text");
const saveBtn = document.getElementById("save-btn");
const checkBtn = document.getElementById("check-btn");
const refreshHistoryBtn = document.getElementById("refresh-history-btn");
const countryInput = document.getElementById("country-input");
const historyBodyEl = document.getElementById("history-body");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameEl = document.getElementById("user-name");

// --- COUNTRY MAPPING ---
const COUNTRY_MAP = {
    "sri lanka": "LK", "usa": "US", "united states": "US", "america": "US",
    "united kingdom": "GB", "uk": "GB", "england": "GB", "australia": "AU",
    "canada": "CA", "france": "FR", "germany": "DE", "japan": "JP",
    "india": "IN", "china": "CN", "russia": "RU", "brazil": "BR",
    "italy": "IT", "spain": "ES", "mexico": "MX", "indonesia": "ID",
    "netherlands": "NL", "saudi arabia": "SA", "switzerland": "CH",
    "turkey": "TR", "singapore": "SG", "uae": "AE", "united arab emirates": "AE",
    "south korea": "KR", "new zealand": "NZ"
};

// --- HELPER FUNCTIONS ---
function formatDateTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function getRiskFromScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return { label: "Unknown", className: "" };
  if (score >= 4.0) return { label: "High Risk", className: "danger" };
  if (score >= 2.5) return { label: "Moderate Risk", className: "moderate" };
  return { label: "Safe", className: "safe" };
}

function resolveCountryCode(input) {
    if (!input) return null;
    const cleanInput = input.trim().toLowerCase();
    if (cleanInput.length === 2) return cleanInput.toUpperCase();
    if (COUNTRY_MAP[cleanInput]) return COUNTRY_MAP[cleanInput];
    return null; 
}

function getFlagUrl(iso2) {
  if (!iso2) return null;
  return `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;
}

// --- RENDER FUNCTIONS ---
function renderOrigin(ipData) {
    if(!originCityEl) return;
    if(!ipData) { originCityEl.textContent = "Unknown"; return; }
    originCityEl.textContent = ipData.city || "Unknown City";
    originCountryEl.textContent = ipData.country || "Unknown Country";
    originCodeEl.textContent = ipData.countryCode || "--";
    originIpEl.textContent = ipData.query ? `IP: ${ipData.query}` : "IP: --";
}

function renderDestination(advisoryData, meta) {
    if(!destNameEl) return;
    const name = advisoryData.countryName || "Unknown";
    const code = advisoryData.countryCode || "--";
    const score = advisoryData.score;

    destNameEl.textContent = name;
    destCodeEl.textContent = code;
    
    const risk = getRiskFromScore(score);
    scoreValueEl.textContent = typeof score === "number" ? score.toFixed(1) : "-";
    riskLevelEl.textContent = risk.label;
    riskLevelEl.className = `chip ${risk.className}`;
    scoreRingWrapperEl.className = `score-circle-wrapper ${risk.className}`;

    if(meta?.fetchedAt) destUpdatedEl.textContent = `Updated: ${formatDateTime(meta.fetchedAt)}`;
    
    const flagUrl = getFlagUrl(code);
    if (flagImageEl) {
        if(flagUrl) {
            flagImageEl.src = flagUrl;
            flagImageEl.classList.remove("hidden");
        } else {
            flagImageEl.classList.add("hidden");
        }
    }

    if(advisoryTextEl) advisoryTextEl.textContent = advisoryData.message || "No specific advisory details available.";
    if(saveBtn) saveBtn.disabled = false;
}

function renderHistory(records) {
  if(!historyBodyEl) return;
  historyBodyEl.innerHTML = "";
  if (!records || records.length === 0) {
    historyBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.6;">No records yet.</td></tr>';
    return;
  }
  records.forEach((rec) => {
    const row = document.createElement("tr");
    const score = typeof rec.advisory?.score === "number" ? rec.advisory.score : (rec.advisoryScore || 0);
    const risk = getRiskFromScore(score);
    const cName = rec.advisory?.countryName || rec.countryName || "-";
    const cCode = rec.advisory?.countryCode || rec.countryCode || "-";
    
    row.innerHTML = `
      <td>${cName}</td>
      <td><span class="badge-outline">${cCode}</span></td>
      <td>${typeof score === "number" ? score.toFixed(1) : "–"}</td>
      <td><span class="chip ${risk.className}" style="padding:0.2rem 0.8rem; font-size:0.75rem;">${risk.label}</span></td>
      <td style="color:var(--text-muted); font-size:0.8rem;">${formatDateTime(rec.createdAt)}</td>
    `;
    historyBodyEl.appendChild(row);
  });
}

// --- API & LOGIC ---
async function fetchIpLocation() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ip-location`);
    if (!res.ok) return null;
    return res.json();
  } catch(e) { return null; }
}

async function fetchTravelAdvisory(countryCode) {
  const code = (countryCode || "").toUpperCase();
  const res = await fetch(`${API_BASE_URL}/api/travel-advisory?countryCode=${code}`);
  if (!res.ok) throw new Error("API Error");
  return res.json(); 
}

async function initDashboard() {
    // Only run if we are on the Home Page (Origin card exists)
    if(!originCityEl) return; 

    try {
        originCityEl.textContent = "Locating...";
        const ipData = await fetchIpLocation();
        
        if(ipData && ipData.countryCode) {
            renderOrigin(ipData);
            if(destUpdatedEl) destUpdatedEl.textContent = "Loading data...";
            const advisory = await fetchTravelAdvisory(ipData.countryCode);
            const payload = {
                ipInfo: ipData,
                advisory,
                meta: { fetchedAt: new Date().toISOString(), source: "auto" }
            };
            currentCombinedPayload = payload;
            renderDestination(advisory, payload.meta);
        } else {
            originCityEl.textContent = "Unavailable";
        }
    } catch(e) {
        if(destUpdatedEl) destUpdatedEl.textContent = "Error loading data";
    }
}

async function updateForCountry(input) {
    if (!input) return;
    const countryCode = resolveCountryCode(input);
    if (!countryCode) {
        alert("Could not recognize country name. Please try the ISO code (e.g. 'LK').");
        return;
    }
    try {
        if(destUpdatedEl) destUpdatedEl.textContent = "Fetching...";
        const advisory = await fetchTravelAdvisory(countryCode);
        const payload = {
            ipInfo: currentCombinedPayload?.ipInfo, 
            advisory,
            meta: { fetchedAt: new Date().toISOString(), source: "manual" }
        };
        currentCombinedPayload = payload;
        renderDestination(advisory, payload.meta);
    } catch (err) {
        alert("Could not fetch advisory for that country.");
    }
}

async function saveCurrentAdvisory() {
  if (!currentCombinedPayload || !window.APP_CONFIG.OAUTH_ACCESS_TOKEN) {
    alert("Please sign in to save."); return;
  }
  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Saving...";
    const res = await fetch(`${API_BASE_URL}/api/advisories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.APP_CONFIG.OAUTH_ACCESS_TOKEN}`, "x-api-key": CLIENT_API_KEY },
      body: JSON.stringify(currentCombinedPayload)
    });
    if(res.ok) {
        saveBtn.innerHTML = "<i class='bx bx-check'></i> Saved";
        setTimeout(() => { saveBtn.innerHTML = "<i class='bx bx-bookmark'></i> Save Report"; saveBtn.disabled = false; }, 2000);
        // Refresh history if we are viewing it
        loadHistory(); 
    } else { throw new Error("Save failed"); }
  } catch (err) { saveBtn.innerHTML = "Error"; saveBtn.disabled = false; }
}

async function loadHistory() {
  // Only try to load history if the table exists on this page
  if (!historyBodyEl) return;
  
  if (!window.APP_CONFIG.OAUTH_ACCESS_TOKEN) { renderHistory([]); return; }
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/records`, { headers: { Authorization: `Bearer ${window.APP_CONFIG.OAUTH_ACCESS_TOKEN}`, "x-api-key": CLIENT_API_KEY } });
    if (res.ok) { renderHistory(await res.json()); }
  } catch (e) { console.error(e); }
}

// --- AUTHENTICATION & PERSISTENCE (FIXED) ---

function updateAuthUI() {
    // Updates the buttons based on login state
    if (window.APP_CONFIG.OAUTH_ACCESS_TOKEN) {
        if(loginBtn) loginBtn.classList.add("hidden");
        if(logoutBtn) logoutBtn.classList.remove("hidden");
        if(userNameEl) userNameEl.textContent = window.APP_CONFIG.USER_NAME;
    } else {
        if(loginBtn) loginBtn.classList.remove("hidden");
        if(logoutBtn) logoutBtn.classList.add("hidden");
        if(userNameEl) userNameEl.textContent = "Guest";
    }
}

function readAuthFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("access_token");
  const urlName = params.get("name");

  // 1. SCENARIO: Coming back from Google Login
  if (urlToken) {
    // Save to Local Storage (Permanent memory)
    localStorage.setItem("aero_token", urlToken);
    localStorage.setItem("aero_user", urlName || "User");
    
    // Set global config
    window.APP_CONFIG.OAUTH_ACCESS_TOKEN = urlToken;
    window.APP_CONFIG.USER_NAME = urlName || "User";

    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
  } 
  // 2. SCENARIO: Page Refresh or Navigation
  else {
    const storedToken = localStorage.getItem("aero_token");
    const storedName = localStorage.getItem("aero_user");

    if (storedToken) {
      window.APP_CONFIG.OAUTH_ACCESS_TOKEN = storedToken;
      window.APP_CONFIG.USER_NAME = storedName;
    }
  }
  
  // Update UI immediately
  updateAuthUI();
}

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  readAuthFromUrl(); // Restore login
  
  initDashboard(); // Load data (if on home page)
  
  if (window.APP_CONFIG.OAUTH_ACCESS_TOKEN) loadHistory(); // Load history (if on history page)

  if(checkBtn) checkBtn.addEventListener("click", () => updateForCountry(countryInput.value.trim()));
  if(countryInput) countryInput.addEventListener("keyup", (e) => { if (e.key === "Enter") updateForCountry(countryInput.value.trim()); });
  if(saveBtn) saveBtn.addEventListener("click", saveCurrentAdvisory);
  if(refreshHistoryBtn) refreshHistoryBtn.addEventListener("click", loadHistory);
  
  if(loginBtn) loginBtn.addEventListener("click", () => window.location.href = `${API_BASE_URL}/auth/google`);
  
  if(logoutBtn) logoutBtn.addEventListener("click", () => { 
      // Clear memory on logout
      localStorage.removeItem("aero_token");
      localStorage.removeItem("aero_user");
      window.APP_CONFIG.OAUTH_ACCESS_TOKEN = null; 
      window.location.reload(); 
  });
});