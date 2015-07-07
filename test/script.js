// TODO:
  // reset tables if you press submit again
  // own function for multiply as in function pctOfValue
  // update spinner before actually running the queries and then
    // check them when they are done

// number formatting
numeral.language('sv', {
    delimiters: {
        thousands: ' ',
        decimal: ','
    },
    abbreviations: {
        thousand: 'k',
        million: 'm',
        billion: 'b',
        trillion: 't'
    },
    ordinal : function (number) {
        return number === 1 ? 'e' : 'e';
    },
    currency: {
        symbol: 'SEK'
    }
});

// switch between languages
numeral.language('sv');

// from here http://stackoverflow.com/questions/5778020/check-whether-an-input-string-contains-number
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function formatNumber(d) {
  return isNumeric(d) ? numeral(d).format('0,0.0000') : d;
}

function formatNumber2decimals(d) {
  return isNumeric(d) ? numeral(d).format('0,0.00') : d;
}
function formatNumber0decimals(d) {
  return isNumeric(d) ? numeral(d).format('0,0') : d;
}

/*
    here we define the sales order table
*/
//names of columns in header
var sot_base = {
    section: "",
    columns: [
          {columnName:"oid",displayName:"Sales Order Ids"}
        , {columnName:"bs",displayName:"Buy/Sell"}
        , {columnName:"avgPrice",displayName:"Average Price"}
        , {columnName:"quantity",displayName:"Quantity", dataFormater: formatNumber0decimals}
        , {columnName:"tradedValue",displayName:"Traded Value", calc:tradedValue}
        , {columnName:"pctOfValue",displayName:"% of total value", calc:pctOfValue, dataFormater: formatNumber2decimals}
    ]
};
var vwap_columns = {
    section: "VWAP",
    columns: [
         {columnName:'vwapAvgPrice',displayName:'Average Price'}
        ,{columnName:'vwapVolume',displayName:'Volume'}
        ,{columnName:'vwapPart',displayName:'Participation', calc:participation}
        ,{columnName:'vwapPnL',displayName:'P&L', calc:pnl}
        ,{columnName:'vwapPnLbps',displayName:'P&L Bps', calc:pnlbps}
    ]
};
var custom_columns = {
    section: "Custom",
    columns: [
         {columnName:'customAvgPrice',displayName:'Average Price'}
    ]
};
var close_columns = {
    section: "Close",
    columns: [
         {columnName:'closePrice',displayName:'Closing Price'},
         {columnName:'closeDate',displayName:'Closing Date'}
    ]
};
var arrival_columns = {
    section: "Arrival",
    columns: [
         {columnName:'arrivalPrice',displayName:'Arrival Price'}
    ]
};

//columns that should have a value in the footer
var sot_foot = [
  {columnName:"quantity", calc:fsumQuantity, dataFormater: formatNumber0decimals}, // we need named functions if we want to define them after this
  {columnName:"avgPrice", calc:fAvgPrice},
  {columnName:"tradedValue", calc:tradedValue}
];
var sot_foot_vwap = [
  {columnName:"vwapPnL", calc:fsumVWAPPnL},
  {columnName:"vwapPnLbps", calc:fVWAPPnLbps}
];

var sot_foot_close = [],
    sot_foot_custom = [],
    sot_foot_arrival =[];

function tradedValue(things) {
  return things.getColInRow("avgPrice") * things.getColInRow("quantity");
}
function pctOfValue(things) {
  // var totalValue = things.getColInFootRow("avgPrice") * things.getColInFootRow("quantity");
  var totalValue = things.getCol("avgPrice").map(function (avgPrice, ind) {
    return things.getCol("quantity")[ind] * avgPrice;
  }).sum();
  return things.getColInRow("tradedValue") / totalValue * 100;
}
function participation(things) {
    return things.getColInRow("quantity")/things.getColInRow("vwapVolume")*100;
}
function pnl(things) {
  var difference = 0;
  if (things.getColInRow("bs") == "B") {
    difference = things.getColInRow("vwapAvgPrice") - things.getColInRow("avgPrice");
  } else if(things.getColInRow("bs") == "S"){
    difference = things.getColInRow("avgPrice") - things.getColInRow("vwapAvgPrice");
  }
  else {
    difference = 0;
    console.log('buy/sell was neither b nor s in pnl(), it was ' + things.getColInRow("bs"));
  }
  return things.getColInRow("quantity") * difference;
}
function pnlbps(things) {
  return things.getColInRow("vwapPnL") / (things.getColInRow("avgPrice") * things.getColInRow("quantity")) * 10000;
}
function fVWAPPnLbps(things) {
  return things.getColInFootRow("vwapPnL") / (things.getColInFootRow("avgPrice") * things.getColInFootRow("quantity")) * 10000;
}

function fsumQuantity(things) {
    //this calculates the sum of the column values
    return things.getCol("quantity").sum();
};
function fsumVWAPPnL(things) {
  return things.getCol("vwapPnL").sum();
};

function fAvgPrice(things){
    var quantities = things.getCol("quantity");
    var prices = things.getCol("avgPrice");

    //quantities * prices
    var product = quantities.map(function(x, index){ //here x = quantities[index]
      return prices[index] * x;
    });

    //sum(product)/sum(quantities)
    return product.sum() /
      quantities.sum();
}

