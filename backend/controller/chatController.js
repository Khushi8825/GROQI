import { pool } from "../db.js";
import jwt from "jsonwebtoken";

// 👉 paste your detectEmotion & detectRisk functions here (same as before)

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body;

    let user_id = null;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user_id = decoded.id;
      } catch (err) {
        console.log("Invalid token, using anonymous user");
      }
    }

    if (!user_id) {
      user_id = req.body.user_id;
    }

    if (!message) {
      return res.json({ reply: "Message missing" });
    }

    // ⚠️ KEEP YOUR FULL EXISTING CHAT LOGIC HERE (no change)

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ reply: "Server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at ASC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (req.user.id != user_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      `SELECT emotion, risk_level FROM chats WHERE user_id = $1`,
      [user_id]
    );

    const data = result.rows;

    let emotions = { joy: 0, sadness: 0, anger: 0, fear: 0, neutral: 0 };
    let risks = { self_harm: 0, threat: 0, harassment: 0, normal: 0 };

    data.forEach((row) => {
      if (emotions[row.emotion] !== undefined) emotions[row.emotion]++;
      if (risks[row.risk_level] !== undefined) risks[row.risk_level]++;
    });

    res.json({
      total: data.length,
      emotions,
      risks,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed analytics" });
  }
};