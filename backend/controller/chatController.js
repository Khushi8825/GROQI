import { pool } from "../db.js";
import jwt from "jsonwebtoken";

// 👉 paste your detectEmotion & detectRisk functions here (same as before)
import axios from "axios";

export const detectEmotion = async (text) => {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/SamLowe/roberta-base-go_emotions",
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
      },
    );
   
    const data = response.data;
    
    // ✅ Handle different response formats safely
    let emotionsArray = [];

    if (Array.isArray(data) && Array.isArray(data[0])) {
      emotionsArray = data[0];
    } else if (Array.isArray(data)) {
      emotionsArray = data;
    } else {
      return {
        emotion: "neutral",
        intensity: 0,
      };
    }

    const textLower = text.toLowerCase();

    // 🔥 CRITICAL: Suicide / high distress override
    if (
      textLower.includes("suicide") ||
      textLower.includes("kill myself") ||
      textLower.includes("end my life")
    ) {
      return {
        emotion: "distress",
        intensity: 1,
      };
    }

    // 🔥 Find top emotion from model
    let topEmotion = emotionsArray.reduce((max, curr) =>
      curr.score > max.score ? curr : max,
    );

    // 🔥 Optional keyword boost layer (better UX)
    const joyWords = ["happy", "joy", "great", "amazing", "good", "excited"];
    const sadWords = ["sad", "cry", "depressed", "unhappy", "down"];
    const angerWords = ["angry", "mad", "furious", "irritated"];
    const fearWords = ["fear", "scared", "afraid", "anxious"];

    if (joyWords.some((w) => textLower.includes(w))) {
      return { emotion: "joy", intensity: 0.8 };
    }

    if (sadWords.some((w) => textLower.includes(w))) {
      return { emotion: "sadness", intensity: 0.8 };
    }

    if (angerWords.some((w) => textLower.includes(w))) {
      return { emotion: "anger", intensity: 0.8 };
    }

    if (fearWords.some((w) => textLower.includes(w))) {
      return { emotion: "fear", intensity: 0.8 };
    }

    // ✅ Final model-based result
    return {
      emotion: topEmotion.label.toLowerCase(),
      intensity: Number(topEmotion.score.toFixed(2)),
    };
  } catch (error) {
    console.error("Emotion detection error:", error.message);
     console.error("HF ERROR FULL:", error.response?.data || error.message);
    return {
      emotion: "neutral",
      intensity: 0,
    };
  }
};

const detectRisk = (text) => {
  const highRiskWords = [
    "suicide",
    "kill myself",
    "end my life",
    "die",
    "want to die",
  ];

  const mediumRiskWords = [
    "hopeless",
    "worthless",
    "no reason to live",
    "tired of life",
  ];

  const lowerText = text.toLowerCase();

  let riskLevel = "low";

  for (let word of highRiskWords) {
    if (lowerText.includes(word)) {
      return { risk: "high" };
    }
  }

  for (let word of mediumRiskWords) {
    if (lowerText.includes(word)) {
      riskLevel = "medium";
    }
  }

  return { risk: riskLevel };
};
const getAIResponse = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192", // fast + powerful
        messages: [
          {
            role: "system",
            content:
              "You are a supportive, empathetic AI assistant. Always respond in a calm, understanding, and helpful tone.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("AI Response Error:", error.message);

    return "I'm here for you. Tell me more about how you're feeling.";
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
    const { risk } = detectRisk(user_message);

    // 🔥 AI response
    const aiPrompt = `
User message: "${user_message}"
Emotion: ${emotion} (intensity: ${intensity})
Risk: ${risk}
Reply in a supportive tone.
    `;

    const aiReply = await getAIResponse(aiPrompt);

    // 🔥 Save to DB (FIXED)
    await pool.query(
      `INSERT INTO chats 
      (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_id,
        user_message,
        aiReply,
        emotion,
        intensity,
        risk,
        0.9, // default risk confidence
      ]
    );

    res.json({
      reply: aiReply,
      meta: {
        emotion,
        intensity,
        risk,
      },
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
      [user_id]
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
      [user_id]
    );

    // 🔥 Risk Distribution
    const riskData = await pool.query(
      `SELECT risk_level, COUNT(*) 
       FROM chats
       WHERE user_id = $1
       GROUP BY risk_level`,
      [user_id]
    );

    // 🔥 Daily Messages
    const dailyData = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) 
       FROM chats
       WHERE user_id = $1
       GROUP BY date
       ORDER BY date ASC`,
      [user_id]
    );

    // 🔥 Avg Emotion Intensity
    const avgEmotion = await pool.query(
      `SELECT AVG(emotion_confidence) as avg_emotion 
       FROM chats
       WHERE user_id = $1`,
      [user_id]
    );

    res.json({
      emotions: emotionData.rows,
      risk: riskData.rows,
      daily: dailyData.rows,
      avgEmotion: avgEmotion.rows[0].avg_emotion,
    });

  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};