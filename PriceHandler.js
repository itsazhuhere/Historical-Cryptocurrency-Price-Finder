var ctrlDown = false;
var ctrlCode = 17;
var defaultCurrency = "ethereum";
var currencyRegex = /(\d+)(\.\d+)?/;

var nameTitle = "Name: ",
    symbolTitle = "Symbol: ",
    currPriceTitle = "Current Price: ",
    histDateTitle = "Date: ",
    histPriceTitle = "Price: ",
        
    nameDefault = "Name N/A",
    symbolDefault = "Symbol N/A",
    currPriceDefault = "$0.00",
    histDateDefault = "Date N/A",
    histPriceDefault = "$0.00";

var boxCount = 0;
var maxResults = 6;
var resultHeight = 0;

//var event = new CustomEvent("changesuccess", )
//move this to local storage instead of loading it on every page

/*
function reloadData(){
    var apiUrl = "https://files.coinmarketcap.com/generated/search/quick_search.json";
    retrieveData(apiUrl, null, onDataFetched);
}


function TwoWayMap(map){
   this.map = map;
   this.reverseMap = {};
   for(var key in map){
      var value = map[key];
      this.reverseMap[value] = key;   
   }
}
TwoWayMap.prototype.get = function(key){ 
    return this.map[key]; 
};
TwoWayMap.prototype.revGet = function(key){ 
    return this.reverseMap[key];
};
TwoWayMap.prototype.add = function(key, value){
    this.map[key] = value;
    this.reverseMap[value] = key;
};

function Crypto(name, symbol, slug){
    this.name = name;
    this.symbol = symbol;
    this.slug = slug;
}

var nameSet = new TwoWayMap({});
//reloadData();


                 
function onDataFetched(responseText, target){
    //#########TODO: modify to work with https://files.coinmarketcap.com/generated/search/quick_search.json data
    //responseText should be a list of dictionaries with coin data contained within them
    var symbolsList = JSON.parse(responseText);
    if(symbolsList.error){
        console.log("CMC API error");
        return;
    }
    
    for(var i = 0; i< symbolsList.length; i++){
        var name = symbolsList[i]["name"].toLowerCase();
        var symbol = symbolsList[i]["symbol"].toLowerCase();
        var slug = "";
        
        var crypto = new Crypto(name, symbol, slug);
        nameSet.add(name, symbol);
    }
    
}
*/

function priceQuery(currency, time){
    return new Promise(function(resolve, reject){
        chrome.runtime.sendMessage({"currency": currency, "time": time}, function(result){
            if(result.substr(0,6) != "Error:"){
                console.log(result);
                resolve(result);
            }
            else{
                reject(result);
            }
        });
    }); 
}


function retrieveData(url, target, callback) {
    
    
    var rawFile = new XMLHttpRequest();
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState == 4) {
            callback(rawFile.responseText, target);
        }
    }
    rawFile.open("GET", url, false);
    rawFile.send(null);
}


function handleQueryResponse(responseText, target){
    /*response in this context will be a string rep of a json object with
    three keys, each containing a list of data pairs, 
    
    [{time since epoch in milliseconds}, {whatever data}]
    
    */
    
    var section = "price_usd",
        responseJSON = JSON.parse(responseText);
    var dataPairs = responseJSON[section];
    var pairsLength = dataPairs.length;
    var lastPair = dataPairs[pairsLength - 1];
    
    var dateString = toDate(lastPair[0]);
    var price = "$" + lastPair[1];
    
    var event = new Event("retrieved");
    event.detail = {"date":dateString, "price": price};
    
    target.dispatchEvent(event);
    //$("body").trigger(event);
    
}

function toDate(milliseconds){
    var date = new Date(milliseconds);
    return date.toLocaleString();
}



function toMilliseconds(date){
    var ms = new Date(date);
    var now = new Date();
    //prevents error for times that havent happened yet
    return Math.min(ms.getTime(), now.getTime());
}
currentSelection = null;

function checkHighlighted(event){
    if(!ctrlDown){
        return;
    }
    var selection = "";
    if (window.getSelection) {
        selection = window.getSelection();
    } 
    /*
    else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
    */
    
    if(!selection){
        //clear the old selection
        if(currentSelection !== null){
            
        }
        return;
    }
    /*
    var amount = determineAmount(selection.toString())
    
    if(amount != ""){
        var currentBox = initInfoBox(selection);
        var currency = determineCurrency(selection);
        var date = determineDate(selection);
        
        
        
    }
    */
    
    var date = determineDate(selection.toString());
    
    if(date != ""){
        var infoBox = initInfoBox(selection);
        setDate(infoBox, date);
    }
    
    selection.empty();
    ctrlDown = false;
    
}

function determineCurrency(selection){
    
}

