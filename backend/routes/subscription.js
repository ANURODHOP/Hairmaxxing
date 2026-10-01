const express = require("express");
const verifyToken = require("../middleware/auth");
const { db, admin } = require("../services/firebase");

const router = express.Router();

router.post("/demo-purchase", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { planId, transactionId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: "planId is required." });
    }

    let durationMonths = 1;
    if (planId === "weekly") durationMonths = 0.25;
    else if (planId === "3month" || planId === "three_month") durationMonths = 3;

    const startDate = new Date();
    const expiresAt = new Date(startDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000).getTime();

    const userRef = db.collection("users").doc(userId);
    await userRef.set(
      {
        isPremium: true,
        entitlement: "premium",
        expiresAt,
        platform: "demo",
        planId,
        subscriptionStatus: "active",
        subscriptionSource: "demo",
        transactionId: transactionId || `HM-DEMO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        currentPeriodStart: startDate.getTime(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ success: true, message: "Demo subscription activated." });
  } catch (error) {
    console.error("Demo purchase failed:", error);
    res.status(500).json({ error: "Demo purchase failed." });
  }
});

router.post("/restore", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.json({ success: false, message: "No active demo subscription found.", isPremium: false });
    }

    const data = userDoc.data();
    let isPremium = data.isPremium || false;

    if (isPremium && data.expiresAt && Date.now() > data.expiresAt) {
      isPremium = false;
      await db.collection("users").doc(userId).set(
        {
          isPremium: false,
          subscriptionStatus: "expired",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (isPremium) {
      res.json({ success: true, message: "Demo subscription restored successfully.", isPremium });
    } else {
      res.json({ success: false, message: "No active demo subscription found.", isPremium });
    }
  } catch (error) {
    console.error("Restore purchase failed:", error);
    res.status(500).json({ error: "Restore purchase failed." });
  }
});

module.exports = router;
