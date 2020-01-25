const scraper = require("./scraper");

const symbols = ['^BVSP', 'ALPA4', 'AMAR3', 'ARZZ3'];
//, 'BBAS3', 'BBDC3', 'BBDC4', 'BOVA11', 'CAML3', 'CMIG4', 'COGN3', 'CPFE3', 'CPLE6', 'CSMG3', 'CSNA3', 'CYRE3', 'DTEX3', 'EGIE3', 'ENBR3', 'ENEV3', 'ENGI11', 'EQTL3', 'FESA4', 'FLRY3', 'GGBR4', 'GOAU3', 'GOLL4', 'GRND3', 'GUAR3', 'ITSA4', 'ITUB3', 'ITUB4', 'JHSF3', 'LREN3', 'MDIA3', 'MRVE3', 'MULT3', 'ODPV3', 'OFSA3', 'PARD3', 'QUAL3', 'RADL3', 'RENT3', 'SANB11', 'SAPR4', 'SBSP3', 'SEER3', 'SMTO3', 'TEND3', 'TRIS3', 'TRPL4', 'USIM3', 'VIVT4', 'VULC3', 'WEGE3', 'YDUQ3'];

const table = [];
var counter = 0;


update();

async function update(){
    counter = 0;
    symbols.forEach((symbol) => {
        scraper(symbol).then(histPrice => {
            histPrice.forEach(element => {
                const date = element["date"];
                if(!table[date]){
                    table[date] = [];
                }
                table[date][symbol] = [];
                table[date][symbol]["adj"] = element["adj"];
            });
            
            counter++;
            
            // last call back
            if(counter >= symbols.length){
                // TODO Gerar planilhas
            }
        });
    });
}