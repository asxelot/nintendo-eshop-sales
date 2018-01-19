const request = require('request')

const Chat = require('./models/chat')
const Game = require('./models/game')
const Bot = require('./bot')

module.exports = class Eshop {
  /**
   * Creates an instance of Eshop.
   *
   */
  constructor () {
    this.bot = new Bot()
  }

  /**
   * Run checking sales games
   *
   */
  async run () {
    console.log('run')

    try {
      const oldGames = await this._getOldGames()
      const games = await this._loadAllGames()
      const oldIds = oldGames.map(g => g.id)
      const newGames = games.filter(game => !oldIds.includes(game.id))

      await this._sendGames(newGames)

      await this._saveGames(games)
    } catch (error) {
      console.error(error.toString())
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
   * @returns {Promise.<Game[]>}
   */
  _getOldGames () {
    console.log('get old games')

    return Game.find({})
  }

  /**
   * Load all sales games
   *
   * @returns {Promise.<Object[]>}
   */
  async _loadAllGames () {
    console.log('load all games')

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
          system: 'switch',
          sale: true
        }
      })

      total = res.filter.total
      offset += limit

      const { game } = res.games
      const limitedGames = Array.isArray(game) ? game : [game] // WTF Nintendo?
      games.push(...limitedGames)
    } while (offset < total)

    console.log('loaded sales games', games.length)
    return games
  }

  /**
   * Promise request wrapper
   *
   * @param {{ url: string, json: boolean, qs: Object }} options
   * @returns {Promise.<Object>}
   */
  _request (options) {
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

    for (let i = 0; i < chats.length; i++) {
      await this.bot.sendMessage(chats[i].id, msg, { parse_mode: 'Markdown' })
    }
  }

  /**
   * Create message and send it
   *
   * @param {Object[]} games
   */
  async _sendGames (games) {
    for (let i = 0; i < games.length; i++) {
      const game = games[i]
      const score = await this.getOpenCriticScore(game.title)
      const s = score ? `(${score})` : ``
      const msg = [
        `[${game.title}](https://www.nintendo.com/games/detail/${game.id}) ${s}`,
        `*$${game.sale_price}* $${game.eshop_price}`
      ].join('\n')

      await this._sendToAll(msg)
    }
  }

  async getOpenCriticScore (name) {
    const searchGames = await this._request({
      url: 'http://opencritic.com/api/site/search',
      json: true,
      qs: {
        criteria: name
      }
    })

    const [game] = searchGames.filter(e => e.relation === 'Game' && e.name === name)

    if (!game) return null

    const { Reviews } = await this._request({
      url: 'http://opencritic.com/api/game',
      json: true,
      qs: {
        id: game.id
      }
    })

    const reviewsWithScore = Reviews.filter(r => r.score !== null)
    const score = reviewsWithScore.reduce((sum, r) => sum + r.score, 0) / reviewsWithScore.length

    return Math.round(score)
  }
}
