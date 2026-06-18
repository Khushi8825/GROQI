import { pool } from "../db.js";
import jwt from "jsonwebtoken";
import { detectRisk, detectEmotion } from "../middleware/chatMiddleware.js";
import axios from "axios";

const getSafetyMessage = (risk) => {
  if (risk === "high") {
    return "Hey, it seems you're going through something really heavy. You are not alone. Please consider reaching out to someone you trust or a professional support line. If you need to talk to me please reply 'Yes, I need to talk you'.";
  };
  return null;
};

const getAIResponse = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a friendly, supportive AI assistant. Reply naturally like a human.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ GROQ ERROR:", error.response?.data || error.message);
    return "AI is temporarily unavailable.";
  }
};

// ── controllers ────────────────────────────────────────────────────────────────

export const handleChat = async (req, res) => {
  try {
    const { user_message } = req.body;

    let user_id = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user_id = decoded.id;
      } catch (err) {
        console.log("Invalid token, falling back to anonymous user_id");
      }
    }

    if (!user_id) {
      user_id = req.body.user_id; // anonymous fallback
    }

    if (!user_message) {
      return res.status(400).json({ reply: "Message is required" });
    }

    const { emotion, intensity } = await detectEmotion(user_message);
    const { risk, intensity: riskConfidence } = await detectRisk(user_message);
    const safetyMessage = getSafetyMessage(risk);

    // ✅ Only call Groq if we're not overriding with a safety message
    let finalReply;
    if (safetyMessage) {
      finalReply = safetyMessage;
    } else {
      const aiPrompt = `
User message: "${user_message}"
Emotion: ${emotion} (intensity: ${intensity})
Risk: ${risk}
Reply in a supportive tone.
      `;
      finalReply = await getAIResponse(aiPrompt);
    }

    await pool.query(
      `INSERT INTO chats 
      (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user_id, user_message, finalReply, emotion, intensity, risk, riskConfidence ?? 0.9],
    );

    res.json({ reply: finalReply, emotion, intensity, risk });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ reply: "Server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    // 🔒 OWNERSHIP CHECK — token user must match the requested user_id
    if (String(req.user.id) !== String(user_id)) {
      return res.status(403).json({ error: "Access denied: not your data" });
    }

    const result = await pool.query(
      `SELECT 
        user_message,
        bot_reply,
        emotion,
        emotion_confidence,
        risk_level,
        risk_confidence,
        created_at
       FROM chats
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [user_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { user_id } = req.params;

    // 🔒 OWNERSHIP CHECK — token user must match the requested user_id
    if (String(req.user.id) !== String(user_id)) {
      return res.status(403).json({ error: "Access denied: not your data" });
    }

    const [emotionData, riskData, dailyData, avgEmotion] = await Promise.all([
      pool.query(
        `SELECT emotion, COUNT(*) FROM chats WHERE user_id = $1 GROUP BY emotion`,
        [user_id],
      ),
      pool.query(
        `SELECT risk_level, COUNT(*) FROM chats WHERE user_id = $1 GROUP BY risk_level`,
        [user_id],
      ),
      pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) 
         FROM chats WHERE user_id = $1 GROUP BY date ORDER BY date ASC`,
        [user_id],
      ),
      pool.query(
        `SELECT AVG(emotion_confidence) as avg_emotion FROM chats WHERE user_id = $1`,
        [user_id],
      ),
    ]);

    const emotionMap = { joy: 0, sadness: 0, anger: 0, fear: 0, neutral: 0 };
    emotionData.rows.forEach((item) => {
      emotionMap[item.emotion] = Number(item.count);
    });

    const riskMap = { self_harm: 0, harassment: 0, normal: 0 };
    riskData.rows.forEach((item) => {
      let key = item.risk_level;
      if (key === "high") key = "self_harm";
      else if (key === "medium") key = "harassment";
      else key = "normal";
      riskMap[key] = Number(item.count);
    });

    res.json({
      emotions: emotionMap,
      risk: riskMap,
      daily: dailyData.rows,
      avgEmotion: avgEmotion.rows[0]?.avg_emotion || 0,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};