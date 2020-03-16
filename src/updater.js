const fs = require('fs');
const scraper = require("./scraper");

const symbols = ['^BVSP', 'ALPA4', 'AMAR3', 'ARZZ3', 'BBAS3', 'BBDC3', 'BBDC4', 'BOVA11', 'CAML3', 'CMIG4', 'COGN3', 'CPFE3', 'CPLE6', 'CSMG3', 'CSNA3', 'CYRE3', 'DIVO11', 'DTEX3', 'EGIE3', 'ENBR3', 'ENEV3', 'ENGI11', 'EQTL3', 'FESA4', 'FIND11', 'FLRY3', 'GGBR4', 'GOAU3', 'GOLL4', 'GRND3', 'GUAR3', 'ITSA4', 'ITUB3', 'ITUB4', 'IVVB11', 'JHSF3', 'LCAM3', 'LREN3', 'MDIA3', 'MOVI3', 'MRVE3', 'MULT3', 'ODPV3', 'OFSA3', 'PARD3', 'PRIO3', 'QUAL3', 'RADL3', 'RENT3', 'SANB11', 'SAPR4', 'SBSP3', 'SEER3', 'SMAL11', 'SMTO3', 'TEND3', 'TRIS3', 'TRPL4', 'UNID3', 'USIM3', 'VIVT4', 'VULC3', 'WEGE3', 'YDUQ3'];

module.exports = async function update(callback){
    const table = [];
    const priceHistoryArray = await scraper.historicalData(symbols, callback);
    priceHistoryArray.forEach(({symbol, priceHistory}) => {
        priceHistory.forEach(element => {
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
    });
    await writeCSV(sortTable(table));
    moveFiles();
}

function sortTable(table){
    const newTable = {};
    Object.keys(table).sort().forEach(key => newTable[key] = table[key]);
    return newTable;
}

async function writeCSV(table){

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
    
    names.forEach((name) => {

        // Backups previous files
        if(fs.existsSync(`${fileDir}/${name}.csv`)){
            fs.copyFileSync(`${fileDir}/${name}.csv`, `${bkpDir}/${name}.csv`);
        }
    
        try{
            // Copy temp files to downlaod directory
            fs.copyFileSync(`${tmpDir}/${name}.csv`, `${fileDir}/${name}.csv`);
        }
        catch(error){
            console.log(`Error while copying file ${tmpDir}/${name}.csv to ${fileDir}/${name}.csv`);
            console.log(error);
        }
    });
}