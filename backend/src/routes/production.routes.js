const express = require("express");
const { auth } = require("../middleware/auth");
const { ProductionEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (_req, res) => {
  const rows = await ProductionEntry.find().sort({ date: -1 }).limit(200);
  res.json(rows);
});

router.post("/", auth(), async (req, res) => {
  const payload = {
    date: req.body.date,
    articleId: req.body.articleId,
    articleName: req.body.articleName || req.body.articleNumber || "",
    quantity: Number(req.body.quantity || 0),
    notes: req.body.notes || "",
    createdBy: req.user.sub
  };
  const row = await ProductionEntry.create(payload);
  res.status(201).json(row);
});

module.exports = router;
