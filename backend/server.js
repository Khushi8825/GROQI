import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import { pool } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

async function detectEmotion(text) {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/SamLowe/roberta-base-go_emotions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      },
    );

    const data = await response.json();
    // console.log("TYPE:", typeof data);
    // console.log("DATA FULL:", JSON.stringify(data, null, 2));
    let emotionsArray = [];

    if (Array.isArray(data) && Array.isArray(data[0])) {
      emotionsArray = data[0];
    } else if (Array.isArray(data)) {
      emotionsArray = data;
    } else if (data.label && data.score) {
      return data.label.toLowerCase();
    } else {
      return { label: "neutral", confidence: 0.5 };
    }

    const textLower = text.toLowerCase();

    // 🔥 CRITICAL: Suicide detection
    if (
      textLower.includes("suicide") ||
      textLower.includes("kill myself") ||
      textLower.includes("end my life")
    ) {
      return { label: "distress", confidence: 1.0 };
    }

    // 🔥 Keyword layer
    const joyWords = ["happy", "joy", "great", "amazing", "good", "excited"];
    const sadWords = ["sad", "cry", "depressed", "unhappy", "down"];
    const angerWords = ["angry", "mad", "furious", "irritated"];
    const fearWords = ["fear", "scared", "afraid", "anxious"];

    if (joyWords.some((w) => textLower.includes(w)))
      return { label: "joy", confidence: 1.0 };
    if (sadWords.some((w) => textLower.includes(w)))
      return { label: "sadness", confidence: 1.0 };
    if (angerWords.some((w) => textLower.includes(w)))
      return { label: "anger", confidence: 1.0 };
    if (fearWords.some((w) => textLower.includes(w)))
      return { label: "fear", confidence: 1.0 };

    // 🔥 Model logic
    let topEmotion = emotionsArray.reduce((max, curr) =>
      curr.score > max.score ? curr : max,
    );

    if (topEmotion.score >= 0.2) {
      return {
        label: topEmotion.label.toLowerCase(),
        confidence: topEmotion.score,
      };
    }

    return { label: "neutral", confidence: 0.5 };
  } catch (error) {
    console.error("Emotion detection error:", error);
    return { label: "neutral", confidence: 0.5 };
  }
}

async function detectRisk(text) {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("suicide") ||
    lowerText.includes("kill myself") ||
    lowerText.includes("end my life")
  ) {
    return { label: "self_harm", confidence: 0.95 };
  }

  if (
    lowerText.includes("i will kill you") ||
    lowerText.includes("threat") ||
    lowerText.includes("attack")
  ) {
    return { label: "threat", confidence: 0.85 };
  }

  if (
    lowerText.includes("abuse") ||
    lowerText.includes("harass") ||
    lowerText.includes("blackmail")
  ) {
    return { label: "harassment", confidence: 0.95 };
  }

  return { label: "normal", confidence: 0.6 };
}

const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 Groq API Key Loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

app.post("/api/chat", async (req, res) => {
  try {
    const { message, user_id } = req.body;

    if (!message) {
      return res.json({ reply: "Message missing" });
    }

    let emotionData = await detectEmotion(message);
    let riskData = await detectRisk(message);

    let emotion = emotionData.label;
    let emotionConfidence = emotionData.confidence;

    let risk = riskData.label;
    let riskConfidence = riskData.confidence;

    console.log("🧠 Emotion:", emotion, "Confidence:", emotionConfidence);
    console.log("🚨 Risk:", risk, "Confidence:", riskConfidence);

    // ✅ OPTIONAL OVERRIDE (better UX)
    if (risk === "self_harm") emotion = "sadness";
    if (risk === "threat") emotion = "anger";
    if (risk === "harassment") emotion = "anger";

    // 🚨 RISK HANDLING
    if (risk !== "normal") {
      let safeReply = "";

      if (risk === "self_harm") {
        safeReply =
          "I'm really sorry you're feeling this way 💜 You're not alone. Please talk to someone you trust or contact a helpline.";
      } else if (risk === "threat") {
        safeReply =
          "I cannot support harmful actions. Let's stay calm and think about safer solutions.";
      } else if (risk === "harassment") {
        safeReply =
          "Harassment or abuse is not okay. If you're facing this, consider reporting it or seeking help.";
      }
      if (user_id) {
        await pool.query(
          `INSERT INTO chats 
       (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user_id,
            message,
            safeReply,
            emotion,
            emotionConfidence,
            risk,
            riskConfidence,
          ],
        );
      }
      return res.json({
        reply: safeReply,
        emotion,
        risk,
      });
    }

    // 🤖 AI CALL
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `
You are a helpful and emotionally intelligent AI assistant.

User emotion: ${emotion}

Instructions:
- If emotion is sadness → give comforting response
- If emotion is anger → stay calm and de-escalate
- If emotion is fear → reassure and support
- If emotion is joy → respond cheerfully
- Otherwise → respond normally
              `,
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      },
    );

    const data = await response.json();

    // console.log("🤖 Groq response:", JSON.stringify(data, null, 2));

    let reply = "AI did not reply";

    if (data?.choices?.length > 0) {
      reply = data.choices[0].message.content;
    }

    // ✅ IMPORTANT FIX: send risk also
    if (!user_id) {
      return res.status(400).json({ reply: "User ID missing" });
    }
    await pool.query(
      `INSERT INTO chats 
   (user_id, user_message, bot_reply, emotion, emotion_confidence, risk_level, risk_confidence)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_id, // ⚠️ IMPORTANT
        message,
        reply,
        emotion,
        emotionConfidence,
        risk,
        riskConfidence,
      ],
    );
    res.json({
      reply,
      emotion,
      emotionConfidence,
      risk,
      riskConfidence,
    });
  } catch (error) {
    console.error("🔥 Backend error:", error);
    res.status(500).json({ reply: "Server error" });
  }
});
app.use("/api/chat", chatRoutes);
app.post("/api/auth/anonymous", async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO users (is_anonymous) 
       VALUES (true) 
       RETURNING id`,
    );

    res.json({ user_id: result.rows[0].id });
  } catch (err) {
    console.error("Anonymous user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, contact_no } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password required" });
    }

    // check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, contact_no, is_anonymous)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email`,
      [name, email, hashedPassword, contact_no],
    );

    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/auth/login", async (req, res) => {
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

    const token = jwt.sign({ id: user.id }, "secret_key", { expiresIn: "7d" });

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
});
app.get("/api/chat/history/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM chats 
       WHERE user_id = $1 
       ORDER BY created_at ASC`,
      [user_id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, "secret_key");

    const result = await pool.query(
      "SELECT name, email, contact_no FROM users WHERE id = $1",
      [decoded.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/chat/analytics/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT emotion, risk_level FROM chats WHERE user_id = $1`,
      [user_id],
    );

    const data = result.rows;

    let total = data.length;

    let emotions = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      neutral: 0,
    };

    let risks = {
      self_harm: 0,
      threat: 0,
      harassment: 0,
      normal: 0,
    };

    data.forEach((row) => {
      if (emotions[row.emotion] !== undefined) {
        emotions[row.emotion]++;
      }

      if (risks[row.risk_level] !== undefined) {
        risks[row.risk_level]++;
      }
    });

    res.json({
      total,
      emotions,
      risks,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed analytics" });
  }
});
app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});
