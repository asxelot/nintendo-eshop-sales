const request = require('request')

class Eshop {
  async run () {
    try {
      const yesterdayGamesId = this._getYesterdayGames().map(g => g.id)
      const games = await this._loadAllGames()

      const newGames = games.filter(game => !yesterdayGamesId.includes(game.id))

      this._sendGames(newGames)

      this._saveGames(games)
    } catch (error) {
      console.error(error)
    }
  }

  _saveGames (games) {
    const json = {
      games,
      updated: new Date().toString()
    }
    fs.writeFileSync('db.json', JSON.stringify(json))
  }

  _getYesterdayGames () {
    try {
      json = JSON.parse(fs.readFileSync('db.json'))
      return json.games
    } catch (e) {
      const games = []
      saveGames(games)
      return games
    }
  }

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
      games.push(...res.games.game)
    } while (offset < total)

    return games
  }

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

  _sendToAll (msg) {
    chats.forEach(chatId => bot.sendMessage(chatId, msg))
  }

  _sendGames (games) {
    games.forEach(game => {
      const msg = [
        `**${game.title}**`,
        `**$${game.sale_price}** \`$${game.ca_price}\``,
        `https://www.nintendo.com/games/detail/${game.id}`
      ].join('\n')

      this._sendToAll(msg)
    })
  }
}

module.exports = new Eshop()