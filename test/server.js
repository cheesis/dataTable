var http = require('http');
var fs = require('fs');

var first_page_file_name = 'index.html';  // has to be utf-8
var serverPort = 8080;

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
    if (request.url === "/baseSoData") {
      var requestBody = '';
      request.on('data', function(data) {
        requestBody += data;
      });
      request.on('end', function() {

        var formData = JSON.parse(requestBody);
        console.log('formData', formData);
        console.log('opid', formData.opid);
        response.writeHead(200, {'Content-Type': 'application/json'});
        var responseData = [
          {oid:"oim6", avgPrice:50.456, quantity:10000, bs:"S"},
          {oid:"oim7", avgPrice:50.456, quantity:10000, bs:"S", NBV:1230}
        ]
        setTimeout(function() {
          response.end(JSON.stringify(responseData));
        }, 6000);
      });
    } else {
      response.writeHead(404, 'Resource Not Found', {'Content-Type': 'text/html'});
      response.end('<!doctype html><html><head><title>404</title></head><body>404: Resource Not Found</body></html>');
    }
  } else {
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
