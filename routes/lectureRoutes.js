const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const lectureController = require("../controllers/lectureController");
const fs = require("fs");

// Ensure folder exists
const uploadDir = "./uploads/lectures";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "video/mp4") cb(null, true);
    else cb(new Error("Only mp4 files allowed"), false);
  },
});

// Routes
router.post("/upload", upload.single("file"), lectureController.uploadLecture);
router.get("/recordings", lectureController.getLectures);
router.delete("/:id", lectureController.deleteLecture);

module.exports = router;
