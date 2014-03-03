/* LICENCE: whatever yahoo wants plus wtfpl for anythying else */

/*global YAHOO, document */
var Dom = YAHOO.util.Dom, Event = YAHOO.util.Event, Lang = YAHOO.lang, DT = YAHOO.widget.DataTable;

var GroupedDataTable = function(elContainer, aColumnDefs, oDataSource, oConfigs) {

	// Insert the "grouping" row
	aColumnDefs.unshift({
		key:"GROUPCOL",
		label:"",
		maxAutoWidth:1,
		className:"yui-dt-group-divider", 
		sortable:false,
		resizeable:false,
		draggable:false,
		groupable: false
	}); 

	GroupedDataTable.superclass.constructor.call(this, elContainer, aColumnDefs, oDataSource, oConfigs);	
};	

YAHOO.widget.GroupedDataTable = GroupedDataTable;

YAHOO.lang.extend(GroupedDataTable, YAHOO.widget.DataTable, {

	// The groupKeys field holds an array of column keys for those columns being grouped
	groupKeys: [],
	
	/**
	 * Class name assigned to groupable elements.
	 *
	 * @property DataTable.CLASS_GROUPABLE
	 * @type String
	 * @static
	 * @final
	 * @default "yui-dt-groupable"
	 */
	CLASS_GROUPABLE: "yui-dt-groupable",

	group: function(groupColKeys) {	
	
		// If a string was passed in, convert it to an one element array.
		groupColKeys = typeof groupColKeys == "string" ? groupColKeys = [groupColKeys] : groupColKeys;
		
		// Get a reference to the underlying recordset
		var rs = this.getRecordSet();
		
		//If we pass nothing, just redo the sort
		if (groupColKeys == null) {
			groupColKeys = this.groupKeys;
		}
		
		// Update the datatable with the new grouping fields
		this.groupKeys = groupColKeys;
		rs.groupKeys = groupColKeys;
		
		// Clear any existing grouping (loops through cells)
		for (var i=0; i < rs.getLength(); i++) {
			while (rs.getRecord(i).grouping) {
				rs.deleteRecord(i);
			}
		}
		
		//update the column keys for by firing a grouping event.
		this.fireEvent("columnGroupEvent",{groupKeys:groupColKeys});
		
		if(groupColKeys.length == 0 || this.groupKeys.length == 0) {
			this.render();
			return;
		}
		
		// Create a recursive sort function that first sorts by element one of the column keys array, 
		// then by element two, ..., and finally by element n.
		var compareFunction = YAHOO.util.Sort.compare;
		var self = this;
		
		function sortFnc (a, b, desc, count, max) {
			count = count ? count : 0;
			max = max || groupColKeys.length - 1;
			
			// look for a custom group sorting function
			var curCol = self.getColumn(groupColKeys[count]);
			if(curCol && curCol.groupOptions && curCol.groupOptions.groupFunction) {
				self.compareFunction = curCol.groupOptions.groupFunction;
			} else {
				self.compareFunction = YAHOO.util.Sort.compare;
			}
			
			var sorted = self.compareFunction(a.getData(groupColKeys[count]), b.getData(groupColKeys[count]), desc);
			
			if (sorted == 0) {
				if (count == max) {
					return YAHOO.util.Sort.compare(a.getId(), b.getId(), desc);
				} else {
					return sortFnc(a, b, desc, count + 1, max);
				}
			} else {
				return sorted;
			}
		}
					
		// Perform the sort
		rs.sortRecords(sortFnc, DT.CLASS_DESC);
		
		// This function will be used to determine if a grouping row is needed directly above the current
		// record.  It checks if the value in the first grouping column of the current record is the same 
		// as the value in the first grouping column of the previous record: if not, add a grouping row, 
		// otherwise check the next grouping column.  It checks each grouping column in this way until it
		// determines that a grouping row is needed, or until there are no more grouping columns to check,
		// in which case the grouping columns all contain the same values for this record as the previous.
		function checkIfGroupingRow(count, max, r, rNum) {	
	
			var curCol = self.getColumn(groupColKeys[count]);
			if(curCol && curCol.groupOptions && curCol.groupOptions.groupFunction) {
				self.compareFunction = curCol.groupOptions.groupFunction;
			} else {
				self.compareFunction = YAHOO.util.Sort.compare;
			}
			
			if (self.compareFunction(r.getData(groupColKeys[count]), groupData[count])) {
				groupData[count] = r.getData(groupColKeys[count]);
				var data = new Object();
				data[groupColKeys[count]] = r.getData(groupColKeys[count]);
				var groupingRecord = rs.addRecord(data,rNum);
				groupingRecord.grouping = true;
				groupingRecord.groupNum = count;
				groupingRecord.groupMember = count - 1;
				//Reset values in the groupData array that are after this one
				for (j=count+1; j<=max; j++) {
					groupData[j] = null;
				}
			} else {
				if (count == max) {
					//Default values of Group members
					r.grouping = false;
					r.groupNum = -1;
					r.groupMember = count;
				} else {
					checkIfGroupingRow(count + 1, max, r, rNum);
				}
			}
		}
		
		// We need an empty array to start, in order to represent the first record's previous record.
		var groupData = [];
		for (var j = 0, len=groupColKeys.length; j < len; j++) {
			groupData[len] = null;
		}
		
		// Look at each record and determine if a grouping row is needed just before it (and add it if so).
		for (var i = 0; i < rs.getLength(); i++) {
			checkIfGroupingRow(0, groupColKeys.length - 1, rs.getRecord(i), i);
		}
					
		//Aggregate non-grouping columns
		var aggregateData = [];
		for (var i = 0, len = groupColKeys.length; i < len; i++) {
			aggregateData[i] = new Object();
			aggregateData[i].clear = false;
		}
		
		for (var i = rs.getLength() - 1; i >= 0; i--) {
			var r = rs.getRecord(i);
			if (r.grouping) {
				//Populate grouping row with aggregated data
				for (var j=groupColKeys.length, jl=this.getColumnSet().keys.length; j<jl; j++) {
					var oColumn = this.getColumn(this.getColumnSet().keys[j].key);
					r.setData(oColumn.key, aggregateData[r.groupNum][oColumn.key]);
				}
				//Make sure the aggregated data is cleared before working on new non-grouping rows
				aggregateData[r.groupNum].clear = true;
			} else {
				//Clear out the aggregate data if it has been flagged (i.e.: we are in a new group)
				for (var j=0, jl=aggregateData.length; j<jl; j++) {
					if (aggregateData[j].clear) {
						aggregateData[j] = new Object();
						aggregateData[j].clear = false;
					}
				}
				for (var j = groupColKeys.length, jl = this.getColumnSet().keys.length; j < jl; j++) {
					//Call Aggregator, passing in the current Record, current Column, and the aggregateData object
					var oColumn = this.getColumn(this.getColumnSet().keys[j].key);
					var fnAggregator = typeof oColumn.aggregator === 'function' ? oColumn.aggregator : YAHOO.widget.DataTable.Aggregator[oColumn.aggregator+''] || YAHOO.widget.DataTable.Aggregator.defaultAggregator;
					fnAggregator(r, oColumn, aggregateData);
				}
			}
		}		
		
		//refresh the table, so we can see the new rows and sort order.
		this.render();		
	},
	
	/**
	 * Outputs markup into the given TD based on given Record.
	 *
	 * @method formatCell
	 * @param elLiner {HTMLElement} The liner DIV element within the TD.
	 * @param oRecord {YAHOO.widget.Record} (Optional) Record instance.
	 * @param oColumn {YAHOO.widget.Column} (Optional) Column instance.
	 */
	formatCell: function(elLiner, oRecord, oColumn) {
		if(!oRecord) {
			oRecord = this.getRecord(elLiner);
		}
		if(!oColumn) {
			oColumn = this.getColumn(elLiner.parentNode.cellIndex);
		}

		if(oRecord && oColumn) {
			var sField = oColumn.field;
			var oData = oRecord.getData(sField);
			var fnFormatter = typeof oColumn.formatter === 'function' ?
							  oColumn.formatter :
							  DT.Formatter[oColumn.formatter+''] ||
							  DT.Formatter.defaultFormatter;

			// Apply special formatter
			if(fnFormatter) {
				fnFormatter.call(this, elLiner, oRecord, oColumn, oData);
			}
			else {
				elLiner.innerHTML = oData;
			}
			
			//If there is no group defined, let's check if we are a group.
			if (oColumn.grouping === undefined) {
				oColumn.grouping = false;
				oColumn.groupNum = -1;
				if (this.groupKeys) {
					for (var j = 0, len = this.groupKeys.length; j < len; j++) {
						if (this.groupKeys[j] == sField) {
							oColumn.grouping = true;
							oColumn.groupNum = j;
							break;
						}
					}
				}
			}
			
			//If we are in a group, show/hide based on whether it's expanded or not
			if (oColumn.grouping) {
				if (oRecord.grouping && oRecord.groupNum == oColumn.groupNum) {
					YAHOO.util.Dom.addClass(elLiner, "grouping-cell")
					
					var groupingIcon = document.createElement('span');
					groupingIcon.className = 'grouping-widget-show';	
					groupingIcon.innerHTML = "&#160;&#160;&#160;&#160;"; 
										
					Event.addListener(groupingIcon, "click", this._toggleGroup, this);
					
					var label = elLiner.innerHTML;				
					elLiner.innerHTML = "";
					elLiner.appendChild(groupingIcon);
					elLiner.appendChild(document.createTextNode(label));	
					
					elLiner.parentNode.grouping = true;					
					elLiner.parentNode.parentNode.expanded = true;
					elLiner.parentNode.parentNode.groupRow = true;
					elLiner.parentNode.parentNode.groupNum = oRecord.groupNum;
				} else {
					//blanks grouped cell
					elLiner.innerHTML = "";
					if(oColumn.groupOptions && oColumn.groupOptions.groupFormatter) {
						elLiner.setAttribute("align", "center");
						elLiner.innerHTML = oColumn.groupOptions.groupFormatter(oData);
					}
					elLiner.parentNode.parentNode.groupNum = oRecord.groupNum;
				}
			}
			this.fireEvent("cellFormatEvent", {record:oRecord, column:oColumn, key:oColumn.key, el:elLiner});
		}
		else {
		}
	},

	CLASS_GROUP_ODD: "yui-dt-group-odd",
	CLASS_GROUP_EVEN: "yui-dt-group-even",

	_setRowStripes: function(row, range) {
		// Default values stripe all rows
		var allRows = this._elTbody.rows,
			nStartIndex = 0,
			nEndIndex = allRows.length,
			aOdds = [], nOddIdx = 0,
			aEvens = [], nEvenIdx = 0,
			aGroupOdds = [], nGroupOddsIdx = 0,
			aGroupEvens = [], nGroupEvensIdx = 0;
		// Stripe a subset
		if((row !== null) && (row !== undefined)) {
			// Validate given start row
			var elStartRow = this.getTrEl(row);
			if(elStartRow) {
				nStartIndex = elStartRow.sectionRowIndex;
				
				// Validate given range
				if(lang.isNumber(range) && (range > 1)) {
					nEndIndex = nStartIndex + range;
				}
			}
		}
		
		for(var i = nStartIndex, modIndex = nStartIndex; i < nEndIndex; i++, modIndex++) {
			if(!allRows[i].groupRow) {
				if (modIndex % 2) {
					aOdds[nOddIdx++] = allRows[i];
				} else {
					aEvens[nEvenIdx++] = allRows[i];
				}
			} else {
				if (allRows[i].groupNum % 2) {
					aGroupOdds[nGroupOddsIdx++] = allRows[i];
				} else {
					aGroupEvens[nGroupEvensIdx++] = allRows[i];
				}
				modIndex = -1;
			}
		}

		if (aOdds.length) {
			YAHOO.util.Dom.replaceClass(aOdds, DT.CLASS_EVEN, DT.CLASS_ODD);
		}

		if (aEvens.length) {
			YAHOO.util.Dom.replaceClass(aEvens, DT.CLASS_ODD, DT.CLASS_EVEN);
		}
		
		if (aGroupOdds.length) {
			YAHOO.util.Dom.replaceClass(aGroupOdds, this.CLASS_GROUP_EVEN, this.CLASS_GROUP_ODD);
		}
		
		if (aGroupEvens.length) {
			YAHOO.util.Dom.replaceClass(aGroupEvens, this.CLASS_GROUP_ODD, this.CLASS_GROUP_EVEN);
		}
	},
	
	/**
	 * Initializes top-level Column TH elements into DD instances.
	 *
	 * @method _initDraggableColumns
	 * @private
	 */
	_initDraggableColumns : function() {
		this._destroyDraggableColumns();
		if(YAHOO.util.DD) {
			var oColumn, elTh, elDragTarget;
			var draggable;
			for(var i=0, len=this._oColumnSet.tree[0].length; i<len; i++) {
				oColumn = this._oColumnSet.tree[0][i];
				
				// Default to true since draggableColumns = true for the whole table
				draggable = oColumn.draggable != undefined ? oColumn.draggable : true; 
				elTh = oColumn.getThEl();
				Dom.addClass(elTh, DT.CLASS_DRAGGABLE);
				if(oColumn.groupable) Dom.addClass(elTh, this.CLASS_GROUPABLE);
				elDragTarget = this._initColumnDragTargetEl();
				oColumn._dd = new YAHOO.widget.ColumnDD(this, oColumn, elTh, elDragTarget);
				oColumn._dd.groupable = oColumn.groupable;
				
				if (!draggable) {
					// This will prevent the column from dragging, but still allow it to be a drop target
					oColumn._dd.subscribe("b4MouseDownEvent", function() {return false;});
				}
				
				var self = this;
				/**
					Override columndd's onDragDrop event to allow drag/drop for nongrouping
					columns to not be able to move past the grouping divider
				**/
				oColumn._dd.onDragDrop = function() {			
					var groupColumn = self.getColumn("GROUPCOL").getTreeIndex();
					if((!this.groupable && this.newIndex <= groupColumn) ||
						(this.newIndex > groupColumn &&
						!self._oColumnSet.tree[0][this.column.getTreeIndex()].key.indexOf("s_"))) {	
						YAHOO.util.Dom.setStyle(this.pointer, 'display', 'none');						
						this.newIndex = this.column.getTreeIndex();
						return;
					}
					
					this.datatable.reorderColumn(this.column, this.newIndex);
				}
				/**
					Override columndd's endDrag event to allow drag/drop for columns
					in the 'grouping' area to regroup the columns
				**/
				oColumn._dd.endDrag = function() {	
					var groupCount = self.getColumn("GROUPCOL").getTreeIndex();
					var groupingOrder = new Array();
					
					for(var j=0; j<groupCount; j++) {							
						var curCol = self._oColumnSet.tree[0][j];
									
						// remove the sister columns, since were adding them back anyways.
						if(!curCol.key.indexOf("s_")) {
							self.removeColumn(curCol);
							groupCount--;
							curCol = self._oColumnSet.tree[0][j];
						}
						
						if(curCol && curCol.groupOptions && 
								curCol.groupOptions.sisterGroupFunction &&
								curCol.groupOptions.sisterGroupData) {
							self.addSisterGroup(curCol, true);
							groupingOrder.push(self._oColumnSet.tree[0][j].key);
							groupingOrder.push(self._oColumnSet.tree[0][++j].key);
							groupCount++;
						} else {
							groupingOrder.push(curCol.key);
						}							
					}
					
					self.group(groupingOrder);
					
					this.newIndex = null;		
					YAHOO.util.Dom.setStyle(this.pointer, 'display', 'none');				
				}					
			}
		}
	},
	
	addSisterGroup: function(curCol, add) {
		var newGroupSister = curCol.groupOptions.sisterGroupFunction;
		var newGroupSisterData = curCol.groupOptions.sisterGroupData;
		
		var sisterColumn = new YAHOO.widget.Column(newGroupSister(curCol));
		sisterColumn.key = 's_'+curCol.key;
		sisterColumn.field = sisterColumn.key;
		
		
		this.insertColumn(sisterColumn, curCol.getTreeIndex());
		this.getColumn(sisterColumn.key).groupOptions = sisterColumn.groupOptions;
		var rs = this.getRecordSet();
		for (var i=0; i < rs.getLength(); i++) {
			var oRecord = rs.getRecord(i);
			oRecord.setData(sisterColumn.key, newGroupSisterData(curCol.key, oRecord));
		}			
	},

	_toggleGroup: function(e, self) {
		var group = Event.getTarget(e);
		
		var tr = group.parentNode.parentNode.parentNode
		
		var groupNum = tr.groupNum;
		var display;
		if (tr.expanded) {
			// Hide it
			group.className = 'grouping-widget-hide';
			tr.expanded = false;
			display = "none";
		} else {
			// Show it
			group.className = 'grouping-widget-show';
			tr.expanded = true;
			display = "";
		}
		while (true) {
			tr = tr.nextSibling;
			//tr = Dom.getNextSibling(group);
			if (tr) {
				if (tr.groupNum >= 0 && tr.groupNum <= groupNum) {
					break;
				}
				tr.style.display = display;
			} else {
				break;
			}
		}
	},
	
	/**
	 * Overridable method gives implementers a hook to show loading message before
	 * sorting Column.
	 *
	 * @method doBeforeSortColumn
	 * @param oColumn {YAHOO.widget.Column} Column instance.
	 * @param sSortDir {String} YAHOO.widget.DataTable.CLASS_ASC or
	 * YAHOO.widget.DataTable.CLASS_DESC.
	 * @return {Boolean} Return true to continue sorting Column.
	 */
	doBeforeSortColumn : function(oColumn, sSortDir) {
		// Shortcut for the frequently-used compare method
		var compare = YAHOO.util.Sort.compare;

		// Default sort function, have to hack this in to make a condition true
		// to avoid the records being simply reversed.
		oColumn.sortOptions = {
			field: oColumn.field,
			sortFunction: function(a, b, desc, field) {
				var sorted = compare(a.getData(field),b.getData(field), desc);
				if(sorted === 0) {
					return compare(a.getCount(),b.getCount(), desc); // Bug 1932978
				}
				else {
					return sorted;
				}
			}
		};
		this.showTableMessage(this.get("MSG_LOADING"), DT.CLASS_LOADING);
		return true;
	}
});	
	
