var expect = require('chai').expect,
    util = require('util'),
    mockery = require('mockery'),
    moduleUnderTest = '../src/scripts/scroll-bar.js',
    generateFunctionSignatureExpects = require('shape-tests').generateFunctionSignatureExpects,
    generatePropertyExpects = require('shape-tests').generatePropertyExpects,
    noop = function() {},
    fakeWindow = {
        HTMLElement: {
            prototype: {}
        },
        document: {
            registerElement: noop,
            addEventListener: noop,
            createElement: function() {
                return {
                    querySelector: function() {
                        return {};
                    }
                };
            }
        }
    };


describe('scroll-bar ', function() {

    describe('shape', function() {

        mockery.registerAllowables([moduleUnderTest, './throttle.js', './templates.js', './underbar.js']);
        mockery.registerMock('./window.js', fakeWindow);
        mockery.enable({
            useCleanCache: true
        });

        var ScrollBar = new require(moduleUnderTest).ScrollBar;

        var scrollBarShape = {
            properties: [],
            methods: [{
                name: 'tickle',
                numArgs: 0,
                inPrototype: true
            }, {
                name: 'setRangeAdapter',
                numArgs: 1,
                inPrototype: true
            }]
        };

        generateFunctionSignatureExpects(ScrollBar, scrollBarShape.methods);

        mockery.disable();
        mockery.deregisterAll();

    });
});
