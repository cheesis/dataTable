var http = require('http');
var serverPort = 8090;

var ConnectionPool = require('tedious-connection-pool');
var Request = require('tedious').Request;

var poolConfig = {
    min: 1,
    max: 2,
    log: false
};

var connectionConfig = {
  userName: 'test',
  password: 'test',
  server: 'localhost',
  options: {
          requestTimeout: 0, // wait indefinitely, default 15000ms
          rowCollectionOnRequestCompletion: true // we need this so that the request callback has the result set
          }
};

var pool = new ConnectionPool(poolConfig, connectionConfig);

function runStatemment(sqlStatement, postData, response){
  //acquire a connection
  pool.acquire(function (err, connection) {
      if (err)
          console.error(err);

      var request = new Request(sqlStatement, function(err, rowCount, rows) {
          if (err)
              console.error(err);

          // debugger; //break when running in debug mode

          var sqlResponse = {};
          rows[0].forEach(function (v, i) {
            sqlResponse[v.metadata.colName] = v.value;
          });

          console.log('we send this' + JSON.stringify([sqlResponse]));

          response.end(JSON.stringify([sqlResponse])); //{oid:'1',vwapAvgPrice:50, vwapVolume:50000}

          //release the connection back to the pool when finished
          connection.release();
      });

      connection.execSql(request);
  });

  pool.on('error', function(err) {
      console.error(err);
  });
}

// end of SQL preparations


function getDelay(){
  return parseInt(Math.random()*5000);
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
        runStatemment("select * from vwapData where oid = '1' waitfor delay '00:00:02'", postData, response);
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
  } 
}).listen(serverPort);
console.log('Server running at localhost:'+serverPort);
