
var BibleCitation = (function () {
    var db = [
        [['Genesis', 'Gen.', 'Ge'], 50, []],
        [['Exdus', 'Ex.', 'Ex'], 40, []],
        [['Leviticus', 'Lev.', 'Le'], 27, []],
        [['Numbers', 'Num.', 'Nu'], 36, []],
        [['Deuteronomy', 'Deut.', 'De'], 34, []],
        [['Joshua', 'Josh.', 'Jos'], 24, []],
        [['Judges', 'Judg.', 'Jg'], 21, []],
        [['Ruth', '', 'Ru'], 4, []],
        [['1 Samuel', '1 Sam.', '1Sa'], 31, []],
        [['2 Samuel', '2 Sam.', '2Sa'], 24, []],
        [['1 Kings', '1 Ki.', '1Ki'], 22, []],
        [['2 Kings', '2 Ki.', '2Ki'], 25, []],
        [['1 Chronicles', '1 Chron.', '1Ch'], 29, []],
        [['2 Chronicles', '2 Chron.', '2Ch'], 36, []],
        [['Ezra', '', 'Ezr'], 10, []],
        [['Nehemiah', '', 'Ne'], 13, []],
        [['Esther', '', 'Es'], 10, []],
        [['Job', '', ''], 42, []],
        [['Psalms', 'Ps.', 'Ps'], 150, []],
        [['Proverbs', 'Prov.', 'Pr'], 31, []],
        [['Ecclesiastes', 'Eccl.', 'Ec'], 12, []],
        [['Song of Solomon', 'Song of Sol.', 'Ca'], 8, []],
        [['Isaiah', 'Isa.', 'Isa'], 66, []],
        [['Jeremiah', 'Jer.', 'Jer'], 52, []],
        [['Lamentations', 'Lam.', 'La'], 5, []],
        [['Ezekiel', 'Ezek.', 'Eze'], 48, []],
        [['Daniel', 'Dan.', 'Da'], 12, []],
        [['Hosea', 'Hos.', 'Ho'], 14, []],
        [['Joel', '', 'Joe'], 3, []],
        [['Amos', '', 'Am'], 9, []],
        [['Obadiah', '', 'Ob'], 1, []],
        [['Jonah', '', 'Jon'], 4, []],
        [['Micah', 'Mic.', 'Mic'], 7, []],
        [['Nahum', '', 'Na'], 3, []],
        [['Habakkuk', 'Hab.', 'Hab'], 3, []],
        [['Zephaniah', 'Zeph.', 'Zep'], 3, []],
        [['Haggai', 'Hag.', 'Hag'], 2, []],
        [['Zechariah', 'Zech.', 'Zec'], 14, []],
        [['Malachi', 'Mal.', 'Mal'], 4, []],
        [['Matthew', 'Matt.', 'Mt'], 28, []],
        [['Mark', '', 'Mr'], 16, []],
        [['Luke', '', 'Lu'], 24, []],
        [['John', '', 'Joh'], 21, []],
        [['Acts', '', 'Ac'], 28, []],
        [['Romans', 'Rom.', 'Ro'], 16, []],
        [['1 Corinthians', '1 Cor.', '1Co'], 16, []],
        [['2 Corinthians', '2 Cor.', '2Co'], 13, []],
        [['Galatians', 'Gal.', 'Ga'], 6, []],
        [['Ephesians', 'Eph.', 'Eph'], 6, []],
        [['Philippians', 'Phil.', 'Php'], 4, []],
        [['Colossians', 'Col.', 'Col'], 4, []],
        [['1 Thessalonians', '1 Thess.', '1Th'], 5, []],
        [['2 Thessalonians', '2 Thess.', '2Th'], 3, []],
        [['1 Timothy', '1 Tim.', '1Ti'], 6, []],
        [['2 Timothy', '2 Tim.', '2Ti'], 4, []],
        [['Titus', '', 'Tit'], 3, []],
        [['Philemon', 'Phil.', 'Phm'], 1, []],
        [['Hebrews', 'Heb.', 'Heb'], 13, []],
        [['James', 'Jas.', 'Jas'],  5, []],
        [['1 Peter', '1 Pet.', '1Pe'],  5, []],
        [['2 Peter', '2 Pet.', '2Pe'],  3, []],
        [['1 John', '', '1Jo'],  5, []],
        [['2 John', '', '2Jo'],  1, []],
        [['3 John', '', '3Jo'], 1, []],
        [['Jude', '', 'Jude'],  1, []],
        [['Revelation', 'Rev.', 'Re'], 22, []]
    ];

    var getFullName = function (no) {
        return db[no - 1][0][0];
    };

    var getName = function (no) {
        var names = db[no - 1][0];
        return names[2] || names[1] || names[0];
    };

    var findName = function (name) {
        var no;
        name = name.toLowerCase();
        for (no = 1; no <= 66; no++) {
            if (name === getName(no).toLowerCase()) {
                return no;
            }
        }
    };

    var getBookCount = function () {
        return db.length;
    };

    var getChapterCount = function (no) {
        return db[no - 1][1];
    };

    var parseCitation = function (s) {
        var m;

        // 'Mt 24' or 'Mt 24:14'
        // 'Ge 3:1-5'
        if ((m = /^(\w+?) (\d+)(?::\d+)?$/.exec(s)) ||
            (m = /^(\w+?) (\d+):\d+-\d+$/.exec(s))) {
            return {
                book: findName(m[1]),
                chapters: [Number(m[2])]
            };
        }

        // 'Mt 5-7' or 'Mt 5-7:1'
        // 'Ac 18:12-19:10'
        if ((m = /^(\w+?) (\d+)-(\d+)(?::\d+)?$/.exec(s)) ||
            (m = /^(\w+?) (\d+):\d+-(\d+)(?::\d+)?$/.exec(s))) {
            var book = findName(m[1]),
                first = Number(m[2]),
                last = Number(m[3]),
                chaps = [];

            for (var chap = first; chap <= last; chap++) {
                chaps.push(chap);
            }
            return {
                book: book,
                chapters: chaps
            };
        }

        // 'Jude'
        if ((m = /^(\w+?)$/.exec(s))) {
            return {
                book: findName(m[1]),
                chapters: [1]
            };
        }
    };

    return {
        DB: db,
        getFullName: getFullName,
        getName: getName,
        getBookCount: getBookCount,
        getChapterCount: getChapterCount,
        findName: findName,
        parseCitation: parseCitation
    };
}());
