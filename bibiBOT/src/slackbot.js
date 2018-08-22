/**
 * http://usejsdoc.org/
 */

'use strict';

const util = require('./util');
const dialogflow = require('./dialogflowAgent');
const path = require('path');
const debug = require('debug')('dialogflow-middleware');

module.exports = function(config) {
  config = checkOptions(config);

  const ignoreTypePatterns = util.makeArrayOfRegex(config.ignoreType || []);
  const middleware = {};

  const agent = (middleware.dialogflow = dialogflow(config));

  middleware.receiveText = async function(bot, message, next) {
console.log(`slackbot.js receiveText \n ${JSON.stringify(message)}`);	  
    if (!message.text || message.is_echo || message.type === 'self_message') {
      next();
      return;
    }

    for (const pattern of ignoreTypePatterns) {
    	if (pattern.test(message.type)) {
        debug('skipping call to Dialogflow since type matched ', pattern);
        next();
        return;
      }
    }

    const sessionId = util.generateSessionId(config, message);
    const lang = message.lang || config.lang;
    console.log(`slackbot.js receiveText \n ${JSON.stringify(message)}`);
    console.log(
      'Sending message to dialogflow. sessionId=%s, language=%s, text=%s',
      sessionId,
      lang,
      message.text
    );

    try {
      const response = await agent.query(sessionId, lang, message.text);
      Object.assign(message, response);

      debug('dialogflow annotated message: %O', message);
      next();
    } catch (error) {
      debug('dialogflow returned error', error);
      next(error);
    }
  };

  /*middleware.receiveImage = async function(bot, message, next){
	//catch file message from slack
	// the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
	var resp = getUrl(bot, message.file_id);
	resp.then(function(value) {
		var opts = {
			method: 'GET',
			url: value.file.url_private,
			headers: {
				Authorization: 'Bearer ' + bot.config.token, // Authorization header with bot's access token
			}
		};
		console.log(opts);
		var destination_path = `/tmp/uploaded/${value.file.name}`;
		var writestream = fs.createWriteStream(destination_path);
		
	//download image file.
	pDownload(opts, destination_path)
	  .then( ()=> console.log('downloaded file no issues...'))
	  .catch( e => console.error('error while downloading', e));
	}, function(reason) {
		console.log(reason);
	});
	}
*/  
  middleware.hearsText = function(patterns, message) {
    const regexPatterns = util.makeArrayOfRegex(patterns);
    for (const pattern of regexPatterns) {
      if (pattern.test(message.intent) && message.confidence >= config.minimumConfidence) {
        debug('dialogflow intent matched hear pattern', message.intent, pattern);
        return true;
      }
    }
    return false;
  };

  middleware.action = function(patterns, message) {
    const regexPatterns = util.makeArrayOfRegex(patterns);

    for (const pattern of regexPatterns) {
      if (pattern.test(message.action) && message.confidence >= config.minimumConfidence) {
        debug('dialogflow action matched hear pattern', message.intent, pattern);
        return true;
      }
    }
    return false;
  };

  return middleware;
};

/**
 * Validate config and set defaults as required
 *
 * @param {object} config - the configuration provided by the user
 * @return {object} validated configuration with defaults applied
 */
function checkOptions(config = {}) {
  const defaults = {
    version: 'v2',
    minimumConfidence: 0.5,
    sessionIdProps: ['user', 'channel'],
    ignoreType: 'self_message',
    lang: 'jp',
  };
  config = Object.assign({}, defaults, config);

  config.version = config.version.toUpperCase();

  if (config.keyFilename) {
    if (!path.isAbsolute(config.keyFilename)) {
      config.keyFilename = path.join(process.cwd(), config.keyFilename);
    }
  }
  if (config.version === 'V1' && !config.token) {
    throw new Error('Dialogflow token must be provided for v1.');
  }

  if (config.version === 'V2' && !config.keyFilename) {
    throw new Error('Dialogflow keyFilename must be provided for v2.');
  }

  console.log(`slacknot.js checkopt settings are \n ${JSON.stringify(config)}`);
  return config;
}

/*function getUrl(bot, file_id) {
    return new Promise(function (resolve, reject) {
        const messageObj = {
            token: bot.config.token,
            file: file_id
        };
        console.log(messageObj);
        bot.api.files.info(messageObj, function (err, res) {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(res);
        });
    });
}

const request = require('request');
const progress = require('request-progress');
const fs = require('fs');
function pDownload(opts, dest){
	var file = fs.createWriteStream(dest);
	return new Promise((resolve, reject) => {
		var responseSent = false; // flag to make sure that response is sent only once.
		
	const result = progress(
		request(opts, function(err, res, body) {
			// body contains the content
			console.log('FILE RETRIEVE STATUS', res.statusCode);
		})		
	).on('progress', state => {
		console.log(state)
	}).on('error', err => {
		if(responseSent)  return;
		responseSent = true;
		reject(err);
		console.log(err)  
	}).on('end', () => {});
	console.log(result);
	result.pipe(file);
	
	file.on('finish', () =>{
		file.close(() => {
			if(responseSent)  return;
			responseSent = true;
			resolve();
		});
	});
	});
}*/

//[END slackbot]