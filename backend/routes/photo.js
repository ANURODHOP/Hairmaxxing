const express = require("express");
const verifyToken = require("../middleware/auth");
const { db, admin, storage } = require("../services/firebase");

const router = express.Router();

router.post("/upload-milestone", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { imageBase64, imagesBase64, currentDay, mimeType = "image/jpeg" } = req.body;

    const base64List = imagesBase64 || (imageBase64 ? [imageBase64] : []);

    if (!base64List.length || !currentDay) {
      return res.status(400).json({ error: "Images and currentDay required." });
    }

    const bucket = storage.bucket();
    const imageUrls = [];

    for (let i = 0; i < base64List.length; i++) {
      const fileName = `milestones/${userId}/day${currentDay}_${Date.now()}_${i}.jpg`;
      const file = bucket.file(fileName);
      const buffer = Buffer.from(base64List[i], "base64");

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      await file.makePublic();

      imageUrls.push(`https://storage.googleapis.com/${bucket.name}/${fileName}`);
    }

    const userRef = db.collection("users").doc(userId);
    await userRef.set(
      {
        milestonePhotos: admin.firestore.FieldValue.arrayUnion({
          day: Number(currentDay),
          imageUrls,
          uploadedAt: Date.now(),
        }),
      },
      { merge: true }
    );

    res.json({ success: true, imageUrls });
  } catch (error) {
    console.error("Failed uploading photos:", error);
    res.status(500).json({ error: "Failed uploading photos." });
  }
});

module.exports = router;
