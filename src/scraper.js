const fs = require('fs');
const puppeteer = require('puppeteer');
const strToStream = require('string-to-stream')
const csv = require('csv-parser');

const PERIOD = 315619200; // 10 years in seconds

const launchOptions = {
    headless: true,
    args: [
        '--no-sandbox'
        // '--proxy-server=ip:port'
    ]
};

module.exports = {
    browser: null,
    startBrowser: async function(){
        this.browser = await puppeteer.launch(launchOptions);
        return this.browser;
    },
    stopBrowser: async function(){
        return this.browser.close();
    },
    scrapData: async function(symbol){
        if(!symbol) return;
        if(!this.browser) throw 'Error: Browser not open';
        

        const symbolBefore = symbol;
        symbol = (symbol==="^BVSP")?symbol:`${symbol}.SA`;

        const url = buildURL(symbol);
        const context = await this.browser.createIncognitoBrowserContext();
        const page = await context.newPage();

        try {
            await page.goto(url);
            // page.on('console', msg => console.log(`${msg.args[0]}`));
            const promise1 = page.waitForSelector(`#quote-header-info > div + div + div > div > div > span`);
            const promise2 = page.waitForSelector(`a[download='${symbol}.csv`);
            await Promise.all([promise1, promise2]);
    
            const {csvHistPrice, currentPrice} =  await page.evaluate(async (symbol) => {
                var currentPrice = document.querySelector("#quote-header-info > div + div + div > div > div > span").innerText; // Price now
                var fileLink = document.querySelector(`a[download='${symbol}.csv']`).href; // CSV file link
                const csvHistPrice = await (await fetch(fileLink, {credentials: 'include'})).text(); // Download CSV file as string (Not necessarily includes today's price)
                return {csvHistPrice, currentPrice};
            }, symbol);
    
            return buildFromCSV(csvHistPrice, currentPrice);
        }
        catch(error){
            console.log(`Download error: ${symbol}`);
            console.log(error)
            console.log(`Trying again...`);
            console.log(``);
            return this.scrapData(symbolBefore);
        }
        finally {
            page.close().catch(() => {
                // Browser may be closed before
                // Don't care
            });
            context.close().catch(() => {
                // Browser may be closed before
                // Don't care
            });
        }
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