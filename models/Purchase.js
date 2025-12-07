// const mongoose = require("mongoose");

// const purchaseSchema = new mongoose.Schema({
//   // Relational references
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true }, // Buyer user
//   houseId: { type: mongoose.Schema.Types.ObjectId, ref: "House", required: true }, // Purchased house
//   title: { type: String, required: true }, // House title
//   rent: { type: Number, required: true }, // House rent

//   // Buyer information
//   buyerName: { type: String, required: true },
//   buyerEmail: { type: String, required: true },
//   buyerPhone: { type: String, required: true },
//   buyerAddress: { type: String }, // Optional

//   // ID Proof
//   idProof: { type: String }, // File path stored in server (uploads/filename.ext)

//   // Payment information
//   paymentMode: { type: String, required: true }, // Credit Card, UPI, Cash etc.
//   transactionId: { type: String, required: true },
//   amount: { type: Number, required: true },
//   paymentReceipt: { type: String }, // File path stored in server

//   // Status of purchase
//   status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

//   // Timestamps
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// // Optional: pre-save hook to update updatedAt automatically
// purchaseSchema.pre("save", function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model("Purchase", purchaseSchema);

const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", required: true },
  houseId: { type: mongoose.Schema.Types.ObjectId, ref: "House", required: true },
  title: { type: String, required: true },
  rent: { type: Number, required: true },

  // Buyer info
  buyerName: { type: String, required: true },
  buyerEmail: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  buyerAddress: { type: String },

  // ID proof & payment receipt
  idProof: { type: String },
  paymentReceipt: { type: String },

  // Payment info
  paymentMode: { type: String, required: true },
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },

  // Status: pending / approved / rejected
  status: { type: String, default: "pending" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Purchase", purchaseSchema);
