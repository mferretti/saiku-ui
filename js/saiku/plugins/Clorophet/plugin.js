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
var Clorophet = Backbone.View.extend({
    initialize: function(args) {
        this.workspace = args.workspace;
        
        // Create a unique ID for use as the CSS selector
        this.id = _.uniqueId("clorophet_");
        $(this.el).attr({ id: this.id,  });
        
        // Bind table rendering to query result event
        _.bindAll(this, "render", "receive_data", "process_data", "show", 
            "setOptions");
        this.workspace.bind('query:result', this.receive_data);
        
        // Add stats button
        this.add_button();
        this.workspace.toolbar.stats = this.show;
        
        // Listen to adjust event and rerender stats
        this.workspace.bind('workspace:adjust', this.render);
        
        // Append stats to workspace
        $(this.workspace.el).find('.workspace_results')
            .prepend($(this.el).hide())
    },
    
    add_button: function() {
        var $stats_button = 
            $('<a href="#stats" class="stats button disabled_toolbar i18n" title="Clorophet Map"></a>')
            .css({  'background-image': "url('js/saiku/plugins/Clorophet/world.png')",
                    'background-repeat':'no-repeat',
                    'background-position':'50% 50%'
                });

        var $stats_li = $('<li class="seperator"></li>').append($stats_button);
        $(this.workspace.toolbar.el).find("ul").append($stats_li);
    },
    
    show: function(event, ui) {
        $(this.workspace.el).find('.workspace_results table').toggle();
        $(this.el).toggle();
        $(event.target).toggleClass('on');
        
        if ($(event.target).hasClass('on')) {
            this.render();
        }
    },
    
    setOptions: function(event) {
        var type = $(event.target).attr('href').replace('#', '');
        try {
            this[type]();
        } catch (e) { }
        
        return false;
    },
    
    render: function() {
        if (! $(this.workspace.toolbar.el).find('.stats').hasClass('on')) {
            return;
        }


        var group = function(grid, el, cback){
            var elements = _.filter(_.map(grid, function(it){return it[el]}), function(it){return it});
            return cback(elements).toFixed(3);
        }

        var extractedRow = function(grid, el){
            var elements = _.filter(_.map(grid, function(it){return it[el]}), function(it){return it})
            return elements;
        }

        
        $(this.el).empty()
        var grid = this.data.metadata
        var rs = this.data.resultset
        
        // settaggi per clorophet
        var MAP_SETTINGS={
        	type : 'none',
        	indexes : '',
        	series : '',
        	getSeries : function() {
        		var tmp='';
        		var trimmer = '';
        		if ( this.type == 'country'){
        			for ( var idx = 0 ; idx < this.series[0].length ; ++idx ) {
        				trimmer = this.indexes[0][idx].replace(/\[\d*\]/,'').replace(/^\s+|\s+$/g, '') ;
        				trimmer = _global_clodo_data(trimmer);
        				tmp = tmp + '"' + trimmer + '":"' + this.series[0][idx] + '"';
        				tmp = tmp + ",";
        			}
        			if ( tmp.length > 0 ) tmp = tmp.substring(0,tmp.length-1);
        		} else {
        			tmp = this.emptySeries;
        		}
        		return JSON.parse("{" + tmp + "}");
        		
        	},
        	emptySeries : {
        			'':''
        	}
        };
        for (colId in grid) {
        	/*
        	 * leggi il tipo di mappa
        	 * leggi la serie per i colori
        	 * TODO : leggi e trasforma i codici country/area/region
        	 * 
        	 */
        	if ( MAP_SETTINGS.type ==='none'){
            	if ( grid[colId].colName === 'Country' ) {
            		MAP_SETTINGS.type='country';
            	} else if ( grid[colId].colName === 'Area' ){
            		MAP_SETTINGS.type='area';
            	} else if ( grid[colId].colName === 'Region' ){
            		MAP_SETTINGS.type='region';
            	}
            	if ( MAP_SETTINGS.type !=='none') MAP_SETTINGS.index=grid[colId].colName;
        	}
        }
        
        var seriesAux = _.filter(grid, function(it){return !it.isHeader && it.colType == 'Numeric'})
        var seriesColumns = _.map(seriesAux, function(it){return it.colName})
        var seriesColumnsIdxs =_.map(seriesColumns, function(el){return _.indexOf(_.map(grid, function(it){return it.colName}), el)})
        var mapAux = _.filter(grid, function(it){return it.isHeader})
        var mapColumns = _.map(mapAux, function(it){return it.colName})
        var mapColumnsIdxs =_.map(mapColumns, function(el){return _.indexOf(_.map(grid, function(it){return it.colName}), el)})
        // fine settaggi per clorophet

        if ( MAP_SETTINGS.type !== 'none') {
        	MAP_SETTINGS.series = _.map(seriesColumnsIdxs, function(it){return extractedRow(rs, it)})
        	MAP_SETTINGS.indexes = _.map(mapColumnsIdxs, function(it){return extractedRow(rs, it)})
        }
        var $map = $("<div id='clorophet_map' class='map'></div>");
        $(this.el).append($map);
        paint_map(MAP_SETTINGS);
		Saiku.i18n.translate();
    },
    
    receive_data: function(args) {
        return _.delay(this.process_data, 0, args);
    },
    
    process_data: function(args) {
        this.data = {};
        this.data.resultset = [];
        this.data.metadata = [];
        this.data.height = 0;
        this.data.width = 0;

        if (args.data.cellset && args.data.cellset.length > 0) {
            
            var lowest_level = 0;
            var isHead = true
            var columnNames = new Array()
            for (var row = 0; row < args.data.cellset.length; row++) {
                if (isHead && (args.data.cellset[row][0].type == "ROW_HEADER_HEADER" || 
                    args.data.cellset[row][0].value == "null")) {
                    this.data.metadata = [];
                    for (var field = 0; field < args.data.cellset[row].length; field++) {
                        if (args.data.cellset[row][field].type == "ROW_HEADER_HEADER") {
                            this.data.metadata.shift();
                            lowest_level = field;
                        }
                        if(columnNames[field]){
                            columnNames[field].push(args.data.cellset[row][field].value)
                        }else{
                            columnNames[field] = [args.data.cellset[row][field].value]
                        }
                        if(args.data.cellset[row][0].type == "ROW_HEADER_HEADER"){
                            this.data.metadata.push({
                                colIndex: field,
                                colType: typeof(args.data.cellset[row + 1][field].value) !== "number" &&
                                    isNaN(args.data.cellset[row + 1][field].value
                                    .replace(/[^a-zA-Z 0-9.]+/g,'')) ? "String" : "Numeric",
                                colName: columnNames[field].join(' / '),
                                isHeader: (args.data.cellset[row][field].type == "ROW_HEADER_HEADER")
                            });    
                        }
                    }
                } else if (args.data.cellset[row][lowest_level].value !== "null" && args.data.cellset[row][lowest_level].value !== "") {
                    isHead = false
                    var record = [];
                    this.data.width = args.data.cellset[row].length;
                    for (var col = lowest_level; col < args.data.cellset[row].length; col++) {
                        var value = args.data.cellset[row][col].value;
                        // check if the resultset contains the raw value, if not try to parse the given value
                        if (args.data.cellset[row][col].properties.raw && args.data.cellset[row][col].properties.raw !== "null")
                        {
                            value = parseFloat(args.data.cellset[row][col].properties.raw);
                        } else if (typeof(args.data.cellset[row][col].value) !== "number" &&
                            parseFloat(args.data.cellset[row][col].value.replace(/[^a-zA-Z 0-9.]+/g,''))) 
                        {
                            value = parseFloat(args.data.cellset[row][col].value.replace(/[^a-zA-Z 0-9.]+/g,''));
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
                args.workspace.clorophet = new Clorophet({ workspace: args.workspace });
            }
        }

        function clear_workspace(args) {
            if (typeof args.workspace.clorophet != "undefined") {
                $(args.workspace.clorophet.el).parents().find('.workspace_results table').show();
                $(args.workspace.clorophet.el).hide();
            }
        }

        
        // Attach stats to existing tabs
        for(var i = 0; i < Saiku.tabs._tabs.length; i++) {
            var tab = Saiku.tabs._tabs[i];
            new_workspace({
                workspace: tab.content
            });
        };

        // Attach stats to future tabs
        Saiku.session.bind("workspace:new", new_workspace);
        Saiku.session.bind("workspace:clear", clear_workspace);
    });

 /**
  * methods for painting the map 
  */
 
 function iterator(data,key){
	 return data[key];
 }
 
 function createColors(data){
	 
	 var max = 0,
	    min = Number.MAX_VALUE,
	    cc,
	    startColor = [222, 235, 247],
	    endColor = [8, 81, 156],
	    colors = {},
	    hex;
	//find maximum and minimum values
	 for (cc in data){
	     if (parseFloat(data[cc]) > max){
	         max = parseFloat(data[cc]);
	     }
	     if (parseFloat(data[cc]) < min){
	         min = parseFloat(data[cc]);
	     }
	 }	 
		//set colors according to values of GDP
	 for (cc in data){
	     if (data[cc] > 0){
	         colors[cc] = '#';
	         for (var i = 0; i<3; i++){
	             hex = Math.round(startColor[i] 
	                 + (endColor[i] 
	                 - startColor[i])
	                 * (data[cc] / (max - min))).toString(16);

	             if (hex.length == 1){
	                 hex = '0'+hex;
	             }
	             colors[cc] += (hex.length == 1 ? '0' : '') + hex;
	         }
	     }
	 }
	 return colors;
 }
 
 function paint_map(settings){
	 var data = settings.getSeries();
	 var map = $('#clorophet_map');
	 map.vectorMap({
		 map: 'europe_en', //TODO : read from parameters
		 enableZoom: true,
		 showTooltip: true,
		 colors: createColors(data),
		 hoverOpacity: 0.7,
		 hoverColor: false,
		 onLabelShow: function(event, label, code){
			 if ( data[code] ) {
				 label.html('<b>'+label.html()+'</b></br></b>'+data[code]); // make the label pretty
			 } else {
				 event.preventDefault(); // do not show the tooltip
			 }
		 }
		});		 
 }
 
/**
 * utility method for transformation of countries
 * TODO : can we do it better ??? how many times the string is loaded ?? 
 */
 function _global_clodo_data(value){
		return {
			"United Arab Emirates": "AE",
			"Afghanistan": "AF",
			"Antigua and Barbuda": "AG",
			"Albania": "AL",
			"Armenia": "AM",
			"Angola": "AO",
			"Argentina": "AR",
			"Austria": "AT",
			"Australia": "AU",
			"Azerbaijan": "AZ",
			"Bosnia and Herzegovina": "BA",
			"Barbados": "BB",
			"Bangladesh": "BD",
			"Belgium": "BE",
			"Burkina Faso": "BF",
			"Bulgaria": "BG",
			"Burundi": "BI",
			"Benin": "BJ",
			"Brunei Darussalam": "BN",
			"Bolivia": "BO",
			"Brazil": "BR",
			"Bahamas": "BS",
			"Bhutan": "BT",
			"Botswana": "BW",
			"Belarus": "BY",
			"Belize": "BZ",
			"Canada": "CA",
			"Congo": "CD",
			"Central African Republic": "CF",
			"Congo": "CG",
			"Switzerland": "CH",
			"Cote d'Ivoire": "CI",
			"Chile": "CL",
			"Cameroon": "CM",
			"China": "CN",
			"Colombia": "CO",
			"Costa Rica": "CR",
			"Cuba": "CU",
			"Cape Verde": "CV",
			"Cyprus": "CY",
			"Czech Republic": "CZ",
			"Germany": "DE",
			"Djibouti": "DJ",
			"Denmark": "DK",
			"Dominica": "DM",
			"Dominican Republic": "DO",
			"Algeria": "DZ",
			"Ecuador": "EC",
			"Estonia": "EE",
			"Egypt": "EG",
			"Eritrea": "ER",
			"Spain": "ES",
			"Ethiopia": "ET",
			"Finland": "FI",
			"Fiji": "FJ",
			"Falkland Islands": "FK",
			"France": "FR",
			"Gabon": "GA",
			"United Kingdom": "GB",
			"Grenada": "GD",
			"Georgia": "GE",
			"French Guiana": "GF",
			"Ghana": "GH",
			"Greenland": "GL",
			"Gambia": "GM",
			"Guinea": "GN",
			"Equatorial Guinea": "GQ",
			"Greece": "GR",
			"Guatemala": "GT",
			"Guinea-Bissau": "GW",
			"Guyana": "GY",
			"Honduras": "HN",
			"Croatia": "HR",
			"Haiti": "HT",
			"Hungary": "HU",
			"Indonesia": "ID",
			"Ireland": "IE",
			"Israel": "IL",
			"India": "IN",
			"Iraq": "IQ",
			"Iran": "IR",
			"Iceland": "IS",
			"Italy": "IT",
			"Jamaica": "JM",
			"Jordan": "JO",
			"Japan": "JP",
			"Kenya": "KE",
			"Kyrgyz Republic": "KG",
			"Cambodia": "KH",
			"Comoros": "KM",
			"Saint Kitts and Nevis": "KN",
			"North Korea": "KP",
			"South Korea": "KR",
			"Kuwait": "KW",
			"Kazakhstan": "KZ",
			"Lao People's Democratic Republic": "LA",
			"Lebanon": "LB",
			"Saint Lucia": "LC",
			"Sri Lanka": "LK",
			"Liberia": "LR",
			"Lesotho": "LS",
			"Lithuania": "LT",
			"Latvia": "LV",
			"Libya": "LY",
			"Morocco": "MA",
			"Moldova": "MD",
			"Madagascar": "MG",
			"Macedonia": "MK",
			"Mali": "ML",
			"Myanmar": "MM",
			"Mongolia": "MN",
			"Mauritania": "MR",
			"Malta": "MT",
			"Mauritius": "MU",
			"Maldives": "MV",
			"Malawi": "MW",
			"Mexico": "MX",
			"Malaysia": "MY",
			"Mozambique": "MZ",
			"Namibia": "NA",
			"New Caledonia": "NC",
			"Niger": "NE",
			"Nigeria": "NG",
			"Nicaragua": "NI",
			"Netherlands": "NL",
			"Norway": "NO",
			"Nepal": "NP",
			"New Zealand": "NZ",
			"Oman": "OM",
			"Panama": "PA",
			"Peru": "PE",
			"French Polynesia": "PF",
			"Papua New Guinea": "PG",
			"Philippines": "PH",
			"Pakistan": "PK",
			"Poland": "PL",
			"Portugal": "PT",
			"Paraguay": "PY",
			"Qatar": "QA",
			"Reunion": "RE",
			"Romania": "RO" ,   "Serbia": "RS",
			"Russian Federationß": "RU",
			"Rwanda": "RW",
			"Saudi Arabia": "SA",
			"Solomon Islands": "SB",
			"Seychelles": "SC",
			"Sudan": "SD",
			"Sweden": "SE",
			"Slovenia": "SI",
			"Slovakia": "SK",
			"Sierra Leone": "SL",
			"Senegal": "SN",
			"Somalia": "SO",
			"Suriname": "SR",
			"Sao Tome and Principe": "ST",
			"El Salvador": "SV",
			"Syrian Arab Republic": "SY",
			"Swaziland": "SZ",
			"Chad": "TD",
			"Togo": "TG",
			"Thailand": "TH",
			"Tajikistan": "TJ",
			"Timor-Leste": "TL",
			"Turkmenistan": "TM",
			"Tunisia": "TN",
			"Turkey": "TR",
			"Trinidad and Tobago": "TT",
			"Taiwan": "TW",
			"Tanzania": "TZ",
			"Ukraine": "UA",
			"Uganda": "UG",
			"United States of America": "US",
			"Uruguay": "UY",
			"Uzbekistan": "UZ",
			"Venezuela": "VE",
			"Vietnam": "VN",
			"Vanuatu": "VU",
			"Yemen": "YE",
			"South Africa": "ZA",
			"Zambia": "ZM",
			"Zimbabwe": "ZW"
		}[value].toLowerCase();
	}

