import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import { pool } from "./db.js";

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
app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});
