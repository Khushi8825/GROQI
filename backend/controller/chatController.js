import { pool } from "../db.js";
import jwt from "jsonwebtoken";
import {detectRisk, detectEmotion} from "../middleware/chatMiddleware.js"
import axios from "axios";

const getSafetyMessage = (risk, text) => {
  const lower = text.toLowerCase();

  if (risk === "high") {
    return "Hey, it seems you're going through something really heavy. You are not alone. Please consider reaching out to someone you trust or a professional support line. If you need to talk to me please reply 'Yes, I need to talk you'.";
  }

  // if (
  //   risk === "medium" ||
  //   lower.includes("harass") ||
  //   lower.includes("abuse") ||
  //   lower.includes("bullied")
  // ) {
  //   return "That sounds difficult. You deserve to feel safe and respected. If you're facing harassment, consider seeking support or talking to someone you trust.";
  // }

  return null;
};
const getAIResponse = async (prompt) => {
  try {
    console.log("📤 Sending to GROQ:", prompt);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly, supportive AI assistant. Reply naturally like a human.",
          },
          {
            role: "user",
            content: prompt,
          },
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

    console.log("✅ GROQ RESPONSE:", response.data);

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ GROQ FULL ERROR:", error.response?.data || error.message);

    return "AI is temporarily unavailable.";
  }
};
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
        console.log("Invalid token, using anonymous user");
      }
    }

    if (!user_id) {
      user_id = req.body.user_id;
    }

    if (!user_message) {
      return res.json({ reply: "Message missing" });
    }

    // 🔥 Emotion & Risk
    const { emotion, intensity } = await detectEmotion(user_message);
    const { risk } = await detectRisk(user_message);
    const safetyMessage = getSafetyMessage(risk, user_message);
    // 🔥 AI response
    const aiPrompt = `
User message: "${user_message}"
Emotion: ${emotion} (intensity: ${intensity})
Risk: ${risk}
Reply in a supportive tone.
    `;

    const aiReply = await getAIResponse(aiPrompt);
    let finalReply = aiReply;

    if (safetyMessage) {
      finalReply = `${safetyMessage}`;
    }
    // 🔥 Save to DB (FIXED)
    await pool.query(
      `INSERT INTO chats 
      (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_id,
        user_message,
        finalReply,
        emotion,
        intensity,
        risk,
        0.9, // default risk confidence
      ],
    );
    res.json({
      reply: finalReply,
      emotion, // 👈 move outside
      intensity,
      risk, // 👈 move outside
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ reply: "Server error" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

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

    // 🔥 Emotion Distribution
    const emotionData = await pool.query(
      `SELECT emotion, COUNT(*) 
       FROM chats
       WHERE user_id = $1
       GROUP BY emotion`,
      [user_id],
    );

    // 🔥 Risk Distribution
    const riskData = await pool.query(
      `SELECT risk_level, COUNT(*) 
       FROM chats
       WHERE user_id = $1
       GROUP BY risk_level`,
      [user_id],
    );

    // 🔥 Daily Messages
    const dailyData = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) 
       FROM chats
       WHERE user_id = $1
       GROUP BY date
       ORDER BY date ASC`,
      [user_id],
    );

    // 🔥 Avg Emotion
    const avgEmotion = await pool.query(
      `SELECT AVG(emotion_confidence) as avg_emotion 
       FROM chats
       WHERE user_id = $1`,
      [user_id],
    );

    // ✅ CONVERT emotion array → object
    const emotionMap = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      neutral: 0,
    };

    emotionData.rows.forEach((item) => {
      emotionMap[item.emotion] = Number(item.count);
    });

    // ✅ CONVERT risk array → object
    const riskMap = {
      self_harm: 0,
      harassment: 0,
      normal: 0,
    };

    riskData.rows.forEach((item) => {
      let key = item.risk_level;

      if (key === "high") key = "self_harm";
      else if (key === "medium") key = "harassment";
      else key = "normal";

      riskMap[key] = Number(item.count);
    });
    res.json({
      emotions: emotionMap, // 👈 now object
      risk: riskMap, // 👈 now object
      daily: dailyData.rows,
      avgEmotion: avgEmotion.rows[0]?.avg_emotion || 0,
    });
    console.log("FINAL RESPONSE:", {
      emotions: emotionMap,
      risk: riskMap,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
