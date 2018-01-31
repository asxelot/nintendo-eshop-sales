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
      const cachedGames = await this._getCachedGames()
      const cachedIds = cachedGames.map(g => g.id)
      const salesGames = await this._loadGames('sale')
      const newGames = await this._loadGames('new')
      const allGames = await this._getPrices([...salesGames, ...newGames])
      const filteredGames = allGames.filter(game => !cachedIds.includes(game.id))

      await this._sendGames(filteredGames)
      await this._saveGames(allGames)
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
  _getCachedGames () {
    console.log('get cached games')

    return Game.find({})
  }

  /**
   * load games by category
   *
   * @param {string} category - new or sale
   * @returns {Promise.<Object[]>}
   */
  async _loadGames (category) {
    const url = 'https://www.nintendo.com/json/content/get/filter/game'
    const games = []
    const limit = 50
    let offset = 0
    let total = 0
    const qs = {
      limit,
      offset,
      system: 'switch'
    }

    switch (category) {
      case 'sale':
        qs.sale = true
        break
      case 'new':
        qs.availability = 'new'
        break
    }

    do {
      const res = await this._request({ url, qs, json: true })

      total = res.filter.total
      offset += limit

      const { game } = res.games
      Array.isArray(game) ? games.push(...game) : games.push(game) // WTF Nintendo?
    } while (offset < total)

    console.log(`loaded ${category} games`, games.length)

    games.forEach(game => { game.category = category })

    return games
  }

  /**
   * get prices
   *
   * @param {Object[]} games
   */
  async _getPrices (games) {
    const res = await this._request({
      url: 'https://api.ec.nintendo.com/v1/price',
      json: true,
      qs: {
        country: 'US',
        lang: 'en',
        ids: games.map(g => g.nsuid).join(',')
      }
    })

    return games.map(game => {
      const [price] = res.prices.filter(p => p.title_id === game.nsuid)

      return {
        ...game,
        eshop_price: price.regular_price.raw_value,
        sale_price: price.discount_price && price.discount_price.raw_value
      }
    })
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
      const msg = [
        `*${game.category.toUpperCase()}*`,
        `[${game.title}](https://www.nintendo.com/games/detail/${game.id})${score}`,
        game.sale_price ? `*$${game.sale_price}* $${game.eshop_price}` : `*$${game.eshop_price}*`
      ].join('\n')

      await this._sendToAll(msg)
    }
  }

  /**
   * get game score from opencritic.com
   *
   * @param {string} name
   * @returns {string}
   */
  async getOpenCriticScore (name) {
    const searchGames = await this._request({
      url: 'http://opencritic.com/api/site/search',
      json: true,
      qs: {
        criteria: name
      }
    })

    const [game] = searchGames.filter(e => e.relation === 'Game' && e.name === name)

    if (!game) return ``

    const { Reviews } = await this._request({
      url: 'http://opencritic.com/api/game',
      json: true,
      qs: {
        id: game.id
      }
    })

    const reviewsWithScore = Reviews.filter(r => r.score !== null)
    const score = Math.round(reviewsWithScore.reduce((sum, r) => sum + r.score, 0) / reviewsWithScore.length)

    return score ? ` [(${score})](http://opencritic.com/game/${game.id}/)` : ``
  }
}
