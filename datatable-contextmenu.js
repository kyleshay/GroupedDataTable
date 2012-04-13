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
var _cmenu;
var _renderTo;
var _groupKeys;

// right click menu to edit column visibility 					
var onContextMenuClick = function(p_sType, p_aArgs, p_myDataTable) {	
	var value = p_myDataTable.getColumn(p_aArgs[1].value);
	if(value && !value.grouping) {
		if(value.hidden) {
			p_myDataTable.showColumn(value);
			p_aArgs[1].cfg.setProperty("checked", true);			
		} else {
			p_myDataTable.hideColumn(value);
			p_aArgs[1].cfg.setProperty("checked", false);
		}
	}
}; 
 
// adds a context menu to a yui datatable that will show/hide columns
//   upon the click of the parent's label
YAHOO.widget.DataTable.prototype.addContextMenu = function(renderTo) {

	// initate if table's theader is right clicked	
	_renderTo = renderTo;
	_cmenu = new YAHOO.widget.ContextMenu("mycontextmenu", {
		trigger: this.getTheadEl()
	});	

	// iterate through parent columns, ignore 'GROUPCOL'
	//   add column label as menu item label
	var cols = this.getColumnSet().flat;
	for(var i=0, l=cols.length; i<l; i++) {
		if(cols[i].getParent() == null && cols[i].getKey() != 'GROUPCOL') {
			if(cols[i].label == null) cols[i].label = cols[i].getKey();
			_cmenu.addItem({text:cols[i].label.replace(/(<([^>]+)>)/ig,""), value:cols[i].getKey(), checked:!cols[i].hidden, disabled:cols[i].grouping});
		}
	}
	
	// Render the ContextMenu instance to the parent container of the DataTable
	_cmenu.render(_renderTo);
	_cmenu.clickEvent.subscribe(onContextMenuClick, this);
	
	this.subscribe("columnGroupEvent", function(oArgs) {
		_groupKeys = oArgs.groupKeys;
		this.updateContextMenu();
	});	
};

// this is to be called when columns are reordered
YAHOO.widget.DataTable.prototype.updateContextMenu = function() {
	// remove all the menu items since they will be re-added.
	_cmenu.clearContent();
	
	// iterate through parent columns, ignore 'GROUPCOL'
	//   add column label as menu item label
	var cols = this.getColumnSet().flat;
	
	for(var i=0, l=cols.length; i<l; i++) {
		if(cols[i].getParent() == null && cols[i].getKey() != 'GROUPCOL') {
			var fieldInGroup = false;
			var j = _groupKeys.length;
			while (j--) {
				if (_groupKeys[j] === cols[i].getKey()) fieldInGroup = true;
			}
			_cmenu.addItem({text:cols[i].label.replace(/(<([^>]+)>)/ig,""), value:cols[i].getKey(), checked:!cols[i].hidden, disabled:fieldInGroup});
		}
	}

	// reassign the trigger and where to render. 
	//   the datatable's thead is destroyed upon dragging columns
	//   so it must be reset.
	_cmenu.cfg.setProperty("trigger", this.getTheadEl());
	_cmenu.render(_renderTo);
};