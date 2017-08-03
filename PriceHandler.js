var ctrlDown = false;
var ctrlCode = 17;
var defaultCurrency = "ethereum";
var currencyRegex = /(\d+)(\.\d+)?/;

var maxResults = 6;

var htmlLoaded = false;
var htmlFile = chrome.extension.getURL("hoverbox.html");
var infoBoxTemplate = null;

//add event listener first

//then begin loading
loadHTMLTemplate(htmlFile);

function loadHTMLTemplate(filepath){
    var htmlPromise = new Promise(function(resolve, reject){
        var request = new XMLHttpRequest();
        request.open("GET", filepath);
        request.onload = function(){
            if(request.status == 200){
                resolve(request.responseText);
            }
            else{
                reject("Invalid document");
            }
        }
        request.onerror = function(){
            reject("Error: Network Error");
        }
        request.send(null);
        
    });
    
    htmlPromise.then(function(result){
        infoBoxTemplate = $.parseHTML(result)[1];
        htmlLoaded = true;
    }, function(error){
        //TODO: other error responses
        console.log(error);
    });
}

class InfoBox{
    constructor(parentSpan, date){
        this.hoverParent = parentSpan;
        this.date = date;
        this.slug = "";
        this.price = "";
        
        this.infoBoxHtml = null;
        
        this.initHTML();
        
    }
    
    initHTML(){
        var infoBox = this;
        this.infoBoxHtml = $(infoBoxTemplate).clone();
        var table = $(this.infoBoxHtml).find("table");
        
        this.closeNode = table.find("#close-row").find("td").find("a");
        this.closeNode.click(function(){
            $(infoBox.infoBoxHtml).hide(0);
        });
        
        this.nameNode = table.find("#name-row").find("td").find("input");
        this.addTA(this.nameNode);
        
        this.dateNode = table.find("#date-row").find("td").find("span");
        this.setDate(this.date);
        $(this.dateNode).on("blur", function(){
            infoBox.checkFields();
        });
        
        this.priceNode = table.find("#price-row").find("td").find("span");
        
        
        $(this.hoverParent).append(this.infoBoxHtml);
        
    }
    
    addTA(searchbar){
        //adds typeahead to the searchbar of the cryptocurrency selector of a new infobox
        var infoBox = this;
        $(searchbar).typeahead({
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
            infoBox.slug = datum.slug;
            infoBox.checkFields();
        }).on("typeahead:open", function(e){
            //determine if menu will overflow
            //the max potential height of the display dropwdown in pixels
            var displayHeight = 500;
            adjustOrientation(displayHeight, this.parentElement, this.parentElement.lastChild);
        });
    }
    
    setDate(newDate){
        $(this.dateNode).html(newDate);
    }
    
    checkFields(){
        var infoBox = this;
        //checking date field
        var dateInput = Date.parse($(this.dateNode).html());
        if(isNaN(dateInput)){
            //do some error handling/css changing
            
            return;
        }
        
        if(this.slug == ""){
            //do some error handling/css changing
            return;
        }
        var now = new Date();
        //prevents error for times that havent happened yet
        var timeInput = Math.min(dateInput, now.getTime());
        
        var pricePromise = priceQuery(this.slug, timeInput);
        pricePromise.then(JSON.parse, function(error){
        //TODO: implement error response
            console.log(error);
        })
        .then(function(response){
            if(response == null){
                return;
            }
            var section = "price_usd";
            var dataPairs = response[section];
            var pairsLength = dataPairs.length;
            var lastPair = dataPairs[pairsLength - 1];
    
            var dateString = toDate(lastPair[0]);
            var price = "$" + lastPair[1];
        
            $(infoBox.dateNode).html(dateString);
            $(infoBox.priceNode).html(price);
        });
    }
    
}

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

function toDate(milliseconds){
    var date = new Date(milliseconds);
    return date.toLocaleString();
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
    
    if(!selection){
        //clear the old selection
        if(currentSelection !== null){
            
        }
        return;
    }
    
    var date = determineDate(selection.toString());
    
    if(date != ""){
        var infoBox = initInfoBox(selection, date);
        //setDate(infoBox, date);
    }
    
    selection.empty();
    ctrlDown = false;
    
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

function initInfoBox(selection, date){
        
    currentSelection = selection;
    var range = currentSelection.getRangeAt(0);
        
    var surroundNode = document.createElement("span");
    surroundNode.setAttribute("class", "hover-text");
    
    range.surroundContents(surroundNode);
    
    //create info box html content
    var newInfoBox = new InfoBox(surroundNode, date);

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
    });
    
    return newInfoBox;
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