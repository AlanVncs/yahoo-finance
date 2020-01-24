const puppeteer = require('puppeteer');
const strToStream = require('string-to-stream')
const csv = require('csv-parser');

const table = [];
var cnt = 0;

// 'ALPA4', 'AMAR3', 'ARZZ3', 'BBAS3', 'BBDC3', 'BBDC4'
(async () => {
    buildTable("ALPA4");
    buildTable("AMAR3");
    buildTable("ARZZ3");
    buildTable("BBAS3");
    buildTable("BBDC3");
    buildTable("BOVA11");
    setInterval(function(){
        if(cnt >= 6){
            console.log(table);
            clearInterval(this);
        }
    }, 1000);
})();



async function buildTable(symbol){
    return new Promise(async (resolve, reject) => {
        const data = await scrapData(symbol);
        const hist = [];
    
        strToStream(data.histPrice).pipe(csv())
        .on('data', (element) => hist.push(element))
        .on('end', function() {
            hist.forEach(element => {
                const key = element["Date"];
                if(!table[key]){
                    table[key] = [];
                }
                table[key][symbol] = [];
                table[key][symbol]["adj"] = element["Adj Close"];
            });
            cnt++;
            resolve();
        });
    });
}

async function scrapData(symbol){
    const url = buildURL(symbol);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // page.on('console', msg => console.log(`chrome[${msg.text()}]`));
    await page.goto(url, {waitUntil: 'load'});
    try{
        const data = await page.evaluate(async (symbol) => {
            var currentPrice = document.querySelector("#quote-header-info > div + div + div > div > div > span").innerText;
            var fileLink = document.querySelector(`a[download='${symbol}.SA.csv']`).href;
            const histPrice = await (await fetch(fileLink, {credentials: 'include'})).text();
            return {histPrice, currentPrice};
        }, symbol);
        return data;
    }
    catch(err){
        console.log(`Erro na consulta do ativo ${symbol}: ${err.message}`);
        console.log(`Tentando novamente...`);
        console.log(``);
        return scrapData(symbol); // retry
    }
    finally{
        browser.close();
    }
}

function buildURL(symbol){
    const period2 = Math.floor(Date.now()/1000) - 30;
    const period1 = period2 - 315619200;
    return `https://finance.yahoo.com/quote/${symbol}.SA/history?period1=${period1}&period2=${period2}&interval=1d&filter=history&frequency=1d`;
}