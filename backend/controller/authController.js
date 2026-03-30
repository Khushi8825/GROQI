import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, contact_no } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password required" });
    }

    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, contact_no, is_anonymous)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email`,
      [name, email, hashedPassword, contact_no]
    );

    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, email, contact_no FROM users WHERE id = $1",
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const createAnonymousUser = async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO users (is_anonymous) VALUES (true) RETURNING id`
    );

    res.json({ user_id: result.rows[0].id });
  } catch (err) {
    console.error("Anonymous user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};