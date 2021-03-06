/* TODO
rewrite dataTableSelector as module pattern singleton to have private functions
_addFooter is duplicate code of body population ... or so
*/

/*
documentation
===============
in the calc functions of your columns the argument is an object containing the following functions:
  getColInFootRow   arg: columnName;         returns: the value of the column in the foot row
  getColInRow       arg: columnName;         returns: the value of the column in the same row you are in, either foot or body depending on where you are
  getColInBodyRow   arg: row-id, columnName; returns: value of column in the given row
  getCol            arg: columnName;         returns: values of body cells for given column as array
*/

function dataTable(tableId, columns, indexColumn, footer_definition, numberFormater, listenToTables){
  this._rowIndex = indexColumn;
  this._columns = columns;
  this._dataFormatter = numberFormater;// here the enthusiast can provide a function that formats numbers
  this._footerDefinition = footer_definition;
  this._tableRef = document.getElementById(tableId);
  this._tableId = tableId;
  this._addHeader(columns);
  this._flatColumns = this._getFlatColumns(columns);// only the sql column names
  this._rightBordersAt = this._getRightBorderIndices(columns);// contains indexes where right borders should be applied
  this._setBorders();
  // passing either undefined or [] should not create a footer
  if (footer_definition && footer_definition.length > 0)
    this._addFooter();

  // save reference to data table on table in the DOM so that we can access it from the cell-callbacks, i.e. blur
  this._tableRef.__data__ = this;

  //dispatch this event with table as source when data got populated
  //dependent tables can listen for it and repopulate
  //the event has the table id in the name because other populate events will fire in the callback
  //and you can't dispatch the event you trigger on in the callback
  this.populateEvent = new Event('populate_' + tableId);

  var tableRefVariable = this; //'this' will point to something else in the callbacks below
  if (listenToTables){
    listenToTables.forEach(function (t) {
      document.getElementById(t).addEventListener('populate_' + t, function () {
        console.log(tableRefVariable._tableId + ' triggers on ' + t + ' populate callback');
        tableRefVariable.populate([]);
      })
    });
  }
}
dataTable.prototype._getRightBorderIndices = function(columns){
  var right_borders_at = [];
  columns.map(function (el, i) { // loop through sections
    return el.columns.length; // builds array with one element per section containing length
  }).reduce(function (pre, curr) { // cumsum adjusted for indices starting at 0 not 1
    right_borders_at.push(curr + pre - 1); // minus one because indices start at 0
    return curr + pre;
  }, 0);
  right_borders_at.pop(); // we don't want borders furthest to the right
  return right_borders_at;
}
dataTable.prototype._getFlatColumns = function (columns){
  var _colList = [];
  columns.forEach(function(sec){
    sec.columns.forEach(function(c){
        _colList.push(c.columnName);
    }, this);
  }, this);
  return _colList;
}
dataTable.prototype._addHeader = function(columns){
  var topRow   = this._tableRef.createTHead().insertRow();
  columns.forEach(function(r, i, myArray){
    var newCell  = topRow.insertCell();
    newCell.colSpan = r['columns'].length;
    newCell.appendChild(document.createTextNode(r['section']));
    newCell.classList.add('table_header_toprow');
    if (i < columns.length-1) { // no right border furthest to the right
        newCell.classList.add('border_right');
    }
  }, this);
  var headRow   = this._tableRef.createTHead().insertRow();
  columns.forEach(function(section){
    section.columns.forEach(function(c){
        var newCell  = headRow.insertCell().appendChild(document.createTextNode(c['displayName']));
    }, this);
  }, this);
}

dataTable.prototype._setBorders = function(){
  for (var i = 1, row; row = this._tableRef.rows[i]; i++) { //start from one because the first one has colspan, borders are set differently
    for (var j = 0, col; col = row.cells[j]; j++) {
      if (this._rightBordersAt.indexOf(j) > -1) {
          col.classList.add("border_right");
      }
    }
  }
}

