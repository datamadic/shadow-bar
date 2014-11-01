// Because this is a node module, we may not have the DOM when run. In practice 
// this will not really happen, but it is useful to test this module as a node 
// module and having an object that abstracts the dom is quite useful. 
var DOM = {};

DOM.window = require('./window.js');

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

var _ = { //jshint ignore:line
    escape: createEscaper(escapeMap), 
    unescape: createEscaper(unescapeMap)

}

if (DOM.window){ //jshint ignore:line
    DOM.window._ = _;
}

module.exports._ = _;





