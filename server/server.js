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