/* TODO
we have to pass a formatter for each column instead, not all numbers should ahve 4 decimals
rewrite dataTableSelector as module pattern singleton to have private functions
if you have column values that depend on a calculated footer value then you have to call populate (at lest) twice
  once with the values that will populate the footer and then without values to recalculate the body values
_addFooter is duplicate code of body population ... or so
possibly make only columns editable where data is not calculated
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
  this._addFooter();

  //dispatch this event with table as source when data got populated
  //dependent tables can listen for it and repopulate
  //the event has the table id in the name because other populate events will fire in the callback
  //and you can't dispatch the event you trigger on in the callback
  this.populateEvent = new Event('populate_' + tableId);

  var tableRefVariable = this; //'this' will point to something else in the callbacks below
  if (listenToTables){
    listenToTables.forEach(function (t) {
      document.getElementById(t).addEventListener('populate_' + t, function () {
        console.log(t + ' callback fires');
        tableRefVariable.populate([]);
      })
    });
  }
}
dataTable.prototype._getRightBorderIndices = function(columns){
      var right_borders_at = [];
      right_borders_at[0] = columns[0]['columns'].length - 1; //-1 because indices start at 0
      for (var i = 1; i < columns.length-1; i++) { //-1 to ignore the last one, we don't want borders all the way to the right
          right_borders_at[i] = right_borders_at[i-1] + columns[i]['columns'].length;
      }
      return right_borders_at;
  };
  dataTable.prototype._getFlatColumns = function (columns){
      var _colList = [];
      columns.forEach(function(sec){
          sec.columns.forEach(function(c){
              _colList.push(c.columnName);
          }, this);
      }, this);
      return _colList;
  };
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
  };

  dataTable.prototype._setBorders = function(){
      for (var i = 1, row; row = this._tableRef.rows[i]; i++) { //start from one because the first one has colspan, borders are set differently
          for (var j = 0, col; col = row.cells[j]; j++) {
              if (this._rightBordersAt.indexOf(j) > -1) {
                  col.classList.add("border_right");
              }
          }
      }
  };

  dataTable.prototype._addFooter = function(){
      var footRow   = this._tableRef.createTFoot().insertRow();
      //same code as in tbody -- TODO
      this._flatColumns.forEach(function(r){
          var newCell  = footRow.insertCell();
          newCell.dataset.columnName = r;
      }, this);
  };

  dataTable.prototype._formatData = function (d) {
    return this._dataFormatter ? this._dataFormatter(d) : d;
  };

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
          footRow.cells[where].innerHTML = this._formatData(calculatedValue);
          footRow.cells[where].__data__ = calculatedValue;
      }, this);
  };
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
              this._flatColumns.forEach(function(r, i, myArray){
                  var newCell  = bodyRow.insertCell();
                  newCell.appendChild(document.createTextNode(this._formatData(d[r]))); //e.g. d.oid here written as d['oid']
                  newCell.dataset.columnName = r;
                  newCell.__data__ = d[r];
                  newCell.setAttribute("contentEditable", true);
                  theTableInstance = this; // save for later use, 'this' will be something else
                  newCell.addEventListener("blur", function () {
                    this.__data__ = this.innerHTML;
                    this.innerHTML = theTableInstance._formatData(this.__data__);
                    theTableInstance.populate([]); //recalculate values
                  });
                  newCell.addEventListener("focus", function () {
                    this.innerHTML = this.__data__;
                  });
              }, this);
          } else {
              //update row
              Object.getOwnPropertyNames(d).forEach(function(prop, pindex){
                  if (prop != this._rowIndex) //we don't want to update the index
                  {
                      var row_cells = bodyrows[rowNbr].cells;
                      for (k = 0; k < row_cells.length; k++) {
                          if (row_cells[k].dataset.columnName == prop) {
                              row_cells[k].innerHTML = this._formatData(d[prop]);
                              row_cells[k].__data__ = d[prop];
                          }
                      }
                  }
              }, this);
          }
      }, this); //yes,very confusing. if we don't pass what 'this' should be then it will be the global object aka Window
                // thank you javascript

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
                    bodyrows[i].cells[columnIndex].innerHTML = this._formatData(calculatedValue);
                    bodyrows[i].cells[columnIndex].__data__ = calculatedValue;
                  }
              }
          }, this);
      }, this);


      // rest
      this._populateFooter();
      this._setBorders();
      this._tableRef.dispatchEvent(this.populateEvent);
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

//ugly but helpful
Array.prototype.sum = function () {
  return this.reduce(function(a, b){return a+b;});
}
