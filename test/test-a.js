const puppeteer = require('puppeteer');
const strToStream = require('string-to-stream')
const csv = require('csv-parser');

const req_url = "https://finance.yahoo.com/quote/ITUB4.SA/history?period1=977356800&period2=1579737600&interval=1d&filter=history&frequency=1d";
 
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(req_url, {waitUntil: 'load'});

    var data = await page.evaluate(async () => {
        var currentPrice = document.querySelector("#quote-header-info > div + div + div > div > div > span").innerText;
        var fileLink = document.querySelector("a[download='ITUB4.SA.csv']").href;
        const histPrice = await (await fetch(fileLink, {credentials: 'include'})).text();
        return {histPrice, currentPrice};
    });

    await browser.close();

    // console.log(data);

    const results = [];
 
    strToStream(data.histPrice)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        console.log(results);
    });

})();