
$(function () {

    var DEFAULT_DURATION_YEARS = 3;
    var TOTAL_CHAPTER_COUNT = (function () {
        var count = 0;
        for (var book = 1; book <= BibleCitation.getBookCount(); book++) {
            count += BibleCitation.getChapterCount(book);
        }
        return count;
    }());

    var personalScheduleProgressTable;
    var settingTable;

    var getDataFromCell = function ($cell) {
        return {
            date: Date.parse($cell.parent().data('date')),
            book: parseInt($cell.data('book'), 10),
            chapter: parseInt($cell.data('chapter'), 10)
        };
    };

    var makePersonalScheduleUI = (function () {
        var isTiny = true;
        return function (wantSame) {
            if (!wantSame) {
                isTiny = !isTiny;
            }
            var tmpl = isTiny ? '#tmplPersonalScheduleTiny' : '#tmplPersonalSchedule';
            return _.template($(tmpl).html());
        };
    })();

    var getSortedDoneListByDate = function () {
        var doneList = personalScheduleProgressTable.query();

        doneList.sort(function (a, b) {
            var bookA = a.get('book'),
                bookB = b.get('book');

            if (bookA < bookB) {
                return -1;
            } else if (bookA > bookB) {
                return 1;
            } else {
                var chapterA = a.get('chapter'),
                    chapterB = b.get('chapter');

                if (chapterA < chapterB) {
                    return -1;
                } else if (chapterA > chapterB) {
                    return 1;
                } else {
                    return 0;
                }
            }
        });

        return doneList;
    };

    var getNextCellIndexForReading = function (doneList) {
        var index = 0;
        if (doneList.length > 0) {
            var lastRec = _.max(doneList, function (rec) { return rec.get('date'); });

            var book = lastRec.get('book');
            for (var curBook = 1; curBook < book; curBook++) {
                index += BibleCitation.getChapterCount(curBook);
            }

            index += (lastRec.get('chapter') - 1);
        }
        return index;
    };

    var updatePersonalScheduleCellState = function (info) {
        var doneList = getSortedDoneListByDate();

        var nextCellIndex = getNextCellIndexForReading(doneList);
        var behindCount = info.behindChapterCount;

        var cellIndex = 0;
        $('.personalSchedule .cells').each(function () {
            $(this).children().each(function () {
                var $cell = $(this);
                var data = getDataFromCell($cell);

                $cell.removeClass('behind');
                if (doneList.length > 0 &&
                        data.book === doneList[0].get('book') &&
                        data.chapter === doneList[0].get('chapter')) {
                    $cell.addClass('done');
                    doneList.shift();
                } else {
                    $cell.removeClass('done');
                    if (cellIndex >= nextCellIndex && behindCount-- > 0) {
                        $cell.addClass('behind');
                    }
                }
                cellIndex++;
            });
        });

        /*
        if (behindCount > 0) {
            var cellIndex = 0;
            $('.personalSchedule .cells').each(function () {
                $(this).children().each(function () {
                    var $cell = $(this);
                    if (!$cell.hasClass('done')) {
                        if (behindCount-- > 0) {
                            $cell.addClass('behind');
                        }
                    }
                    cellIndex++;
                });
            });
        }
        */
    };

    var getBeginDateForPersonalSchedule = function (doneList) {
        // From the setting table
        var results = settingTable.query({
            type: 'duration'
        });
        if (results.length > 0) {
            var val = results[0].get('beginDate');
            if (val) {
                return new Date(val);
            }
        }

        // From the earliest recored date
        if (doneList.length > 0) {
            var begRec = _.min(doneList, function (rec) { return rec.get('date'); });
            return new Date(begRec.get('date'));
        }

        // Current time
        return new Date();
    };

    var getDurationYears = function () {
        var results = settingTable.query({
            type: 'duration'
        });

        if (results.length > 0) {
            var val = results[0].get('years');
            if (val) {
                return val;
            }
        }

        return DEFAULT_DURATION_YEARS;
    };

    var getEndDateForPersonalSchedule = function (beginDate) {
        var endDate = beginDate.clone();
        endDate.addMonths(12 * getDurationYears());
        return endDate;
    };

    var getDurationInfo = function () {
        var doneList = personalScheduleProgressTable.query();
        var beginDate = getBeginDateForPersonalSchedule(doneList);
        var endDate = getEndDateForPersonalSchedule(beginDate);
        var durationDays = beginDate.getDaysBetween(endDate);
        var chaptersPerDay = TOTAL_CHAPTER_COUNT / durationDays;
        var elapsedDays = beginDate.getDaysBetween(new Date());
        var expectedPercentage = elapsedDays * 100 / durationDays;
        var expectedChapterCount = TOTAL_CHAPTER_COUNT * expectedPercentage / 100;
        var actualChapterCount = doneList.length;
        var actualPercentage = actualChapterCount * 100 / TOTAL_CHAPTER_COUNT;
        var behindChapterCount = expectedChapterCount - actualChapterCount;
        var actualPercentageToExpected = actualPercentage * 100 / expectedPercentage;

        return {
            beginDate: beginDate,
            endDate: endDate,
            durationDays: durationDays,
            chaptersPerDay: chaptersPerDay,
            elapsedDays: elapsedDays,
            expectedPercentage: expectedPercentage,
            expectedChapterCount: expectedChapterCount,
            actualPercentage: actualPercentage,
            actualChapterCount: actualChapterCount,
            behindChapterCount: behindChapterCount,
            actualPercentageToExpected: actualPercentageToExpected
        };
    };

    var updatePersonalScheduleProgress = function (info) {
        var $progress = $('.personalSchedule .progress');
        $progress.find('.actual').css('width', info.actualPercentageToExpected + '%');
        $progress.find('.expected').css('width', info.expectedPercentage + '%');

        var $percentage = $('.personalSchedule .percentage');
        $percentage.html(Math.round(info.actualPercentage) + '&thinsp;%');
    };

    var updateDurationSetting = function (info) {
        $('#durationBeginDate').val(info.beginDate.toFormat('YYYY-MM-DD'));
        $('#durationEndDate').val(info.endDate.toFormat('YYYY-MM-DD'));
        $('#durationYears').val(getDurationYears());
    };

    var updateActionsSetting = function () {
        var loadActionValues = function (result, fieldName, selector) {
            var values = result.get(fieldName);
            for (var i = 0; i < values.length(); i++) {
                var $el = $(selector + '[data-id=' + i + ']');
                var val = values.get(i);
                if ($el.val() !== val) {
                    $el.val(val);
                }
            }
        };

        var results = settingTable.query({
            type: 'action'
        });

        if (results.length > 0) {
            var result = results[0];
            loadActionValues(result, 'names', '.actionName');
            loadActionValues(result, 'urls', '.actionURL');
        }
    };

    var dataChanged = function () {
        // TODO: update only items that are modified.
        var info = getDurationInfo();
        updatePersonalScheduleCellState(info);
        updatePersonalScheduleProgress(info);
        updateDurationSetting(info);
        updateActionsSetting();
    };

    var resetPersonalSchedule = function () {
        var results = personalScheduleProgressTable.query();
        _.each(results, function (rec, i) {
            rec.deleteRecord();
        });
    };

    var getActionName = function (id) {
        return $('.actionName[data-id=' + id + ']').val();
    };

    var getActionFormatString = function (id) {
        return $('.actionURL[data-id=' + id + ']').val();
    };

    var chooseAction = function (data) {
        var $menuFrame = $('#actionMenu');
        var $menuActions = $('#actionMenu > ul > li');

        var dismissMenu = function () {
            $menuFrame.fadeOut(function () {
                $menuActions.off();
            });
        };

        $('#actionMenu > div').on('click', dismissMenu);

        $menuActions
            .each(function (i, el) {
                var name = getActionName(i);
                var actionFormatString = getActionFormatString(i);
                if (name && actionFormatString) {
                    var actionString = actionFormatString.replace(/{(book|chapter)}/g, function (m, g1) {
                        return data[g1];
                    });
                    $(el).find('> a').text(name).attr('href', actionString).end().show();
                } else {
                    $(el).hide();
                }
            })
            .on('click', function (e) {
                dismissMenu();
            });

        $menuFrame.fadeIn({
            start: function () {
                var $menu = $('#actionMenu > ul');
                $menu
                    .css({
                        top: $(window).height() / 2 - $menu.height() / 2,
                        left: $(window).width() / 2 - $menu.width() / 2
                    });
            }
        });
    };

    // Main
    var client = new Dropbox.Client({ key: DROPBOX_APP_KEY });

    client.authenticate({ interactive: false }, function (error) {
        if (error) {
            alert('Authentication error: ' + error);
        }
    });

    if (client.isAuthenticated()) {
        client.getDatastoreManager().openDefaultDatastore(function (error, datastore) {
            if (error) {
                alert('Error opening default datastore: ' + error);
                return true;
            }

            personalScheduleProgressTable = datastore.getTable('personalScheduleProgress');
            settingTable = datastore.getTable('setting');

            $('#personal').html(makePersonalScheduleUI(true));
            $('#main').css('display', 'block');
            window.setTimeout(dataChanged, 0);

            datastore.recordsChanged.addListener(dataChanged);
        });

        $('.personalSchedule').tap('.cell', {
            delay: 750,
            tap: function (e) {
                var $cell = $(e.target);
                var data = getDataFromCell($cell);

                var results = personalScheduleProgressTable.query({
                    book: data.book,
                    chapter: data.chapter
                });

                if (results.length > 0) {
                    $cell.removeClass('done');
                    results[0].deleteRecord();
                } else {
                    $cell.removeClass('begind');
                    $cell.addClass('done');
                    personalScheduleProgressTable.insert({
                        date: Date.now(),
                        book: data.book,
                        chapter: data.chapter
                    });
                }

                var info = getDurationInfo();
                updatePersonalScheduleCellState(info);
                updatePersonalScheduleProgress(info);
                e.stopPropagation();
            },
            hold: function (e) {
                var $cell = $(e.target);
                chooseAction(getDataFromCell($cell));
            }
        });

        $('.actionName, .actionURL').on('keyup', (function () {
            var timer;
            return function (e) {
                if (timer) {
                    window.clearTimeout(timer);
                    timer = undefined;
                }
                timer = window.setTimeout(function () {
                    var names = _.map($('.actionName'), function (el, i) {
                        return $(el).val();
                    });

                    var urls = _.map($('.actionURL'), function (el, i) {
                        return $(el).val();
                    });

                    var results = settingTable.query({
                        type: 'action'
                    });

                    if (results.length > 0) {
                        results[0].update({
                            names: names,
                            urls: urls
                        });
                    } else {
                        settingTable.insert({
                            type: 'action',
                            names: names,
                            urls: urls
                        });
                    }

                    timer = undefined;
                }, 500);
            };
        })());

        $('#durationYears').on('change keyup', (function () {
            var timer;
            return function (e) {
                if (timer) {
                    window.clearTimeout(timer);
                    timer = undefined;
                }
                timer = window.setTimeout(function () {
                    var years = Number($('#durationYears').val());

                    if (0 < years && years <= 10) {
                        $('#durationYears').css('color', '');

                        var results = settingTable.query({
                            type: 'duration'
                        });

                        if (results.length > 0) {
                            results[0].update({
                                years: years
                            });
                        } else {
                            settingTable.insert({
                                type: 'duration',
                                years: years
                            });
                        }
                    } else {
                        $('#durationYears').css('color', 'red');
                    }

                    timer = undefined;
                }, 500);
            };
        })());

        $('#resetPersonalSchedule').on('click', function (e) {
            if (confirm('Are you sure?')) {
                resetPersonalSchedule();
            }
            e.preventDefault();
        });

    } else {
        $('#login').css('display', 'block');

        $('#loginButton').on('click', function (e) {
            e.preventDefault();
            client.authenticate();
        });
    }
});
