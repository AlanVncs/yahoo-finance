const puppeteer = require('puppeteer');
const strToStream = require('string-to-stream')
const csv = require('csv-parser');


var table = [];

(async () => {
    await buildTable("ITUB4");    
    await console.log(table);
})();



async function buildTable(symbol){
    const data = await scrapData(symbol);
    const hist = [];
 
    strToStream(data.histPrice)
    .pipe(csv())
    .on('data', (element) => hist.push(element))
    .on('end', () => {
        hist.forEach(element => {
            const key = element["Date"];
            // console.log(table[key]);
            if(!table[key]){
                table[key] = [];
            }
            // console.log(table[key]);
            table[key][symbol] = [];
            table[key][symbol]["adj"] = element["Adj Close"];
            // console.log(table[key][symbol]["adj"]);
        });
        console.log(table);
    });
}

async function scrapData(symbol){
    const url = buildURL(symbol);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // page.on('console', msg => console.log(`chrome[${msg.text()}]`));
    await page.goto(url, {waitUntil: 'load'});
    const data = await page.evaluate(async (symbol) => {
        var currentPrice = document.querySelector("#quote-header-info > div + div + div > div > div > span").innerText;
        var fileLink = document.querySelector(`a[download='${symbol}.SA.csv']`).href;
        const histPrice = await (await fetch(fileLink, {credentials: 'include'})).text();
        return {histPrice, currentPrice};
    }, symbol);
    await browser.close();
    return data;
}

function buildURL(symbol){
    const period2 = Math.floor(Date.now()/1000) - 30;
    const period1 = period2 - 315619200;
    return `https://finance.yahoo.com/quote/${symbol}.SA/history?period1=${period1}&period2=${period2}&interval=1d&filter=history&frequency=1d`;
}