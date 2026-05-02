// const detectEmotion = async (text) => {
//   try {
//     console.log("🔥 detectEmotion INPUT:", text);

//     const response = await fetch(
//       "https://huggingface.co/j-hartmann/emotion-english-distilroberta-base",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${process.env.HF_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ inputs: text }),
//       }
//     );

//     const data = await response.json();

//     // ⚠️ Handle model loading case
//     if (data.error && data.error.includes("loading")) {
//       console.log("⏳ Model loading... retrying");
//       return { emotion: "neutral", intensity: 0.5 };
//     }

//     // ✅ FIX: HF returns nested array
//     const predictions = data[0];

//     if (!predictions) {
//       return { emotion: "neutral", intensity: 0.5 };
//     }

//     // get top emotion
//     const top = predictions.reduce((max, curr) =>
//       curr.score > max.score ? curr : max
//     );

//     const result = {
//       emotion: top.label.toLowerCase(),
//       intensity: Number(top.score.toFixed(2)),
//     };

//     console.log(
//       `🎯 Emotion: ${result.emotion} | Intensity: ${result.intensity}`
//     );

//     return result;
//   } catch (err) {
//     console.error("❌ Emotion error:", err.message);
//     return { emotion: "neutral", intensity: 0.5 };
//   }
// };

import { InferenceClient } from "@huggingface/inference";
const client = new InferenceClient(process.env.HF_API_KEY);
const detectEmotion = async (text) => {
  const result = await client.textClassification({
    model: "j-hartmann/emotion-english-distilroberta-base",
    inputs: text,
  });

  return result[0]; // highest score
};
const detectRisk = async (text) => {
  try {
    console.log("🔥 detectRisk INPUT:", text);

    const HF_URL =
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";

    const response = await fetch(HF_URL, {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ HF Risk API Error:", errorText);
      return fallbackRisk(text);
    }

    const data = await response.json();

    if (!data.labels || !data.scores) {
      return fallbackRisk(text);
    }

    const result = {
      risk: data.labels[0].split(" ")[0], // high / medium / low
      intensity: Number(data.scores[0].toFixed(2)),
    };

    console.log(
      `🚨 Risk: ${result.risk} | Intensity: ${result.intensity}`
    );

    return result;
  } catch (error) {
    console.error("❌ Risk error:", error.message);
    return fallbackRisk(text);
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

  for (let word of highRiskWords) {
    if (lowerText.includes(word)) {
      console.log("🚨 Fallback Risk: high");
      return { risk: "high", intensity: 1.0 };
    }
  }

  for (let word of mediumRiskWords) {
    if (lowerText.includes(word)) {
      console.log("⚠️ Fallback Risk: medium");
      return { risk: "medium", intensity: 0.7 };
    }
  }

  console.log("✅ Fallback Risk: low");
  return { risk: "low", intensity: 0.3 };
};

export {
  detectRisk, detectEmotion
};