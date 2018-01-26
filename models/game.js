const mongoose = require('mongoose')

const GameSchema = mongoose.Schema({
  buyitnow: String,
  buyonline: String,
  ca_price: String,
  categories: Object,
  digitaldownload: String,
  eshop_price: String,
  free_to_start: String,
  front_box_art: String,
  game_code: String,
  id: { type: String, required: true, unique: true },
  nsuid: String,
  number_of_players: String,
  release_date: String,
  sale_price: String,
  slug: String,
  system: String,
  title: String,
  category: String
})

module.exports = mongoose.model('Game', GameSchema)