YAHOO.widget.Column.prototype.groupable = false;
/**
 *	Custom sorter for groups 
 *	if the table isn't grouped in any way, it does normal sorting
 *
 * Sorts all Records by given function. Records keep their unique IDs but will
 * have new RecordSet position indexes. Extened from Datatable to include Group sorting
 *
 * @method sortRecords
 * @param fnSort {Function} Reference to a sort function.
 * @param desc {Boolean} True if sort direction is descending, false if sort
 * direction is ascending.
 * @param field {String} The field to sort by, from sortOptions.field
 * @return {YAHOO.widget.Record[]} Sorted array of Records.
 */
YAHOO.widget.RecordSet.prototype.sortRecords = function(fnSort, desc, field) {
	var recs = this._records;
	var groupByNum = -1;
	var isGroupColumn = false;
	var groupCount = 0;
	var groupRecs = [];
	
	if(field == null || this.groupKeys == null || this.groupKeys.length == 0) return this._records.sort(function(a, b) {return fnSort(a, b, desc, field);});

	var fieldInGroup = false;
	var i = this.groupKeys.length;
	while (i--) {
		if (this.groupKeys[i] === field) fieldInGroup = true;
	}
	if(fieldInGroup) {
		// column we are sorting by is a grouping column (left side of group divider)
		isGroupColumn = true;
		groupByNum = this.groupKeys.indexOf(field);
	} else {
		// right side
		groupByNum = this.groupKeys.length - 1;
	}

	/**
	 *	Custom sorting function that builds a new record set from the existing
	 *  by turning the groups into a segmented tree and once done traversing, it
	 *  will sort the leaf nodes within each of their own groups. 
	 *  returns an ordered record set
	 */
	function sortGroupRecs(recs, target, groupCount) {
		// group records have been rebuilt and re ordered within 
		// each segmented 'target' group.
		if(groupCount > groupByNum) {
			return recs;
		}
		
		for(var i=0, l=recs.length; i<l; i++) {
			if(recs[i].groupNum == groupCount || !target[target.length - 1]) {
				recs[i].members = [];
				target.push(recs[i]);
			} else {
				target[target.length - 1].members.push(recs[i]);
			}
		}	
		
		// This checks to see if segmentation of groups has been completed.
		// It will then sort the leaf nodes before recursing one more time 
		// to return the final record set.
		if(groupByNum == groupCount) { 	
			if(isGroupColumn) { // sort on left side of the grouping divider
				target.sort(function(a, b) {return fnSort(a, b, desc, field);});
			} else {
				for(var i=0, l=target.length; i<l; i++) {
					target[i].members.sort(function(a, b) {return fnSort(a, b, desc, field);});
				}
			}
		}	
		
		var allChildren = [];
		groupCount++;
		for(var j=0; j<target.length; j++) {	
			allChildren = allChildren.concat([target[j]], sortGroupRecs(target[j].members.slice(0), target[j].members = [], groupCount));
		}
		return allChildren;
	}
	var r = sortGroupRecs(recs, groupRecs, groupCount);
	this._records = r;
	return r;
};


/**
 * Reverses all Records, so ["one", "two", "three"] becomes ["three", "two", "one"].
 *
 * @method reverseRecords
 * @return {YAHOO.widget.Record[]} Reverse-sorted array of Records.
 */
YAHOO.widget.RecordSet.prototype.reverseRecords = function() {
	var el = this.getThEl(target) || this.getTdEl(target);
	// Shortcut for the frequently-used compare method
	var compare = YAHOO.util.Sort.compare;
	console.log('asdf');
	// Default sort function if necessary
	var sortFnc = function(a, b, desc, field) {
			var sorted = compare(a.getData(field),b.getData(field), desc);
			if(sorted === 0) {
				return compare(a.getCount(),b.getCount(), desc); // Bug 1932978
			}
			else {
				return sorted;
			}
		};

	console.log('asdf');
	// Get the field to sort
	var sField = (oColumn.sortOptions && oColumn.sortOptions.field) ? oColumn.sortOptions.field : oColumn.field;

	// Sort the Records        
	this._oRecordSet.sortRecords(sortFnc, ((sSortDir == DT.CLASS_DESC) ? true : false), sField);
	console.log('asdf');
};
