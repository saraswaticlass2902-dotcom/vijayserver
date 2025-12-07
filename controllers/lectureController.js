const Lecture = require("../models/lectureModel");
const path = require("path");
const fs = require("fs");

// ---------------- Upload Lecture ----------------
exports.uploadLecture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const title = req.body.title || "Untitled Lecture";
    const videoUrl = `/uploads/lectures/${req.file.filename}`;

    const lecture = new Lecture({
      title,
      filename: req.file.filename,
      videoUrl,
    });

    await lecture.save();
    res.json({ success: true, lecture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- Get All Lectures ----------------
exports.getLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find().sort({ uploadedAt: -1 });
    res.json(lectures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Delete Lecture ----------------
exports.deleteLecture = async (req, res) => {
  try {
    const { id } = req.params;
    const lecture = await Lecture.findById(id);
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    // Delete file from uploads folder
    const filePath = path.join(__dirname, "..", "uploads", "lectures", lecture.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Delete from DB
    await lecture.deleteOne();

    res.json({ success: true, message: "Lecture deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