var numbersDateRE = /\d{1,2}[./-\s]+\d{1,2}[./-\s]+\d{2,4}/;
var alphaDateRe = /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},\s+\d{4}/i;
var timeRE = /\d{1,2}:\d{2}(:\d{2})?\s*([ap]m)?\s*(\w{3})?([+-]\d{4})?/i;

function determineDate(selection){
    var dateStr = "";
    
    var dates = numbersDateRE.exec(selection);
    if(dates === null){
        dates = alphaDateRe.exec(selection);
        if(dates === null){
            //selection has no properly formatted dates to use
            return dateStr;
        }
    }
    
    dateStr = dates[0];

    
    var times = timeRE.exec(selection);
    if(times === null){
        //no time included, allow it to default
        //possibly use CMC's day by day price in the future
    }
    else{
        dateStr = dateStr + " " + times[0];
    }
    
    return dateStr;
}

function setDate(infoBox, date){
    // infoBox -> third tr -> second td -> first child
    var dateEntry = infoBox.childNodes[DATE].childNodes[1].childNodes[0];
    
    dateEntry.innerHTML = date;
    
    var event = new Event("blur");
    dateEntry.dispatchEvent(event);
}

function validateDate(event){
    var date = Date.parse(event.target.innerHTML);
    
    if(isNaN(date) == false){
        event.target.setAttribute("isvalid", "true");
        triggerStateChange(event.target);
    }
    else{
        event.target.innerHTML = histDateDefault;
        event.target.setAttribute("isvalid", "false");
    }
}

var imageLink = chrome.extension.getURL("close.png");

function initInfoBox(selection){
        
    currentSelection = selection;
    var range = currentSelection.getRangeAt(0);
        
    var surroundNode = document.createElement("span");
    surroundNode.setAttribute("class", "hover-text");
    
    range.surroundContents(surroundNode);
    
    //create info box html content
    var hoverBox = document.createElement("div");
    hoverBox.setAttribute("class", "hover-box");
    
    //all info will be contained within a table for formatting
    var infoTable = document.createElement("table");
    infoTable.addEventListener("validinput", validateTable, false);
    
    var closeButtonRow = document.createElement("tr");
    var closeButtonCell = document.createElement("td");
    var closeButton = document.createElement("a");
    
    var closeImage = document.createElement("img");
    closeImage.setAttribute("src", imageLink);
    closeImage.setAttribute("alt", "X");
    closeImage.setAttribute("class", "close-button");
    
    closeButton.appendChild(closeImage);
    $(closeButton).click(function(event){
        //the span element that contains the close box event is 5 levels up; checking for span just to   be sure.
        $(this).parent().parent().parent().parent().parent("span").trigger("close-hover");
    });
    
    closeButtonCell.appendChild(closeButton);
    closeButtonRow.appendChild(closeButtonCell);
    
    
    var nameRow = createRow(nameTitle, nameDefault, "input", "false"),
        //symbolRow = createRow(symbolTitle, symbolDefault, "false", validateSymbol),
        //currPriceRow = createRow(currPriceTitle, currPriceDefault),
        histDateRow = createRow(histDateTitle, histDateDefault, "span", "false"),
        histPriceRow = createRow(histPriceTitle, histPriceDefault, "span", "true");
    
    var nameField = getDataField(nameRow);
    var nameFieldId = "crypto-search-entry" + boxCount;
    
    nameField.setAttribute("id", nameFieldId);
    
    boxCount++;
    
    var dateField = getDataField(histDateRow);
    dateField.addEventListener("blur", validateDate, false);
    dateField.setAttribute("contenteditable", "true");
    
    infoTable.appendChild(closeButtonRow);
    infoTable.appendChild(nameRow);
    //infoTable.appendChild(symbolRow);
    //infoTable.appendChild(currPriceRow);
    infoTable.appendChild(histDateRow);
    infoTable.appendChild(histPriceRow);
    
    hoverBox.appendChild(infoTable);
    
    surroundNode.appendChild(hoverBox);
    $(surroundNode).hover(function(e){
        
        $(this).find(".hover-box").stop(true, true).animate({opacity: "100"});
        adjustOrientation(400, this, $(this).find(".hover-box"));
        $(this).find(".hover-box").show(0);
        
    },function(e){
        $(this).find(".hover-box").stop().animate({opacity: "100"});
        $(this).find(".hover-box").delay(500).fadeOut(1500);
    }
    );
    
    $(surroundNode).on("close-hover", function(event){
        $(this).find(".hover-box").hide(0);
    })
    
    addTA(nameFieldId);
    
    return infoTable;
}

searchEngine = null;


function initSearchEngine(){
    var engine = new Bloodhound({
        name: "currencies",
        prefetch: {
            "url": "https://files.coinmarketcap.com/generated/search/quick_search.json",
            "ttl": 2
        },
        datumTokenizer: function(d) {
            return Bloodhound.tokenizers.whitespace(d.tokens.join(' '));
        },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        
        
    });
    searchEngine = engine;
    searchEngine.initialize();
}

