define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/_base/array',
           'dojo/io-query',
           'JBrowse/Plugin',
           'JBrowse/ConfigManager',
           'dojo/domReady!'
       ],

       function(
           declare,
           lang,
           Deferred,
           array,
           ioQuery,
           JBrowsePlugin,
           ConfigManager
       ) {


return declare( JBrowsePlugin,
		{
		    constructor: function( args ) {
			console.log("Loaded ComboTrackSelector plugin");
			var thisB = this;
			
			//Load additional track config
			var c = new ConfigManager({ bootConfig: thisB.config2, defaults: thisB._configDefaults(), browser: thisB });
			c.getFinalConfig()
			    .then( dojo.hitch(thisB, function( finishedConfig2 ) {
				thisB.config2 = finishedConfig2;
				
			    }));
			
			this.browser.afterMilestone( 'loadRefSeqs', dojo.hitch( this, function() {
			    
			    thisB.createNewTrackList(thisB.config2).then( lang.hitch( this, function() {
				
				thisB.initTrackMetadata( thisB.config2 );
				thisB._addTrackConfigs( thisB.config2 );
				
				this.browser.config.stores = dojo.mixin(this.browser.config.stores, thisB.config2.stores);
				this.browser.config.tracks = dojo.mixin(this.browser.config.tracks, thisB.config2.tracks);
				this.browser.trackConfigsByName = dojo.mixin(this.browser.trackConfigsByName, thisB.trackConfigsByName);

				// if available, store config for track selector icon
				if( args.icon !== undefined )
				    this.browser.config.combotracksel_icon = args.icon;
				
				this.browser.containerWidget.startup();
				this.browser.onResize();
				
    				// make our global keyboard shortcut handler
				//on( document.body, 'keypress', dojo.hitch( this, 'globalKeyHandler' ));
				
			    }));
			    
			}));
			
		    },


/**
 * Asynchronously create the track list.
 * @private
 */
createNewTrackList: function(newconfig) {

    var thisB = this;
    newconfig = lang.clone( newconfig );

    return this.browser._milestoneFunction('createTrack', function( deferred ) {
        // find the tracklist class to use
        var tl_class = !this.config.show_tracklist ? 'Null' : 'Faceted';

        if( ! /\//.test( tl_class ) )
            tl_class = 'ComboTrackSelector/View/TrackList/'+tl_class;

        // load all the classes we need
        require( [ tl_class ],
                 lang.hitch( this, function( trackListClass ) {
                     // instantiate the tracklist and the track metadata object
                     this.trackListView = new trackListClass(
                         lang.mixin(
                             lang.clone( newconfig.trackSelector ) || {},
                             {
                                 trackConfigs: newconfig.tracks,
                                 browser: this,
                                 trackMetaData: this.trackMetaDataStore
                             }
                         )
                     );

                     // listen for track-visibility-changing messages from
                     // views and update our tracks cookie
                     this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged', dojo.hitch( this, function() {
                         this.cookie( "tracks",
                                      this.view.visibleTrackNames().join(','),
                                      {expires: 60});
                     }));

                     deferred.resolve({ success: true });
        }));
    });
},

_configDefaults: function() {

    var queryParams = ioQuery.queryToObject( window.location.search.slice(1) );
    var dataRoot = queryParams.data || 'data';
    return {
        tracks: [],

        containerID: 'GenomeBrowser',
        dataRoot: dataRoot,
        show_tracklist: true,
        show_nav: true,
        show_overview: true,

        refSeqs: "{dataRoot}/seq/refSeqs.json",
        include: [
	    "{dataRoot}/trackList2.json"
        ],
        nameUrl: "{dataRoot}/names/root.json",

        datasets: {
            _DEFAULT_EXAMPLES: true,
            volvox:    { url: '?data=sample_data/json/volvox',    name: 'Volvox Example'    },
            modencode: { url: '?data=sample_data/json/modencode', name: 'MODEncode Example' },
            yeast:     { url: '?data=sample_data/json/yeast',     name: 'Yeast Example'     }
        },

        highlightSearchedRegions: false,
        highResolutionMode: 'disabled'
    };
},

/**
 * Add new track configurations.
 * @private
 */
_addTrackConfigs: function( newconfig ) {

    newconfig = lang.clone( newconfig );
    var configs = newconfig.tracks || [];

    if( ! newconfig.tracks )
        newconfig.tracks = [];
    if( ! this.trackConfigsByName )
        this.trackConfigsByName = {};

    array.forEach( configs, function(conf){

        // if( this.trackConfigsByName[ conf.label ] ) {
        //     console.warn("track with label "+conf.label+" already exists, skipping");
        //     return;
        // }

        this.trackConfigsByName[conf.label] = conf;
        newconfig.tracks.push( conf );

    },this);

    return configs;
},

/**
 * Asynchronously initialize our track metadata.
 */
initTrackMetadata: function( newconfig ) {

    newconfig = lang.clone( newconfig );

    return this.browser._milestoneFunction( 'initTrackMetadata', function( deferred ) {

        var metaDataSourceClasses = dojo.map(
                                    (newconfig.trackMetadata||{}).sources || [],
                                    function( sourceDef ) {
                                        var url  = sourceDef.url || 'trackMeta.csv';
                                        var type = sourceDef.type || (
                                                /\.csv$/i.test(url)     ? 'csv'  :
                                                /\.js(on)?$/i.test(url) ? 'json' :
                                                'csv'
                                        );
                                        var storeClass = sourceDef['class']
                                            || { csv: 'dojox/data/CsvStore', json: 'dojox/data/JsonRestStore' }[type];
                                        if( !storeClass ) {
                                            console.error( "No store class found for type '"
                                                           +type+"', cannot load track metadata from URL "+url);
                                            return null;
                                        }
                                        return { class_: storeClass, url: url };
                                    });

        require( Array.prototype.concat.apply( ['JBrowse/Store/TrackMetaData'],
                                               dojo.map( metaDataSourceClasses, function(c) { return c.class_; } ) ),
                 dojo.hitch(this,function( MetaDataStore ) {
                     var mdStores = [];
                     for( var i = 1; i<arguments.length; i++ ) {
                         mdStores.push( new (arguments[i])({url: metaDataSourceClasses[i-1].url}) );
                     }

                     this.trackMetaDataStore =  new MetaDataStore(
                         dojo.mixin( dojo.clone(newconfig.trackMetadata || {}), {
                                         trackConfigs: newconfig.tracks,
                                         browser: this,
                                         metadataStores: mdStores
                                     })
                     );

                     deferred.resolve({success:true});
        }));
    });
}



});
});
