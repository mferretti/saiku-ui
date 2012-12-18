/*  
 *   Copyright 2012 OSBI Ltd
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */


var LOOKUP_COUNTRY_MAP;
var CENTROIDS;
/**
 * Renders a stats for each workspace
 */
var Clorophet = Backbone.View
		.extend({
			initialize : function(args) {

				this.workspace = args.workspace;

				// Create a unique ID for use as the CSS selector
				this.id = _.uniqueId("clorophet_");
				$(this.el).attr({
					id : this.id,
				});

				// Bind table rendering to query result event
				_.bindAll(this, "render", "receive_data", "process_data",
						"show", "setOptions");
				this.workspace.bind('query:result', this.receive_data);

				// Add stats button
				this.add_button();
				this.workspace.toolbar.stats = this.show;

				// Listen to adjust event and rerender stats
				this.workspace.bind('workspace:adjust', this.render);

				// Append stats to workspace
				$(this.workspace.el).find('.workspace_results').prepend(
						$(this.el).hide());
			},

			add_button : function() {
				var $stats_button = $(
						'<a href="#stats" class="stats button disabled_toolbar i18n" title="Clorophet Map"></a>')
						.css(
								{
									'background-image' : "url('js/saiku/plugins/Clorophet/world.png')",
									'background-repeat' : 'no-repeat',
									'background-position' : '50% 50%'
								});

				var $stats_li = $('<li class="seperator"></li>').append(
						$stats_button);
				$(this.workspace.toolbar.el).find("ul").append($stats_li);
			},

			show : function(event, ui) {
				$(this.workspace.el).find('.workspace_results table').toggle();
				$(this.el).toggle();
				$(event.target).toggleClass('on');

				if ($(event.target).hasClass('on')) {
					this.render();
				}
			},

			setOptions : function(event) {
				var type = $(event.target).attr('href').replace('#', '');
				try {
					this[type]();
				} catch (e) {
				}

				return false;
			},

			render : function() {
				if (!$(this.workspace.toolbar.el).find('.stats').hasClass('on')) {
					return;
				}

				var group = function(grid, el, cback) {
					var elements = _.filter(_.map(grid, function(it) {
						return it[el];
					}), function(it) {
						return it;
					});
					return cback(elements).toFixed(3);
				};

				var extractedRow = function(grid, el) {
					var elements = _.filter(_.map(grid, function(it) {
						return it[el];
					}), function(it) {
						return it;
					});
					return elements;
				};

				$(this.el).empty();
				var grid = this.data.metadata;
				var rs = this.data.resultset;

				// settaggi per clorophet
				var MAP_SETTINGS = {
					type : 'none',
					indexes : '',
					series : '',
					mapId: '#clorophet_map',
					map : function(data) {
						if (data && maps[data]) {
							return maps[data];
						} else {
							return 'europe_mill_en'; // default value
						}
					},
					maps : {
						// TODO : this needs to be somewhere else ... like a config file
						country : "europe_mill_en", 
						area : "jquery.vmap.area.js",
						region : "jquery.vmap.region.js"
					},
					getSeries : function() {
						var tmp = '';
						var trimmer = '';
						var markerSeries = '';
						var markerSeries2 = '';
						var json = '';
						if (this.type == 'country') {
							for ( var idx = 0; idx < this.series[0].length; ++idx) {
								trimmer = this.indexes[0][idx].replace(
										/\[\d*\]/, '')
										.replace(/^\s+|\s+$/g, '');
								trimmer = _global_cloro_data(trimmer);
								tmp = tmp + '"' + trimmer + '":"'
										+ this.series[0][idx] + '",';
								if (this.series[1]) {
									markerSeries = markerSeries + '"' + trimmer
											+ '":'
											+ parseFloat(this.series[1][idx])
											+ ",";
								}
								if (this.series[2]) {
									markerSeries2 = markerSeries2 + '"'
											+ trimmer + '":'
											+ parseFloat(this.series[2][idx])
											+ ",";
								}
							}
							if (tmp.length > 0)
								tmp = tmp.substring(0, tmp.length - 1);
							if (markerSeries.length > 0)
								markerSeries = markerSeries.substring(0,
										markerSeries.length - 1);
							if (markerSeries2.length > 0)
								markerSeries2 = markerSeries2.substring(0,
										markerSeries2.length - 1);
						} else {
							tmp = '"series": [{}]';
							markerSeries = '';
							markerSeries2 = '';
						}

						if (markerSeries2.length > 0) {
							json = '{ "series": [{' + tmp + '}],"markers":[{'
									+ markerSeries + '},{' + markerSeries2
									+ '}]}';
						} else if (markerSeries.length > 0) {
							json = '{ "series": [{' + tmp + '}],"markers":[{'
									+ markerSeries + '}]}';
						} else {
							json = "{" + tmp + "}"
						}
						return JSON.parse(json);
					},
					emptySeries : {
						'' : ''
					}
				};
				for (colId in grid) {
					if (MAP_SETTINGS.type === 'none') {
						if (grid[colId].colName === 'Country') {
							MAP_SETTINGS.type = 'country';
						} else if (grid[colId].colName === 'Area') {
							MAP_SETTINGS.type = 'area';
						} else if (grid[colId].colName === 'Region') {
							MAP_SETTINGS.type = 'region';
						}
						if (MAP_SETTINGS.type !== 'none')
							MAP_SETTINGS.index = grid[colId].colName;
					}
				}

				var seriesAux = _.filter(grid, function(it) {
					return !it.isHeader && it.colType == 'Numeric';
				});
				var seriesColumns = _.map(seriesAux, function(it) {
					return it.colName;
				});
				var seriesColumnsIdxs = _.map(seriesColumns, function(el) {
					return _.indexOf(_.map(grid, function(it) {
						return it.colName;
					}), el);
				});
				var mapAux = _.filter(grid, function(it) {
					return it.isHeader;
				});
				var mapColumns = _.map(mapAux, function(it) {
					return it.colName;
				});
				var mapColumnsIdxs = _.map(mapColumns, function(el) {
					return _.indexOf(_.map(grid, function(it) {
						return it.colName;
					}), el);
				});
				// end of clorophet settings

				if (MAP_SETTINGS.type !== 'none') {
					MAP_SETTINGS.series = _.map(seriesColumnsIdxs,
							function(it) {
								return extractedRow(rs, it);
							});
					MAP_SETTINGS.indexes = _.map(mapColumnsIdxs, function(it) {
						return extractedRow(rs, it);
					});
				}
				var $map = $("<div id='clorophet_map' class='map'></div>");
				$(this.el).append($map);
				paint_map(MAP_SETTINGS);
				Saiku.i18n.translate();
			},

			receive_data : function(args) {
				return _.delay(this.process_data, 0, args);
			},

			process_data : function(args) {
				this.data = {};
				this.data.resultset = [];
				this.data.metadata = [];
				this.data.height = 0;
				this.data.width = 0;

				if (args.data.cellset && args.data.cellset.length > 0) {

					var lowest_level = 0;
					var isHead = true;
					var columnNames = new Array();
					for ( var row = 0; row < args.data.cellset.length; row++) {
						if (isHead
								&& (args.data.cellset[row][0].type == "ROW_HEADER_HEADER" || args.data.cellset[row][0].value == "null")) {
							this.data.metadata = [];
							for ( var field = 0; field < args.data.cellset[row].length; field++) {
								if (args.data.cellset[row][field].type == "ROW_HEADER_HEADER") {
									this.data.metadata.shift();
									lowest_level = field;
								}
								if (columnNames[field]) {
									columnNames[field]
											.push(args.data.cellset[row][field].value);
								} else {
									columnNames[field] = [ args.data.cellset[row][field].value ];
								}
								if (args.data.cellset[row][0].type == "ROW_HEADER_HEADER") {
									this.data.metadata
											.push({
												colIndex : field,
												colType : typeof (args.data.cellset[row + 1][field].value) !== "number"
														&& isNaN(args.data.cellset[row + 1][field].value
																.replace(
																		/[^a-zA-Z 0-9.]+/g,
																		'')) ? "String"
														: "Numeric",
												colName : columnNames[field]
														.join(' / '),
												isHeader : (args.data.cellset[row][field].type == "ROW_HEADER_HEADER")
											});
								}
							}
						} else if (args.data.cellset[row][lowest_level].value !== "null"
								&& args.data.cellset[row][lowest_level].value !== "") {
							isHead = false;
							var record = [];
							this.data.width = args.data.cellset[row].length;
							for ( var col = lowest_level; col < args.data.cellset[row].length; col++) {
								var value = args.data.cellset[row][col].value;
								// check if the resultset contains the raw
								// value, if not try to parse the given value
								if (args.data.cellset[row][col].properties.raw
										&& args.data.cellset[row][col].properties.raw !== "null") {
									value = parseFloat(args.data.cellset[row][col].properties.raw);
								} else if (typeof (args.data.cellset[row][col].value) !== "number"
										&& parseFloat(args.data.cellset[row][col].value
												.replace(/[^a-zA-Z 0-9.]+/g, ''))) {
									value = parseFloat(args.data.cellset[row][col].value
											.replace(/[^a-zA-Z 0-9.]+/g, ''));
								}
								if (col == lowest_level) {
									value += " [" + row + "]";
								}
								record.push(value);
							}
							this.data.resultset.push(record);
						}
					}
					this.data.height = this.data.resultset.length;
					this.render();
				} else {
					$(this.el).text("No results");
				}
			}
		});

