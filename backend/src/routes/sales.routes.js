const express = require("express");
const { auth } = require("../middleware/auth");
const { SaleEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (_req, res) => {
  const rows = await SaleEntry.find().sort({ date: -1 }).limit(200);
  const withTotals = rows.map((r) => ({ ...r.toObject(), totalAmount: r.quantity * r.ratePerPiece }));
  res.json(withTotals);
});

router.post("/", auth(), async (req, res) => {
  const quantity = Number(req.body.quantity || 0);
  const ratePerPiece = Number(req.body.ratePerPiece ?? req.body.pricePerSole ?? 0);
  const totalAmount = quantity * ratePerPiece;
  const paymentStatus = req.body.paymentStatus || (req.body.paymentMethod === "credit" ? "pending" : "paid");
  const paidAmount =
    paymentStatus === "paid"
      ? totalAmount
      : paymentStatus === "partial"
        ? Number(req.body.paidAmount || 0)
        : 0;

  const payload = {
    date: req.body.date,
    customerId: req.body.customerId,
    customerName: req.body.customerName || req.body.partyName || "",
    articleId: req.body.articleId,
    articleName: req.body.articleName || req.body.articleNumber || "",
    quantity,
    ratePerPiece,
    paymentStatus,
    paymentMethod: req.body.paymentMethod || "cash",
    paidAmount,
    notes: req.body.notes || "",
    createdBy: req.user.sub
  };
  const row = await SaleEntry.create(payload);
  res.status(201).json({ ...row.toObject(), totalAmount: row.quantity * row.ratePerPiece });
});

module.exports = router;
