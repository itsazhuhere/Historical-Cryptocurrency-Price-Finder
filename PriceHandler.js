var ctrlDown = false;
var ctrlCode = 17;
var enterCode = 13;
var escCode = 27;
var nameErrorCode = 404;
var defaultCurrency = "ethereum";
var currencyRegex = /(\d+)(\.\d+)?/;

var maxResults = 6;

var htmlLoaded = false;
var htmlFile = chrome.extension.getURL("hoverbox.html");
var infoBoxTemplate = null;

var tooltips = [];

var nameErrorMessage = "Invalid cryptocurrency name";
var dateErrorMessage = "Invalid date";
var networkErrorMessage = "Network error: check connection";

var contextMenuTitle = "Search for price";

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
        };
        request.onerror = function(){
            reject("Invalid document");
        };
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
        this.topResult = "";
        
        this.infoBoxHtml = null;
        
        this.initHTML();
        if(this.infoBoxHtml){
            this.addTTipster(this.infoBoxHtml);
        }
    }
    
    initHTML(){
        var infoBox = this;
        this.infoBoxHtml = $(infoBoxTemplate).clone();
        var table = $(this.infoBoxHtml).find("table");
        
        this.closeNode = table.find(".close-row").find("td").find("a");
        this.closeNode.click(function(){
            $(infoBox.infoBoxHtml).hide(0);
        });
        
        this.nameNode = table.find(".name-row").find("td").find("input");
        this.addTA(this.nameNode);
        $(this.nameNode)
            .on("change", function(e){
            infoBox.checkFields(infoBox);
        })
            .on("keydown", function(e){
            if(event.keyCode == enterCode){
                infoBox.slug = $(this).val();
                console.log(infoBox.slug);
                $(this).trigger("blur");
            }
        });
        
        this.dateNode = table.find(".date-row").find("td").find("span");
        this.setDate(true, this.date);
        $(this.dateNode).on("change", function(e){
            infoBox.checkFields(infoBox);
        });
        
        this.priceNode = table.find(".price-row").find("td").find("span");
        
        this.statusNode = table.find(".status-bar").find("td");
        
        
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
            infoBox.checkFields(infoBox);
        }).on("typeahead:open", function(e){
            //determine if menu will overflow
            //the max potential height of the display dropwdown in pixels
            var displayHeight = 500;
            adjustOrientation(displayHeight, this.parentElement, this.parentElement.lastChild);
        });
    }
    
    addTTipster(htmlTemplate){
        $(this.hoverParent).tooltipster({
            interactive: true,
            theme: "tooltipster-light",
            //theme: ['tooltipster-noir', 'tooltipster-noir-customized'],
            functionInit: function(instance, helper){
                instance.content(htmlTemplate);
            }
        });
        $(this.hoverParent).tooltipster("reposition");
    }
    
    setDate(valid, newDate){
        newDate = newDate || "";
        var row = $(this.dateNode).parents(".date-row");
        if(valid){
            $(this.dateNode).html(newDate);
            row.toggleClass("valid-entry", true).toggleClass("invalid-entry", false);
        }
        else{
            row.toggleClass("valid-entry", false).toggleClass("invalid-entry", true);
        }
    }
    
    setNameValidity(valid){
        var row = $(this.nameNode).parents(".name-row");
        row.toggleClass("valid-entry", valid).toggleClass("invalid-entry", !valid);
    }
    
    checkFields(context){
        console.log("checkFields");
        var infoBox = context;
        //checking date field
        var dateInput = Date.parse($(this.dateNode).html());
        if(isNaN(dateInput)){
            //do some error handling/css changing
            this.displayError(dateErrorMessage);
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
            //This function will be called on network errors or invalid crypto name errors
            console.log(error);
            if(error == nameErrorCode){
                infoBox.setNameValidity(false);
                this.displayError(nameErrorMessage);
                
            }
            else{
                //some kind of "something went wrong" message
            }
        })
        .then(function(response){
            if(response == null){
                return;
            }
            infoBox.setNameValidity(true);
            
            var section = "price_usd";
            var dataPairs = response[section];
            var pairsLength = dataPairs.length;
            if(pairsLength === 0){
                infoBox.setDate(false);
                return;
            }
            var lastPair = dataPairs[pairsLength - 1];
    
            var dateString = toDate(lastPair[0]);
            var price = "$" + lastPair[1];
        
            $(infoBox.dateNode).html(dateString);
            $(infoBox.priceNode).html(price);
        });
    }
    
    displayError(error){
        
        this.statusNode.html(error);
    }
    
}

function priceQuery(currency, time){
    return new Promise(function(resolve, reject){
        chrome.runtime.sendMessage({"currency": currency, "time": time}, function(result){
            console.log(result);
            if(result && result.substr(0,6) != "Error:"){
                resolve(result);
            }
            else{
                var errorNo = 0;
                if(result){
                    if(result.substr(7) == "Network Error"){
                        errorNo = 503;
                    }
                    else{
                        errorNo = Number(result.substr(7, 3));
                    }
                }
                reject(errorNo);
            }
        });
    }); 
}

