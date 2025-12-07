

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// -------- User Registration + Email Send --------
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
// -------- Forgot Password - Send OTP --------
router.post("/forgot-password", authController.forgotPassword);

// -------- Verify OTP & Change Password --------
router.post("/verify-otp", authController.verifyOtp);

router.post("/check-email", authController.checkEmail);


module.exports = router;
