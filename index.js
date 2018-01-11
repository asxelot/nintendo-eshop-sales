const TelegramBot = require('node-telegram-bot-api')
const request = require('request')
const fs = require('fs')
const CronJob = requier('cron').CronJob

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true })
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

const saveGames = games => {
  const json = {
    games,
    updated: new Date().toString()
  }
  fs.writeFileSync('db.json', JSON.stringify(json))
}

const getYesterdayGames = () => {
  try {
    json = JSON.parse(fs.readFileSync('db.json'))
    return json.games
  } catch (e) {
    const games = []
    saveGames(games)
    return games
  }
}

const loadAllGames = async () => {
  const url = 'https://www.nintendo.com/json/content/get/filter/game'
  const games = []
  const limit = 50
  let offset = 0
  let total = 0

  do {
    const res = await new Promise((resolve, reject) => {
      request({
        url,
        json: true,
        qs: {
          limit,
          offset,
          sale: true
        }
      }, (err, response) => {
        if (err) reject(err)
        resolve(response.body)
      })
    })

    total = res.filter.total
    offset += limit
    games.push(...res.games.game)
  } while (offset < total)

  return games
}

const sendToAll = msg => {
  chats.forEach(chatId => bot.sendMessage(chatId, msg))
}

const sendGames = games => {
  games.forEach(game => {
    const msg = [
      `**${game.title}**`,
      `**$${game.sale_price}** \`$${game.ca_price}\``,
      `https://www.nintendo.com/games/detail/${game.id}`
    ].join('\n')

    sendToAll(msg)
  })
}

const main = async () => {
  try {
    const yesterdayGamesId = getYesterdayGames().map(g => g.id)
    const games = await loadAllGames()

    const newGames = games.filter(game => !yesterdayGamesId.includes(game.id))

    sendGames(newGames)

    saveGames(games)
  } catch (error) {
    console.error(error)
  }
}

new CronJob('0 0 * * * *', main)