/**
 * Start Plugin
 */
Saiku.events.bind('session:new', function(session) {

	function new_workspace(args) {
		// Add stats element
		if (typeof args.workspace.clorophet == "undefined") {
			args.workspace.clorophet = new Clorophet({
				workspace : args.workspace
			});
		}
	}

	function clear_workspace(args) {
		if (typeof args.workspace.clorophet != "undefined") {
			$(args.workspace.clorophet.el).parents().find(
					'.workspace_results table').show();
			$(args.workspace.clorophet.el).hide();
		}
	}

	// Attach stats to existing tabs
	for ( var i = 0; i < Saiku.tabs._tabs.length; i++) {
		var tab = Saiku.tabs._tabs[i];
		new_workspace({
			workspace : tab.content
		});
	}
	;

	// Attach stats to future tabs
	Saiku.session.bind("workspace:new", new_workspace);
	Saiku.session.bind("workspace:clear", clear_workspace);
});

/**
 * methods for painting the map
 */

function iterator(data, key) {
	return data[key];
}

function paint_map(settings) {
	var data = settings.getSeries();
	var markers=[];
	var centroids={};
	var regions=[];
	
	var markerSeries1 ={};
	
	if (data['markers']){
		regions= [ {
			values : data['series'][0],
			scale : [ '#C8EEFF', '#006491' ],
			normalizeFunction : 'polynomial'
		} ];
		
		centroids = getCentroids(data['markers'][0]),
		markerSeries1 = data['markers'][0];
		if (data['markers'][1]) {
			var markerSeries2 = data['markers'][1];
			markers= [ {
				attribute : 'r',
				scale : [ 5, 20 ],
				values : markerSeries1,
			}, {
				attribute : 'fill',
				scale : [ '#FEE5D9', '#A50F15' ],
				values : markerSeries2,
			} ];
		} else if (data['markers'][0]) {
			markers= [ {
				attribute : 'r',
				scale : [ 5, 20 ],
				values : markerSeries1,
			} ];
		}
	} else { 
		regions= [ {
			values : data,
			scale : [ '#C8EEFF', '#006491' ],
			normalizeFunction : 'polynomial'
		} ];
	}

	$(settings.mapId).vectorMap(
			{
				backgroundColor : '#C4C4C4',
				map : 'europe_mill_en',
				markers : centroids,
				series : {
					regions : regions,
					markers : markers
				},
				onMarkerLabelShow : function(event, label, index) {
					if (data['markers'][1]) {
						label
						.html('<b>' + index
								+ '</b><br/>' + '<b>series1:</b>'
								+ markerSeries1[index]
								+ '<br/><b>series2:</b>'
								+ markerSeries2[index]);
					} else {
						label.html('<b>' + index
								+ '</b><br/>' + '<b>series1:</b>'
								+ markerSeries1[index]);
					}
				},
				onRegionLabelShow : function(event, label, code) {
					if (data['series'][0][code]) {
						label.html('<b>' + label.html() + '</b></br></b>'
								+ data['series'][0][code]);
					} else {
						event.preventDefault(); // do not show the tooltip
					}
				}
			});
}
//
// Utility methods
//

/**
 * 
 * @param value
 * @returns
 */

function loadJsonData(filename){
	var json = null;
	$.ajax({
	  url: filename,
	  async: false,
	  dataType: 'json',
	  success: function (response) {
		  json=response;
	  },
	  error: function() { 
		  console.log('error loading lookup map file ' + filename) ;
	  }
	});
	return json;
	
}
function _global_cloro_data(value) {
	if ( !LOOKUP_COUNTRY_MAP ) {
		LOOKUP_COUNTRY_MAP=loadJsonData("js/saiku/plugins/Clorophet/lookupCountryMap.json");
	}
	return LOOKUP_COUNTRY_MAP[value];
}


function getCentroids(data) {
	var region, centroid, markers = {};
	if ( !CENTROIDS ) {
		CENTROIDS=loadJsonData("js/saiku/plugins/Clorophet/centroids.json");
	}
	for (region in data) {
		centroid = CENTROIDS[region];
		centroid || (centroid = {
			"latLng" : [ 0, 0 ],
			"name" : region
		});
		markers[region] = centroid;
	}
	return markers;
}
