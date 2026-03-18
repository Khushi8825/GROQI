import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

async function detectEmotion(text) {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    const data = await response.json();

    console.log("🧠 Emotion raw:", data);

    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return "neutral";
    }

    let topEmotion = data[0][0];

    for (let e of data[0]) {
      if (e.score > topEmotion.score) {
        topEmotion = e;
      }
    }

    return topEmotion.label;

  } catch (error) {
    console.error("Emotion detection error:", error);
    return "neutral";
  }
}

const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 Groq API Key Loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const emotion = await detectEmotion(message);
    console.log("🧠 Detected Emotion:", emotion);

    if (!message) {
      return res.json({ reply: "Message missing" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("🤖 Groq response:", JSON.stringify(data, null, 2));

    let reply = "AI did not reply";

    if (data?.choices?.length > 0) {
      reply = data.choices[0].message.content;
    }

    res.json({ reply, emotion });

  } catch (error) {
    console.error("🔥 Backend error:", error);
    res.status(500).json({ reply: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});


