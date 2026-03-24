import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.post("/save-chat", async (req, res) => {
  try {
    const {
      user_id,
      user_message,
      bot_reply,
      emotion,
      emotion_confidence,
      risk_level,
      risk_confidence
    } = req.body;

    const result = await pool.query(
      `INSERT INTO chats 
       (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user_id,
        user_message,
        bot_reply,
        emotion,
        emotion_confidence,
        risk_level,
        risk_confidence
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save chat" });
  }
});

export default router;