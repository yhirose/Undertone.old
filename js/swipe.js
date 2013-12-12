
(function ($) {

    var getPosX = function (e) {
        // TODO: Windows support
        return e.originalEvent.touches[0].clientX;
    };

    var getPosY = function (e) {
        // TODO: Windows support
        return e.originalEvent.touches[0].clientY;
    };

    $.fn.swipe = function (options) {

        var defaults = {
            swiping: function (delta) {},
            complete: function (delta) {}
        };

        options = $.extend(defaults, options);

        return this.each(function () {
            var swiping = false;
            var beginX = null;
            var beginY = null;
            var deltaX = null;
            var deltaY = null;

            return $(this)
                .on('touchstart', function (e) {
                    swiping = false;
                    beginX = getPosX(e);
                    beginY = getPosY(e);
                    deltaX = 0;
                    deltaY = 0;
                })
                .on('touchmove', function (e) {
                    deltaX = getPosX(e) - beginX;
                    deltaY = getPosY(e) - beginY;
                    if (swiping || Math.abs(deltaY) < 10) {
                        if (swiping || Math.abs(deltaX) > 10) {
                            e.preventDefault();
                            swiping = true;
                            options.swiping(deltaX);
                        }
                    }
                })
                .on('touchend', function () {
                    if (swiping) {
                        options.complete(deltaX);
                    }
                    swiping = false;
                });
        });
    };

})(jQuery);
