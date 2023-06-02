const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }});
const User = mongoose.model('WhatsUpp', UserSchema);
module.exports = User;
