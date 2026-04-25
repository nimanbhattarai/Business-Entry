const express = require("express");
const { auth } = require("../middleware/auth");
const { MaterialEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (_req, res) => {
  const rows = await MaterialEntry.find().sort({ date: -1 }).limit(200);
  res.json(rows);
});

router.post("/", auth(), async (req, res) => {
  const payload = {
    date: req.body.date,
    rawMaterialName: req.body.rawMaterialName,
    quantityPurchased: Number(req.body.quantityPurchased || 0),
    cost: Number(req.body.cost || 0),
    supplierName: req.body.supplierName || "",
    createdBy: req.user.sub
  };
  const row = await MaterialEntry.create(payload);
  res.status(201).json(row);
});

module.exports = router;
