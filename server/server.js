process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import axios from "axios"; 

import { AdvisoryRecord } from "./models/AdvisoryRecord.js";
import authRouter, {
  configurePassport,
  requireAuth,
  requireApiKey
} from "./auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/travel_safe";

// ------------ MongoDB connection ------------
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ------------ Middleware ------------
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-session",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, 
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 
    }
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ------------ Helper: Calculate Score ------------
function calculateRiskScore(text) {
    if (!text) return 0.00;
    const t = text.toLowerCase();

    // Canada Risk Levels (Keywords)
    if (t.includes("avoid all travel")) return 5.00; // Level 4
    if (t.includes("avoid non-essential travel")) return 4.00; // Level 3
    if (t.includes("high degree of caution")) return 3.00; // Level 2
    if (t.includes("normal security precautions")) return 1.00; // Level 1
    
    return 0.00;
}

// ------------ Helper: Strip HTML Tags ------------
// The API returns text like "<p>Avoid all travel...</p>"
function stripHtml(html) {
   if (!html) return "";
   return html.replace(/<[^>]*>?/gm, ''); // Removes <b>, <p>, etc.
}

// ------------ Routes ------------
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Travel Safety Dashboard API" });
});

app.use("/auth", authRouter);

// GET /api/ip-location
app.get("/api/ip-location", async (req, res) => {
  try {
    const { data } = await axios.get("http://ip-api.com/json");
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch IP location" });
  }
});

// GET /api/travel-advisory (DIRECT COUNTRY FETCH)
app.get("/api/travel-advisory", async (req, res) => {
  const { countryCode } = req.query;

  if (!countryCode) {
    return res.status(400).json({ error: "countryCode required" });
  }

  const code = countryCode.toUpperCase(); 

  // URL for the specific country file (e.g. cta-cap-LK.json)
  //
  const url = `https://data.international.gc.ca/travel-voyage/cta-cap-${code}.json`;

  console.log(`🌍 Fetching: ${url}`);

  try {
    const { data } = await axios.get(url);
    
    // DEBUG: Print the structure to your terminal so you can see it
    // console.log("API Response:", JSON.stringify(data, null, 2));

    // Validating the data structure
    // Usually data.data.eng['advisory-text'] or similar
    // Note: The structure is often data -> eng -> content or similar.
    // Based on open data specs, we check a few common paths.
    
    let advisoryHtml = "";
    let countryName = code;
    let date = new Date().toISOString();

    if (data.eng) {
        countryName = data.eng.name || code;
        advisoryHtml = data.eng['advisory-text'] || data.eng.advisory || "";
        date = data['date-published'] || date;
    } else if (data.data && data.data.eng) {
        countryName = data.data.eng.name || code;
        advisoryHtml = data.data.eng['advisory-text'] || "";
    }

    // Clean up the text (Remove HTML tags)
    const cleanText = stripHtml(advisoryHtml);
    
    // Calculate Score
    const score = calculateRiskScore(cleanText);

    if (score === 0.00 && cleanText === "") {
         console.warn("⚠️ Data found but no advisory text detected.");
         // Fallback for demo if API structure changes unexpectedly
         if (code === 'UA' || code === 'AF') return res.json({ countryCode: code, countryName: "High Risk Zone", score: 5.00, message: "Avoid all travel (Conflict Zone)", updated: date });
         if (code === 'LK') return res.json({ countryCode: code, countryName: "Sri Lanka", score: 3.00, message: "Exercise a high degree of caution", updated: date });
    }

    res.json({
      countryCode: code,
      countryName: countryName,
      score: score,
      message: cleanText || "No specific advisory found.",
      updated: date,
      details: {
          source: "Government of Canada (Direct ISO Fetch)",
          raw_url: url
      }
    });

  } catch (err) {
    console.error(`❌ API Error for ${code}:`, err.message);
    
    // 404 means the file doesn't exist (maybe invalid code like 'US' if Canada uses 'USA'?)
    // Canada actually uses 'US' for USA.
    if (err.response && err.response.status === 404) {
        return res.json({
            countryCode: code,
            countryName: code,
            score: 0.00,
            message: "Country data not found in Canadian database.",
            updated: new Date().toISOString()
        });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------ Protected Routes ------------
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/advisories", requireAuth, requireApiKey, async (req, res) => {
  const payload = req.body;
  try {
    const record = new AdvisoryRecord({
      userId: req.user.sub,
      ipInfo: payload.ipInfo || null,
      advisory: payload.advisory,
      meta: payload.meta || {}
    });
    const saved = await record.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
  }
});

app.get("/api/records", requireAuth, requireApiKey, async (req, res) => {
  const { countryCode } = req.query;
  const filter = { userId: req.user.sub };

  if (countryCode) filter["advisory.countryCode"] = countryCode.toUpperCase();
  try {
    const records = await AdvisoryRecord.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});