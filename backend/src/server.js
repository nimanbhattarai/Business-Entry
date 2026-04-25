const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err?.stack || err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err?.stack || err);
  process.exit(1);
});

const authRoutes = require("./routes/auth.routes");
const productionRoutes = require("./routes/production.routes");
const salesRoutes = require("./routes/sales.routes");
const materialRoutes = require("./routes/material.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportRoutes = require("./routes/report.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const masterRoutes = require("./routes/master.routes");
const expenseRoutes = require("./routes/expenses.routes");

// Local dev loads backend/.env. In Render/production, real env vars come from the platform.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "soletrack-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/expenses", expenseRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI environment variable.");
  console.error("Set it in Render -> Environment -> MONGO_URI (MongoDB Atlas connection string).");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable.");
  console.error("Set it in Render -> Environment -> JWT_SECRET (a long random string).");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SoleTrack backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
