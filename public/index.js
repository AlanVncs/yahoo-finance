$(document).ready(() => {

    var btn = $("div.btn-update");
    var status = $("div.status");

    getStatus();

    btn.click(function(){
        if(!btn.hasClass("btn-disabled")){
            btn.addClass("btn-disabled");
            btn.text("Atualizando...");
            status.text("0.00%");
            $.ajax({url: "/update"});
        }
    });

    setInterval(getStatus, 1000);

    function getStatus(){
        $.ajax({
            url: "/status",
            success: (data) => {
                setBtn(data.updating, data.taxa, data.lastUpdate);
            }
        });
    }

    function setBtn(updating, taxa, lastUpdate){
        if(updating){
            btn.addClass("btn-disabled");
            btn.text("Atualizando...");
            status.text((taxa*100).toFixed(2) + "%");
        }
        else{
            btn.removeClass("btn-disabled");
            btn.text("Atualizar");
            status.text("Última atualização: " + lastUpdate);
        }
    }

});