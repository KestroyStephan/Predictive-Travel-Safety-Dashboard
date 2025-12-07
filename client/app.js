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