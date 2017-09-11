chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        var time = request.time;
        var currency = request.currency;
        
        //TODO: determine if necessary to store 
         var apiBase = "https://graphs.coinmarketcap.com/currencies/",
            timeIncrement = 7200000; //looks back for about two hours before the given date, and takes the latest time.  CMC's graph backend appears to be about an hour behind the current time.
    
        //will always find the nearest price on or before the given time
        var timeEnd = time;
        var timeStart = timeEnd - timeIncrement;
        var url = apiBase + currency + "/" + timeStart + "/" + timeEnd;
        
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", url);
        rawFile.onload = function() {
            if (rawFile.status == 200) {
                console.log(rawFile.response);
                sendResponse(rawFile.response);
            }
            else{
                sendResponse("Error: " + rawFile.status);
            }
        }
    
        rawFile.onerror = function(){
            sendResponse("Error: Network Error");
        }
        rawFile.send(null);
        return true;
    });

var contextMenuTitle = "Price on date: '%s'";

function contextMenuCheck(info, tab){
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tab.id, {}, function(response){});
    });
}

chrome.contextMenus.create({title:contextMenuTitle, 
                                type:"normal", 
                                onclick:contextMenuCheck,
                                contexts:["selection"]},
                                function(){}
                                );