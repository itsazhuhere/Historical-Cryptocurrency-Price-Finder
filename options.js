function save(){
    var enabled = document.getElementById("enable").checked;
    var currency = documeng.getElementById("defaultcurrency").innerHTML;
    chrome.storage.sync.set({
        enable: enabled,
        currency: currency
    }, function(){
        //For notifying the user of the saved status
    });
}

function restore(){
    chrome.storage.sync.get({
        //defaults
        enable: true,
        currency: "None"
    }, function(items){
        document.getElementById("enable").checked = items.enable;
        document.getElementById("defaultcurrency").innerHTML = items.currency;
    });
    
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById("save").addEventListener("click", save);