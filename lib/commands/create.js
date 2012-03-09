var support = require('../support'),
	config = require('../support/config'),
	constants = require('../support/constants'),
	fs = require('fs'),
	wrench = require('wrench'),
	uuid = require('node-uuid'),
	mu = require('mu');

exports.doc = {
	command: 'titanium create', 
	description: 'Create a new Titanium project. By default, it will create a mobile project targeting all supported platforms.', 
	usage: 'titanium create PROJECT_NAME [-v] [-a [targets]] [-t [type]] [-p [path]]', 
	options: [
		['-d, --desc <desc>', 'Description of your project', ''],
		['-i, --id <id>', 'Your application id', ''],
		['-p, --path <path>', 'Path for new project. [cwd]', ''],
		['-t, --target <target>', 'Platforms to target [android,ios,mobileweb]', 'android,ios,mobileweb'], 
		//['-b, --template <template>', 'Template on which to base the project', 'base'],
		['-T, --type <type>', 'project, module, or plugin. [project]', 'project'],
		['-v, --verbose', 'Verbose logging output']
	]
};

//Clean a project directory based on the given arguments
exports.execute = function(args, options, logger) {
	var props = config.getConfig(false, true);
	var cliPath = process.argv[1].replace(/[^\/]+$/, '');

	// validate project name
	var name = args.shift();
	if (!name) {
		logger.error('You must specify a project name.');
		return;
	} else if (/^[A-Za-z]+[A-Za-z0-9_-]*/.test(name) === false) {
		logger.error('Invalid project name "' + name + '". Project names must start with a letter and contain only letters, numbers, dashes, and underscores.');
		return;
	}

	// TODO: validate app id
	options.id = options.id || props.appIdPrefix + '.' + name;

	// validate project type
	options.type = options.type || 'project';
	if (constants.CREATE_TYPES.indexOf(options.type) === -1) {
		logger.error('Invalid type "' + options.type + '". Must be one of the following: [' + constants.CREATE_TYPES.join(',') + ']');
		return;
	}

	// validate targets
	options.target = options.target.split(',');
	for (var i = 0; i < options.target.length; i++) {
		if (constants.CREATE_TARGETS.indexOf(options.target[i]) === -1) {
			logger.error('Invalid target "' + options.target[i] + '". Must be one of the following: [' + constants.CREATE_TARGETS.join(',') + ']');
			return;
		}
	}

	// validate path
	options.path = options.path || process.cwd() + '/' + name;
	try {
		fs.statSync(options.path);
		logger.error('The path "' + options.path + '" already exists.');
		return;
	} catch(e) { }
	fs.mkdirSync(options.path, 0755);
	
	// Prepare configuration settings for templates
	var templatePath = cliPath + '../templates/base';
	var templateCommon = cliPath + '../templates/_common';
	var context = {
		appname: name,
		publisher: props.appPublisher,
		url: props.appPublisherURL,
		image: 'appicon.png',
		appid: options.id,
		desc: options.desc,
		type: options.target[0],
		guid: uuid.v4(),
		hasmobileweb: 'false',
		hasandroid: 'false',
		hasios: 'false',
		hasblackberry: 'false',
		sdk: '2.0.0'
	};

	// Let's fill the project directory with the required files
	wrench.copyDirSyncRecursive(templatePath, options.path + '/');
	for (var i = 0; i < options.target.length; i++) {
		var t = options.target[i];
		context['has' + t] = 'true';
		t = (t === 'ios' ? 'iphone' : t);
		wrench.copyDirSyncRecursive(templateCommon + '/Resources/' + t, options.path + '/Resources/' + t);
		fs.mkdirSync(options.path + '/build/' + t, 0755);
	}

	// Create manifest file  and tiapp.xml from templates
	createFileFromTemplate(templatePath + '/manifest', options.path + '/manifest', context);
	createFileFromTemplate(templatePath + '/tiapp.xml', options.path + '/tiapp.xml', context);
};

var createFileFromTemplate = function(fromFile, toFile, context) {
	var buffer = '';
	mu.renderText(fs.readFileSync(fromFile, 'utf8'), context)
		.on('data', function (c) { buffer += c; })
        .on('end', function () { 
        	var fd = fs.openSync(toFile, 'w');
        	fs.writeSync(fd, buffer, 0);
        });
};

var isValidValue = function(value, collection) {
	for (var i = 0; i < collection.length; i++) {
		if (value === collection[i]) {
			return true;
		}
	}
	return false;
};