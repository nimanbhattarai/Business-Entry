const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "employee"], default: "employee" }
  },
  { timestamps: true }
);

const productionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    soleType: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const saleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    customerName: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    pricePerSole: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["cash", "online", "credit"], required: true },
    isPaid: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

saleSchema.virtual("totalAmount").get(function totalAmount() {
  return this.quantity * this.pricePerSole;
});

const materialSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    rawMaterialName: { type: String, required: true },
    quantityPurchased: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    supplierName: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  ProductionEntry: mongoose.model("ProductionEntry", productionSchema),
  SaleEntry: mongoose.model("SaleEntry", saleSchema),
  MaterialEntry: mongoose.model("MaterialEntry", materialSchema)
};
