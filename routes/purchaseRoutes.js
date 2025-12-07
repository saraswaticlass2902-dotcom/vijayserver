
const express = require("express");
const router = express.Router();
const Purchase = require("../models/Purchase");
const defaultAuth = require("../middleware/authMiddleware");
const multer = require("multer");


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });


router.post(
  "/add",
  defaultAuth,
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "paymentReceipt", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        houseId, title, rent,
        buyerName, buyerEmail, buyerPhone, buyerAddress,
        paymentMode, transactionId, amount
      } = req.body;

      if (!houseId || !title || !rent || !buyerName || !buyerEmail || !buyerPhone || !transactionId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const purchase = new Purchase({
        houseId,
        title,
        rent,
        userId: req.user._id,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        paymentMode,
        transactionId,
        amount,
        idProof: req.files.idProof ? req.files.idProof[0].path : null,
        paymentReceipt: req.files.paymentReceipt ? req.files.paymentReceipt[0].path : null,
        status: "pending" // 🔹 Initially pending
      });

      await purchase.save();
      res.json({ message: "Purchase submitted successfully. Waiting for admin approval.", purchase });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


router.get("/my-purchases", defaultAuth, async (req, res) => {
  try {
    const purchases = await Purchase.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/admin", async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/admin/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status.toLowerCase()))
      return res.status(400).json({ error: "Invalid status" });

    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      { status: status.toLowerCase() },
      { new: true }
    );

    res.json({ message: `Purchase ${status}`, purchase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
