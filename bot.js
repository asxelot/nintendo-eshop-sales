const TelegramBot = require('node-telegram-bot-api')

const Chat = require('./models/chat')

module.exports = class Bot {
  /**
   * Creates an instance of Bot.
   *
   */
  constructor () {
    this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })

    this.sendMessage = this.bot.sendMessage.bind(this.bot)

    this.bot.onText(/\/start/, this.onStart.bind(this))
    this.bot.onText(/\/stop/, this.onStop.bind(this))
    this.bot.onText(/\/test/, this.onTest.bind(this))
    this.bot.on('polling_error', this.onError.bind(this))
  }

  /**
   * Subscribe user
   *
   * @param {Object} msg
   * @param {Object} msg.chat
   * @param {number} msg.chat.id
   * @param {string} msg.chat.first_name
   * @param {string} msg.chat.last_name
   * @param {string} msg.chat.type
   */
  async onStart (msg) {
    const chatId = msg.chat.id
    const chat = await Chat.findOne({ id: chatId })
    const reply = chatId => this.bot.sendMessage(chatId, 'You subscribed. Send /stop to unsubscribe.')

    if (!chat) {
      await Chat.create(msg.chat)

      await reply(chatId)
    } else if (chat && !chat.isActive) {
      chat.isActive = true
      await chat.save()

      await reply(chatId)
    }
  }

  /**
   * Unsubscribe user
   *
   * @param {Object} msg
   * @param {Object} msg.chat
   * @param {number} msg.chat.id
   */
  async onStop (msg) {
    const chatId = msg.chat.id
    const chat = await Chat.findOne({ id: chatId })

    if (chat && chat.isActive) {
      chat.isActive = false
      await chat.save()

      await this.bot.sendMessage(chatId, 'You unsubscribed. Send /start to subscribe.')
    }
  }

  /**
   * Test
   *
   * @param {Object} msg
   * @param {string} msg.text
   * @param {number} msg.date
   * @param {Object} msg.chat
   * @param {number} msg.chat.id
   * @param {string} msg.chat.first_name
   * @param {string} msg.chat.last_name
   * @param {string} msg.chat.type
   */
  onTest (msg) {
    this.bot.sendMessage(msg.chat.id, '*bold* _italic_ `code`', { parse_mode: 'Markdown' })
  }

  /**
   * Error handling
   *
   * @param {Error} err
   */
  onError (err) {
    console.log(err.toString())
  }
}
