const express = require("express");
const { auth } = require("../middleware/auth");
const { ProductionEntry, SaleEntry, MaterialEntry } = require("../models");

const router = express.Router();

router.get("/:period", auth(["admin", "employee"]), async (req, res) => {
  const period = req.params.period;
  const now = new Date();
  let from = new Date(now);

  if (period === "daily") from.setDate(now.getDate() - 1);
  else if (period === "weekly") from.setDate(now.getDate() - 7);
  else from.setMonth(now.getMonth() - 1);

  const [productions, sales, materials] = await Promise.all([
    ProductionEntry.find({ date: { $gte: from } }),
    SaleEntry.find({ date: { $gte: from } }),
    MaterialEntry.find({ date: { $gte: from } })
  ]);

  const produced = productions.reduce((acc, r) => acc + r.quantity, 0);
  const sold = sales.reduce((acc, r) => acc + r.quantity, 0);
  const revenue = sales.reduce((acc, r) => acc + r.quantity * r.pricePerSole, 0);
  const expense = materials.reduce((acc, r) => acc + r.cost, 0);

  res.json({
    period,
    from,
    to: now,
    production: produced,
    sold,
    revenue,
    expense,
    profit: revenue - expense,
    exports: {
      pdf: `/api/reports/${period}/export/pdf`,
      excel: `/api/reports/${period}/export/excel`
    }
  });
});

router.get("/:period/export/:format", auth(["admin"]), async (req, res) => {
  const { period, format } = req.params;
  res.json({
    message: `${format.toUpperCase()} export endpoint ready for ${period} report`,
    note: "Integrate exceljs/pdfkit generation here."
  });
});

module.exports = router;
