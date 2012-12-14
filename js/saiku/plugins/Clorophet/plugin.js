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
					map : function(data) {
						if (data && maps[data]) {
							return maps[data];
						} else {
							return 'europe_mill_en'; // default value
						}
					},
					maps : {
						country : "europe_mill_en",
						area : "jquery.vmap.area.js",
						region : "jquery.vmap.region.js"
					},
					getSeries : function() {
						var tmp = '';
						var trimmer = '';
						var markerSeries = '';
						var json = '';
						if (this.type == 'country') {
							for ( var idx = 0; idx < this.series[0].length; ++idx) {
								trimmer = this.indexes[0][idx].replace(
										/\[\d*\]/, '')
										.replace(/^\s+|\s+$/g, '');
								trimmer = _global_cloro_data(trimmer);
								tmp = tmp + '"' + trimmer + '":"' + this.series[0][idx] + '",';
								if (this.series[1]) {
									markerSeries = markerSeries + '"' + trimmer + '":' + parseFloat(this.series[1][idx]) + ",";
								}
							}
							if (tmp.length > 0)
								tmp = tmp.substring(0, tmp.length - 1);
							if (markerSeries.length > 0)
								markerSeries = markerSeries.substring(0,
										markerSeries.length - 1);
						} else {
							tmp = this.emptySeries;
							markerSeries = this.emptySeries;
						}
						if (markerSeries.length > 0) {
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
					/*
					 * read map type
					 * read color series
					 * TODO : read and transform country/area/region codes 
					 * 
					 */
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
				var $hiddenmap = $("<div id='hidden_clorophet_map' '></div>");
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
								// check if the resultset contains the raw value, if not try to parse the given value
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

function createColors(data) {

	var max = 0, min = Number.MAX_VALUE, cc, startColor = [ 222, 235, 247 ], endColor = [
			8, 81, 156 ], colors = {}, hex;
	//find maximum and minimum values
	for (cc in data) {
		if (parseFloat(data[cc]) > max) {
			max = parseFloat(data[cc]);
		}
		if (parseFloat(data[cc]) < min) {
			min = parseFloat(data[cc]);
		}
	}
	//set colors according to values 
	for (cc in data) {
		if (data[cc] > 0) {
			colors[cc] = '#';
			for ( var i = 0; i < 3; i++) {
				hex = Math.round(
						startColor[i] + (endColor[i] - startColor[i])
								* (data[cc] / (max - min))).toString(16);
				if (hex.charAt(0) === '-') {
					hex = hex.substr(1);
				}
				if (hex.length == 1) {
					hex = '0' + hex;
				}
				colors[cc] += (hex.length == 1 ? '0' : '') + hex;
			}
		}
	}
	return colors;
}

function maxAndMin(data) {
	var max = 0, min = Number.MAX_VALUE, cc;
	for (cc in data) {
		if (parseFloat(data[cc]) > max) {
			max = parseFloat(data[cc]);
		}
		if (parseFloat(data[cc]) < min) {
			min = parseFloat(data[cc]);
		}
	}
	return new Array(max, min);
}

function getCentroid(selection) {
	var element = selection.node;
	bbox = element.getBBox();
	return [ bbox.x + bbox.width / 2, bbox.y + bbox.height / 2 ];
}

function mapWithMarkers(settings, data, mapId) {
	var markerslist = getCentroids(data['markers'][0]);
	mapHook = $(mapId);
	mapHook
			.vectorMap({
				map : settings.map(),
				markers : markerslist,
				backgroundColor : '#C4C4C4',
				series : {
//					regions : [ {
//						values : data['series'][0],
//						scale : [ '#C8EEFF', '#006491' ],
//						normalizeFunction : 'polynomial'
//					} ],
					markers : [ {
						attribute : 'r',
						scale : [ 5, 20 ],
						normalizeFunction: 'polynomial',
						values : data['markers'][0],
						min: jvm.min(data['markers'][0]),
						max: jvm.max(data['markers'][0])        	      

					} ]
				},
				showTooltip : true,
				onRegionLabelShow : function(event, label, code) {
					if (data['series'][0][code]) {
						label.html('<b>' + label.html() + '</b></br></b>'
								+ data['series'][0][code]); // make the label pretty
					} else {
						event.preventDefault(); // do not show the tooltip
					}
				},
				regionStyle : {
					hover : false
				}
			});
}

function getCentroids(data) {
	var region, centroid, markers = [];
	for (region in data) {
		centroid = centroids[region];
		centroid || (centroid={"latLng": [0,0], "name": region });
		markers[region]=centroid;
	}
	return markers;
}


function mapOnly(settings, data, mapid) {
	var mapHook = $(mapId);
	mapHook
			.vectorMap({
				map : settings.map(),
				backgroundColor : '#C4C4C4',
				series : {
					regions : [ {
						values : data,
						scale : [ '#C8EEFF', '#006491' ],
						normalizeFunction : 'polynomial'
					} ]
				},
				showTooltip : true,
				onRegionLabelShow : function(event, label, code) {
					if (data[code]) {
						label.html('<b>' + label.html() + '</b></br></b>'
								+ data[code]); // make the label pretty
					} else {
						event.preventDefault(); // do not show the tooltip
					}
				},
				regionStyle : {
					hover : false
				}
			});
}

function paint_map(settings) {
	console.log('painting map : ' + settings.map());
	var data = settings.getSeries();
//	var mapHook = $('#clorophet_map');
	if (data['markers']) {
		mapWithMarkers(settings, data, '#clorophet_map');
	} else {
		mapOnly(settings, data, '#clorophet_map');
	}
}


var centroids={
		SJ	:{	LatLng:[	76.8591165896	,	16.0969591141	]	,	name:'SJ'},
		IS	:{	LatLng:[	64.7907925848	,	-19.0131257	]	,	name:    'IS'},
		FO	:{	LatLng:[	62.0570939585	,	-6.9948547	]	,	name:    'FO'},
		GL	:{	LatLng:[	61.7083820751	,	-42.2554637	]	,	name:    'GL'},
		FI	:{	LatLng:[	60.3356187901	,	26.06832405	]	,	name:    'FI'},
		LV	:{	LatLng:[	57.1453750186	,	24.60559855	]	,	name:    'LV'},
		NO	:{	LatLng:[	68.6082724618	,	18.00477455	]	,	name:    'NO'},
		EE	:{	LatLng:[	58.7231308968	,	25.80743905	]	,	name:    'EE'},
		BY	:{	LatLng:[	51.5661492645	,	27.9598583906	]	,	name:'BY'},
		SE	:{	LatLng:[	59.0617155069	,	17.63434405	]	,	name:    'SE'},
		LT	:{	LatLng:[	55.1446358096	,	23.94318005	]	,	name:    'LT'},
		DK	:{	LatLng:[	54.9474884605	,	9.5169593	]	,	name:    'DK'},
		IM	:{	LatLng:[	54.2262991521	,	-4.555637598	]	,	name:'IM'},
		PL	:{	LatLng:[	51.8785955371	,	19.1343868	]	,	name:    'PL'},
		MN	:{	LatLng:[	46.0049050162	,	103.8357756897	]	,	name:'MN'},
		IE	:{	LatLng:[	51.8086677478	,	-8.2395732	]	,	name:    'IE'},
		BE	:{	LatLng:[	50.7124562931	,	4.47667405	]	,	name:    'BE'},
		NL	:{	LatLng:[	52.168216513	,	5.33051555	]	,	name:    'NL'},
		CZ	:{	LatLng:[	49.8710817359	,	15.47528855	]	,	name:    'CZ'},
		LU	:{	LatLng:[	49.7528254617	,	6.13354455	]	,	name:    'LU'},
		UK	:{	LatLng:[	53.2738257155	,	-2.23261195	]	,	name:    'UK'},
		SK	:{	LatLng:[	48.7995331298	,	19.70020105	]	,	name:    'SK'},
		GG	:{	LatLng:[	49.4598100166	,	-2.5958002806	]	,	name:'GG'},
		JE	:{	LatLng:[	49.2290195778	,	-2.1410565376	]	,	name:'JE'},
		HU	:{	LatLng:[	46.126319666	,	19.5036003	]	,	name:    'HU'},
		MD	:{	LatLng:[	46.848698718	,	28.3926183	]	,	name:    'MD'},
		DE	:{	LatLng:[	47.4511351606	,	10.4542458	]	,	name:    'DE'},
		AT	:{	LatLng:[	47.4522340968	,	13.34598005	]	,	name:    'AT'},
		LI	:{	LatLng:[	47.1376947306	,	9.55405105	]	,	name:    'LI'},
		SI	:{	LatLng:[	46.0518456722	,	14.98661705	]	,	name:    'SI'},
		PM	:{	LatLng:[	46.858301116	,	-56.3368244171	]	,	name:'PM'},
		RS	:{	LatLng:[	43.772349013	,	20.9222053	]	,	name:    'RS'},
		UA	:{	LatLng:[	49.3514542351	,	31.1827403	]	,	name:    'UA'},
		CH	:{	LatLng:[	46.9680736726	,	8.22404255	]	,	name:    'CH'},
		BA	:{	LatLng:[	42.9389841208	,	17.671719513	]	,	name:'BA'},
		RO	:{	LatLng:[	45.7269377819	,	24.99122905	]	,	name:    'RO'},
		KZ	:{	LatLng:[	48.0038990475	,	66.9022574853	]	,	name:'KZ'},
		BG	:{	LatLng:[	42.4650434612	,	25.4823218	]	,	name:    'BG'},
		SM	:{	LatLng:[	43.9337021534	,	12.46033005	]	,	name:    'SM'},
		MC	:{	LatLng:[	43.7317907993	,	7.42424455	]	,	name:    'MC'},
		GE	:{	LatLng:[	42.0476984034	,	43.3657987641	]	,	name:'GE'},
		ME	:{	LatLng:[	42.1031045683	,	19.400097987	]	,	name:'ME'},
		XI	:{	LatLng:[	45.0975319683	,	147.8777542114	]	,	name:'XI'},
		KG	:{	LatLng:[	41.6703247449	,	74.7796140387	]	,	name:'KG'},
		HR	:{	LatLng:[	43.515138473	,	16.4685578	]	,	name:    'HR'},
		AL	:{	LatLng:[	41.0722525003	,	20.169941998	]	,	name:'AL'},
		AD	:{	LatLng:[	42.5462239633	,	1.59981055	]	,	name:    'AD'},
		RU	:{	LatLng:[	63.8828821522	,	103.658881444	]	,	name:'RU'},
		MK	:{	LatLng:[	41.5885601885	,	21.7460586089	]	,	name:'MK'},
		CA	:{	LatLng:[	58.5508271398	,	-98.3076210022	]	,	name:'CA'},
		VA	:{	LatLng:[	41.7373726414	,	12.65642405	]	,	name:    'VA'},
		AM	:{	LatLng:[	40.3998266462	,	45.0385435632	]	,	name:'AM'},
		UZ	:{	LatLng:[	41.2146473437	,	64.565968895	]	,	name:'UZ'},
		TJ	:{	LatLng:[	37.9334643752	,	71.2621765722	]	,	name:'TJ'},
		AZ	:{	LatLng:[	40.3992478553	,	47.6985530619	]	,	name:'AZ'},
		TM	:{	LatLng:[	39.7010771647	,	59.5576447786	]	,	name:'TM'},
		AF	:{	LatLng:[	31.3524981875	,	67.6789371665	]	,	name:'AF'},
		KP	:{	LatLng:[	38.7298553051	,	127.4953727877	]	,	name:'KP'},
		SY	:{	LatLng:[	35.0863644902	,	38.9858167047	]	,	name:'SY'},
		XJ	:{	LatLng:[	37.2431154334	,	131.8698120117	]	,	name:'XJ'},
		DZ	:{	LatLng:[	28.5557884048	,	1.6528406143	]	,	name:'DZ'},
		XH	:{	LatLng:[	32.6982365032	,	75.9100615167	]	,	name:'XH'},
		TR	:{	LatLng:[	39.1274862298	,	35.4396575472	]	,	name:'TR'},
		GI	:{	LatLng:[	36.1360352388	,	-5.35283295	]	,	name:    'GI'},
		MT	:{	LatLng:[	35.8844420578	,	14.4474608	]	,	name:    'MT'},
		XC	:{	LatLng:[	34.9701876392	,	79.1337661218	]	,	name:'XC'},
		MA	:{	LatLng:[	31.7487100828	,	-7.0801638365	]	,	name:'MA'},
		CY	:{	LatLng:[	35.0482800421	,	33.4286823	]	,	name:    'CY'},
		IT	:{	LatLng:[	42.7921054959	,	12.5738378	]	,	name:    'IT'},
		GR	:{	LatLng:[	38.2643590826	,	23.32199905	]	,	name:    'GR'},
		LB	:{	LatLng:[	33.942136926	,	35.8701493389	]	,	name:'LB'},
		KR	:{	LatLng:[	36.6236883323	,	127.8502197266	]	,	name:'KR'},
		TN	:{	LatLng:[	33.797281569	,	9.5615487099	]	,	name:'TN'},
		JO	:{	LatLng:[	30.6522364863	,	37.1305885211	]	,	name:'JO'},
		IL	:{	LatLng:[	30.4520522942	,	34.9687068748	]	,	name:'IL'},
		LY	:{	LatLng:[	26.98052148	,	17.2675343427	]	,	name:    'LY'},
		BM	:{	LatLng:[	32.2795754363	,	-64.7862854004	]	,	name:'BM'},
		PS	:{	LatLng:[	31.5683103913	,	35.2283427389	]	,	name:'PS'},
		XE	:{	LatLng:[	32.7598320859	,	79.3507952105	]	,	name:'XE'},
		NP	:{	LatLng:[	28.3773655391	,	84.1278040317	]	,	name:'NP'},
		PT	:{	LatLng:[	39.4242354935	,	-7.84494095	]	,	name:    'PT'},
		IQ	:{	LatLng:[	33.5927592872	,	43.6842041256	]	,	name:'IQ'},
		KW	:{	LatLng:[	29.531416692	,	47.4945269792	]	,	name:'KW'},
		XD	:{	LatLng:[	28.4156327841	,	94.4859490722	]	,	name:'XD'},
		BT	:{	LatLng:[	27.4728406405	,	90.4422372911	]	,	name:'BT'},
		ES	:{	LatLng:[	40.0683756021	,	-2.98815745	]	,	name:    'ES'},
		EH	:{	LatLng:[	25.380991934	,	-12.8867287636	]	,	name:'EH'},
		XN	:{	LatLng:[	25.7722064178	,	123.5290107727	]	,	name:'XN'},
		BH	:{	LatLng:[	26.0434951165	,	50.5486125946	]	,	name:'BH'},
		IR	:{	LatLng:[	31.7811389872	,	53.6748573156	]	,	name:'IR'},
		ML	:{	LatLng:[	18.9556949566	,	-3.9951882836	]	,	name:'ML'},
		QA	:{	LatLng:[	25.3463679556	,	51.1969394684	]	,	name:'QA'},
		AE	:{	LatLng:[	23.432113161	,	53.978969811	]	,	name:'AE'},
		JP	:{	LatLng:[	35.3508463358	,	136.4690322876	]	,	name:'JP'},
		PK	:{	LatLng:[	27.8108957202	,	68.1297053824	]	,	name:'PK'},
		NE	:{	LatLng:[	17.2632125815	,	8.0809463337	]	,	name:'NE'},
		TD	:{	LatLng:[	15.2001267379	,	18.7380681038	]	,	name:'TD'},
		EG	:{	LatLng:[	26.6480283893	,	30.2460348713	]	,	name:'EG'},
		XF	:{	LatLng:[	22.5144131784	,	35.4883708954	]	,	name:'XF'},
		LA	:{	LatLng:[	18.8046890893	,	103.8949053178	]	,	name:'LA'},
		HK	:{	LatLng:[	22.4419646183	,	114.1525907432	]	,	name:'HK'},
		MO	:{	LatLng:[	22.1990654757	,	113.5479772025	]	,	name:'MO'},
		XK	:{	LatLng:[	21.8664748108	,	33.6351280212	]	,	name:'XK'},
		BS	:{	LatLng:[	24.7630673503	,	-78.0800209045	]	,	name:'BS'},
		TC	:{	LatLng:[	21.8078887413	,	-71.7451210022	]	,	name:'TC'},
		BD	:{	LatLng:[	22.1241278446	,	90.3509979248	]	,	name:'BD'},
		CU	:{	LatLng:[	22.1013406561	,	-79.545841217	]	,	name:'CU'},
		US	:{	LatLng:[	28.6698488997	,	-95.8133468628	]	,	name:'US'},
		MR	:{	LatLng:[	20.5847322657	,	-10.9470973015	]	,	name:'MR'},
		KY	:{	LatLng:[	19.317572553	,	-81.2612991333	]	,	name:'KY'},
		CN	:{	LatLng:[	32.3194323106	,	104.1685568999	]	,	name:'CN'},
		XL	:{	LatLng:[	18.4097395557	,	-75.0147819519	]	,	name:'XL'},
		VG	:{	LatLng:[	18.4299280826	,	-64.6354866028	]	,	name:'VG'},
		AI	:{	LatLng:[	18.2175025587	,	-63.0716876984	]	,	name:'AI'},
		PR	:{	LatLng:[	18.2286236978	,	-66.4288902283	]	,	name:'PR'},
		SD	:{	LatLng:[	12.9746956722	,	30.2092113495	]	,	name:'SD'},
		HT	:{	LatLng:[	18.3252062666	,	-73.0459709167	]	,	name:'HT'},
		JM	:{	LatLng:[	18.1189102234	,	-77.2734794617	]	,	name:'JM'},
		GT	:{	LatLng:[	15.7977935996	,	-90.2323455811	]	,	name:'GT'},
		VI	:{	LatLng:[	17.740087888	,	-64.7362632751	]	,	name:'VI'},
		DO	:{	LatLng:[	18.927919874	,	-70.1617431641	]	,	name:'DO'},
		OM	:{	LatLng:[	21.4354747286	,	55.9182903965	]	,	name:'OM'},
		KN	:{	LatLng:[	17.3361400618	,	-62.7473487854	]	,	name:'KN'},
		AG	:{	LatLng:[	17.081206985	,	-61.7894229889	]	,	name:'AG'},
		BZ	:{	LatLng:[	17.2116806625	,	-88.6528358459	]	,	name:'BZ'},
		MS	:{	LatLng:[	16.7447521632	,	-62.1945018768	]	,	name:'MS'},
		SN	:{	LatLng:[	12.9760725509	,	-14.4360346794	]	,	name:'SN'},
		SA	:{	LatLng:[	23.302841632	,	45.1212806809	]	,	name:'SA'},
		MX	:{	LatLng:[	23.8667189423	,	-101.9300613403	]	,	name:'MX'},
		XA	:{	LatLng:[	15.7823782703	,	111.2005348206	]	,	name:'XA'},
		DM	:{	LatLng:[	15.3953002081	,	-61.3641300201	]	,	name:'DM'},
		XM	:{	LatLng:[	15.0902462734	,	117.72108078	]	,	name:'XM'},
		BF	:{	LatLng:[	12.8000440862	,	-1.5567605495	]	,	name:'BF'},
		CV	:{	LatLng:[	15.0587104564	,	-23.6147670746	]	,	name:'CV'},
		ET	:{	LatLng:[	9.2265900061	,	40.493188858	]	,	name:'ET'},
		MP	:{	LatLng:[	15.2049539128	,	145.7648010254	]	,	name:'MP'},
		LC	:{	LatLng:[	13.883192199	,	-60.9741687775	]	,	name:'LC'},
		GM	:{	LatLng:[	13.5749043407	,	-15.3080034256	]	,	name:'GM'},
		GU	:{	LatLng:[	13.4588821578	,	144.7864074707	]	,	name:'GU'},
		BB	:{	LatLng:[	13.1375578387	,	-59.5354137421	]	,	name:'BB'},
		HN	:{	LatLng:[	14.8620122024	,	-86.2530021667	]	,	name:'HN'},
		SV	:{	LatLng:[	13.7508023245	,	-88.9194908142	]	,	name:'SV'},
		ER	:{	LatLng:[	14.7901175174	,	39.786699295	]	,	name:'ER'},
		DJ	:{	LatLng:[	11.2654966634	,	42.5947494507	]	,	name:'DJ'},
		AW	:{	LatLng:[	12.4993427715	,	-69.9647674561	]	,	name:'AW'},
		VC	:{	LatLng:[	13.2451215994	,	-61.1970653534	]	,	name:'VC'},
		BJ	:{	LatLng:[	9.0425984662	,	2.3127754927	]	,	name:'BJ'},
		GD	:{	LatLng:[	12.1035352836	,	-61.6989421844	]	,	name:'GD'},
		NI	:{	LatLng:[	12.621320491	,	-85.4240531921	]	,	name:'NI'},
		YE	:{	LatLng:[	15.8563630381	,	47.851571118	]	,	name:'YE'},
		AN	:{	LatLng:[	12.1429352397	,	-68.9447059631	]	,	name:'AN'},
		GH	:{	LatLng:[	8.0975622228	,	-1.0318194628	]	,	name:'GH'},
		TG	:{	LatLng:[	8.3678958704	,	0.8304219469	]	,	name:'TG'},
		CF	:{	LatLng:[	6.9976286549	,	20.9421072006	]	,	name:'CF'},
		GW	:{	LatLng:[	11.3588727247	,	-15.1760674893	]	,	name:'GW'},
		XB	:{	LatLng:[	10.7288388949	,	115.8238563538	]	,	name:'XB'},
		TT	:{	LatLng:[	10.4217303385	,	-61.4171333313	]	,	name:'TT'},
		CP	:{	LatLng:[	10.2972843724	,	-109.2163047791	]	,	name:'CP'},
		KH	:{	LatLng:[	12.5175379518	,	104.9830513	]	,	name:    'KH'},
		MM	:{	LatLng:[	16.9295625519	,	96.6786998107	]	,	name:'MM'},
		GN	:{	LatLng:[	11.0031944082	,	-11.2838447094	]	,	name:'GN'},
		VE	:{	LatLng:[	5.8090222573	,	-66.5890464783	]	,	name:'VE'},
		LR	:{	LatLng:[	6.3453490783	,	-9.4285976887	]	,	name:'LR'},
		LK	:{	LatLng:[	7.6622194294	,	80.7857551575	]	,	name:'LK'},
		VN	:{	LatLng:[	10.1040226651	,	105.8055426344	]	,	name:'VN'},
		SL	:{	LatLng:[	8.5599378635	,	-11.7959342003	]	,	name:'SL'},
		PA	:{	LatLng:[	7.5583154246	,	-80.11277771	]	,	name:'PA'},
		IN	:{	LatLng:[	22.5210001148	,	82.6768785447	]	,	name:'IN'},
		PW	:{	LatLng:[	7.4808893556	,	134.5638885498	]	,	name:'PW'},
		GY	:{	LatLng:[	4.5763450432	,	-58.9382610321	]	,	name:'GY'},
		TH	:{	LatLng:[	6.3764490154	,	101.4930000305	]	,	name:'TH'},
		SR	:{	LatLng:[	2.0008753921	,	-56.0339660302	]	,	name:'SR'},
		CR	:{	LatLng:[	9.4792983917	,	-84.2535743713	]	,	name:'CR'},
		FM	:{	LatLng:[	6.8728181913	,	158.2238311768	]	,	name:'FM'},
		XG	:{	LatLng:[	4.752479444	,	34.9436149597	]	,	name:    'XG'},
		CI	:{	LatLng:[	7.76600425	,	-5.5470995903	]	,	name:    'CI'},
		BN	:{	LatLng:[	4.009011885	,	114.6140489454	]	,	name:    'BN'},
		PH	:{	LatLng:[	13.9111555995	,	121.9739723206	]	,	name:'PH'},
		CM	:{	LatLng:[	5.3683168743	,	12.3434815407	]	,	name:'CM'},
		NG	:{	LatLng:[	8.9470307733	,	8.6735500097	]	,	name:'NG'},
		MH	:{	LatLng:[	7.091317536	,	171.1345596313	]	,	name:    'MH'},
		UG	:{	LatLng:[	1.3462489279	,	32.3046503067	]	,	name:'UG'},
		CG	:{	LatLng:[	-1.3348616596	,	14.9274244308	]	,	name:'CG'},
		CO	:{	LatLng:[	3.3644271248	,	-72.9578056335	]	,	name:'CO'},
		MY	:{	LatLng:[	2.8903689537	,	114.4015426636	]	,	name:'MY'},
		SG	:{	LatLng:[	1.3662733719	,	103.8231048584	]	,	name:'SG'},
		ST	:{	LatLng:[	0.2477339383	,	6.6194620132	]	,	name:'ST'},
		GA	:{	LatLng:[	-0.6211082957	,	11.5990390778	]	,	name:'GA'},
		UM	:{	LatLng:[	6.4780948033	,	-162.5613937378	]	,	name:'UM'},
		NR	:{	LatLng:[	-0.5293893991	,	166.9226074219	]	,	name:'NR'},
		MV	:{	LatLng:[	-0.6161462967	,	73.0967254639	]	,	name:'MV'},
		RW	:{	LatLng:[	-2.0654233671	,	29.876376152	]	,	name:'RW'},
		SO	:{	LatLng:[	4.3998702425	,	46.2008323669	]	,	name:'SO'},
		GQ	:{	LatLng:[	1.5852214625	,	10.3408236504	]	,	name:'GQ'},
		BI	:{	LatLng:[	-3.5132379797	,	29.9203948975	]	,	name:'BI'},
		EC	:{	LatLng:[	-1.1800392757	,	-78.0957946777	]	,	name:'EC'},
		KE	:{	LatLng:[	0.0142519736	,	37.903968811	]	,	name:'KE'},
		KI	:{	LatLng:[	1.8936221449	,	-157.6631546021	]	,	name:'KI'},
		CD	:{	LatLng:[	-7.936396744	,	21.7559962273	]	,	name:'CD'},
		IO	:{	LatLng:[	-7.4088386988	,	72.4224891663	]	,	name:'IO'},
		ZM	:{	LatLng:[	-14.5961738651	,	27.852684021	]	,	name:'ZM'},
		TL	:{	LatLng:[	-8.7588812876	,	126.1163215637	]	,	name:'TL'},
		TK	:{	LatLng:[	-9.192982321	,	-171.8539123535	]	,	name:'TK'},
		TV	:{	LatLng:[	-7.4791911006	,	178.6784515381	]	,	name:'TV'},
		BO	:{	LatLng:[	-17.2762635717	,	-63.5494289398	]	,	name:'BO'},
		SC	:{	LatLng:[	-4.6240600956	,	55.4527835846	]	,	name:'SC'},
		TZ	:{	LatLng:[	-6.4137768796	,	34.8851947784	]	,	name:'TZ'},
		CX	:{	LatLng:[	-10.4928752412	,	105.6297454834	]	,	name:'CX'},
		ID	:{	LatLng:[	-0.9953138349	,	113.9168395996	]	,	name:'ID'},
		PG	:{	LatLng:[	-6.7560625632	,	145.8593139648	]	,	name:'PG'},
		MW	:{	LatLng:[	-15.8467825197	,	34.2953853607	]	,	name:'MW'},
		CC	:{	LatLng:[	-12.1788556806	,	96.8442306519	]	,	name:'CC'},
		KM	:{	LatLng:[	-11.6123905058	,	43.3602600098	]	,	name:'KM'},
		SB	:{	LatLng:[	-9.6199333317	,	160.208984375	]	,	name:'SB'},
		AC	:{	LatLng:[	-12.27338123	,	122.9684181213	]	,	name:'AC'},
		YT	:{	LatLng:[	-12.9642407305	,	45.1367759705	]	,	name:'YT'},
		WS	:{	LatLng:[	-13.6269668431	,	-172.4824371338	]	,	name:'WS'},
		AS	:{	LatLng:[	-14.2933691825	,	-170.7023849487	]	,	name:'AS'},
		PE	:{	LatLng:[	-7.7973712264	,	-75.001914978	]	,	name:'PE'},
		WF	:{	LatLng:[	-13.2856046306	,	-176.1731872559	]	,	name:'WF'},
		ZW	:{	LatLng:[	-18.9506999777	,	29.1466665268	]	,	name:'ZW'},
		AO	:{	LatLng:[	-12.7351311823	,	17.9072232246	]	,	name:'AO'},
		BW	:{	LatLng:[	-21.8850927856	,	24.680390358	]	,	name:'BW'},
		NU	:{	LatLng:[	-19.0506597729	,	-169.8630905151	]	,	name:'NU'},
		PY	:{	LatLng:[	-27.1010411085	,	-58.4521789551	]	,	name:'PY'},
		MU	:{	LatLng:[	-20.2625834873	,	57.5517406464	]	,	name:'MU'},
		VU	:{	LatLng:[	-15.6119995519	,	166.886932373	]	,	name:'VU'},
		FJ	:{	LatLng:[	-17.8314196594	,	177.9728927612	]	,	name:'FJ'},
		FR	:{	LatLng:[	46.7741141742	,	1.7205953	]	,	name:    'FR'},
		CK	:{	LatLng:[	-21.2279340113	,	-159.7713012695	]	,	name:'CK'},
		MG	:{	LatLng:[	-20.173416064	,	46.8540821075	]	,	name:'MG'},
		XO	:{	LatLng:[	-22.3589459607	,	40.3562469482	]	,	name:'XO'},
		TO	:{	LatLng:[	-21.1950591138	,	-175.1962051392	]	,	name:'TO'},
		NC	:{	LatLng:[	-21.4176797815	,	165.5067367554	]	,	name:'NC'},
		PN	:{	LatLng:[	-24.3619387575	,	-128.3169021606	]	,	name:'PN'},
		SZ	:{	LatLng:[	-26.5238486214	,	31.4654035568	]	,	name:'SZ'},
		MZ	:{	LatLng:[	-23.928322433	,	35.5289726257	]	,	name:'MZ'},
		NA	:{	LatLng:[	-23.1900752502	,	18.4861655235	]	,	name:'NA'},
		PF	:{	LatLng:[	-17.6486863847	,	-149.3760070801	]	,	name:'PF'},
		LS	:{	LatLng:[	-30.3579359571	,	28.2474145889	]	,	name:'LS'},
		NF	:{	LatLng:[	-29.0252844191	,	168.0497894287	]	,	name:'NF'},
		BR	:{	LatLng:[	-29.5723242952	,	-54.3878288269	]	,	name:'BR'},
		UY	:{	LatLng:[	-32.8950920476	,	-55.7584400177	]	,	name:'UY'},
		SH	:{	LatLng:[	-37.11296164	,	-12.2834868431	]	,	name:'SH'},
		ZA	:{	LatLng:[	-30.002136712	,	24.677857399	]	,	name:'ZA'},
		TF	:{	LatLng:[	-49.6066279278	,	69.6484870911	]	,	name:'TF'},
		NZ	:{	LatLng:[	-44.5061489654	,	170.3666229248	]	,	name:'NZ'},
		FK	:{	LatLng:[	-52.0148778657	,	-58.7210483551	]	,	name:'FK'},
		HM	:{	LatLng:[	-53.1029830789	,	73.556224823	]	,	name:'HM'},
		BV	:{	LatLng:[	-54.4322933447	,	3.4117375612	]	,	name:'BV'},
		AU	:{	LatLng:[	-21.9701258238	,	133.3932647705	]	,	name:'AU'},
		AR	:{	LatLng:[	-42.6081780465	,	-63.5874023438	]	,	name:'AR'},
		CL	:{	LatLng:[	-53.4953607601	,	-71.341091156	]	,	name:'CL'},
		GS	:{	LatLng:[	-54.2072033412	,	-36.9061126709	]	,	name:'GS'},
		AQ	:{	LatLng:[	-80.6712758061	,	0.0134145098	]	,	name:'AQ'},

};


/**
 * utility method for transformation of countries
 * TODO : can we do it better ??? how many times the string is loaded ?? 
 */
function _global_cloro_data(value) {
	return {
		"United Arab Emirates" : "AE",
		"Afghanistan" : "AF",
		"Antigua and Barbuda" : "AG",
		"Albania" : "AL",
		"Armenia" : "AM",
		"Angola" : "AO",
		"Argentina" : "AR",
		"Austria" : "AT",
		"Australia" : "AU",
		"Azerbaijan" : "AZ",
		"Bosnia and Herzegovina" : "BA",
		"Barbados" : "BB",
		"Bangladesh" : "BD",
		"Belgium" : "BE",
		"Burkina Faso" : "BF",
		"Bulgaria" : "BG",
		"Burundi" : "BI",
		"Benin" : "BJ",
		"Brunei Darussalam" : "BN",
		"Bolivia" : "BO",
		"Brazil" : "BR",
		"Bahamas" : "BS",
		"Bhutan" : "BT",
		"Botswana" : "BW",
		"Belarus" : "BY",
		"Belize" : "BZ",
		"Canada" : "CA",
		"Congo" : "CD",
		"Central African Republic" : "CF",
		"Congo" : "CG",
		"Switzerland" : "CH",
		"Cote d'Ivoire" : "CI",
		"Chile" : "CL",
		"Cameroon" : "CM",
		"China" : "CN",
		"Colombia" : "CO",
		"Costa Rica" : "CR",
		"Cuba" : "CU",
		"Cape Verde" : "CV",
		"Cyprus" : "CY",
		"Czech Republic" : "CZ",
		"Germany" : "DE",
		"Djibouti" : "DJ",
		"Denmark" : "DK",
		"Dominica" : "DM",
		"Dominican Republic" : "DO",
		"Algeria" : "DZ",
		"Ecuador" : "EC",
		"Estonia" : "EE",
		"Egypt" : "EG",
		"Eritrea" : "ER",
		"Spain" : "ES",
		"Ethiopia" : "ET",
		"Finland" : "FI",
		"Fiji" : "FJ",
		"Falkland Islands" : "FK",
		"France" : "FR",
		"Gabon" : "GA",
		"United Kingdom" : "GB",
		"Grenada" : "GD",
		"Georgia" : "GE",
		"French Guiana" : "GF",
		"Ghana" : "GH",
		"Greenland" : "GL",
		"Gambia" : "GM",
		"Guinea" : "GN",
		"Equatorial Guinea" : "GQ",
		"Greece" : "GR",
		"Guatemala" : "GT",
		"Guinea-Bissau" : "GW",
		"Guyana" : "GY",
		"Honduras" : "HN",
		"Croatia" : "HR",
		"Haiti" : "HT",
		"Hungary" : "HU",
		"Indonesia" : "ID",
		"Ireland" : "IE",
		"Israel" : "IL",
		"India" : "IN",
		"Iraq" : "IQ",
		"Iran" : "IR",
		"Iceland" : "IS",
		"Italy" : "IT",
		"Jamaica" : "JM",
		"Jordan" : "JO",
		"Japan" : "JP",
		"Kenya" : "KE",
		"Kyrgyz Republic" : "KG",
		"Cambodia" : "KH",
		"Comoros" : "KM",
		"Saint Kitts and Nevis" : "KN",
		"North Korea" : "KP",
		"South Korea" : "KR",
		"Kuwait" : "KW",
		"Kazakhstan" : "KZ",
		"Lao People's Democratic Republic" : "LA",
		"Lebanon" : "LB",
		"Saint Lucia" : "LC",
		"Sri Lanka" : "LK",
		"Liberia" : "LR",
		"Lesotho" : "LS",
		"Lithuania" : "LT",
		"Latvia" : "LV",
		"Libya" : "LY",
		"Morocco" : "MA",
		"Moldova" : "MD",
		"Madagascar" : "MG",
		"Macedonia" : "MK",
		"Mali" : "ML",
		"Myanmar" : "MM",
		"Mongolia" : "MN",
		"Mauritania" : "MR",
		"Malta" : "MT",
		"Mauritius" : "MU",
		"Maldives" : "MV",
		"Malawi" : "MW",
		"Mexico" : "MX",
		"Malaysia" : "MY",
		"Mozambique" : "MZ",
		"Namibia" : "NA",
		"New Caledonia" : "NC",
		"Niger" : "NE",
		"Nigeria" : "NG",
		"Nicaragua" : "NI",
		"Netherlands" : "NL",
		"Norway" : "NO",
		"Nepal" : "NP",
		"New Zealand" : "NZ",
		"Oman" : "OM",
		"Panama" : "PA",
		"Peru" : "PE",
		"French Polynesia" : "PF",
		"Papua New Guinea" : "PG",
		"Philippines" : "PH",
		"Pakistan" : "PK",
		"Poland" : "PL",
		"Portugal" : "PT",
		"Paraguay" : "PY",
		"Qatar" : "QA",
		"Reunion" : "RE",
		"Romania" : "RO",
		"Serbia" : "RS",
		"Russian Federationß" : "RU",
		"Rwanda" : "RW",
		"Saudi Arabia" : "SA",
		"Solomon Islands" : "SB",
		"Seychelles" : "SC",
		"Sudan" : "SD",
		"Sweden" : "SE",
		"Slovenia" : "SI",
		"Slovakia" : "SK",
		"Sierra Leone" : "SL",
		"Senegal" : "SN",
		"Somalia" : "SO",
		"Suriname" : "SR",
		"Sao Tome and Principe" : "ST",
		"El Salvador" : "SV",
		"Syrian Arab Republic" : "SY",
		"Swaziland" : "SZ",
		"Chad" : "TD",
		"Togo" : "TG",
		"Thailand" : "TH",
		"Tajikistan" : "TJ",
		"Timor-Leste" : "TL",
		"Turkmenistan" : "TM",
		"Tunisia" : "TN",
		"Turkey" : "TR",
		"Trinidad and Tobago" : "TT",
		"Taiwan" : "TW",
		"Tanzania" : "TZ",
		"Ukraine" : "UA",
		"Uganda" : "UG",
		"United States of America" : "US",
		"Uruguay" : "UY",
		"Uzbekistan" : "UZ",
		"Venezuela" : "VE",
		"Vietnam" : "VN",
		"Vanuatu" : "VU",
		"Yemen" : "YE",
		"South Africa" : "ZA",
		"Zambia" : "ZM",
		"Zimbabwe" : "ZW"
	}[value];
}
