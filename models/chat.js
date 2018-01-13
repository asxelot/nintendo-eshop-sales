const mongoose = require('mongoose')

const ChatSchema = mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  first_name: String,
  last_name: String,
  type: String,
  isActive: { type: Boolean, default: true },
  created: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Chat', ChatSchema)
