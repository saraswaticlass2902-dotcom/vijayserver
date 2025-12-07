

// controllers/authController.js (patched)
const Registration = require("../models/Registration");
const Verification = require("../models/Verification");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

// Email transporter (Gmail - App Password recommended)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const EMAIL_FROM = process.env.EMAIL_USER || "no-reply@example.com";

// Optional: verify transporter at startup to fail early if credentials are wrong
transporter.verify().then(() => {
  console.log("Email transporter OK");
}).catch((err) => {
  console.warn("Email transporter verify failed (emails may not send):", err && err.message);
});

// Helpers
function generateNumericOtp(len = 6) {
  let otp = "";
  for (let i = 0; i < len; i++) otp += Math.floor(Math.random() * 10);
  return otp;
}
function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

// IMPORTANT DB INDEX RECOMMENDATIONS (in Verification model):
// - add TTL index on expiresAt: { expiresAt: 1 }, expireAfterSeconds: 0
// - add unique index on otpToken: { otpToken: 1 }, unique: true
// These keep the collection lean and ensure token uniqueness.

// ====================================================================
// 1) CHECK EMAIL (register flow) -> creates Verification record + emails OTP
// ====================================================================
exports.checkEmail = [
  body("email").isEmail().withMessage("Valid email required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email } = req.body;
      const normalized = String(email).toLowerCase().trim();

      // If user exists, let frontend know (stop register flow)
      const existingUser = await Registration.findOne({ email: normalized });
      if (existingUser) return res.status(200).json({ exists: true, message: "Email already registered" });

      // Rate limit check
      const last = await Verification.findOne({ email: normalized, purpose: "register" }).sort({ createdAt: -1 });
      const RATE_LIMIT_SECONDS = parseInt(process.env.OTP_RATE_LIMIT_SECONDS || "60", 10);
      if (last && (Date.now() - last.createdAt.getTime()) / 1000 < RATE_LIMIT_SECONDS) {
        return res.status(429).json({ message: `Please wait before requesting a new OTP.` });
      }

      // Create OTP, hash, and create Verification record
      const otp = generateNumericOtp(6);
      const otpHash = hashOtp(otp);
      const otpToken = uuidv4();
      const OTP_TTL_MS = parseInt(process.env.OTP_TTL_MS || String(10 * 60 * 1000), 10);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await Verification.create({
        email: normalized,
        otpHash,
        otpToken,
        purpose: "register",
        expiresAt,
        attempts: 0,
        verified: false,
      });

      // Send OTP email (fire-and-forget)
      (async () => {
        try {
          await transporter.sendMail({
            from: EMAIL_FROM,
            to: normalized,
            subject: "Saraswati Classes - Registration OTP",
            html: `
              <div style="font-family: Arial, sans-serif; text-align:center; padding:20px;">
                <h2 style="color:#0d6efd;">Saraswati Classes</h2>
                <p>Your OTP is valid for ${Math.floor(OTP_TTL_MS/60000)} minutes</p>
                <div style="font-size:28px; letter-spacing:6px; font-weight:bold; background:#0d6efd; color:#fff; padding:10px 18px; border-radius:6px;">${otp}</div>
                <p style="font-size:12px; color:#666; margin-top:10px;">Do not share this OTP with anyone.</p>
              </div>
            `,
          });
          console.log("Registration OTP email queued for", normalized);
        } catch (err) {
          // log but do not fail the request (avoid exposing mail errors to clients)
          console.error("Error sending registration OTP email:", err && err.message ? err.message : err);
        }
      })();

      console.log("Generated registration otpToken for email:", normalized);
      return res.status(200).json({
        exists: false,
        otpToken,
        resendAfter: RATE_LIMIT_SECONDS,
        message: "OTP sent to email"
      });
    } catch (err) {
      console.error("checkEmail error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
];

// ====================================================================
// 2) VERIFY OTP (works for both register & forgot flows)
// ====================================================================
exports.verifyOtp = [
  body("email").isEmail().withMessage("Valid email required"),
  body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, otp, otpToken, newPassword } = req.body;
      if (!otpToken) return res.status(400).json({ message: "otpToken required" });

      const normalized = String(email).toLowerCase().trim();
      const verification = await Verification.findOne({ email: normalized, otpToken }).sort({ createdAt: -1 });

      if (!verification) return res.status(400).json({ message: "Invalid token or OTP" });
      if (verification.verified) return res.status(400).json({ message: "OTP already used" });
      if (verification.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

      // increase attempts and persist immediately
      verification.attempts = (verification.attempts || 0) + 1;
      const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "6", 10);
      if (verification.attempts > MAX_ATTEMPTS) {
        await verification.save();
        return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
      }

      const providedHash = hashOtp(String(otp).trim());
      if (providedHash !== verification.otpHash) {
        await verification.save(); // persist incremented attempts
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // mark verified
      verification.verified = true;
      await verification.save();

      // ===== NEW: set emailVerified on Registration when purpose is "register" =====
      if (verification.purpose === "register") {
        try {
          await Registration.findOneAndUpdate(
            { email: normalized },
            { $set: { emailVerified: true } }
          );
        } catch (err) {
          // log but don't fail the OTP verification response
          console.error("Error setting emailVerified on user:", err && err.message ? err.message : err);
        }
      }

      // If forgot password flow and newPassword provided -> reset
      if (verification.purpose === "forgot" && newPassword) {
        const user = await Registration.findOne({ email: normalized });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = await bcrypt.hash(String(newPassword), 10);
        await user.save();

        // cleanup verifications for this purpose
        await Verification.deleteMany({ email: normalized, purpose: "forgot" });

        return res.status(200).json({ success: true, message: "Password reset successful" });
      }

      // For register flow, frontend will call /register next
      return res.status(200).json({ success: true, message: "OTP verified" });
    } catch (err) {
      console.error("verifyOtp error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
];

// ====================================================================
// 3) REGISTER USER
//    - Ensures prior Verification exists and is verified
// ====================================================================
exports.registerUser = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("otpToken").optional().isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      let { username, email, password, otpToken } = req.body;
      const normalized = String(email).toLowerCase().trim();
      username = String(username).trim();

      // 1) ensure user not already exists
      const existing = await Registration.findOne({ email: normalized });
      if (existing && existing.password) {
        return res.status(400).json({ message: "User already exists" });
      }

      // 2) Verify OTP record exists and is verified
      let verification;
      if (otpToken) {
        verification = await Verification.findOne({ email: normalized, otpToken, purpose: "register" });
      } else {
        verification = await Verification.findOne({ email: normalized, purpose: "register", verified: true }).sort({ createdAt: -1 });
      }

      if (!verification || !verification.verified) {
        return res.status(400).json({ message: "Email not verified. Complete OTP verification first." });
      }

      // 3) Create user (or update existing placeholder record)
      const hashedPassword = await bcrypt.hash(String(password), 10);
      const user = await Registration.findOneAndUpdate(
        { email: normalized },
        { username, email: normalized, password: hashedPassword, role: "user" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 4) Clean up register verifications for this email
      await Verification.deleteMany({ email: normalized, purpose: "register" });

      // 5) Send welcome email (async)
      (async () => {
        try {
          await transporter.sendMail({
            from: EMAIL_FROM,
            to: normalized,
            subject: "🎉 Welcome to Saraswati Classes — Registration Complete!",
            html: `
              <div style="font-family: Arial, sans-serif; padding:20px; text-align:center;">
                <h2 style="color:#0d6efd;">Welcome, ${username}!</h2>
                <p>Your account has been created successfully. Login to continue.</p>
                <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/login" style="display:inline-block; padding:10px 18px; background:#0d6efd; color:#fff; border-radius:6px; text-decoration:none;">Login Now</a>
              </div>
            `,
          });
        } catch (err) {
          console.error("Welcome email error:", err && err.message ? err.message : err);
        }
      })();

      // return minimal user info only
      return res.status(201).json({
        message: "Registration successful",
        user: { id: user._id.toString(), email: user.email, username: user.username }
      });
    } catch (err) {
      console.error("registerUser error:", err);
      return res.status(500).json({ message: "Server error during registration" });
    }
  },
];

// ====================================================================
// 4) LOGIN USER
// ====================================================================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalized = String(email).toLowerCase().trim();

    const user = await Registration.findOne({ email: normalized });
    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "3d" });

    // cookie config - change secure & sameSite in production
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Login successful", user: { id: user._id.toString(), email: user.email, username: user.username } });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ====================================================================
// 5) FORGOT PASSWORD - create Verification (purpose: "forgot")
// ====================================================================
exports.forgotPassword = [
  body("email").isEmail().withMessage("Valid email required"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email } = req.body;
      const normalized = String(email).toLowerCase().trim();
      const user = await Registration.findOne({ email: normalized });
      if (!user) return res.status(404).json({ message: "User not found" });

      // rate-limit check
      const last = await Verification.findOne({ email: normalized, purpose: "forgot" }).sort({ createdAt: -1 });
      const RATE_LIMIT_SECONDS = parseInt(process.env.OTP_RATE_LIMIT_SECONDS || "60", 10);
      if (last && (Date.now() - last.createdAt.getTime()) / 1000 < RATE_LIMIT_SECONDS) {
        return res.status(429).json({ message: `Please wait before requesting a new OTP.` });
      }

      const otp = generateNumericOtp(6);
      const otpHash = hashOtp(otp);
      const otpToken = uuidv4();
      const OTP_TTL_MS = parseInt(process.env.OTP_TTL_MS || String(10 * 60 * 1000), 10);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await Verification.create({
        email: normalized,
        otpHash,
        otpToken,
        purpose: "forgot",
        expiresAt,
        attempts: 0,
        verified: false,
      });

      // send OTP email (async)
      (async () => {
        try {
          await transporter.sendMail({
            from: EMAIL_FROM,
            to: normalized,
            subject: "Saraswati Classes - Password Reset OTP",
            html: `
              <div style="font-family: Arial, sans-serif; text-align:center; padding:20px;">
                <h3>Saraswati Classes</h3>
                <p>Your OTP is valid for ${Math.floor(OTP_TTL_MS/60000)} minutes</p>
                <div style="font-size:26px; font-weight:bold; padding:8px 14px; background:#0d6efd; color:#fff; border-radius:6px;">${otp}</div>
                <p style="font-size:12px; color:#666; margin-top:10px;">Do not share this OTP.</p>
              </div>
            `,
          });
          console.log("Forgot-password OTP queued for", normalized);
        } catch (err) {
          console.error("Forgot password email error:", err && err.message ? err.message : err);
        }
      })();

      return res.status(200).json({ success: true, otpToken, resendAfter: RATE_LIMIT_SECONDS, message: "OTP sent to email" });
    } catch (err) {
      console.error("forgotPassword error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
];
