const mongoose = require('mongoose')
const request = require('request')
const http = require('http')

const Eshop = require('./eshop')

const { PORT, HEROKU_APP_URL, MONGO_URL } = process.env

mongoose.Promise = Promise
mongoose.connect(MONGO_URL)
  .then(main)
  .catch(err => console.error('MongoError: ' + err))

function main () {
  console.log('Connected to DB')

  const eshop = new Eshop()

  // eshop.run()
  setInterval(() => {
    eshop.run()
  }, 24 * 60 * 60 * 1000)

  // keep Heroku asleep
  http.createServer((req, res) => res.end('Hello')).listen(PORT)
  setInterval(() => {
    request(HEROKU_APP_URL)
  }, 5 * 60 * 1000)
}
