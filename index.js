const mongoose = require('mongoose')
const request = require('request')
const http = require('http')

const Eshop = require('./eshop')
const Bot = require('./bot')

const { PORT, HEROKU_APP_URL, MONGO_URL } = process.env

mongoose.Promise = Promise
mongoose.connect(MONGO_URL)
  .connection
    .once('open', main)
    .on('error', err => console.error('MongoErr: ', err))

function main () {
  console.log('Connected to DB')

  const bot = new Bot()
  const eshop = new Eshop(bot)

  // keep Heroku asleep
  http.createServer((req, res) => res.end('Hello')).listen(PORT)
  setInterval(() => {
    request(HEROKU_APP_URL)
  }, 60 * 1000)

  // eshop.run()
  setInterval(() => {
    eshop.run()
  }, 60 * 60 * 1000)
}
