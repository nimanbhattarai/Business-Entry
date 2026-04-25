const express = require("express");
const { auth } = require("../middleware/auth");
const { MasterItem } = require("../models");

const router = express.Router();

// Seeds initial dropdown values for first-time setup.
router.post("/bootstrap/defaults", auth(["admin", "employee"]), async (req, res) => {
  const defaults = {
    article: ["782", "Air", "358", "355", "356"],
    rawMaterial: ["Rubber", "Chemical", "Foam", "Color", "Thread"],
    customer: ["ABC Traders", "XYZ Footwear", "Nepal Sole House"]
  };

  const created = [];
  for (const [type, names] of Object.entries(defaults)) {
    for (const name of names) {
      const existing = await MasterItem.findOne({ type, name });
      if (existing) continue;
      const item = await MasterItem.create({ type, name, createdBy: req.user.sub });
      created.push(item);
    }
  }

  res.json({ ok: true, createdCount: created.length, created });
});

router.get("/:type", auth(), async (req, res) => {
  const { type } = req.params;
  const q = (req.query.q || "").trim();
  const filter = { type };
  if (q) filter.name = { $regex: q, $options: "i" };

  const items = await MasterItem.find(filter).sort({ name: 1 }).limit(500);
  res.json(items);
});

router.post("/:type", auth(), async (req, res) => {
  const { type } = req.params;
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });

  try {
    const item = await MasterItem.create({
      type,
      name,
      notes: req.body.notes || "",
      joiningDate: req.body.joiningDate,
      createdBy: req.user.sub
    });
    res.status(201).json(item);
  } catch (e) {
    if (String(e?.code) === "11000") return res.status(409).json({ message: "Already exists" });
    throw e;
  }
});

router.patch("/:id", auth(), async (req, res) => {
  const { id } = req.params;
  const patch = {};
  if (typeof req.body.name === "string") patch.name = req.body.name.trim();
  if (typeof req.body.notes === "string") patch.notes = req.body.notes;
  if (req.body.joiningDate) patch.joiningDate = req.body.joiningDate;

  const item = await MasterItem.findByIdAndUpdate(id, patch, { new: true });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.delete("/:id", auth(["admin"]), async (req, res) => {
  const { id } = req.params;
  const deleted = await MasterItem.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

module.exports = router;