function addTA(searchbar){
    //adds typeahead to the searchbar of the cryptocurrency selector of a new infobox
    $("#" + searchbar).typeahead({
        hint: false,
        highlight: false,
        minLength: 1
    }, {
        name: "currencies",
        display: "name",
        source: searchEngine.ttAdapter(),
        templates: {
            suggestion: formatSuggestion
        }
    }).on("typeahead:select", function(e, datum){
        //checking if target can be used directly
        var target = e.target;
        var parent = target.parentElement;
        parent.setAttribute("isvalid", "true");
        parent.setAttribute("data-selection", datum.slug);
        triggerStateChange(parent);
        
    }).on("typeahead:open", function(e){
        
        //determine if menu will overflow
        //the max potential height of the display dropwdown in pixels
        var displayHeight = 500;
        adjustOrientation(displayHeight, this.parentElement, this.parentElement.lastChild);
        
        
    });
}

function adjustOrientation(maxHeight, baseElement, toAdjust){
    var wHeight = $(window).height();
    var top = $(baseElement)[0].getBoundingClientRect().top;
    var bottom = $(baseElement)[0].getBoundingClientRect().bottom;
    
    if((bottom + maxHeight) > wHeight){
        $(toAdjust).css("bottom",["100%"]).css("top", [""]);
    }
        
    if((top - maxHeight) < 0){
        $(toAdjust).css("top",["100%"]).css("bottom", [""]);
    }
}

function formatSuggestion(context){
    var div = document.createElement("div");
    div.setAttribute("class", "crypto-suggestion");
    
    div.innerHTML = context.name;
    
    return div.outerHTML;
}

function triggerStateChange(cell){
    //cell parent should be three levels up
    var parent = cell;
    for(var i = 0; i < 3; i++){
        parent = parent.parentNode;
        if(parent === null){
            console.error("No parent");
            return;
        }
    }
    
    var event = new Event("validinput")
    parent.dispatchEvent(event);
}

var NAME = 1,
    DATE = 2,
    PRICE = 3,
    CLOSE = 0;

function validateTable(event){
    var table = event.target,
        rows = table.childNodes,
        currency = "", time = 0;
    
    var dateCell = null, priceCell = null;
    for(var i = 0; i < rows.length; i++){
        if(i == CLOSE){
            continue;
        }
        //relevant cell will be second one
        var cell = rows[i].childNodes[1].childNodes[0];
        if( cell.getAttribute("isvalid") != "true"){
            return;
        }
        if(i == NAME){
            currency = cell.getAttribute("data-selection");
        }
        else if(i == DATE){
            time = toMilliseconds(cell.innerHTML);
            dateCell = cell;
        }
        else if(i == PRICE){
            priceCell = cell;
        }
    }
    
    if(priceCell == null || dateCell == null){
        return;
    }
    
    //all cells are valid
    
    //make request to CMC graph api
    
    var pricePromise = priceQuery(currency, time);
    
    pricePromise.then(JSON.parse, function(error){
        //TODO: implement error response
        console.log(error);
    })
    .then(function(response){
        var section = "price_usd";
        var dataPairs = response[section];
        var pairsLength = dataPairs.length;
        var lastPair = dataPairs[pairsLength - 1];
    
        var dateString = toDate(lastPair[0]);
        var price = "$" + lastPair[1];
        
        dateCell.innerHTML = dateString;
        priceCell.innerHTML = price;
    });
}

function createRow(title, defaultText, type, valid){
    var row = document.createElement("tr");
    
    var rowTitle = document.createElement("td");
    rowTitle.innerHTML = title;
    row.appendChild(rowTitle);
    
    var rowData = document.createElement("td");
    
    var rowText = document.createElement(type);
    rowText.setAttribute("isvalid", valid);
    rowText.innerHTML = defaultText;
    //add event listener for onblur
    
    rowData.appendChild(rowText);
    
    row.appendChild(rowTitle);
    row.appendChild(rowData);
    
    return row;
}

function getDataField(row){
    //row is a tr, childNodes[1] is the second td, childNodes[0] is the data field of that td
    return row.childNodes[1].childNodes[0];
}

function addDate(){
    
}


function addText(){
    //adds to the second td of the tr
}

function determineAmount(text){
    var test = text.replace(/\s+/, "");
    var match = currencyRegex.exec(test);
    return match ? match[0] : "";
}

function detectCtrlKeydown(event){
    if (event.keyCode == ctrlCode) {
        ctrlDown = true;
    }
}

function detectCtrlKeyup(event){
    if (event.keyCode == ctrlCode) {
        ctrlDown = false;
    }
}
$(document).ready(function(){
    
    document.addEventListener("mouseup",checkHighlighted);
    window.addEventListener("keydown", detectCtrlKeydown, false);
    window.addEventListener("keyup", detectCtrlKeyup, false);

    initSearchEngine();
    
});


                          