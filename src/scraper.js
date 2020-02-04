const {Cluster} = require('puppeteer-cluster');
const strToStream = require('string-to-stream');
const csv = require('csv-parser');
const logToFile = require('log-to-file');

const PERIOD_OFFSET = 10; // years
const SYMBOL_SUFFIX = 'SA'

const clusterOptions = {
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 10,
    monitor: true,
    puppeteerOptions: {
        headless: true,
        args: [
            '--no-sandbox',
            // '--proxy-server=ip:port'
        ]
    }
}

module.exports = {
    counter: 0,
    historicalData: async (symbols, callback) => {
        this.counter = 0;
        const reference = this;
        const cluster = await Cluster.launch(clusterOptions);

        // What to do
        await cluster.task(async ({page, data: symbol}) => {
            const url = buildURL(symbol);
            await page.goto(url);
            await page.waitForSelector(`a[download='${parseSymbol(symbol)}.csv`);
            
            const priceHistoryCSV =  await page.evaluate(async (symbol) => {
                const csvLink = await document.querySelector(`a[download='${symbol}.csv']`).href // CSV file link
                return (await fetch(csvLink, {credentials: 'include'})).text();
            }, parseSymbol(symbol));
            reference.counter++;
            callback(reference.counter/symbols.length);
            return parseCSV(priceHistoryCSV);
        });


        const priceHistoryArray = [];
        symbols.forEach(async symbol => {
            priceHistoryArray.push(await execAlways(cluster, symbol, 5));
        });

        await cluster.idle();
        await cluster.close();

        return priceHistoryArray;
    }  
};

async function execAlways(cluster, symbol, max=5){
    return new Promise((resolve, reject) => {
        if(max == 0){
            log(`Número máximo de execuções alcançado`);
            log(`Abortando a operação de ID: ${symbol}`);
            log('------------------------------------');
            resolve({symbol, priceHistory: []});
        }
        else{
            cluster.execute(symbol)
            .then(priceHistory => {
                resolve({symbol, priceHistory});
            })
            .catch((reason)=>{
                log(`ID: ${symbol}`);
                log(reason);
                log(`Tentativas restantes: ${--max}`);
                log(`--------`);
                return execAlways(cluster, symbol, max);
            });
        }
    });
}

function buildURL(symbol){

    const date = new Date(); // Now

    const end = Math.floor(date.getTime()/1000) - 30;  // -30 seconds to be sure it isn't future ;D

    date.setUTCFullYear(date.getUTCFullYear() - PERIOD_OFFSET); // ${PERIOD_OFFSET} years ago
    date.setUTCMonth(0); // jan
    date.setUTCDate(1); // 01 jan

    const start = Math.floor(date.getTime()/1000);

    return encodeURI(`https://finance.yahoo.com/quote/${parseSymbol(symbol)}/history?period1=${start}&period2=${end}&interval=1d&filter=history&frequency=1d`);
}

function parseSymbol(symbol){
    const regex = /^\^/; // Starts with ^ (Means it is an index)
    if(!symbol.match(regex)) return `${symbol}.${SYMBOL_SUFFIX}`;
    return symbol;
}

function parseCSV(priceHistoryCSV){
    return new Promise(resolve => {
        const priceHistory = [];
        strToStream(priceHistoryCSV).pipe(csv(['date', 'open', 'high', 'low', 'close', 'adj', 'volume']))
        .on('data', line => priceHistory.push(line))
        .on('end', () => {
            priceHistory.shift();
            resolve(priceHistory);
        });
    });
}

function log(text){
    logToFile(text, 'logs/scraper.log');
}