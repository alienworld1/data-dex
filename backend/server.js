const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "DataDex Backend",
  });
});

// Basic API info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "DataDex Backend API",
    version: "1.0.0",
    description: "Backend API for DataDex - A decentralized data marketplace",
    endpoints: {
      health: "GET /health",
      upload: "POST /api/upload/*",
      datasets: "GET /api/datasets/*",
      aptos: "GET /api/aptos/*",
    },
    status: "running",
  });
});

// Import and use routes
try {
  const uploadRoutes = require("./routes/upload");
  const datasetRoutes = require("./routes/datasets");
  const aptosRoutes = require("./routes/aptos");

  app.use("/api/upload", uploadRoutes);
  app.use("/api/datasets", datasetRoutes);
  app.use("/api/aptos", aptosRoutes);

  console.log("✅ All routes loaded successfully");
} catch (error) {
  console.warn("⚠️  Some routes failed to load:", error.message);
  console.log("📝 Server will start with basic endpoints only");
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 DataDex Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`
  );
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API info: http://localhost:${PORT}/api`);
});

module.exports = app;
