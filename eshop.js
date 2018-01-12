const request = require('request')
const fs = require('fs')

const Chat = require('./models/chat')

module.exports = class Eshop {
  /**
   * Creates an instance of Eshop.
   *
   * @param {TelegramBot} bot
   */
  constructor(bot) {
    this.bot = bot
  }

  /**
   * Run checing sales games
   *
   */
  async run () {
    try {
      const oldGames = await this._getOldGames()
      const games = await this._loadAllGames()
      const oldIds = oldGames.map(g => g.id)
      const newGames = games.filter(game => !oldIds.includes(game.id))

      await this._sendGames(newGames)

      await this._saveGames(games)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Save games
   *
   * @param {Object[]} games
   */
  async _saveGames (games) {
    await Game.remove({})

    await Game.create(games)
  }

  /**
   * Get previous games to compare
   *
   * @returns {Object[]}
   */
  async _getOldGames () {
    return await Game.find()
  }

  /**
   * Load all sales games
   *
   * @returns {Object[]}
   */
  async _loadAllGames () {
    const url = 'https://www.nintendo.com/json/content/get/filter/game'
    const games = []
    const limit = 50
    let offset = 0
    let total = 0

    do {
      const res = await this._request({
        url,
        json: true,
        qs: {
          limit,
          offset,
          sale: true
        }
      })

      total = res.filter.total
      offset += limit

      const { game } = res.games
      const limitedGames = Array.isArray(game) ? game : [game] // fucking Nintendo API
      games.push(...limitedGames)
    } while (offset < total)

    console.log('loaded sales games', games.length)
    return games
  }

  /**
   * Promise request wrapper
   *
   * @param {Object} options
   * @param {string} options.url
   * @param {boolean} options.json
   * @param {Object} options.qs
   * @returns
   */
  _request(options) {
    return new Promise((resolve, reject) => {
      request(options, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.body)
        }
      })
    })
  }

  /**
   * Send message to all users
   *
   * @param {string} msg
   */
  async _sendToAll (msg) {
    const chats = await Chat.find()
    console.log('send to all', chats)
    chats.forEach(chat => this.bot.sendMessage(chat.id, null, msg))
  }

  /**
   * Create message and send it
   *
   * @param {Object[]} games
   */
  async _sendGames (games) {
    for (let i = 0; i < games.length; i++) {
      const msg = [
        `*${games[i].title}*`,
        `*$${games[i].sale_price}* \`$${games[i].eshop_price}\``,
        `https://www.nintendo.com/games/detail/${games[i].id}`
      ].join('\n')

      await this._sendToAll(msg)
    }
  }
}
