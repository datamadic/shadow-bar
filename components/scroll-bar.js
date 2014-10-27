var importDoc = document.currentScript.ownerDocument;

// An instance of his will become the prototype for the custom scroll-bar
// element
var ScrollBar = function() {};

ScrollBar.prototype = Object.create(HTMLElement.prototype);

//ScrollBar.prototype.RangeAdapter = RangeAdapter;

ScrollBar.prototype.setRangeAdapter = function(rangeAdapter) {
    var that = this;

    that.rangeAdapter = rangeAdapter;
    if (that.thumb) {
        that.thumb.rangeAdapter = rangeAdapter;
    }
    Object.observe(that.rangeAdapter.valueObj, function(change) {
        //console.log(that.rangeAdapter, change);
        that.thumb.moveToPercent(change[0].object.value);
    });
};

// the createdCallback method will be called by the native code
ScrollBar.prototype.attachedCallback = function() {

    var that = this;

    console.log('this is the created call back parent node', importDoc);
    var scrollbarTemplate = importDoc.querySelector('template'),
        scrollBarImportClone = document.importNode(scrollbarTemplate.content, true),
        scrollbarShadowRoot = this.createShadowRoot();

    scrollbarShadowRoot.appendChild(scrollBarImportClone);

    this.scrollbarShadowRoot = scrollbarShadowRoot;

    // get the actionable child elements
    this.bar = scrollbarShadowRoot.querySelector('.scroll-bar');
    this.thumb = scrollbarShadowRoot.querySelector('.scroll-bar-thumb');

    this.thumb.rangeAdapter = this.rangeAdapter;

    this.btnUp = scrollbarShadowRoot.querySelector('.scroll-bar-up');
    this.btnDown = scrollbarShadowRoot.querySelector('.scroll-bar-down');

    this.configureOrientation();



    this.addEventListener('mouseenter', function(event) {
        that.mouseOver = true;
    });
    this.addEventListener('mousedown', function(event) {
        that.mouseOver = false;
    });

    var throttledWheelEvent = throttle(function(event) {



        var directionXY = that.thumb.orientation.toUpperCase(),
            styleProperty = directionXY === 'Y' ? 'top' : 'left',
            rangeStop = that.rangeAdapter.rangeStop();


        var currentPercent = (that.thumb.style && that.thumb.style[styleProperty] && parseFloat(that.thumb.style[styleProperty])) || 0;

        var direction = event['delta' + directionXY] > 0 ? 1 : -1;

        //var ranged = currentPercent / 100 + (.01 * direction);

        var currentPercentOfTotal = Math.round(that.rangeAdapter.rangeStop() * currentPercent);
        var oneMoreRow = Math.round(currentPercentOfTotal + (1 * direction));
        var ranged = oneMoreRow / rangeStop;

        if (directionXY === 'Y') {
            console.log(currentPercent, ranged);
        }


        ranged = ranged > 1 ? 1 : ranged;
        ranged = ranged < 0 ? 0 : ranged;

        that.rangeAdapter.setValue(ranged);

    }, 30);

    document.addEventListener('wheel', function(event) {
        // dont pull on the page at all
        event.preventDefault();
        throttledWheelEvent(event);
    });

    // from the thumb 

    var bounds = that.getBoundingClientRect();
    that.isScrolling = false;

    this.thumb.addEventListener('mousedown', function(event) {
        console.log(event);
        that.isScrolling = true;
    });

    document.addEventListener('mousemove', function(event) {
        if (that.isScrolling) {
            var location = event[that.orientation] - bounds.top - 35;

            that.moveThumb(location);
        }
    });
    document.addEventListener('mouseup', function(event) {
        if (that.isScrolling) {
            that.isScrolling = false;
        }
    });
    // from the thumb end 


}; // end attaached 

ScrollBar.prototype.moveThumb = function(location) {

    var that = this,
        range = that.getMaxScroll();

    //keep the scrolling in range
    location = (location) < 0 ? 0 : location;
    location = (location) > range ? range : location;

    var percent = location / that.getMaxScroll();
    this.lastPercent = percent;

    var direction = this.orientation === 'y' ? 'top' : 'left';

    var axis = that.orientation.toUpperCase();

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
        this.moveThumb(percent * this.getMaxScroll());
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
    return this.parentNode[direction];

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

var scrollBarUpProto = Object.create(HTMLElement.prototype, {});

var scrollBarThumbProto = Object.create(HTMLElement.prototype, {
    createdCallback: {
        value: function(event) {

            var that = this;
            var bounds = that.getBoundingClientRect();
            that.isScrolling = false;

            this.addEventListener('mousedown', function(event) {
                console.log(event);
                that.isScrolling = true;
            });

            document.addEventListener('mousemove', function(event) {
                if (that.isScrolling) {
                    var location = event[that.orientation] - bounds.top - 35;

                    that.moveThumb(location);
                }
            });
            document.addEventListener('mouseup', function(event) {
                if (that.isScrolling) {
                    that.isScrolling = false;
                }
            });

        }
    },
    moveThumb: {
        value: function(location) {

            var that = this,
                range = that.getMaxScroll();

            //keep the scrolling in range
            location = (location) < 0 ? 0 : location;
            location = (location) > range ? range : location;

            var percent = location / that.getMaxScroll();
            this.lastPercent = percent;

            var direction = this.orientation === 'y' ? 'top' : 'left';

            var axis = that.orientation.toUpperCase();

            that.style[direction] = (100 * percent) + '%';

            if (that.rangeAdapter) {
                that.rangeAdapter.setValue(percent);
            }
        } //end movethumb value
    },
    moveToPercent: {
        value: function(percent) {
            var that = this;
            // if already dragging, dont respect the observable value sets
            if (!that.isScrolling) {
                //console.log('set to this', percent);
                this.moveThumb(percent * this.getMaxScroll());
            }
        }
    },
    getLocation: {
        value: function() {
            return 0 / that.getMaxScroll() * 100;
        }
    },
    setValueUpdatedCallback: {
        value: function(callback) {
            this.valueUpdatedCallback = callback;
        }
    },
    setOrientation: {
        value: function(orientation) {
            console.log('this is the orientation', orientation);
            this.orientation = orientation;
        }
    },
    setScrollableElement: {
        value: function(scrollableElement) {}
    },
    getMaxScroll: {
        value: function() {
            var direction = this.orientation === 'y' ? 'clientHeight' : 'clientWidth';
            return this.parentNode[direction];
        }
    }
});


scrollBarThumbProto.lastPercent = 0.0;

var scrollBarDownProto = Object.create(HTMLElement.prototype, {});

// document.registerElement('scroll-bar-up', {
//     prototype: scrollBarUpProto
// });
// document.registerElement('scroll-bar-thumb', {
//     prototype: scrollBarThumbProto
// });
// document.registerElement('scroll-bar-down', {
//     prototype: scrollBarDownProto
// });


document.registerElement('scroll-bar', {
    prototype: new ScrollBar()
});
