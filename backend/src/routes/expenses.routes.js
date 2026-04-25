const express = require("express");
const { auth } = require("../middleware/auth");
const { ExpenseEntry } = require("../models");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  const category = req.query.category;
  const filter = {};
  if (category) filter.category = category;
  const rows = await ExpenseEntry.find(filter).sort({ date: -1 }).limit(300);
  res.json(rows);
});

router.post("/", auth(), async (req, res) => {
  const payload = {
    date: req.body.date || new Date().toISOString(),
    category: req.body.category,
    cost: Number(req.body.cost || 0),
    notes: req.body.notes || "",
    supplierId: req.body.supplierId,
    createdBy: req.user.sub,
    machine: req.body.machine,
    rawMaterial: req.body.rawMaterial,
    salary: req.body.salary,
    tax: req.body.tax,
    electricity: req.body.electricity,
    rent: req.body.rent
  };

  const row = await ExpenseEntry.create(payload);
  res.status(201).json(row);
});

module.exports = router;

