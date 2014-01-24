
$(function () {

    var DEFAULT_DURATION_YEARS = 3;
    var SCHOOL_SCHEDULE_PATH = 'dat/SchoolSchedule.csv';
    var TOTAL_CHAPTER_COUNT = (function () {
        var count = 0;
        for (var book = 1; book <= BibleCitation.getBookCount(); book++) {
            count += BibleCitation.getChapterCount(book);
        }
        return count;
    }());

    var schoolScheduleProgressTable;
    var personalScheduleProgressTable;
    var settingTable;

    var CSV = {
        parse: function (s) {
            return _.map(_.str.trim(s).split('\n'), function (x) {
                return x.split(',');
            });
        }/*,
        stringify: function (csv) {
            return _.map(csv, function (row) { return row.join(','); }).join('\n');
        }
        */
    };

    var getSchoolSchedule = function (db, weekOffset) {
        var normalize = function (s) {
            return s;
        };

        var index = -1;
        for (var i = 0, len = db.length; i < len; i++) {
            var date = Date.parse(normalize(db[i][0])),
                now = Date.now();

            if (date <= now &&
                (i + 1 === len || now < Date.parse(normalize(db[i + 1][0])))) {
                index = i;
                break;
            }
        }

        if (index === -1 || (index + weekOffset) === db.length) {
            return -1;
        }

        return db[index + weekOffset];
    };

    var getDataFromCell = function ($cell) {
        return {
            date: Date.parse($cell.parent().data('date')),
            book: parseInt($cell.data('book'), 10),
            chapter: parseInt($cell.data('chapter'), 10)
        };
    };

    var makeSchoolScheduleUI = function (schedule) {
        var parseRangeText = function (s) {
            return _.map(s.split('/'), function (cita) {
                return BibleCitation.parseCitation(cita);
            });
        };

        return _.template($('#tmplSchoolSchedule').html(), {
            date: schedule[0],
            items: parseRangeText(schedule[1])
        });
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

    var updateSchoolScheduleCellState = function () {
        $('.schoolSchedule .cells').each(function () {
            $(this).children().each(function () {
                var $cell = $(this);
                var data = getDataFromCell($cell);
                var results = schoolScheduleProgressTable.query(data);
                if (results.length > 0) {
                    if (!$cell.hasClass('done')) {
                        $cell.addClass('done');
                    }
                } else {
                    if ($cell.hasClass('done')) {
                        $cell.removeClass('done');
                    }
                }
            });
        });
    };

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
        var begindCount = info.behindChapterCount;

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
                    if (cellIndex >= nextCellIndex && begindCount-- > 0) {
                        $cell.addClass('behind');
                    }
                }
                cellIndex++;
            });
        });

        if (begindCount > 0) {
            var cellIndex = 0;
            $('.personalSchedule .cells').each(function () {
                $(this).children().each(function () {
                    var $cell = $(this);
                    if (!$cell.hasClass('done')) {
                        if (begindCount-- > 0) {
                            $cell.addClass('behind');
                        }
                    }
                    cellIndex++;
                });
            });
        }
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
        updateSchoolScheduleCellState();
        updatePersonalScheduleCellState(info);
        updatePersonalScheduleProgress(info);
        updateDurationSetting(info);
        updateActionsSetting();
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

            schoolScheduleProgressTable = datastore.getTable('schoolScheduleProgress');
            personalScheduleProgressTable = datastore.getTable('personalScheduleProgress');
            settingTable = datastore.getTable('setting');

            $.get(SCHOOL_SCHEDULE_PATH).done(function (csv) {

                var db = CSV.parse(csv);

                var thisWeekSchedule = getSchoolSchedule(db, 0);
                var nextWeekSchedule = getSchoolSchedule(db, 1);

                // Remove old records...
                var thisWeekDate = Date.parse(thisWeekSchedule[0]);
                var results = schoolScheduleProgressTable.query();
                _.each(results, function (rec, i) {
                    if (rec.date < thisWeekDate) {
                        rec.deleteRecord();
                    }
                });

                $('#thisWeek').html(makeSchoolScheduleUI(thisWeekSchedule));
                $('#nextWeek').html(makeSchoolScheduleUI(nextWeekSchedule));
                $('#personal').html(makePersonalScheduleUI(true));
                $('#main').css('display', 'block');
                window.setTimeout(dataChanged, 0);
            });

            datastore.recordsChanged.addListener(dataChanged);
        });

        $('.schoolSchedule').tap('.cell', {
            delay: 750,
            tap: function (e) {
                var $cell = $(e.target);
                var data = getDataFromCell($cell);

                var results = schoolScheduleProgressTable.query(data);

                if (results.length > 0) {
                    $cell.removeClass('done');
                    results[0].deleteRecord();
                } else {
                    $cell.addClass('done');
                    schoolScheduleProgressTable.insert(data);
                }

                updateSchoolScheduleCellState();
                e.stopPropagation();
            },
            hold: function (e) {
                var $cell = $(e.target);
                chooseAction(getDataFromCell($cell));
            }
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

    } else {
        $('#login').css('display', 'block');

        $('#loginButton').on('click', function (e) {
            e.preventDefault();
            client.authenticate();
        });
    }
});
