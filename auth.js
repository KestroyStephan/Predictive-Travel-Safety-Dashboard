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

// STEP 1: redirect to Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// STEP 2: callback from Google
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const user = req.user;

    // Create JWT
    const token = jwt.sign(
      {
        sub: user.id,
        name: user.displayName,
        email: user.email
      },
      process.env.JWT_SECRET || "change-me-in-production",
      { expiresIn: "2h" }
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5500";

    // Redirect back to frontend with token & name
    res.redirect(
      `${clientUrl}?access_token=${encodeURIComponent(
        token
      )}&name=${encodeURIComponent(user.displayName)}`
    );
  }
);

// Middleware: JWT auth
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "change-me-in-production"
    );
    req.user = decoded; // { sub, name, email }
    next();
  } catch (err) {
    console.error("JWT verification failed", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
