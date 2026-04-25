const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Missing required fields" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: role || "employee" });
  const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return res.status(201).json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
});

router.get("/me", auth(), async (req, res) => {
  const user = await User.findById(req.user.sub).select("-passwordHash");
  res.json({ user });
});

module.exports = router;
