
(function ($, window) {

    var makeGetPos = function (prop1, prop2) {
        return function (e) {
            if (e.originalEvent.touches) {
                if (e.type === 'touchend') {
                    return e.originalEvent.changedTouches[0][prop1] - $(e.originalEvent.target).offset()[prop2];
                } else {
                    return e.originalEvent.touches[0][prop1] - $(e.originalEvent.target).offset()[prop2];
                }
            } else {
                return e[prop1] - $(e.target).offset()[prop2];
            }
        };
    };

    var getPosX = makeGetPos('pageX', 'left');
    var getPosY = makeGetPos('pageY', 'top');

    $.fn.tap = function (sel, options) {

        var defaults = {
                delay: 750,
                tap: function (e) {},
                hold: function (e) {}
            }

        options = $.extend(defaults, options);

        return this.each(function () {
            var tapAndHold;
            var timer;
            var beginX;
            var beginY;
            var deltaX;
            var deltaY;

            return $(this)
                .on('touchstart mousedown', sel, function (e) {
                    tapAndHold = false;

                    window.clearTimeout(timer);
                    timer = window.setTimeout(function () {
                        tapAndHold = true;
                        timer = null;
                        options.hold(e);
                    }, options.delay);

                    beginX = getPosX(e);
                    beginY = getPosY(e);
                    deltaX = 0;
                    deltaY = 0;
                })
                .on('touchmove mousemove', function (e) {
                    deltaX = getPosX(e) - beginX;
                    deltaY = getPosY(e) - beginY;

                    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                        window.clearTimeout(timer);
                        timer = null;
                    }
                })
                .on('touchend mouseup', sel, function (e) {
                    window.clearTimeout(timer);
                    timer = null;

                    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                        if (!tapAndHold) {
                            options.tap(e);
                            e.preventDefault();
                        }
                    }
                });
        });
    };
})(jQuery, window);
