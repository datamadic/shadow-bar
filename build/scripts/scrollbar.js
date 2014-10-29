(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var underbar = require('./underbar.js'),
		observe = require('./observe.js'),
		scrollBar = require('./scroll-bar.js'),
		rangeAdapter = require('./range-adapter.js');

module.exports.RangeAdapter = rangeAdapter;
		

},{"./observe.js":2,"./range-adapter.js":3,"./scroll-bar.js":4,"./underbar.js":6}],2:[function(require,module,exports){
/*
  we need a shim for now object.observe, its from here: 
  https://github.com/jdarling/Object.observe/blob/master/Object.observe.poly.js
*/

/*

  Tested against Chromium build with Object.observe and acts EXACTLY the same,
  though Chromium build is MUCH faster

  Trying to stay as close to the spec as possible,
  this is a work in progress, feel free to comment/update

  Specification:
    http://wiki.ecmascript.org/doku.php?id=harmony:observe

  Built using parts of:
    https://github.com/tvcutsem/harmony-reflect/blob/master/examples/observer.js

  Limits so far;
    Built using polling... Will update again with polling/getter&setters to make things better at some point

TODO:
  Add support for Object.prototype.watch -> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
*/

if(!Object.observe){
  (function(extend, global){
    "use strict";
    var isCallable = (function(toString){
        var s = toString.call(toString),
            u = typeof u;
        return typeof global.alert === "object" ?
          function isCallable(f){
            return s === toString.call(f) || (!!f && typeof f.toString == u && typeof f.valueOf == u && /^\s*\bfunction\b/.test("" + f));
          }:
          function isCallable(f){
            return s === toString.call(f);
          }
        ;
    })(extend.prototype.toString);
    // isNode & isElement from http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    //Returns true if it is a DOM node
    var isNode = function isNode(o){
      return (
        typeof Node === "object" ? o instanceof Node :
        o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
      );
    }
    //Returns true if it is a DOM element
    var isElement = function isElement(o){
      return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
    );
    }
    var _isImmediateSupported = (function(){
      return !!global.setImmediate;
    })();
    var _doCheckCallback = (function(){
      if(_isImmediateSupported){
        return function _doCheckCallback(f){
          return setImmediate(f);
        };
      }else{
        return function _doCheckCallback(f){
          return setTimeout(f, 10);
        };
      }
    })();
    var _clearCheckCallback = (function(){
      if(_isImmediateSupported){
        return function _clearCheckCallback(id){
          clearImmediate(id);
        };
      }else{
        return function _clearCheckCallback(id){
          clearTimeout(id);
        };
      }
    })();
    var isNumeric=function isNumeric(n){
      return !isNaN(parseFloat(n)) && isFinite(n);
    };
    var sameValue = function sameValue(x, y){
      if(x===y){
        return x !== 0 || 1 / x === 1 / y;
      }
      return x !== x && y !== y;
    };
    var isAccessorDescriptor = function isAccessorDescriptor(desc){
      if (typeof(desc) === 'undefined'){
        return false;
      }
      return ('get' in desc || 'set' in desc);
    };
    var isDataDescriptor = function isDataDescriptor(desc){
      if (typeof(desc) === 'undefined'){
        return false;
      }
      return ('value' in desc || 'writable' in desc);
    };

    var validateArguments = function validateArguments(O, callback, accept){
      if(typeof(O)!=='object'){
        // Throw Error
        throw new TypeError("Object.observeObject called on non-object");
      }
      if(isCallable(callback)===false){
        // Throw Error
        throw new TypeError("Object.observeObject: Expecting function");
      }
      if(Object.isFrozen(callback)===true){
        // Throw Error
        throw new TypeError("Object.observeObject: Expecting unfrozen function");
      }
      if (accept !== undefined) {
        if (!Array.isArray(accept)) {
          throw new TypeError("Object.observeObject: Expecting acceptList in the form of an array");
        }
      }
    };

    var Observer = (function Observer(){
      var wraped = [];
      var Observer = function Observer(O, callback, accept){
        validateArguments(O, callback, accept);
        if (!accept) {
          accept = ["add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions"];
        }
        Object.getNotifier(O).addListener(callback, accept);
        if(wraped.indexOf(O)===-1){
          wraped.push(O);
        }else{
          Object.getNotifier(O)._checkPropertyListing();
        }
      };

      Observer.prototype.deliverChangeRecords = function Observer_deliverChangeRecords(O){
        Object.getNotifier(O).deliverChangeRecords();
      };

      wraped.lastScanned = 0;
      var f = (function f(wrapped){
              return function _f(){
                var i = 0, l = wrapped.length, startTime = new Date(), takingTooLong=false;
                for(i=wrapped.lastScanned; (i<l)&&(!takingTooLong); i++){
                  if(_indexes.indexOf(wrapped[i]) > -1){
                    Object.getNotifier(wrapped[i])._checkPropertyListing();
                    takingTooLong=((new Date())-startTime)>100; // make sure we don't take more than 100 milliseconds to scan all objects
                  }else{
                    wrapped.splice(i, 1);
                    i--;
                    l--;
                  }
                }
                wrapped.lastScanned=i<l?i:0; // reset wrapped so we can make sure that we pick things back up
                _doCheckCallback(_f);
              };
            })(wraped);
      _doCheckCallback(f);
      return Observer;
    })();

    var Notifier = function Notifier(watching){
    var _listeners = [], _acceptLists = [], _updates = [], _updater = false, properties = [], values = [];
      var self = this;
      Object.defineProperty(self, '_watching', {
                  enumerable: true,
                  get: (function(watched){
                    return function(){
                      return watched;
                    };
                  })(watching)
                });
      var wrapProperty = function wrapProperty(object, prop){
        var propType = typeof(object[prop]), descriptor = Object.getOwnPropertyDescriptor(object, prop);
        if((prop==='getNotifier')||isAccessorDescriptor(descriptor)||(!descriptor.enumerable)){
          return false;
        }
        if((object instanceof Array)&&isNumeric(prop)){
          var idx = properties.length;
          properties[idx] = prop;
          values[idx] = object[prop];
          return true;
        }
        (function(idx, prop){
          properties[idx] = prop;
          values[idx] = object[prop];
          Object.defineProperty(object, prop, {
            get: function(){
              return values[idx];
            },
            set: function(value){
              if(!sameValue(values[idx], value)){
                Object.getNotifier(object).queueUpdate(object, prop, 'update', values[idx]);
                values[idx] = value;
              }
            }
          });
        })(properties.length, prop);
        return true;
      };
      self._checkPropertyListing = function _checkPropertyListing(dontQueueUpdates){
        var object = self._watching, keys = Object.keys(object), i=0, l=keys.length;
        var newKeys = [], oldKeys = properties.slice(0), updates = [];
        var prop, queueUpdates = !dontQueueUpdates, propType, value, idx, aLength;

        if(object instanceof Array){
          aLength = self._oldLength;//object.length;
          //aLength = object.length;
        }

        for(i=0; i<l; i++){
          prop = keys[i];
          value = object[prop];
          propType = typeof(value);
          if((idx = properties.indexOf(prop))===-1){
            if(wrapProperty(object, prop)&&queueUpdates){
              self.queueUpdate(object, prop, 'add', null, object[prop]);
            }
          }else{
            if(!(object instanceof Array)||(isNumeric(prop))){
              if(values[idx] !== value){
                if(queueUpdates){
                  self.queueUpdate(object, prop, 'update', values[idx], value);
                }
                values[idx] = value;
              }
            }
            oldKeys.splice(oldKeys.indexOf(prop), 1);
          }
        }

        if(object instanceof Array && object.length !== aLength){
          if(queueUpdates){
            self.queueUpdate(object, 'length', 'update', aLength, object);
          }
          self._oldLength = object.length;
        }

        if(queueUpdates){
          l = oldKeys.length;
          for(i=0; i<l; i++){
            idx = properties.indexOf(oldKeys[i]);
            self.queueUpdate(object, oldKeys[i], 'delete', values[idx]);
            properties.splice(idx,1);
            values.splice(idx,1);
          };
        }
      };
      self.addListener = function Notifier_addListener(callback, accept){
        var idx = _listeners.indexOf(callback);
        if(idx===-1){
          _listeners.push(callback);
          _acceptLists.push(accept);
        }
        else {
          _acceptLists[idx] = accept;
        }
      };
      self.removeListener = function Notifier_removeListener(callback){
        var idx = _listeners.indexOf(callback);
        if(idx>-1){
          _listeners.splice(idx, 1);
          _acceptLists.splice(idx, 1);
        }
      };
      self.listeners = function Notifier_listeners(){
        return _listeners;
      };
      self.queueUpdate = function Notifier_queueUpdate(what, prop, type, was){
        this.queueUpdates([{
          type: type,
          object: what,
          name: prop,
          oldValue: was
        }]);
      };
      self.queueUpdates = function Notifier_queueUpdates(updates){
        var self = this, i = 0, l = updates.length||0, update;
        for(i=0; i<l; i++){
          update = updates[i];
          _updates.push(update);
        }
        if(_updater){
          _clearCheckCallback(_updater);
        }
        _updater = _doCheckCallback(function(){
          _updater = false;
          self.deliverChangeRecords();
        });
      };
      self.deliverChangeRecords = function Notifier_deliverChangeRecords(){
        var i = 0, l = _listeners.length,
            //keepRunning = true, removed as it seems the actual implementation doesn't do this
            // In response to BUG #5
            retval;
        for(i=0; i<l; i++){
          if(_listeners[i]){
            var currentUpdates;
            if (_acceptLists[i]) {
              currentUpdates = [];
              for (var j = 0, updatesLength = _updates.length; j < updatesLength; j++) {
                if (_acceptLists[i].indexOf(_updates[j].type) !== -1) {
                  currentUpdates.push(_updates[j]);
                }
              }
            }
            else {
              currentUpdates = _updates;
            }
            if (currentUpdates.length) {
              if(_listeners[i]===console.log){
                console.log(currentUpdates);
              }else{
                _listeners[i](currentUpdates);
              }
            }
          }
        }
        _updates=[];
      };
      self.notify = function Notifier_notify(changeRecord) {
        if (typeof changeRecord !== "object" || typeof changeRecord.type !== "string") {
          throw new TypeError("Invalid changeRecord with non-string 'type' property");
        }
        changeRecord.object = watching;
        self.queueUpdates([changeRecord]);
      };
      self._checkPropertyListing(true);
    };

    var _notifiers=[], _indexes=[];
    extend.getNotifier = function Object_getNotifier(O){
    var idx = _indexes.indexOf(O), notifier = idx>-1?_notifiers[idx]:false;
      if(!notifier){
        idx = _indexes.length;
        _indexes[idx] = O;
        notifier = _notifiers[idx] = new Notifier(O);
      }
      return notifier;
    };
    extend.observe = function Object_observe(O, callback, accept){
      // For Bug 4, can't observe DOM elements tested against canry implementation and matches
      if(!isElement(O)){
        return new Observer(O, callback, accept);
      }
    };
    extend.unobserve = function Object_unobserve(O, callback){
      validateArguments(O, callback);
      var idx = _indexes.indexOf(O),
          notifier = idx>-1?_notifiers[idx]:false;
      if (!notifier){
        return;
      }
      notifier.removeListener(callback);
      if (notifier.listeners().length === 0){
        _indexes.splice(idx, 1);
        _notifiers.splice(idx, 1);
      }
    };
  })(Object, this);
}
},{}],3:[function(require,module,exports){
// Adapted form http://live.exept.de/ClassDoc/classDocOf:,RangeAdaptor
// Range Adaptor is a kind of UpdateAdaptor that can be used to turn an
// arbitrary number (either an Integer or a Float) into a Float normalized between
// 0 and 1.
RangeAdapter = function(subject, userConfig) {
    var config = userConfig || {
            step: 1,
            page: 40,
            rangeStart: 0,
            rangeStop: 100
        },
        that = this;

    // this is the 'cached' value that is listenable
    that.valueObj = {
        value: null
    };

    Object.observe(subject, function(changeSet) {
        that.subjectChanged();
    });

    that.subjectChanged = function() {
        that.valueObj.value = that.computeNormalizedValue();
    };

    that.grid = function(value) {
        if (value === undefined) {
            return grid;
        }
        grid = value;
    };

    that.rangeStart = function(value) {
        if (value === undefined) {
            return config.rangeStart;
        }
    };

    that.rangeStop = function(value) {
        if (value === undefined) {
            return config.rangeStop;
        }
    };

    that.page = function(value) {
        if (value === undefined) {
            return config.page;
        }
    };

    // @param value is a number
    that.setValue = function(newValue) {
        if (!typeof value === 'number') {
            return;
        }
        var deNormalized = Math.floor((newValue * (config.rangeStop - config.rangeStart)) + config.rangeStart);
        subject.setValue(deNormalized);
        that.valueObj.value = newValue;
    };
    that.computeNormalizedValue = function() {
        value = (subject.getValue() - config.rangeStart) / (config.rangeStop - config.rangeStart);
        return value;
    };

    that.getValue = function() {
        return that.valueObj.value;
    };

};

module.exports.RangeAdapter = RangeAdapter;

},{}],4:[function(require,module,exports){
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

    if (directionXY === 'X')
        console.log('directionXY %s,styleProperty %s,rangeStop %s, currentPercent %s, currentPercentAsRows %s, oneMoreRow %s, ranged %s',
            directionXY, styleProperty, rangeStop, currentPercent, currentPercentAsRows, oneMoreRow, ranged);

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
    return this.parentNode[direction] - SCROLL_BAR_BUTTON_SIZE * 2;

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

},{"./templates.js":5}],5:[function(require,module,exports){
module.exports = module.exports || {};

module.exports["scrollbar"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\t<template>\n\t\t<style>\n\t\t.scroll-bar {\n\t\t\twidth: 15px;\n\t\t\tposition: absolute;\n\t\t\ttop:0;\n\t\t\tbottom:0;\n\t\t\tbackground-color: lightgrey;\n\t\t}\n\t\t.scroll-gutter {\n\t\t\tposition: absolute;\n\t\t\ttop: 0%;\n\t\t\tbottom: 0%;\n\t\t\tright: 0%;\n\t\t\tleft: 0%;\n\t\t\tmargin-top: 15px;\n\t\t\tmargin-bottom: 35px;\n\t\t}\n\t\t.scroll-bar.horizontal {\n\t\t\theight: 15px;\n\t\t\twidth: 100%;\n\t\t\tposition: absolute;\n\t\t\tleft:0;\n\t\t\tright: 100%;\n\t\t\ttop:100%;\n\t\t}\n\n\t\t.horizontal .scroll-gutter {\n\t\t\tposition: absolute;\n\t\t\ttop: 0%;\n\t\t\tbottom: 0%;\n\t\t\tright: 0%;\n\t\t\tleft: 0%;\n\t\t\tmargin-top: 0px;\n\t\t\tmargin-bottom: 0px;\n\t\t\tmargin-left: 15px;\n\t\t\tmargin-right: 35px;\n\t\t}\n\n\t\t.scroll-bar-up{\n\t\t\tposition: absolute;\n\t\t\ttop: 0;\n\t\t\tleft: 0;\n\t\t\twidth: 15px;\n\t\t\theight: 15px;\n\t\t\tbackground-color: darkgrey;\n\t\t}\n\n\t\t.scroll-bar.horizontal .scroll-bar-up{\n\t\t\tposition: absolute;\n\t\t\ttop: 0;\n\t\t\tright: 0;\n\t\t\tleft: auto;\n\t\t\twidth: 15px;\n\t\t\theight: 15px;\n\t\t\tbackground-color: darkgrey;\n\t\t}\n\n\t\t.scroll-bar-thumb {\n\t\t\tbackground-color: gray;\n\t\t\twidth: 15px;\n\t\t\theight: 20px;\n\t\t\ttop: 0;\n\t\t\tleft: 0px;\n\t\t\tposition: absolute;\n\t\t}\n\t\t.scroll-bar.horizontal .scroll-bar-thumb {\n\t\t\theight: 15px;\n\t\t\twidth: 20px;\n\t\t\tleft: 0px;\n\t\t\ttop: 0;\n\t\t\tposition: absolute;\n\t\t}\n\n\t\t.scroll-bar-down{\n\t\t\tposition: absolute;\n\t\t\tright: 0;\n\t\t\tbottom: 0;\n\t\t\twidth: 15px;\n\t\t\theight: 15px;\n\t\t\tbackground-color: darkgrey;\n\t\t}\n\t\t.scroll-bar.horizontal .scroll-bar-down{\n\t\t\tposition: absolute;\n\t\t\tleft: 0;\n\t\t\twidth: 15px;\n\t\t\theight: 15px;\n\t\t\tbackground-color: darkgrey;\n\t\t}\n\n\t\t</style>\n\t\t<div class="scroll-bar">\n\t\t\t<div class="scroll-bar-up"></div>\n\t\t\t<div class="scroll-gutter">\n\t\t\t\t<div class="scroll-bar-thumb" draggable="false"></div>\n\t\t\t</div>\n\t\t\t<div class="scroll-bar-down"></div>\n\t\t</div>\n\t</template>\n';

}
return __p
};
},{}],6:[function(require,module,exports){


//expose browserify to global

var invert = function(obj) {
    var result = {};
    var keys = Object.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
        result[obj[keys[i]]] = keys[i];
    }
    return result;
};
var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#x27;',
    '`': '&#x60;'
};
var unescapeMap = invert(escapeMap);

// Functions for escaping and unescaping strings to/from HTML interpolation.
var createEscaper = function(map) {
    var escaper = function(match) {
        return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + Object.keys(map).join('|') + ')';
    var testRegexp = new RegExp(source);
    var replaceRegexp = new RegExp(source, 'g');
    return function(string) {
        string = !string ? '' : '' + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
};

if (window){ //jshint ignore:line
    window._ = { //jshint ignore:line
        escape: createEscaper(escapeMap), 
        unescape: createEscaper(unescapeMap)

    };
}






},{}]},{},[1,2,3,4,5,6]);
