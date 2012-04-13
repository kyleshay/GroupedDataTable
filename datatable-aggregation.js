/*
Copyright (C) 2012 kyle.shay

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
 
 
//Define YUI group datatable Aggregators
YAHOO.widget.DataTable.Aggregator = {
	
	//-- Blank value
	defaultAggregator: function(oRecord, oColumn, aggregateData) {
		for (var i=0, il=aggregateData.length; i<il; i++) {
			aggregateData[i][oColumn.key] = "";
		}
	},
	
	//-- Summation
	sumAggregator: function(oRecord, oColumn, aggregateData) {
		var oData = oRecord.getData(oColumn.key);
		for (var i=0, il=aggregateData.length; i<il; i++) {
			if (aggregateData[i][oColumn.key] === undefined) {aggregateData[i][oColumn.key] = 0;}
			if (YAHOO.lang.isNumber(oData)) {
				aggregateData[i][oColumn.key] += oData;
			}
		}
	},
	
	//-- Min Date
	minDateAggregator: function(oRecord, oColumn, aggregateData) {
		var oData = oRecord.getData(oColumn.key);
		for (var i=0, il=aggregateData.length; i<il; i++) {
			if (aggregateData[i][oColumn.key] === undefined) {aggregateData[i][oColumn.key] = oData;}
			if (oData < aggregateData[i][oColumn.key]) {
				aggregateData[i][oColumn.key] = oData;
			}
		}
	},
	
	//-- Max Date
	maxDateAggregator: function(oRecord, oColumn, aggregateData) {
		var oData = oRecord.getData(oColumn.key);
		for (var i=0, il=aggregateData.length; i<il; i++) {
			if (aggregateData[i][oColumn.key] === undefined) {aggregateData[i][oColumn.key] = oData;}
			if (oData > aggregateData[i][oColumn.key]) {
				aggregateData[i][oColumn.key] = oData;
			}
		}
	},
	
	//-- Comma Separated
	commaSeparatedAggregator: function(oRecord, oColumn, aggregateData) {
		var oData = oRecord.getData(oColumn.key);
		for (var i=0, il=aggregateData.length; i<il; i++) {
			if (aggregateData[i][oColumn.key] === undefined) {aggregateData[i][oColumn.key] = "";}
			var tempStr = aggregateData[i][oColumn.key];
			tempStr = " " + tempStr + ",";
			if (tempStr.indexOf(" " + oData + ",") == -1) {
				aggregateData[i][oColumn.key] +=  (aggregateData[i][oColumn.key] == "") ? oData : ", " + oData;
			}
		}
	}
}