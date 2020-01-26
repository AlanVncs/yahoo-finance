const puppeteer = require('puppeteer');

(async () => {
    const url = 'https://www.meuip.com.br/';
    const browser = await puppeteer.launch({headless: false, args: ['--proxy-server=187.4.67.26:8080']});
    const page = await browser.newPage();
    await page.goto(url);
    // await page.waitForSelector(`#quote-header-info > div + div + div > div > div > span`);
    // await page.waitForSelector(`a[download='${symbol}.csv`);
})();