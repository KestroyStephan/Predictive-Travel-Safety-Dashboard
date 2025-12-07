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
