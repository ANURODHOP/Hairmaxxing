const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const verifyToken = require("../middleware/auth");
const { db, admin } = require("../services/firebase");

const router = express.Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function adjustScores(data) {
  for (let key in data.Present) {
    let score = Number(data.Present[key]) || 5;
    data.Present[key] = Math.min(Math.max(score, 3), 7);
  }
  for (let key in data.Future) {
    let base = Number(data.Present[key]) || 5;
    let score = Number(data.Future[key]) || base + 1;
    data.Future[key] = Math.min(Math.max(score, base + 1), 9);
  }
  return data;
}

function generateGraph(base, future) {
  return Array.from({ length: 12 }, (_, i) => {
    const progress = i / 11;
    const eased = 1 - Math.pow(1 - progress, 2);
    return Math.round(base + (future - base) * eased);
  });
}

function cleanJson(text) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

router.post("/analyze-hair", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { frontImage, sideImage, topImage } = req.body;

    if (!frontImage || !sideImage || !topImage) {
      return res.status(400).json({ error: "All 3 images required." });
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data().lastAnalyzedAt) {
      const last = userDoc.data().lastAnalyzedAt.toMillis();
      if (Date.now() - last < SEVEN_DAYS_MS) {
        return res.status(429).json({ error: "Please wait 7 days before next analysis." });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfiguration: AI key missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze these 3 hair images.

Return ONLY valid JSON.

{
  "Present": {
    "Overall Hair": number,
    "Maxxing Potential": number,
    "Hairline": number,
    "Density": number,
    "Scalp Health": number,
    "Thickness": number,
    "Shed Control": number,
    "DHT Blocking": number
  },
  "Future": {
    "Overall Hair": number,
    "Maxxing Potential": number,
    "Hairline": number,
    "Density": number,
    "Scalp Health": number,
    "Thickness": number,
    "Shed Control": number,
    "DHT Blocking": number
  }
}
`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: frontImage } },
      { inlineData: { mimeType: "image/jpeg", data: sideImage } },
      { inlineData: { mimeType: "image/jpeg", data: topImage } },
    ]);

    const rawText = cleanJson(result.response.text());
    let jsonData;

    try {
      jsonData = JSON.parse(rawText);
    } catch (err) {
      console.error("Invalid JSON from AI:", rawText);
      return res.status(500).json({ error: "AI returned invalid response." });
    }

    jsonData = adjustScores(jsonData);
    const base = jsonData.Present["Overall Hair"];
    const future = jsonData.Future["Overall Hair"];
    const graph = generateGraph(base, future);

    await userRef.set(
      {
        lastAnalyzedAt: admin.firestore.FieldValue.serverTimestamp(),
        presentData: jsonData.Present,
        futureData: jsonData.Future,
        graphData: graph,
      },
      { merge: true }
    );

    res.json({
      success: true,
      data: {
        present: jsonData.Present,
        future: jsonData.Future,
        graph,
      },
    });
  } catch (error) {
    console.error("Hair analysis failed:", error);
    res.status(500).json({ error: "Hair analysis failed." });
  }
});

module.exports = router;
