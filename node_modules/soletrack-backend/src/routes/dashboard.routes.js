const express = require("express");
const { auth } = require("../middleware/auth");
const { ProductionEntry, SaleEntry, MaterialEntry } = require("../models");

const router = express.Router();

function startOfDay(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

router.get("/", auth(), async (_req, res) => {
  const sod = startOfDay();

  const [todayProduced, todaySold, materialCostToday, revenueToday, weeklyProduction] = await Promise.all([
    ProductionEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]),
    SaleEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]),
    MaterialEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$cost" } } }]),
    SaleEntry.aggregate([
      { $match: { date: { $gte: sod } } },
      { $project: { lineTotal: { $multiply: ["$quantity", "$pricePerSole"] } } },
      { $group: { _id: null, total: { $sum: "$lineTotal" } } }
    ]),
    ProductionEntry.aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$quantity" }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const produced = todayProduced[0]?.total || 0;
  const sold = todaySold[0]?.total || 0;
  const materialCost = materialCostToday[0]?.total || 0;
  const revenue = revenueToday[0]?.total || 0;

  res.json({
    totalProductionToday: produced,
    totalSoldToday: sold,
    remainingStock: Math.max(produced - sold, 0),
    totalMaterialCost: materialCost,
    totalRevenue: revenue,
    profitOrLoss: revenue - materialCost,
    weeklyProduction
  });
});

module.exports = router;
