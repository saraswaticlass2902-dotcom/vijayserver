//houseRouses.js
const express = require("express");
const router = express.Router();
const House = require("../models/House");
const upload = require("../middleware/upload");


router.post("/add", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image required" });

    const newHouse = new House({
      title: req.body.title,
      rent: req.body.rent,
      location: req.body.location,
      type: req.body.type,
      contact: req.body.contact,
      description: req.body.description, 
      image: `http://localhost:5000/uploads/${req.file.filename}`,
    });

    await newHouse.save();
    res.status(201).json(newHouse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/list", async (req, res) => {
  try {
    const houses = await House.find().sort({ createdAt: -1 });
    res.json(houses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
