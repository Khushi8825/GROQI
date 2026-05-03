import dotenv from "dotenv";
dotenv.config();
import { InferenceClient } from "@huggingface/inference";
const client = new InferenceClient(process.env.HF_API_KEY);
const detectEmotion = async (text) => {
  try {
    console.log("🔥 detectEmotion INPUT:", text);

    const result = await client.textClassification({
      model: "j-hartmann/emotion-english-distilroberta-base",
      inputs: text,
    });
    // result format:
    // [
    //   { label: 'sadness', score: 0.95 },
    //   { label: 'joy', score: 0.02 },
    //   ...
    // ]
    if (!result || result.length === 0) {
      return { emotion: "neutral", intensity: 0.5 };
    }

    // ✅ find highest score manually
    const top = result.reduce((max, curr) =>
      curr.score > max.score ? curr : max
    );

    const finalResult = {
      emotion: top.label.toLowerCase(),
      intensity: Number(top.score.toFixed(2)),
    };

    console.log(
      `🎯 Emotion: ${finalResult.emotion} | Intensity: ${finalResult.intensity}`
    );

    return finalResult;
  } catch (err) {
    console.error("❌ Emotion error:", err.message);
    return { emotion: "neutral", intensity: 0.5 };
  }
};
const detectRisk = async (text) => {
  try {
    console.log("🔥 detectRisk INPUT:", text);

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: ["high", "medium", "low"],
          },
        }),
      }
    );

    const data = await response.json();

    console.log("📦 HF RAW RESPONSE:", data);

    // ❗ handle error
    if (data.error) {
      console.log("⚠️ HF Risk Error:", data.error);
      return fallbackRisk(text);
    }

    // ✅ HANDLE ARRAY RESPONSE (THIS WAS MISSING)
    if (Array.isArray(data)) {
      const top = data.reduce((max, curr) =>
        curr.score > max.score ? curr : max
      );

      const result = {
        risk: top.label,
        intensity: Number(top.score.toFixed(2)),
      };

      console.log(
        `🚨 Risk: ${result.risk} | Intensity: ${result.intensity}`
      );

      return result;
    }

    // ❗ fallback if unexpected format
    console.log("⚠️ Unknown HF format");
    return fallbackRisk(text);

  } catch (error) {
    console.error("❌ Risk error:", error.message);
    return fallbackRisk(text);
  }
};
// const detectRisk = async (text) => {
//   try {
//     console.log("🔥 detectRisk INPUT:", text);

//     const HF_URL =
//       "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";

//     const response = await fetch(HF_URL, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.HF_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         inputs: text,
//         parameters: {
//           candidate_labels: ["high risk", "medium risk", "low risk"],
//         },
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("❌ HF Risk API Error:", errorText);
//       return fallbackRisk(text);
//     }

//     const data = await response.json();

//     if (!data.labels || !data.scores) {
//       return fallbackRisk(text);
//     }

//     const result = {
//       risk: data.labels[0].split(" ")[0], // high / medium / low
//       intensity: Number(data.scores[0].toFixed(2)),
//     };

//     console.log(
//       `🚨 Risk: ${result.risk} | Intensity: ${result.intensity}`
//     );

//     return result;
//   } catch (error) {
//     console.error("❌ Risk error:", error.message);
//     return fallbackRisk(text);
//   }
// };
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