const mongoose = require('mongoose')

const Eshop = require('./eshop')

const { MONGO_URL } = process.env

mongoose.Promise = Promise
mongoose.connect(MONGO_URL)
  .then(main)
  .catch(err => console.error('MongoError: ' + err))

function main () {
  console.log('Connected to DB')

  const eshop = new Eshop()

  eshop.run()
}
