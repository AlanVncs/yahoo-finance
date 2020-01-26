const fs = require('fs');
const scraper = require("./scraper");

const symbols = ['^BVSP', 'ALPA4', 'AMAR3', 'ARZZ3', 'BBAS3'];
//, 'BBDC3', 'BBDC4', 'BOVA11', 'CAML3', 'CMIG4', 'COGN3', 'CPFE3', 'CPLE6', 'CSMG3', 'CSNA3', 'CYRE3', 'DTEX3', 'EGIE3', 'ENBR3', 'ENEV3', 'ENGI11', 'EQTL3', 'FESA4', 'FLRY3', 'GGBR4', 'GOAU3', 'GOLL4', 'GRND3', 'GUAR3', 'ITSA4', 'ITUB3', 'ITUB4', 'JHSF3', 'LREN3', 'MDIA3', 'MRVE3', 'MULT3', 'ODPV3', 'OFSA3', 'PARD3', 'QUAL3', 'RADL3', 'RENT3', 'SANB11', 'SAPR4', 'SBSP3', 'SEER3', 'SMTO3', 'TEND3', 'TRIS3', 'TRPL4', 'USIM3', 'VIVT4', 'VULC3', 'WEGE3', 'YDUQ3'];

var table = [];

var threads = 3;
var started = 0;
var finished = 0;

update();

async function update(){
    started = 0;
    finished = 0;
    symbols.forEach(scrapData);
}

async function scrapData(symbol){

    // Avoid run more than ${thread} threads at the same time and ignore last null call
    if(started-finished >= threads || !symbol) return;

    started++;
    console.log(`Started: ${started}/${symbols.length}`);
    scraper(symbol).then((histPrice) => {
        histPrice.forEach(element => {
            const date = element["date"];
            if(!table[date]){
                table[date] = [];
            }
            table[date][symbol] = [];
            table[date][symbol]["adj"] = (element['adj'] == 'null')?'FALSO':element['adj'];
        });
        
        finished++;
        console.log(`Finished: ${finished}/${symbols.length}`);

        scrapData(symbols[started]);
        
        if(finished == symbols.length){ // last symbol
            sortTable();
            writeCSV();
            return;
        }
    });
}

function sortTable(){
    newTable = {};
    Object.keys(table)
    .sort((date1, date2) => (date1<date2)?1:-1) // Reverse ordering
    .forEach(key => newTable[key] = table[key]);
    table = newTable;
}

function writeCSV(){
    const tmpFilesDir = './tmpFiles';
    if(!fs.existsSync(tmpFilesDir)){
        fs.mkdirSync(tmpFilesDir);
    }
    const adjStream = fs.createWriteStream(`${tmpFilesDir}/adj.csv`);

    // Headers
    adjStream.write('Data');
    symbols.forEach(symbol => {
        adjStream.write(`;${symbol}`);
    });
    adjStream.write('\n');


    // Values
    for(date in table){
        adjStream.write(date);
        symbols.forEach(symbol => {
            value = (table[date][symbol])?table[date][symbol]['adj']:'FALSO';
            adjStream.write(`;${value}`);
        });
        adjStream.write('\n');
    }

    adjStream.close();
}

function moveFiles(){
    
}