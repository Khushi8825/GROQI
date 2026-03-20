import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

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
    console.log("TYPE:", typeof data);
    console.log("DATA FULL:", JSON.stringify(data, null, 2));
    let emotionsArray = [];

    if (Array.isArray(data) && Array.isArray(data[0])) {
      emotionsArray = data[0];
    } else if (Array.isArray(data)) {
      emotionsArray = data;
    } else if (data.label && data.score) {
      return data.label.toLowerCase();
    } else {
      return "neutral";
    }

    const textLower = text.toLowerCase();

    // 🔥 CRITICAL: Suicide detection
    if (
      textLower.includes("suicide") ||
      textLower.includes("kill myself") ||
      textLower.includes("end my life")
    ) {
      return "distress";
    }

    // 🔥 Keyword layer
    const joyWords = ["happy", "joy", "great", "amazing", "good", "excited"];
    const sadWords = ["sad", "cry", "depressed", "unhappy", "down"];
    const angerWords = ["angry", "mad", "furious", "irritated"];
    const fearWords = ["fear", "scared", "afraid", "anxious"];

    if (joyWords.some((w) => textLower.includes(w))) return "joy";
    if (sadWords.some((w) => textLower.includes(w))) return "sadness";
    if (angerWords.some((w) => textLower.includes(w))) return "anger";
    if (fearWords.some((w) => textLower.includes(w))) return "fear";

    // 🔥 Model logic
    let topEmotion = emotionsArray.reduce((max, curr) =>
      curr.score > max.score ? curr : max,
    );

    if (topEmotion.score >= 0.2) {
      return topEmotion.label.toLowerCase();
    }

    return "neutral";
  } catch (error) {
    console.error("Emotion detection error:", error);
    return "neutral";
  }
}

async function detectRisk(text) {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("suicide") ||
    lowerText.includes("kill myself") ||
    lowerText.includes("end my life")
  ) {
    return "self_harm";
  }

  if (
    lowerText.includes("i will kill you") ||
    lowerText.includes("threat") ||
    lowerText.includes("attack")
  ) {
    return "threat";
  }

  if (
    lowerText.includes("abuse") ||
    lowerText.includes("harass") ||
    lowerText.includes("blackmail")
  ) {
    return "harassment";
  }

  return "normal";
}

const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 Groq API Key Loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({ reply: "Message missing" });
    }

    let emotion = await detectEmotion(message);
    const risk = await detectRisk(message);

    console.log("🚨 Risk Level:", risk);
    console.log("🧠 Detected Emotion:", emotion);

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

    console.log("🤖 Groq response:", JSON.stringify(data, null, 2));

    let reply = "AI did not reply";

    if (data?.choices?.length > 0) {
      reply = data.choices[0].message.content;
    }

    // ✅ IMPORTANT FIX: send risk also
    res.json({ reply, emotion, risk });
  } catch (error) {
    console.error("🔥 Backend error:", error);
    res.status(500).json({ reply: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});
