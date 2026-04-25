const express = require("express");
const { auth } = require("../middleware/auth");
const { ProductionEntry, SaleEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (_req, res) => {
  const [producedAgg, soldAgg] = await Promise.all([
    ProductionEntry.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }]),
    SaleEntry.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }])
  ]);

  const totalStock = producedAgg[0]?.total || 0;
  const soldStock = soldAgg[0]?.total || 0;
  const remainingStock = Math.max(totalStock - soldStock, 0);
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 100);

  res.json({
    totalStock,
    soldStock,
    remainingStock,
    lowStockWarning: remainingStock <= threshold
  });
});

module.exports = router;
