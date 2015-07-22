var http = require('http');
var fs = require('fs');

var first_page_file_name = 'index.html';  // has to be utf-8
var serverPort = 8080;

function getDelay(){
  return parseInt(Math.random()*5000);
}

// get suffix polyfill; it's from ES6
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (position === undefined || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

http.createServer(function (request, response) {
  console.log(request.method, request.url);
  if(request.method === "POST") {
    var requestBody = '';
    request.on('data', function(data) {
      requestBody += data;
    });
    request.on('end', function() {
      var postData = JSON.parse(requestBody);
      console.log('posted data', postData);
      response.writeHead(200, {'Content-Type': 'application/json'});
      var responseData = [];
      if (request.url === "/baseSoData") {
        postData.forEach(function (orderId) {
          responseData.push({oid:orderId, start:"2015-07-14 12:00:00", stop:"2015-07-14  16:45:00", avgPrice:50.456, quantity:10000, bs:"S", NBV:1230});
        });
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        }, getDelay());
      }
      else if(request.url === "/vwapBM") {
        console.log('returning vwap');
        responseData.push({oid:postData.oid,vwapAvgPrice:50, vwapVolume:50000});
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        }, getDelay());
      }
      else if(request.url === "/customBM") {
        console.log('returning custom');
        responseData.push({oid:postData.oid, customPrice:60, customTime:postData.customTime});
        console.log(responseData);
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        });//, getDelay());
      }
      else if(request.url === "/arrivalBM") {
        console.log('returning arrival');
        responseData.push({oid:postData.oid, arrivalPrice:70});
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        });//, getDelay());
      }
      else if(request.url === "/closeBM") {
        console.log('returning custom');
        var today = new Date().toJSON().slice(0,10);
        responseData.push({oid:postData.oid, closePrice:65, closeDate: today});
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        });//, getDelay());
      }
      else if(request.url === "/venues") {
        console.log('returning venues');
        responseData = [
          {
            "label": "XSTO",
            "value": 264131
          },
          {
            "label": "CHIX",
            "value": 218812
          }
        ];
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        });//, getDelay());
      }
      else if(request.url === "/sources") {
        console.log('returning sources');
        responseData = [
          {
            "label": "Automatic",
            "value": 264131
          },
          {
            "label": "Dark",
            "value": 218812
          }
        ];
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        });//, getDelay());
      }
      else {
        response.writeHead(404, 'Resource ' + request.url + ' not found', {'Content-Type': 'text/html'});
        response.end('<!doctype html><html><head><title>404</title></head><body>404: Resource Not Found</body></html>');
      }
    });
  } else {
    // with nothing given, look for index.html
    if (request.url == '/') {
      request.url = '/index.html';
    }

    //don't read the first letter, it's '/', which will make node look at C:\
    var html = fs.readFileSync(request.url.substr(1));

    if (request.url.endsWith('html')) {
      response.writeHead(200, {'Content-Type': 'text/html'});
    } else if (request.url.endsWith('css')) {
      response.writeHead(200, {'Content-Type': 'text/css'});
    } else if (request.url.endsWith('js')) {
      response.writeHead(200, {'Content-Type': 'text/javascript'});
    } else if (request.url.endsWith('ico')) {
        response.writeHead(200, {'Content-Type': 'image/x-icon'});
      }
    response.end(html);

    // response.writeHead(405, 'Method Not Supported', {'Content-Type': 'text/html'});
    // return response.end('<!doctype html><html><head><title>405</title></head><body>405: Method Not Supported</body></html>');
  }
}).listen(serverPort);
console.log('Server running at localhost:'+serverPort);
