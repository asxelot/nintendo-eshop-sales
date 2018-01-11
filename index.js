const TelegramBot = require('node-telegram-bot-api')
const http = require('http')
const fs = require('fs')
const Eshop = require('./eshop')

const { PORT, TELEGRAM_TOKEN, APP_URL } = process.env

const eshop = new Eshop()

// keep Heroku asleep
http.createServer().listen(PORT)
setInterval(() => {
  http.get(APP_URL)
  eshop.run()
}, 5 * 60 * 1000)

setInterval(() => {
  eshop.run()
}, 60 * 60 * 1000)

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })
const chats = []

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id

  if (chats.indexOf(chatId) === -1) {
    chats.push(chatId)
    bot.sendMessage(chatId, 'You subscribed. Send `/stop` to unsubscribe.')
  }
})

bot.onText(/\/stop/, msg => {
  const chatId = msg.chat.id
  const i = chats.indexOf(chatId)
  if (i !== -1) {
    chats.splice(i, 1)
    bot.sendMessage(chatId, 'You unsubscribed. Send `/start` to subscribe.')
  }
})

bot.on('polling_error', error => console.error(error))