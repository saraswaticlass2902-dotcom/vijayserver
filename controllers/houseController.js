// controllers/houseController.js
const House = require("../models/House");



exports.addHouse = async (req, res) => {
  try {
    console.log("📩 Incoming Body:", req.body);
    console.log("📸 Incoming File:", req.file);

    // जर image आली नाही तर error टाकून बघ
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded!" });
    }

    res.json({ message: "✅ House Added Successfully" });
  } catch (err) {
    console.error("❌ Backend Error:", err);
    res.status(500).json({ error: "Server Error while adding house" });
  }
};


exports.getAllHouses = async (req, res) => {
  try {
    const houses = await House.find();
    res.json(houses);
  } catch (err) {
    console.error("Error fetching houses:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getHouseById = async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }
    res.json(house);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



// Update House
exports.updateHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, price } = req.body;

    const updateData = { name, location, price };
    if (req.file) {
      updateData.image = req.file.filename; // जर image upload केली असेल तर
    }

    const house = await House.findByIdAndUpdate(id, updateData, { new: true });

    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    res.json({ message: "✅ House updated successfully", house });
  } catch (err) {
    console.error("Error updating house:", err);
    res.status(500).json({ message: "Server error" });
  }
};