dataTable.prototype._addFooter = function(){
  var footRow   = this._tableRef.createTFoot().insertRow();
  //same code as in tbody -- TODO
  this._flatColumns.forEach(function(r){
    var newCell  = footRow.insertCell();
    newCell.dataset.columnName = r;
  }, this);
}

dataTable.prototype._formatData = function (col, d) {
  if (col.hasOwnProperty('dataFormater')) {
    return col.dataFormater(d);
  }
  else if (this._dataFormatter)
    return this._dataFormatter(d)
  else
    return d;
  // return this._dataFormatter ? this._dataFormatter(d) : d;
}

dataTable.prototype._populateFooter = function(){
    var footRow = this._tableRef.createTFoot().rows[0];
    this._footerDefinition.forEach(function(d,i){
        var where = this._flatColumns.indexOf(d.columnName);
        var things = {
          getColInFootRow: dataTableSelector.colInFootRowSelector.bind(this, this._tableId),
          getColInRow: dataTableSelector.colInFootRowSelector.bind(this, this._tableId),
          getColInBodyRow: dataTableSelector.colInBodyRowSelector.bind(this, this._tableId),
          getCol: dataTableSelector.columnSelector.bind(this, this._tableId)
        };
        var calculatedValue = d.calc(things);
        footRow.cells[where].innerHTML = this._formatData(d, calculatedValue);
        footRow.cells[where].__data__ = calculatedValue;
    }, this);
}
dataTable.prototype.populate = function(data){
    //first we handle the data that we get directly from the source
    var tbody = new Object();
    if (this._tableRef.tBodies.length == 0) {
        tbody = this._tableRef.appendChild(document.createElement('tbody'));
    } else {
        tbody = this._tableRef.tBodies[0];
    }

    var bodyrows = tbody.rows,
        rowIds = []; //this array contains the data attribute id of each row
    for (i = 0; i < bodyrows.length; i++) {
        rowIds.push(bodyrows[i].dataset.id);
    }

    //get row that contains the id
    data.forEach(function(d,i){
        var id = d[this._rowIndex];
        var rowNbr = rowIds.indexOf(id);
        if (rowNbr == -1){
            //create
            var bodyRow = tbody.insertRow();
            bodyRow.dataset.id = id;
            this._columns.forEach(function(section){
              section.columns.forEach(function(column){
                  var newCell  = bodyRow.insertCell();
                  newCell.appendChild(document.createTextNode(this._formatData(column, d[column.columnName]))); //e.g. d.oid here written as d['oid']
                  newCell.dataset.columnName = column.columnName;
                  newCell.__data__ = d[column.columnName];
                  // calculated columns are not editable
                  if (!column.hasOwnProperty('calc')) newCell.setAttribute("contentEditable", true);
                  newCell.addEventListener("blur", function () {
                    // dangerous but fun
                    this.__data__ = this.innerHTML;
                    // TODO find table with while loop
                    var tableId = this.parentElement.parentElement.parentElement.id;
                    var theTableInstance = document.getElementById(tableId).__data__;
                    this.innerHTML = theTableInstance._formatData(column, this.__data__);
                    // console.log(theTableInstance);
                    theTableInstance.populate([]); //recalculate values
                  });
                  newCell.addEventListener("focus", function () {
                    this.innerHTML = this.__data__;
                  });
              }, this);
            }, this);
        } else {
            //update row
            Object.getOwnPropertyNames(d).forEach(function(prop, pindex){
                if (prop != this._rowIndex) //we don't want to update the index
                {
                  this._columns.forEach(function(section){
                    section.columns.forEach(function(column){
                      if (d.hasOwnProperty(column.columnName)){
                        var columnIndex = this._flatColumns.indexOf(column.columnName);
                        bodyrows[rowNbr].cells[columnIndex].innerHTML = this._formatData(column, d[column.columnName]);
                        bodyrows[rowNbr].cells[columnIndex].__data__ = d[column.columnName];
                      }
                    }, this);
                  }, this);
                }
            }, this);
        }
    }, this); //yes,very confusing. if we don't pass what 'this' should be then it will be the global object aka Window
              // thank you javascript

  // there might be long chains of references in a table, so we update until nothing changes anymore
  // an example would be a cell value that depends on the footer of another column
  //then there might be a third column that depends an the previous column footer so you'd have to update 3 times
  // we put a safegueard of a 1000 updates
  var changed = true;
  for (var pop_i = 0; pop_i < 100 && changed; pop_i++) {
    changed = false; // did values in this table change? true: run again

    //compute values for calculated columns
    //almost same code as _populateFooter - bad style
    this._columns.forEach(function(section){
      section.columns.forEach(function(column){
        if (column.hasOwnProperty('calc')){
          var columnIndex = this._flatColumns.indexOf(column.columnName);
          for (i = 0; i < bodyrows.length; i++) {
            var things = {
              getColInFootRow: dataTableSelector.colInFootRowSelector.bind(this, this._tableId),
              getColInRow: dataTableSelector.colInBodyRowSelector.bind(this, this._tableId, bodyrows[i].dataset.id),
              getColInBodyRow: dataTableSelector.colInBodyRowSelector.bind(this, this._tableId),
              getCol: dataTableSelector.columnSelector.bind(this, this._tableId)
            };
            var calculatedValue = column.calc(things);
            if (bodyrows[i].cells[columnIndex].__data__ != calculatedValue  // NaN != NaN is false, so if we can't computer
                && !isNaN(bodyrows[i].cells[columnIndex].__data__)         // because not all data is there then we'll keep running 
                && !isNaN(calculatedValue)) {                               // the opulate loop which we don't want nothing changed if NaN is still NaN
              // console.log(bodyrows[i].cells[columnIndex].__data__ +' is not '+ calculatedValue);
              changed = true; // a calculated value changed which might impact other calculated values so we run another iteration of populate()
            }
            bodyrows[i].cells[columnIndex].innerHTML = this._formatData(column, calculatedValue);
            bodyrows[i].cells[columnIndex].__data__ = calculatedValue;
          }
        }
      }, this);
    }, this);


    // rest
    this._populateFooter();
    this._setBorders();

    console.log('iteration ' + pop_i +' for table ' + this._tableId);
    if (pop_i > 90) console.error(this._tableId + ' ran populate over 90 times consecutively');
  };//update loop

  this._tableRef.dispatchEvent(this.populateEvent);

  return data; //return the data so we can use it in a promise.then() method
}

//Singleton
var dataTableSelector =
{
  // from here http://stackoverflow.com/questions/5778020/check-whether-an-input-string-contains-number
  isNumeric: function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
  },
  columnSelector: function (tableId, columnName) {
    var arr = Array.prototype.slice.call(document.querySelectorAll('#'+tableId+'>tbody [data-column-name="'+columnName+'"]'));
    var values = [];
    var allNumeric = arr.every(function (d) { return isNumeric(d.__data__); });

    arr.forEach(function (d,i) {
      if (allNumeric) {
        values[i] = parseFloat(d.__data__);
      } else {
        values[i] = d.__data__;
      }
    });
    return values;
  },
  colInBodyRowSelector: function (tableId, rowId, columnName) {
    var value = document.querySelector('#'+tableId+'>tbody [data-id="'+rowId+'"] [data-column-name="'+columnName+'"]').__data__;
    if (isNumeric(value)) {
      return parseFloat(value);
    } else {
      return value;
    }
  },
  colInFootRowSelector: function (tableId, columnName) {
    var value = document.querySelector('#'+tableId+'>tfoot [data-column-name="'+columnName+'"]').__data__;
    if (isNumeric(value)) {
      return parseFloat(value);
    } else {
      return value;
    }
  }
}
