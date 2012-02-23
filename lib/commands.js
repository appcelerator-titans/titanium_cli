/******************************************
 * Modules included in this package
 *****************************************/
var fs = require('fs'),
    p = require('commander'),
    terminal = require('./terminal'),
    exec = require('child_process').exec,
    ProgressBar = require('progress');

/******************************************
 * Private Vars
 *****************************************/
var cwd = process.cwd();

/******************************************
 * Private methods
 *****************************************/
function debug(text) {
    terminal.color('blue').write('[DEBUG] '+text+"\n");
}

function info(text) {
    terminal.color('green').write('[INFO] '+text+"\n");
}

function warning(text) {
    terminal.color('yellow').write('[WARNING] '+text+"\n");
}

function error(text) {
    terminal.color('red').write('[ERROR] '+text+"\n");
}

// detect the lines log level and color acording
function colorizeConsole(text) {

    if(text.indexOf('[DEBUG]') === 0) {

        terminal.color('blue').write(text);

    } else if(text.indexOf('[INFO]') === 0) {

        terminal.color('green').write(text);

    } else if(text.indexOf('[WARNING]') === 0) {

        terminal.color('yellow').write(text);

    } else if(text.indexOf('[ERROR]') === 0) {

        terminal.color('red').write(text);

    } else {

        console.log(text);

    }
}

/******************************************
 * Public Methods
 *****************************************/
exports.runScript = function(cmd) {
    var child = exec(cmd),
        verbose = true,
        iv,
        progress = 0,
        bar,
        booted = false;

    function startProgress() {
        bar = new ProgressBar('Rebuilding progress: [:bar] :percent', { total: 20 });
        iv = setInterval(function () {
            if(progress < 19) {
                progress = progress+1;
                bar.tick();
            }

            if (booted) {
                clearInterval(iv);
            }
        }, 400);
    }

    child.stdout.on('data', function (data) {

        if(data.indexOf("SystemExit: 65") != -1 ) {
            clearInterval(iv);
            console.log("\n");
            error('There was an error compialing your application, and Xcode did not provide the full error. Please run your project directly from Xcode to see the error...');
        } else if(data.indexOf("processing") != -1 || data.indexOf("linking") != -1 || data.indexOf("Performing full rebuild") != -1) {
            if(bar === undefined && iv === undefined && p.verbose === undefined) {
                verbose = false;
                startProgress();
            } else if(verbose === true) {
                colorizeConsole(data);
            }
        } else if(data.indexOf("application booted") != -1 ) {
            booted = true;
            if(bar !== undefined) {
                bar.tick(20 - p);
                console.log("\n");
                colorizeConsole(data);
            }
        } else {
            if( verbose || booted ) colorizeConsole(data);
        }

    });

    child.stderr.on('data', function (data) {
      console.log(data);
    });

    child.on('exit', function (code) {
      return code;
    });
};

// public console output methods
exports.info = info;
exports.debug = debug;
exports.warning = warning;
exports.error = error;