/*
    here we define the summary table
*/
//names of columns in header
var st_left = {
    section: "",
    columns: [
          {
            columnName:"id",
            displayName:""
          }
    ]
};
var st_right = {
    section: "",
    columns: [
      {columnName:"nbr",displayName:"Number", calc:countOrders},
      {columnName:"nbv",displayName:"NBV", calc:calcNBV}
    ]
};
function countOrders(things) {
  // we refer to a different table so we have to use dataTableSelector functions directly
  // instead of the helper functions of the passed 'things' object
  var sides = dataTableSelector.columnSelector("sot", "bs");
  switch (things.getColInRow("id")) {
    case "Buy":
      return sides.filter(function (a) {
        return a == "B";
      }).length;
    case "Sell":
        return sides.filter(function (a) {
          return a == "S";
        }).length;
    default:
      return "Oops, somebody can't code";
  }
}
function calcNBV(things) {
  var ourSide = things.getColInRow("id");
  var sides = dataTableSelector.columnSelector("sot", "bs");
  var tradedValue = dataTableSelector.columnSelector("sot", "tradedValue");
  var tradedValueThisSide = tradedValue.filter(function(v,i){
    return ourSide.indexOf(sides[i]) == 0; //javascript doesn't have startsWith yet
  });
  if (tradedValueThisSide.length > 0) {
    var totalValue = tradedValueThisSide.sum();
    if (ourSide == "Sell") {
      return totalValue;
    } else if(ourSide == "Buy"){
      return totalValue * (-1);
    } else {
      return "Oops, somebody can't code";
    }
  } else {
    return 0;
  }
}

var st_data = [
   {id:"Buy"},
   {id:"Sell"}
 ];
 var st_foot = [ {columnName:"nbr", calc:fCount}, // we need named functions if we want to define them after this
                 {columnName:"nbv", calc:fNBV}
               ];

 function fNBV(things) {
   return things.getCol("nbv").sum();
 };
 function fCount(things) {
    return things.getCol("nbr").sum();
 }

// this table does not depend on use input so we build it right away
 var summaryTable = new dataTable("st",[st_left, st_right], "id", st_foot, formatNumber0decimals, ['sot']);
 summaryTable.populate(st_data);




//
// here we handle the user input
//
function getFormData(formId) {
  var formHash = {};
  var elements = document.getElementById('mainform').elements;
  for (var i = 0, element; element = elements[i++];) {
    switch (element.type) {
      case "checkbox":
        if (!element['checked'])
          break;
        else {
          formHash[element['name']] = true;
        }
      case "button":
      case "fieldset":
        break; //disregard
      case "textarea":
        formHash[element['name']] = element['value'].split('\n').filter(function (obj) {
          if(obj)
            return true;
          else
            return false; //discard empty lines
        });
        break;
      default:
        console.log(element.type, "adding");
        formHash[element['name']] = element['value'];
    }
  }
  console.log(formHash);
  return formHash
}


function ajaxPost(url, jsonData) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Content-type", "application/json");
    request.onload = function() {
      if (request.status == 200) {
        resolve(request.response);  // Resolve the promise with the response text
      }
      else {
        reject(Error(request.statusText));
      }
    };
    // Handle network errors
    request.onerror = function() {
      reject(Error("Network Error"));
    };

    request.send(JSON.stringify(jsonData));
  });
}


function formCB(formId) {
  var formData = getFormData(formId);
  var soiIds = formData.soids; //this is sent to query 1

  // build sales order table according to user selection
  // columns that are always present
  var sot_definition = [sot_base];
  var sot_foot_definition = sot_foot;

  // columns that depend on user selection
  if (formData.arrivalBM) {
    sot_foot_definition = sot_foot_definition.concat(sot_foot_arrival)
    sot_definition = sot_definition.concat(arrival_columns)
  }
  if (formData.vwapBM) {
    sot_foot_definition = sot_foot_definition.concat(sot_foot_vwap)
    sot_definition = sot_definition.concat(vwap_columns)
  }
  if (formData.closeBM) {
    sot_foot_definition = sot_foot_definition.concat(sot_foot_close)
    sot_definition = sot_definition.concat(close_columns)
  }
  if (formData.customBM) {
    sot_foot_definition = sot_foot_definition.concat(sot_foot_custom)
    sot_definition = sot_definition.concat(custom_columns)
  }

  var myTable = new dataTable("sot",sot_definition, "oid", sot_foot_definition, formatNumber);

  // update status div
  var littleBox = document.createElement("div");
  littleBox.classList.add('littleBox');
  document.getElementById('footer').appendChild(littleBox);

  //handle standard data
  ajaxPost('baseSoData', soiIds).then(function (response) {
    console.log("Success!", response);
    return myTable.populate(JSON.parse(response));
  }).then(function (res) {
    // handle vwap
    if (formData.vwapBM) {
      console.log('handling wvap');
      res.forEach(function (r) {
        ajaxPost('vwapBM',r).then(function (vwap) {
          console.log("got vwap", vwap);
          myTable.populate(JSON.parse(vwap));
        });
      });
    }
    // handle custom
    if (formData.customBM) {
      console.log('handling custom');
      res.forEach(function (r) {
        ajaxPost('customBM',r).then(function (custom) {
          console.log("got custom", custom);
          myTable.populate(JSON.parse(custom));
        });
      });
    }
  }).then(function (res) {
    console.log('');
    console.log('All done');
  }).catch(function (error) {
    console.log("Failed!", error);
  });
}
