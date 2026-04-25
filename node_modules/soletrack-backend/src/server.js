const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const productionRoutes = require("./routes/production.routes");
const salesRoutes = require("./routes/sales.routes");
const materialRoutes = require("./routes/material.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportRoutes = require("./routes/report.routes");
const inventoryRoutes = require("./routes/inventory.routes");

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

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in backend/.env");
  console.error("Create backend/.env (copy from backend/.env.example) and set MONGO_URI.");
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
