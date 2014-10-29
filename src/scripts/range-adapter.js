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

    return that;
};

module.exports = RangeAdapter;
