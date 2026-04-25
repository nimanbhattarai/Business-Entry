const express = require("express");
const { auth } = require("../middleware/auth");
const { SaleEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (_req, res) => {
  const rows = await SaleEntry.find().sort({ date: -1 }).limit(200);
  const withTotals = rows.map((r) => ({ ...r.toObject(), totalAmount: r.quantity * r.pricePerSole }));
  res.json(withTotals);
});

router.post("/", auth(), async (req, res) => {
  const payload = {
    date: req.body.date,
    customerName: req.body.customerName || "",
    quantity: Number(req.body.quantity || 0),
    pricePerSole: Number(req.body.pricePerSole || 0),
    paymentMethod: req.body.paymentMethod || "cash",
    isPaid: req.body.paymentMethod === "credit" ? false : true,
    createdBy: req.user.sub
  };
  const row = await SaleEntry.create(payload);
  res.status(201).json({ ...row.toObject(), totalAmount: row.quantity * row.pricePerSole });
});

module.exports = router;
