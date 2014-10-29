var templateHolder = document.createElement('div');

    templateHolder.innerHTML = require('./templates.js').scrollbar();

var scrollbarTemplate = templateHolder.querySelector('template');

var importDoc = document.currentScript.ownerDocument,
    SCROLL_BAR_BUTTON_SIZE = 15;


// this is from underscore http://underscorejs.org/docs/underscore.html
var throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function() {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};


// An instance of his will become the prototype for the custom scroll-bar
// element
var ScrollBar = function() {};

ScrollBar.prototype = Object.create(HTMLElement.prototype);

ScrollBar.prototype.setRangeAdapter = function(rangeAdapter) {

    var that = this;

    that.rangeAdapter = rangeAdapter;
    if (that.thumb) {
        that.thumb.rangeAdapter = rangeAdapter;
    }
    Object.observe(that.rangeAdapter.valueObj, function(change) {
        that.moveToPercent(change[0].object.value);
    });

    console.log('range adapter set', rangeAdapter, that.rangeAdapter, that);
};

// the createdCallback method will be called by the native code
ScrollBar.prototype.attachedCallback = function() {

    var that = this;

    var //scrollbarTemplate = importDoc.querySelector('template'),
        //scrollBarImportClone = document.importNode(scrollbarTemplate.content, true),
        scrollbarShadowRoot = this.createShadowRoot();

    scrollbarShadowRoot.appendChild(scrollbarTemplate.content.cloneNode(true));


    this.scrollbarShadowRoot = scrollbarShadowRoot;

    // get the actionable child elements
    this.bar = scrollbarShadowRoot.querySelector('.scroll-bar');
    this.thumb = scrollbarShadowRoot.querySelector('.scroll-bar-thumb');
    this.btnUp = scrollbarShadowRoot.querySelector('.scroll-bar-up');
    this.btnDown = scrollbarShadowRoot.querySelector('.scroll-bar-down');

    this.configureOrientation();

    var bounds = that.bounds = that.getBoundingClientRect();
    that.isScrolling = false;

    that.attachThumbMouseDown()
        .attachThumbMouseMove()
        .attachThumbMouseUp()
        .attachWheelEvent();


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

    // if (directionXY === 'Y')
    //     console.log('directionXY %s,styleProperty %s,rangeStop %s, currentPercent %s, currentPercentAsRows %s, oneMoreRow %s, ranged %s',
    //         directionXY, styleProperty, rangeStop, currentPercent, currentPercentAsRows, oneMoreRow, ranged);

    that.rangeAdapter.setValue(ranged);

}, 30);

ScrollBar.prototype.attachWheelEvent = function() {
    var that = this;

    document.addEventListener('wheel', function(event) {
        // dont pull on the page at all
        event.preventDefault();
        that.throttledWheelEvent(event);
    });

    return that;
};

ScrollBar.prototype.attachThumbMouseDown = function() {
    var that = this;

    that.thumb.addEventListener('mousedown', function(event) {
        console.log(event);
        that.isScrolling = true;
        that.offset = event['offset' + that.orientation.toUpperCase()];
    });

    return that;
};

ScrollBar.prototype.attachThumbMouseMove = function() {
    var that = this;

    document.addEventListener('mousemove', function(event) {
        if (that.isScrolling) {
            var location = event[that.orientation] - that.offset;
            console.log(event[that.orientation], that.offset); // - that.bounds.top;

            that.moveThumb(location);
        }
    });

    return that;
};

ScrollBar.prototype.attachThumbMouseUp = function() {
    var that = this;
    document.addEventListener('mouseup', function(event) {
        if (that.isScrolling) {
            that.isScrolling = false;
        }
    });

    return that;
};

ScrollBar.prototype.moveThumb = function(location) {

    var that = this,
        range = that.getMaxScroll();

    //keep the scrolling in range
    location = (location) < 0 ? 0 : location;
    location = (location) > range ? range : location;

    var percent = location / that.getMaxScroll();
    this.lastPercent = percent;

    var direction = this.orientation === 'y' ? 'top' : 'left',
        axis = that.orientation.toUpperCase();

    console.log('move to this percent ', (100 * percent) + '%')
    that.thumb.style[direction] = (100 * percent) + '%';

    if (that.rangeAdapter) {
        that.rangeAdapter.setValue(percent);
    }
}; //end movethumb value

ScrollBar.prototype.moveToPercent = function(percent) {
    var that = this;
    // if already dragging, dont respect the observable value sets
    if (!that.isScrolling) {
        //console.log('set to this', percent);
        that.moveThumb(percent * this.getMaxScroll());
    }

};

ScrollBar.prototype.getLocation = function() {
    return 0 / that.getMaxScroll() * 100;

};


ScrollBar.prototype.setValueUpdatedCallback = function(callback) {
    this.valueUpdatedCallback = callback;

};


ScrollBar.prototype.setOrientation = function(orientation) {
    console.log('this is the orientation', orientation);
    this.orientation = orientation;

};

ScrollBar.prototype.getMaxScroll = function() {
    var direction = this.orientation === 'y' ? 'clientHeight' : 'clientWidth';
    return this[direction] - SCROLL_BAR_BUTTON_SIZE * 2;

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
    this.rangeAdapter.setValue(this.thumb.lastPercent);
};

ScrollBar.prototype.lastPercent = 0.0;

//scrollBarThumbProto.lastPercent = 0.0;


document.registerElement('scroll-bar', {
    prototype: new ScrollBar()
});

module.exports. ScrollBar = ScrollBar;
