const express = require("express");
const verifyToken = require("../middleware/auth");
const { db } = require("../services/firebase");

const router = express.Router();

router.get("/status", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.json({
        isNewUser: true,
        hasCompletedSurvey: false,
        isSubscribed: false,
      });
    }

    const d = userDoc.data();
    let isSubscribed = d.isPremium || false;

    if (isSubscribed && d.expiresAt) {
      if (Date.now() > d.expiresAt) {
        isSubscribed = false;
      }
    }

    res.json({
      isNewUser: false,
      hasCompletedSurvey: !!d.step1,
      isSubscribed,
      planName: d.planId || null,
      presentData: d.presentData || null,
      futureData: d.futureData || null,
      graphData: d.graphData || null,
    });
  } catch (error) {
    console.error("Error fetching user status:", error);
    res.status(500).json({ error: "Failed to fetch user status." });
  }
});

router.get("/analytics", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.json({
        present: null,
        future: null,
        graph: null,
      });
    }

    const d = userDoc.data();
    res.json({
      present: d.presentData || null,
      future: d.futureData || null,
      graph: d.graphData || null,
      milestonePhotos: d.milestonePhotos || [],
      improvementMetric: d.improvementMetric || null,
      lastAnalyzedAt: d.lastAnalyzedAt ? d.lastAnalyzedAt.toMillis() : null,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

module.exports = router;
