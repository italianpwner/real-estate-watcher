import PropertiesReader from 'properties-reader'
import { Telegraf } from 'telegraf'
import Fetcher from './fetch.js'
import cheerio from 'cheerio'

var props = PropertiesReader('config.properties')

const sleep = ms => new Promise(resolve =>
	setTimeout(resolve, ms)
)

const now = () => {
	const time = new Date()
	return '['+time.getHours()+':'+
			time.getMinutes()+':'+
			time.getSeconds()+']'
}

const token = props.get('token')
const bot = new Telegraf(token)
const channel = props.get('channel')

let city = props.get('citta')
if(props.get('provincia') === 'y')
	city += '-provincia'

const urlImmobiliare = "https://www.immobiliare.it/"

let lastPublished = {
	"immobiliare" : {
		"stanze": undefined,
		"appartamenti" : undefined
	}
}

const fetch = new Fetcher('utf-8')

const scanImmobiliare = async (type) => {
	const url = urlImmobiliare + 'affitto-' + type + '/'
				+ city + '/?criterio=dataModifica&ordine=desc'
	
	const $ = cheerio.load(await fetch.html(url))
	const html = $('ul')[2]
	let n = 0
	const id_1st = html.children[n].attribs.id
	
	const last = lastPublished.immobiliare[type]
	if(last === undefined) {
		lastPublished.immobiliare[type] = id_1st
	} else if(last !== id_1st) {
		let next_id = id_1st
		while(last !== next_id) {
			if(next_id.startsWith('link_ad_')) {
				let adUrl = urlImmobiliare + 'annunci/'
							+ next_id.split('_')[2]
				bot.telegram.sendMessage(channel, adUrl)
			}
			n++;
			next_id = html.children[n].attribs.id
			await sleep(1500)
		}
		lastPublished.immobiliare[type] = id_1st
	}
}

const ms = props.get('checking_delay') * 60000
while(true) {
	await scanImmobiliare('appartamenti')
	await scanImmobiliare('stanze')
	await sleep(ms)
}
