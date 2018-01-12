const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const request = require('request')
const http = require('http')

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
http.createServer((req, res) => res.end('Hello')).listen(PORT)
setInterval(() => {
  request(HEROKU_APP_URL)
}, 60 * 1000)

// eshop.run()

setInterval(() => {
  eshop.run()
}, 60 * 60 * 1000)

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id
  const chat = await Chat.findOne({ id: chatId })
  const reply = chatId => bot.sendMessage(chatId, 'You subscribed. Send /stop to unsubscribe.')

  if (!chat) {
    await Chat.create(msg.chat)

    reply(chatId)
  } else if (chat && !chat.isActive) {
    chat.isActive = true
    await chat.save()

    reply(chatId)
  }
})

bot.onText(/\/stop/, async msg => {
  const chatId = msg.chat.id
  const chat = await Chat.findOne({ id: chatId })

  if (chat && chat.isActive) {
    chat.isActive = false
    await chat.save()

    bot.sendMessage(chatId, 'You unsubscribed. Send /start to subscribe.')
  }
})

bot.onText(/\/test/, msg => {
  bot.sendMessage(msg.chat.id, '*bold* _italic_ `code`', { parse_mode: 'Markdown' })
})

bot.on('polling_error', error => console.error(error))
