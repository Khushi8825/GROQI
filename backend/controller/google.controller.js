// ============================================================
// google.controller.js  —  Google OAuth for PostgreSQL
// ============================================================
// In your LEARNING project (MongoDB), you used:
//    User.findOne({ email })          ← Mongoose method
//    User.create({ name, email })     ← Mongoose method
//
// In THIS project (PostgreSQL), we use:
//    pool.query("SELECT ... WHERE email = $1")   ← pg method
//    pool.query("INSERT INTO users ...")          ← pg method
//
// Everything ELSE (OAuth2Client, code exchange, JWT) is IDENTICAL
// ============================================================

import { OAuth2Client } from "google-auth-library"; // same package you used in learning project
import jwt from "jsonwebtoken";
import { pool } from "../db.js"; // your existing PostgreSQL pool
import dotenv from "dotenv";

dotenv.config();

// ── Step 1: Create a Google OAuth client ──────────────────────────────────────
// This is the SAME as your learning project.
// The redirect_uri must EXACTLY match what you set in Google Cloud Console.
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5173/auth/google/callback" // ← where Google sends the user after login
);

// ── Main Controller ───────────────────────────────────────────────────────────
const googleController = async (req, res) => {
  try {
    // STEP A: Frontend sends us the "code" that Google gave it
    // This is the SAME as your learning project (Login.jsx sends this)
    const { code } = req.body;
    console.log("📨 Auth code received from frontend");

    // STEP B: Exchange the one-time code for real tokens
    // Google gives us: access_token, id_token, refresh_token
    // This is IDENTICAL to your learning project
    const { tokens } = await client.getToken(code);
    console.log("✅ Tokens received from Google");

    // STEP C: Verify the id_token to make sure it's genuinely from Google
    // (not someone faking a login). Also IDENTICAL to your learning project
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // STEP D: Extract user info from the verified token
    // Google puts user info inside "payload"
    // sub = Google's unique ID for this user (like MongoDB's _id but from Google's side)
    const payload = ticket.getPayload();
    const { name, email, picture, sub: googleId } = payload;
    console.log("👤 Google user:", email);

    // ── HERE IS THE MAIN DIFFERENCE FROM YOUR LEARNING PROJECT ──────────────
    //
    // Your learning project (MongoDB):
    //   let user = await User.findOne({ email });
    //   if (!user) user = await User.create({ name, email, googleId, avatar: picture });
    //
    // This project (PostgreSQL):
    //   We write raw SQL queries instead. The LOGIC is identical:
    //   1. Check if user already exists
    //   2. If not, create them
    //   3. If yes, update their Google info (in case they change their profile pic)
    // ─────────────────────────────────────────────────────────────────────────

    // STEP E: Check if this email is already registered
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (existingUser.rows.length === 0) {
      // ── NEW USER: first time signing in with Google ────────────────────────
      // password = NULL because Google users don't need a password
      // is_anonymous = false because they ARE identified (we know their Google account)
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, google_id, avatar, is_anonymous)
         VALUES ($1, $2, NULL, $3, $4, false)
         RETURNING id, name, email, avatar`,
        [name, email, googleId, picture]
      );

      user = newUser.rows[0];
      console.log("🆕 New user created via Google:", email);

    } else {
      // ── EXISTING USER: they've logged in before ────────────────────────────
      // Update their google_id and avatar in case they didn't have it
      // (e.g., they registered with email/password first, now signing in with Google)
      const updatedUser = await pool.query(
        `UPDATE users
         SET google_id = $1, avatar = $2
         WHERE email = $3
         RETURNING id, name, email, avatar`,
        [googleId, picture, email]
      );

      user = updatedUser.rows[0];
      console.log("🔄 Existing user logged in via Google:", email);
    }

    // STEP F: Create our own JWT token (same as your email/password login)
    // This is how the frontend knows who is logged in
    // IDENTICAL logic to your authController.js login function
    const token = jwt.sign(
      { id: user.id },              // payload: we store the user's DB id
      process.env.JWT_SECRET,       // secret key from .env
      { expiresIn: "7d" }           // token lasts 7 days
    );

    // STEP G: Send token + user info back to frontend
    res.status(200).json({
      success: true,
      message: "Google Login Successful",
      token,                         // frontend stores this in localStorage
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,         // Google profile picture URL
      },
    });

  } catch (error) {
    console.error("❌ Google Auth Error:", error.message);
    res.status(500).json({ success: false, message: "Google Login Failed" });
  }
};

export default googleController;