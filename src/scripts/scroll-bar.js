// # scroll-bar.js
//
// This module defines a custom `<scroll-bar>` element and attaches it to the 
// document.
//

// Because this is a node module, we may not have the DOM when run. In practice 
// this will not really happen, but it is useful to test this module as a node 
// module and having an object that abstracts the dom is quite useful. 
var DOM = {
    window: require('./window.js'),
    document: require('./window.js').document
};

var templateHolder = DOM.document.createElement('div'),
    SCROLL_BAR_BUTTON_SIZE = 15,
    throttle = require('./throttle.js');

templateHolder.innerHTML = require('./templates.js').scrollbar();
    

// An instance of his will become the prototype for the custom scroll-bar
// element
var ScrollBar = function() {

    
};

ScrollBar.prototype = Object.create(DOM.window.HTMLElement.prototype);

ScrollBar.prototype.setRangeAdapter = function(rangeAdapter) {

    var that = this;

    that.rangeAdapter = rangeAdapter;
    if (that.thumb) {
        that.thumb.rangeAdapter = rangeAdapter;
    }

    Object.observe(that.rangeAdapter.valueObj, function(change) {
        var value = change[0].object.value;
        if (value) {
            try {
                that.supressUpdates = true;
                that.moveToPercent(value);
            }
            finally {
                that.supressUpdates = false;
            }
        }
    });
};

// the createdCallback method will be called by the native code
ScrollBar.prototype.attachedCallback = function() {

    var that = this;

    var scrollbarShadowRoot = this.createShadowRoot();

    // add the template content to the shadow root
    scrollbarShadowRoot
        .appendChild(
            templateHolder
                .querySelector('template')
                    .content.cloneNode(true));


    this.scrollbarShadowRoot = scrollbarShadowRoot;

    // get the actionable child elements
    this.bar = scrollbarShadowRoot.querySelector('.scroll-bar');
    this.thumb = scrollbarShadowRoot.querySelector('.scroll-bar-thumb');
    this.gutter = scrollbarShadowRoot.querySelector('.scroll-bar-gutter');

    this.configureOrientation();

    var bounds = that.bounds = that.getBoundingClientRect();
    that.isScrolling = false;

    that.attachThumbMouseDown()
        .attachThumbMouseMove()
        .attachThumbMouseUp();
}; // end attaached 


ScrollBar.prototype.throttledWheelEvent = throttle(function(event) {

    var that = this;

    var directionXY = that.orientation.toUpperCase(),
        styleProperty = directionXY === 'Y' ? 'top' : 'left',
        rangeStop = that.rangeAdapter.rangeStop(),
        currentPercent = ((that.thumb.style && that.thumb.style[styleProperty]) && parseFloat(that.thumb.style[styleProperty])) || 0,
        direction = event['delta' + directionXY] > 0 ? 1 : -1,
        currentPercentAsRows = Math.round(that.rangeAdapter.rangeStop() * currentPercent),
        oneMoreRow = Math.round(currentPercentAsRows + (1 * direction)),
        ranged = oneMoreRow / rangeStop / 100;

    ranged = ranged > 1 ? 1 : ranged;
    ranged = ranged < 0 ? 0 : ranged;

    that.rangeAdapter.setValue(ranged);

}, 30);

ScrollBar.prototype.attachWheelEvent = function() {
    var that = this;

    DOM.document.addEventListener('wheel', function(event) {
        // dont pull on the page at all
        event.preventDefault();
        that.throttledWheelEvent(event);
    });

    return that;
};

ScrollBar.prototype.attachThumbMouseDown = function() {
    var that = this;

    that.thumb.addEventListener('mousedown', function(event) {
        that.isScrolling = true;
        that.offset = event['offset' + that.orientation.toUpperCase()];
    });

    return that;
};
 
ScrollBar.prototype.attachThumbMouseMove = function() {
    var that = this;

    DOM.document.addEventListener('mousemove', function(event) {
        if (that.isScrolling) {

            that.moveThumb(event['page' + that.orientation.toUpperCase()] );
        }
    });

    return that;
};

ScrollBar.prototype.attachThumbMouseUp = function() {
    var that = this;
    DOM.document.addEventListener('mouseup', function(event) {
        if (that.isScrolling) {
            that.isScrolling = false;
        }
    });

    return that;
};

ScrollBar.prototype.moveThumb = function(pageLocation) {
    var that = this,
        direction = this.orientation === 'y' ? 'top' : 'left',
        percent,
        maxScroll = that.getMaxScroll(),
        distanceFromEdge = that.gutter.getBoundingClientRect(),
        offBy =  pageLocation - distanceFromEdge[direction] - that.offset;
    
    offBy = offBy < 0 ? 0 : offBy;
    offBy = offBy / maxScroll;
    offBy = offBy > 1 ? 1 : offBy;
    offBy = offBy * 100;

    that.thumb.style[direction] = offBy + '%';

    if (that.rangeAdapter) {
        if (that.supressUpdates) {
            return;
        }
        that.rangeAdapter.setValue(percent);
    }
}; //end movethumb value

ScrollBar.prototype.moveToPercent = function(percent) {
    var that = this;

    if (!that.isScrolling) {
        that.moveThumb(percent * this.getMaxScroll());
    }
};


ScrollBar.prototype.setValueUpdatedCallback = function(callback) {
    this.valueUpdatedCallback = callback;

};


ScrollBar.prototype.setOrientation = function(orientation) {
    this.orientation = orientation;

};

ScrollBar.prototype.getMaxScroll = function() {
    var direction = this.orientation === 'y' ? 'clientHeight' : 'clientWidth';
    return this.gutter[direction];

};


ScrollBar.prototype.configureOrientation = function() {
    var orientation = 'y';

    if ('horizontal' in this.attributes) {
        orientation = 'x';
        this.bar.classList.add('horizontal');
    }

    this.setOrientation(orientation);
};

ScrollBar.prototype.tickle = function() {
    this.rangeAdapter.setValue(this.lastPercent);
};

ScrollBar.prototype.lastPercent = 0.0;


DOM.document.registerElement('scroll-bar', {
    prototype: new ScrollBar()
});


module.exports.ScrollBar = ScrollBar;
