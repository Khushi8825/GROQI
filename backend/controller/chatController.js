import { pool } from "../db.js";
import jwt from "jsonwebtoken";

// 👉 paste your detectEmotion & detectRisk functions here (same as before)
const detectEmotion = (text) => {
    const emotions = {
        happy: ["happy", "joy", "excited", "great", "amazing", "love"],
        sad: ["sad", "down", "unhappy", "cry", "depressed", "lonely"],
        angry: ["angry", "mad", "furious", "hate", "irritated"],
        anxious: ["anxious", "worried", "scared", "nervous", "panic"],
    };

    let scores = {
        happy: 0,
        sad: 0,
        angry: 0,
        anxious: 0,
    };

    const words = text.toLowerCase().split(/\W+/);

    words.forEach(word => {
        for (let emotion in emotions) {
            if (emotions[emotion].includes(word)) {
                scores[emotion]++;
            }
        }
    });

    // find max emotion
    let detectedEmotion = "neutral";
    let maxScore = 0;

    for (let emotion in scores) {
        if (scores[emotion] > maxScore) {
            maxScore = scores[emotion];
            detectedEmotion = emotion;
        }
    }

    // intensity normalize (0–1)
    const intensity = Math.min(maxScore / words.length, 1);

    return {
        emotion: detectedEmotion,
        intensity: Number(intensity.toFixed(2)),
    };
};

const detectRisk = (text) => {
    const highRiskWords = [
        "suicide", "kill myself", "end my life", "die", "want to die"
    ];

    const mediumRiskWords = [
        "hopeless", "worthless", "no reason to live", "tired of life"
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

    // 🔥 STEP 1: Detect emotion & risk
    const { emotion, intensity } = detectEmotion(message);
    const { risk } = detectRisk(message);

    // 🔥 STEP 2: Consoling message logic
    const generateConsolingMessage = (emotion, risk) => {
      if (risk === "high") {
        return "I'm really sorry you're feeling this way. You're not alone. Please consider talking to someone you trust or a professional. I'm here with you 🤍";
      }

      if (emotion === "sad") {
        return "I can sense that you're feeling low. Do you want to talk about it?";
      }

      if (emotion === "angry") {
        return "It seems you're feeling frustrated. Take a deep breath, I'm here to listen.";
      }

      if (emotion === "anxious") {
        return "I understand this might feel overwhelming. Let's take it step by step.";
      }

      return null;
    };

    const isHighEmotion = intensity > 0.6;
    const isHighRisk = risk === "high";

    let supportMessage = null;

    if (isHighEmotion || isHighRisk) {
      supportMessage = generateConsolingMessage(emotion, risk);
    }

    // 🔥 STEP 3: AI Response (IMPORTANT)
    const aiPrompt = `
User message: "${message}"
Emotion: ${emotion} (intensity: ${intensity})
Risk: ${risk}

Reply in a supportive and empathetic tone.
    `;

    const aiReply = await getAIResponse(aiPrompt); // 👈 make sure this exists

    // 🔥 STEP 4: Combine messages
    let finalReply = "";

    if (supportMessage) {
      finalReply = supportMessage + "\n\n" + aiReply;
    } else {
      finalReply = aiReply;
    }

    // 🔥 STEP 5: Save to DB
    await pool.query(
      `INSERT INTO chats (user_id, message, reply, emotion, intensity, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user_id, message, finalReply, emotion, intensity, risk]
    );

    // 🔥 STEP 6: Send response
    res.json({
      reply: finalReply,
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