const fs = require('fs');
const puppeteer = require('puppeteer');
const strToStream = require('string-to-stream')
const csv = require('csv-parser');

const PERIOD = 315619200; // 10 years in seconds

module.exports = async function scrapData(symbol){

    if(!symbol) return null;

    const launchOptions = {
        headless: true,
        args: ['--no-sandbox']
        // args: ['--proxy-server=ip:port']
    };

    var browser = await puppeteer.launch(launchOptions);
    symbol = (symbol==="^BVSP")?symbol:`${symbol}.SA`;
    const url = buildURL(symbol);
    const page = (await browser.pages())[0];

    try {
        await page.goto(url);
        await page.waitForSelector(`#quote-header-info > div + div + div > div > div > span`);
        await page.waitForSelector(`a[download='${symbol}.csv`);

        const {csvHistPrice, currentPrice} =  await page.evaluate(async (symbol) => {
            var currentPrice = document.querySelector("#quote-header-info > div + div + div > div > div > span").innerText; // Price now
            var fileLink = document.querySelector(`a[download='${symbol}.csv']`).href; // CSV file link
            const csvHistPrice = await (await fetch(fileLink, {credentials: 'include'})).text(); // Download CSV file as string (Not necessarily includes today's price)
            return {csvHistPrice, currentPrice};
        }, symbol);

        return buildFromCSV(csvHistPrice, currentPrice);
    }
    catch(error){
        logInfo(`Download error: ${symbol}`);
        logInfo(`Message: ${error.message}`);
        logInfo(`Trying again...`)
        logInfo(``);
        return scrapData(symbol);
    }
    finally {
        browser.close();
    }
}

async function buildFromCSV(csvHistPrice, currentPrice){
    return new Promise((resolve, reject) => {
        const histPrice = [];
        strToStream(csvHistPrice).pipe(csv(['date', 'open', 'high', 'low', 'close', 'adj', 'volume']))
        .on('data', (element) => histPrice.push(element))
        .on('end', () => {
            histPrice.shift();
            histPrice.push({date: today(), adj: currentPrice});
            resolve(histPrice);
        });
    });
}

function buildURL(symbol){
    const end = Math.floor(Date.now()/1000) - 30; // -30 seconds to be sure it isn't future ;D
    const start = end - PERIOD;
    return encodeURI(`https://finance.yahoo.com/quote/${symbol}/history?period1=${start}&period2=${end}&interval=1d&filter=history&frequency=1d`);
}

function today(){

    const offset = -3; // Brazil

    const now = new Date();
    now.setHours(now.getHours() + offset);

    var year = now.getUTCFullYear();

    var month = now.getUTCMonth() + 1;
    month = (month < 10)?`0${month}`:month;

    var date = now.getUTCDate();
    date = (date<10)?`0${date}`:date;

    return `${year}-${month}-${date}`;
}

function logInfo(info){
    console.log(info);
    fs.appendFileSync('./logs/scraper.log', `${info}\n`);
}