const fs = require('fs');
const scraper = require("./scraper");

const symbols = ['^BVSP', 'ALPA4', 'AMAR3', 'ARZZ3', 'BBAS3', 'BBDC3', 'BBDC4', 'BOVA11', 'CAML3', 'CMIG4', 'COGN3', 'CPFE3', 'CPLE6', 'CSMG3', 'CSNA3', 'CYRE3', 'DTEX3', 'EGIE3', 'ENBR3', 'ENEV3', 'ENGI11', 'EQTL3', 'FESA4', 'FLRY3', 'GGBR4', 'GOAU3', 'GOLL4', 'GRND3', 'GUAR3', 'ITSA4', 'ITUB3', 'ITUB4', 'JHSF3', 'LREN3', 'MDIA3', 'MRVE3', 'MULT3', 'ODPV3', 'OFSA3', 'PARD3', 'QUAL3', 'RADL3', 'RENT3', 'SANB11', 'SAPR4', 'SBSP3', 'SEER3', 'SMTO3', 'TEND3', 'TRIS3', 'TRPL4', 'USIM3', 'VIVT4', 'VULC3', 'WEGE3', 'YDUQ3'];

var table = [];

const threads = 10; // Ideal for a home PC
var started = 0;
var finished = 0;

update();

async function update(){
    started = 0;
    finished = 0;
    symbols.forEach(scrapData);
}

async function scrapData(symbol){

    // Avoid run more than ${thread} cromium instances at the same time and ignore last null call
    if(started-finished >= threads || !symbol) return;

    started++;
    console.log(`Started: ${started}/${symbols.length}`);
    scraper(symbol).then(async (histPrice) => {
        histPrice.forEach(element => {
            const date = element["date"];
            if(!table[date]){
                table[date] = [];
            }
            table[date][symbol] = [];
            table[date][symbol]["open"] = (element['open'] == 'null')?'FALSO':element['open'];
            table[date][symbol]["high"] = (element['high'] == 'null')?'FALSO':element['high'];
            table[date][symbol]["low"] = (element['low'] == 'null')?'FALSO':element['low'];
            table[date][symbol]["close"] = (element['close'] == 'null')?'FALSO':element['close'];
            table[date][symbol]["adj"] = (element['adj'] == 'null')?'FALSO':element['adj'];
            table[date][symbol]["volume"] = (element['volume'] == 'null')?'FALSO':element['volume'];
        });
        
        finished++;
        console.log(`Finished: ${finished}/${symbols.length}`);

        // When finished, start another one
        scrapData(symbols[started]);
        
        // Last one
        if(finished == symbols.length){
            sortTable();
            await writeCSV();
            moveFiles();
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

async function writeCSV(){

    const tmpFilesDir = './tmpFiles';

    const streams  = {
        open: fs.createWriteStream(`${tmpFilesDir}/open.csv`),
        high: fs.createWriteStream(`${tmpFilesDir}/high.csv`),
        low: fs.createWriteStream(`${tmpFilesDir}/low.csv`),
        close: fs.createWriteStream(`${tmpFilesDir}/close.csv`),
        adj: fs.createWriteStream(`${tmpFilesDir}/adj.csv`),
        volume: fs.createWriteStream(`${tmpFilesDir}/volume.csv`),
        write: writeStreams,
        end: endStreams
    };

    // Write headers
    streams.write('Data');
    symbols.forEach(symbol => {
        streams.write(`;${symbol}`);
    });
    streams.write('\n');


    // Write date + values
    for(date in table){
        streams.write(date);
        symbols.forEach(symbol => {
            streams.write(';');
            streams.write(table[date][symbol], true);
        });
        streams.write('\n');
    }

    // Promise resolved when all stream are properly writen and closed
    return streams.end();
}

function writeStreams(content, flag){
    const names = ['open', 'high', 'low', 'close', 'adj', 'volume'];
    if(flag){
        names.forEach((name)=>{
            this[name].write(content && content[name] || 'FALSO');
        });
    }
    else{
        names.forEach((name)=>{
            this[name].write(content);
        });
    }
}

async function endStreams(){
    // this: [key => Stream]
    const names = ['open', 'high', 'low', 'close', 'adj', 'volume'];
    const promises = [];
    names.forEach((name) => {
        promises.push(endStream(this[name]));
    });
    return Promise.all(promises);
}

async function endStream(stream){
    return new Promise((resolve, reject) => {
        stream.end(resolve);
    });
}

function moveFiles(){
    const fileDir = './files';
    const bkpDir = `${fileDir}/backups`;
    const tmpDir = './tmpFiles';
    const names = ['open', 'high', 'low', 'close', 'adj', 'volume'];
    // const adj = 'adj.csv'
    
    // Backup previous file
    names.forEach((name) => {
        if(fs.existsSync(`${fileDir}/${name}.csv`)){
            fs.copyFileSync(`${fileDir}/${name}.csv`, `${bkpDir}/${name}.csv`);
        }
    
        try{
            fs.copyFileSync(`${tmpDir}/${name}.csv`, `${fileDir}/${name}.csv`);
        }
        catch(error){
            console.log(`Error while copying file ${tmpDir}/${name}.csv to ${fileDir}/${name}.csv`);
            console.log(error);
        }
    });
}