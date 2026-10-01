const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
const userRoutes = require("./routes/user");
const analysisRoutes = require("./routes/analysis");
const progressRoutes = require("./routes/progress");
const photoRoutes = require("./routes/photo");
const subscriptionRoutes = require("./routes/subscription");

app.use("/api/user", userRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/photo", photoRoutes);
app.use("/api/subscription", subscriptionRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "HairMaxxing backend is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
