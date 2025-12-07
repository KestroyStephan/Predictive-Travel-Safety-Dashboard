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