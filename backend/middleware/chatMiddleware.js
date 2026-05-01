import axios from "axios";

const detectEmotion = async (text) => {
  try {
    const textLower = text.toLowerCase();
    console.log("🔥 detectEmotion INPUT:", text);
    // 🔥 STEP 1: keyword-based quick detection (FAST + RELIABLE)
    if (
      textLower.includes("sad") ||
      textLower.includes("cry") ||
      textLower.includes("depressed")
    ) {
      return { emotion: "sad", intensity: 0.8 };
    }

    if (
      textLower.includes("happy") ||
      textLower.includes("good") ||
      textLower.includes("great")
    ) {
      return { emotion: "joy", intensity: 0.8 };
    }

    if (
      textLower.includes("angry") ||
      textLower.includes("mad") ||
      textLower.includes("furious")
    ) {
      return { emotion: "anger", intensity: 0.8 };
    }

    if (
      textLower.includes("scared") ||
      textLower.includes("fear") ||
      textLower.includes("afraid")
    ) {
      return { emotion: "fear", intensity: 0.8 };
    }
    
    // 🔥 STEP 2: fallback to HuggingFace
    const response = await fetch(
      "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      },
    );

    if (!response.ok) {
      return { emotion: "neutral", intensity: 0.5 };
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return { emotion: "neutral", intensity: 0.5 };
    }

    let top = data.reduce((max, curr) => (curr.score > max.score ? curr : max));

    return {
      emotion: top.label.toLowerCase(),
      intensity: Number(top.score.toFixed(2)),
    };
  } catch (err) {
    console.error("Emotion error:", err.message);
    return { emotion: "neutral", intensity: 0.5 };
  }
};
const fallbackRisk = (text) => {
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
const detectRisk = async (text) => {
  try {
    if (text.includes("kill myself")) {
      return { risk: "high", confidence: 1.0 };
    }
    console.log("API KEY:", process.env.HF_API_KEY);
    const HF_URL =
  "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";

    const response = await fetch(
      HF_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: ["high risk", "medium risk", "low risk"],
          },
        }),
      },
    );
    console.log("Calling:", HF_URL);
       if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API Error:", errorText);
      return fallbackRisk(text);
    }
    const data = await response.json();

    // Example response:
    // { labels: ["medium risk", "low risk", "high risk"], scores: [0.7, 0.2, 0.1] }

    const topLabel = data.labels[0];
    const confidence = data.scores[0];

    return {
      risk: topLabel.split(" ")[0], // "medium"
      confidence,
    };
  } catch (error) {
    console.error("HF error:", error);

    // fallback to your old logic
    return fallbackRisk(text);
  }
};
export { detectRisk, detectEmotion };
