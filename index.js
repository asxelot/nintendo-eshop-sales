const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const request = require('request')
const http = require('http')
const fs = require('fs')

const Eshop = require('./eshop')
const Chat = require('./models/chat')

const { PORT, TELEGRAM_TOKEN, HEROKU_APP_URL, MONGO_URL } = process.env

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })
const eshop = new Eshop(bot)

mongoose.Promise = Promise
mongoose.connect(MONGO_URL)
  .connection
    .once('open', () => console.log('Connected to DB'))
    .on('error', err => console.error('MongoErr: ', err))

// keep Heroku asleep
http.createServer().listen(PORT)
setInterval(() => {
  request(HEROKU_APP_URL)
}, 5 * 60 * 1000)

// eshop.run()

setInterval(() => {
  eshop.run()
}, 60 * 60 * 1000)

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id
  const chat = await Chat.findOne({ id: chatId })

  if (!chat) {
    await Chat.create(msg.chat)

    bot.sendMessage(chatId, 'You subscribed. Send `/stop` to unsubscribe.')
  } else if (chat && !chat.isActive) {
    chat.isActive = true
    await chat.save()

    bot.sendMessage(chatId, 'You subscribed. Send `/stop` to unsubscribe.')
  }
})

bot.onText(/\/stop/, async msg => {
  const chatId = msg.chat.id
  const chat = await Chat.findOne({ id: chatId })

  if (chat && chat.isActive) {
    chat.isActive = false
    await chat.save()

    bot.sendMessage(chatId, 'You unsubscribed. Send `/start` to subscribe.')
  }
})

bot.onText(/\/test/, msg => {
  bot.sendMessage(msg.chat.id, null, '*bold* _italic_ `code`')
})

bot.on('polling_error', error => console.error(error))