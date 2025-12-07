// test-mongo.js
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

(async () => {
  try {
    console.log('Trying to connect...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, family: 4 });
    console.log('✅ Connected OK');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error(err);
    process.exit(1);
  }
})();
