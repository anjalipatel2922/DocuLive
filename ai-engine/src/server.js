const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const routes = require("./routes");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "DocuLive AI Engine is running"
  });
});

// AI routes
app.use("/api", routes);

// Start server
app.listen(PORT, () => {
  console.log(`AI Engine running on http://localhost:${PORT}`);
});