function toDate(milliseconds){
    var date = new Date(milliseconds);
    return date.toLocaleString();
}

currentSelection = null;

function ctrlCheck(event){
    if(!event.ctrlKey){
        return;
    }
    var selection = "";
    if (window.getSelection) {
        selection = window.getSelection();
    }
    
    var info = {selection: null, node: null};
    
    if(selection == "" || !selection){
        var clicked = event.target;
        info.node = clicked;
    }
    else{
        info.selection = selection;
    }
    
    checkHighlighted(info);
}

function contextMenuCheck(info, tab){
    var selection = "";
    if (window.getSelection) {
        selection = window.getSelection();
    }
    
    if(selection == "" || !selection){
        return;
    }
    info.selection = selection;
    
    checkHighlighted(info);
}


function checkHighlighted(info){
    var selection = info.selection;
    var node = info.node;
    
    var selectionInfo = {};
    if(selection != null){
        selectionInfo = determineDate(selection);
    }
    else{
        //using node
        selectionInfo = determineDate(node);
    }
    
    var date = selectionInfo.selectString;
    
    if(date != ""){
        var infoBox = initInfoBox(selectionInfo.range, date);
        //setDate(infoBox, date);
    }   
    
    
}

var numbersDateRE = /\d{1,2}[./-\s]+\d{1,2}[./-\s]+\d{2,4}/;
var alphaDateRe = /(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|Jun(e)?|Jul(y)?|Aug(ust)?|Sep(tember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\s+\d{1,2},?[\s\S]+?\d{4}/i;
var timeRE = /\d{1,2}:\d{2}(:\d{2})?\s*([ap]m)?\s*(\w{3})?([+-]\d{4})?/i;

function determineDate(selectedNode){
    //simple version: check if the anchor node or any parent node of it is a timestamp then use its title if it is
    var currentNode = null;
    var selectionText = "";
    if(selectedNode.getRangeAt){
        var range = selectedNode.getRangeAt(0);
        currentNode = range.commonAncestorContainer;
        selectionText = range.toString();
    }
    else{
        currentNode = selectedNode;
    }
    var range = document.createRange();
    var selectionInfo = {selectString: "", range: range};
    
    if(selectionText != ""){
        var dateStr = "";
    
        var dates = numbersDateRE.exec(selectionText);
        if(dates === null){
            dates = alphaDateRe.exec(selectionText);
            
        }
        if(dates !== null){
            dateStr = dates[0];

    
            var times = timeRE.exec(selectionText);
            if(times === null){
                //no time included, allow it to default
                //possibly use CMC's day by day price in the future
            }
            else{
                dateStr = dateStr + " " + times[0];
            }
            selectionInfo.selectString = dateStr;
            selectionInfo.range = selectedNode.getRangeAt(0);
            return selectionInfo;
        }
    }
    //Either no selected text or selected text doesn't have proper formatting
    //Find a node that is usable
    
    var children = Array.from(currentNode.childNodes);
    
    //check children first, then if none are usable check parents
    //TODO: implement limits to the number of parents and childs to check
    while(children.length > 0){
        var currChild = children.pop();
        if(currChild.childNodes){
            var toAdd = Array.from(currChild.childNodes);
            for(var i =0; i< toAdd.length; i++){
                children.push(toAdd[i]);
            }
        }
        if (currChild.nodeName == "TIME"){
            selectionInfo.selectString = $(currChild).attr("datetime");
            
            range.selectNode(currChild);
            selectionInfo.range = range;
            return selectionInfo;
        }
        
    }
    
    while(currentNode != null){
        if (currentNode.nodeName == "TIME"){
            selectionInfo.selectString = $(currentNode).attr("datetime");
            range.selectNode(currentNode);
            selectionInfo.range = range;
            //break;
            return selectionInfo;
        }
        currentNode = currentNode.parentNode;
    }
    
    return selectionInfo;
}

function toCollapsedArray(nodeList){
    var array = [];
    
}

function initInfoBox(range, date){
        
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
    tooltips.push(surroundNode);
    return newInfoBox;
}

searchEngine = null;

function initSearchEngine(){
    //good place to put this; not part of search engine initialization
    $().tooltipster();
    
    
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

function initContextMenu(){
    chrome.contextMenus.create({title:contextMenuTitle, 
                                type:"normal", 
                                onclick:checkHighlighted,
                                contexts:["selection"],function(){}
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
    //also detects esc key being pressed
    if (event.keyCode == ctrlCode) {
        ctrlDown = false;
    }
    else if (event.keyCode == escCode){
        $(".hover-text").trigger("close-hover").tooltipster("close");
    }
}

$(document).ready(function(){
    
    document.addEventListener("mouseup",ctrlCheck);
    window.addEventListener("keydown", detectCtrlKeydown, false);
    window.addEventListener("keyup", detectCtrlKeyup, false);

    initSearchEngine();
});