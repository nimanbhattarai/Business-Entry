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

/**
 * Master data is shared across the entire app (dropdowns, profiles, etc.).
 * One collection keeps it simple and consistent.
 */
const masterItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["article", "rawMaterial", "customer", "employee", "supplier", "machine", "taxType"]
    },
    name: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    joiningDate: { type: Date }, // used for employees
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);
masterItemSchema.index({ type: 1, name: 1 }, { unique: true });

const productionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    // Article master reference (preferred) + legacy fallback string for backward compatibility
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
    articleName: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const saleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
    customerName: { type: String, default: "" },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
    articleName: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    ratePerPiece: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["paid", "partial", "pending"], required: true, default: "paid" },
    paymentMethod: { type: String, enum: ["cash", "online", "credit"], required: true, default: "cash" },
    paidAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

saleSchema.virtual("totalAmount").get(function totalAmount() {
  return this.quantity * this.ratePerPiece;
});

// Legacy (raw material purchases) kept to avoid breaking old data; new app uses ExpenseEntry.
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

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    category: {
      type: String,
      required: true,
      enum: ["machine", "rawMaterial", "salary", "tax", "electricity", "rent"]
    },
    cost: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    // common relations to master data (optional depending on category)
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // category-specific payload (kept flexible)
    machine: {
      machineId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
      machineName: { type: String, default: "" },
      type: { type: String, enum: ["repair", "purchase"], default: "repair" }
    },
    rawMaterial: {
      rawMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
      rawMaterialName: { type: String, default: "" },
      quantity: { type: Number, default: 0, min: 0 },
      unit: { type: String, default: "" },
      supplierName: { type: String, default: "" }
    },
    salary: {
      employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
      employeeName: { type: String, default: "" },
      salaryAmount: { type: Number, default: 0, min: 0 },
      advancePayment: { type: Number, default: 0, min: 0 },
      remainingSalary: { type: Number, default: 0, min: 0 },
      paymentDate: { type: Date }
    },
    tax: {
      taxTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterItem" },
      taxType: { type: String, default: "" }
    },
    electricity: {
      month: { type: String, default: "" },
      billAmount: { type: Number, default: 0, min: 0 },
      status: { type: String, enum: ["paid", "pending"], default: "paid" }
    },
    rent: {
      monthlyRent: { type: Number, default: 0, min: 0 },
      status: { type: String, enum: ["paid", "pending"], default: "paid" },
      dueDate: { type: Date }
    }
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  MasterItem: mongoose.model("MasterItem", masterItemSchema),
  ProductionEntry: mongoose.model("ProductionEntry", productionSchema),
  SaleEntry: mongoose.model("SaleEntry", saleSchema),
  MaterialEntry: mongoose.model("MaterialEntry", materialSchema),
  ExpenseEntry: mongoose.model("ExpenseEntry", expenseSchema)
};
