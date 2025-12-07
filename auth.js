// server/auth.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import express from "express";

const router = express.Router();

// Serialize/deserialize for sessions
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:4000/auth/google/callback";

  if (!clientID || !clientSecret) {
    console.error(
      "[auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env"
    );
    throw new Error("Google OAuth environment variables not configured");
  }

  console.log("[auth] Configuring GoogleStrategy...");
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL
      },
      async function verify(accessToken, refreshToken, profile, done) {
        const user = {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value
        };
        return done(null, user);
      }
    )
  );
}
