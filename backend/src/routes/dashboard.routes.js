const express = require("express");
const { auth } = require("../middleware/auth");
const { ProductionEntry, SaleEntry, MaterialEntry, ExpenseEntry } = require("../models");

const router = express.Router();

function startOfDay(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfMonth(d = new Date()) {
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

router.get("/", auth(), async (_req, res) => {
  const sod = startOfDay();
  const som = startOfMonth();

  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    todayProduced,
    todaySold,
    revenueToday,
    expensesToday,
    weeklyProduction,
    monthlyProduction,
    productionByArticleToday,
    inventoryByArticle,
    pendingPaymentsAgg,
    expensesByCategoryMonth
  ] = await Promise.all([
    ProductionEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]),
    SaleEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$quantity" } } }]),
    SaleEntry.aggregate([
      { $match: { date: { $gte: sod } } },
      { $project: { lineTotal: { $multiply: ["$quantity", "$ratePerPiece"] } } },
      { $group: { _id: null, total: { $sum: "$lineTotal" } } }
    ]),
    ExpenseEntry.aggregate([{ $match: { date: { $gte: sod } } }, { $group: { _id: null, total: { $sum: "$cost" } } }]),
    ProductionEntry.aggregate([
      { $match: { date: { $gte: last7 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$quantity" } } },
      { $sort: { _id: 1 } }
    ]),
    ProductionEntry.aggregate([
      { $match: { date: { $gte: last30 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$quantity" } } },
      { $sort: { _id: 1 } }
    ]),
    ProductionEntry.aggregate([
      { $match: { date: { $gte: sod } } },
      { $group: { _id: "$articleName", total: { $sum: "$quantity" } } },
      { $sort: { total: -1 } }
    ]),
    // inventory = produced - sold grouped by article
    Promise.all([
      ProductionEntry.aggregate([{ $group: { _id: "$articleName", total: { $sum: "$quantity" } } }]),
      SaleEntry.aggregate([{ $group: { _id: "$articleName", total: { $sum: "$quantity" } } }])
    ]).then(([p, s]) => {
      const soldMap = new Map(s.map((x) => [x._id || "Unknown", x.total]));
      const merged = p.map((x) => {
        const key = x._id || "Unknown";
        const sold = soldMap.get(key) || 0;
        return { article: key, produced: x.total, sold, stock: Math.max(x.total - sold, 0) };
      });
      // include articles that only have sales (shouldn't happen but safe)
      for (const x of s) {
        const key = x._id || "Unknown";
        if (!merged.find((m) => m.article === key)) merged.push({ article: key, produced: 0, sold: x.total, stock: 0 });
      }
      return merged.sort((a, b) => b.stock - a.stock);
    }),
    // pending payments = sum(total - paidAmount) where status != paid
    SaleEntry.aggregate([
      {
        $project: {
          total: { $multiply: ["$quantity", "$ratePerPiece"] },
          paid: "$paidAmount",
          status: "$paymentStatus"
        }
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, 0, { $max: [{ $subtract: ["$total", "$paid"] }, 0] }]
            }
          }
        }
      }
    ]),
    ExpenseEntry.aggregate([
      { $match: { date: { $gte: som } } },
      { $group: { _id: "$category", total: { $sum: "$cost" } } }
    ])
  ]);

  const produced = todayProduced[0]?.total || 0;
  const sold = todaySold[0]?.total || 0;
  const materialCost = 0; // legacy field kept for compatibility
  const revenue = revenueToday[0]?.total || 0;
  const expenses = expensesToday[0]?.total || 0;
  const pendingPayment = pendingPaymentsAgg[0]?.pending || 0;

  const expensesByCategory = {
    machine: 0,
    rawMaterial: 0,
    salary: 0,
    tax: 0,
    electricity: 0,
    rent: 0
  };
  for (const row of expensesByCategoryMonth) {
    expensesByCategory[row._id] = row.total;
  }

  res.json({
    totalProductionToday: produced,
    totalSoldToday: sold,
    remainingStock: Math.max(produced - sold, 0),
    totalMaterialCost: materialCost,
    totalRevenue: revenue,
    totalExpensesToday: expenses,
    pendingPayment,
    profitOrLoss: revenue - expenses,
    weeklyProduction,
    monthlyProduction,
    productionByArticleToday: productionByArticleToday.map((x) => ({ article: x._id || "Unknown", total: x.total })),
    inventoryByArticle,
    expensesByCategoryMonth: expensesByCategory
  });
});

module.exports = router;
