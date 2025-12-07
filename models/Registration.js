
// //models/Registration.js   

// const mongoose = require("mongoose");
// const registrationSchema = new mongoose.Schema({
//   username: { type: String },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   otp: { type: String },
//   otpExpires: { type: Date },
//   role: {
//     type: String,
//     enum: ["user", "admin"],
//     default: "user",
//   },
// });

// module.exports = mongoose.model("Registration", registrationSchema);

const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // REMOVE otp + otpExpires
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  emailVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model("Registration", registrationSchema);
