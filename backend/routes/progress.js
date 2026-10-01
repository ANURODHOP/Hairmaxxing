const express = require("express");
const verifyToken = require("../middleware/auth");
const { db, admin } = require("../services/firebase");

const router = express.Router();

router.post("/update", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { dayNumber, tasks, allComplete } = req.body;

    if (dayNumber == null || !tasks) {
      return res.status(400).json({ error: "dayNumber and tasks required." });
    }

    const progressRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyProgress")
      .doc(String(dayNumber));

    const progressData = {
      dayNumber,
      tasks: {
        washDay: !!tasks.washDay,
        scalpMassage: !!tasks.scalpMassage,
        topicalTreatment: !!tasks.topicalTreatment,
        hydration: !!tasks.hydration,
        nutrientIntake: !!tasks.nutrientIntake,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (allComplete) {
      progressData.completedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await progressRef.set(progressData, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed updating progress:", error);
    res.status(500).json({ error: "Failed updating progress." });
  }
});

module.exports = router;
