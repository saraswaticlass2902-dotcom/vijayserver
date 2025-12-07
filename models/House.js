// const mongoose = require("mongoose");

// const houseSchema = new mongoose.Schema(
//   {
//     title: String,
//     rent: Number,
//     location: String,
//     image: String, // फक्त filename save
//     apartmenttype:String,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("House", houseSchema);


// const mongoose = require("mongoose");

// const houseSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   rent: { type: Number, required: true },
//   location: { type: String, required: true },
//   type: { type: String, required: true },
//   contact: { type: String, required: true },
//   info: { type: String },
//   image: { type: String },
// });

// module.exports = mongoose.model("House", houseSchema);

const mongoose = require("mongoose");

const houseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    rent: { type: Number, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    contact: { type: String, required: true },
    description: { type: String }, // ✅ change 'info' → 'description'
    image: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("House", houseSchema);
