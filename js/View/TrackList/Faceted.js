define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dijit/layout/ContentPane',
        'JBrowse/Util',
        'JBrowse/View/TrackList/Faceted'
    ],
    function (
        declare,
        lang,
        ContentPane,
        Util
    ) {

var dojof = Util.dojof;
return declare( 'ComboTrackSelector.View.TrackList.Faceted', JBrowse.View.TrackList.Faceted,
   /**
    * @lends JBrowse.View.TrackList.Faceted.prototype
    */
   {

    renderInitial: function() {
        this.containerElem = dojo.create( 'div', {
            id: 'faceted_tracksel',
            style: {
                left: '-95%',
                width: '95%',
                zIndex: 500
            }
        },
        document.body );

        // make the tab that turns the selector on and off
        dojo.create('div',
            {
                className: 'faceted_track_header',
                innerHTML: '<div>Tracks Available in Faceted List</div>'
            },
            this.containerElem
        );

        var titles = this.config.title;
        var title_list = titles.join("<br>");

        var icon_elem = '<div></div>';
        if( this.browser.config.combotracksel_icon !== undefined )
            icon_elem = '</div><img width="20px" src="' + this.browser.config.combotracksel_icon + '"><div>'
        dojo.create('div',
            {
                className: 'faceted_tracksel_on_off tab',
                innerHTML: icon_elem + title_list + '</div><img src="' + this.browser.resolveUrl('img/right_arrow.png') + '">'
            },
            this.containerElem
        );
        this.mainContainer = new dijit.layout.BorderContainer(
            { design: 'headline', gutters: false },
            dojo.create('div',{ className: 'mainContainer' }, this.containerElem)
        );


        this.topPane = new dijit.layout.ContentPane(
            { region: 'top',
              id: "faceted_tracksel_top",
              content: '<div class="title">Select Tracks</div> '
                       + '<div class="topLink" style="cursor: help"><a title="Track selector help">Help</a></div>'
            });
        dojo.query('div.topLink a[title="Track selector help"]',this.topPane.domNode)
            .forEach(function(helplink){
                var helpdialog = new dijit.Dialog({
                    "class": 'help_dialog',
                    refocus: false,
                    draggable: false,
                    title: 'Track Selection',
                    content: '<div class="main">'
                             + '<p>The JBrowse Faceted Track Selector makes it easy to search through'
                             + ' large numbers of available tracks to find exactly the ones you want.'
                             + ' You can incrementally filter the track display to narrow it down to'
                             + ' those your are interested in.  There are two types of filtering available,'
                             + ' which can be used together:'
                             + ' <b>filtering with data fields</b>, and free-form <b>filtering with text</b>.'
                             + '</p>'
                             + '  <dl><dt>Filtering with Data Fields</dt>'
                             + '  <dd>The left column of the display contains the available <b>data fields</b>.  Click on the data field name to expand it, and then select one or more values for that field.  This narrows the search to display only tracks that have one of those values for that field.  You can do this for any number of fields.<dd>'
                             + '  <dt>Filtering with Text</dt>'
                             + '  <dd>Type text in the "Contains text" box to filter for tracks whose data contains that text.  If you type multiple words, tracks are filtered such that they must contain all of those words, in any order.  Placing "quotation marks" around the text filters for tracks that contain that phrase exactly.  All text matching is case insensitive.</dd>'
                             + '  <dt>Activating Tracks</dt>'
                             + "  <dd>To activate and deactivate a track, click its check-box in the left-most column.  When the box contains a check mark, the track is activated.  You can also turn whole groups of tracks on and off using the check-box in the table heading.</dd>"
                             + "  </dl>"
                             + "</div>"
                 });
                dojo.connect( helplink, 'onclick', this, function(evt) {helpdialog.show(); return false;});
            },this);

        this.mainContainer.addChild( this.topPane );

        // make both buttons toggle this track selector
        dojo.query( '.faceted_tracksel_on_off' )
            .onclick( lang.hitch( this, 'toggle' ));

        this.centerPane = new dijit.layout.BorderContainer({region: 'center', "class": 'gridPane', gutters: false});
        this.mainContainer.addChild( this.centerPane );
        var textFilterContainer = this.renderTextFilter();

        this.busyIndicator = dojo.create(
            'div', {
                innerHTML: '<img src="'+this.browser.resolveUrl('img/spinner.gif')+'">',
                className: 'busy_indicator'
            }, this.containerElem );

        this.centerPane.addChild(
            new dijit.layout.ContentPane(
                { region: 'top',
                  "class": 'gridControls',
                  content: [
                      dojo.create( 'button', {
                                       className: 'faceted_tracksel_on_off',
                                       innerHTML: '<img src="'+this.browser.resolveUrl('img/left_arrow.png')+'"> <div>Back to browser</div>',
                                       onclick: lang.hitch( this, 'hide' )
                                   }
                                 ),
                      dojo.create( 'button', {
                                       className: 'clear_filters',
                                       innerHTML:'<img src="'+this.browser.resolveUrl('img/red_x.png')+'">'
                                                 + '<div>Clear All Filters</div>',
                                       onclick: lang.hitch( this, function(evt) {
                                           this._clearTextFilterControl();
                                           this._clearAllFacetControls();
                                           this._async( function() {
                                               this.updateQuery();
                                               this._updateFacetCounts();
                                           },this).call();
                                       })
                                   }
                                 ),
                      this.busyIndicator,
                      textFilterContainer,
                      dojo.create('div', { className: 'matching_record_count' })
                  ]
                }
            )
        );


    }
});
});
