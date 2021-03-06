const updater = require('./updater');
const express = require('express');
const fs = require('fs');
const app = express();

const PORT = '80';

app.use(express.static('public'));

app.use(/\/file\/(\w+\.csv)/, function(req, res, next){
    res.header("Content-Type", "text/plain");
    const file = `files/${req.params[0]}`;
    console.log(`Arquivo ${file} solicitado`);
    if(fs.existsSync(file)){
        fs.createReadStream(file).pipe(res);
    }
    else{
        res.send(`Arquivo ${file} não encontrado`);
    }
});

app.use(/\/backup\/(\w+\.csv)/, function(req, res, next){
    res.header("Content-Type", "text/plain");
    const file = `files/backups/${req.params[0]}`;
    if(fs.existsSync(file)){
        fs.createReadStream(file).pipe(res);
    }
    else{
        res.send(`Arquivo ${file} não encontrado`);
    }
});

var updating = false;
var taxa = 0;

app.get('/update', function(req, res){
    if(!updating){
        updating = true;
        taxa = 0;
        updater(function(status){
            taxa = status;
            if(taxa >= 1){
                updating = false;
                taxa = 0;
                fs.writeFileSync("lastUpdate", getDate());
            }
        });
    }
    res.redirect('/status');
});

app.get('/status', function(req, res){
    try{
        var lastUpdate = fs.readFileSync("lastUpdate");
    }
    catch(e){
        var lastUpdate = "Nunca"
    }
    res.json({
        updating: updating,
        taxa: taxa,
        lastUpdate: lastUpdate.toString()
    });
});

function getDate(){

    const offset = -3; // Brazil

    const now = new Date();
    now.setHours(now.getHours() + offset);

    var year = now.getUTCFullYear();

    var month = now.getUTCMonth() + 1;
    month = (month < 10)?`0${month}`:month;

    var date = now.getUTCDate();
    date = (date<10)?`0${date}`:date;

    var hours = now.getUTCHours();
    hours = (hours < 10)?`0${hours}`:hours;

    var minutes = now.getUTCMinutes();
    minutes = (minutes < 10)?`0${minutes}`:minutes;

    return `${hours}:${minutes} ${date}/${month}/${year}`;
}

app.listen(PORT);