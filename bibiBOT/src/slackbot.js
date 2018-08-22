/**
 * http://usejsdoc.org/
 */

'use strict';

const util = require('./util');
const dialogflow = require('./dialogflowAgent');
const path = require('path');
const debug = require('debug');

module.exports = function(config) {
	config = checkOptions(config);
	
	const ignoreTypePatterns = util.makeArrayOfRegex(config.ignoreType || []);
	const middleware = {};
	
	//dialogflow agent connected with service account of GCP
	const agent = (middleware.dialogflow = dialogflow(config));
	  
	//process 'direct_message' event emited from slack user
	middleware.receiveText = async function(bot, message, next) {
		//ignore events except 'direct_message'
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
		console.log(`slackbot.js receiveText \n ${JSON.stringify(message)}`);
		
		const sessionId = util.generateSessionId(config, message);
		const lang = message.lang || config.lang;
			console.log(`slackbot.js receiveText \n ${JSON.stringify(message)}`);
			console.log(
				'Sending message to dialogflow. sessionId=%s, language=%s, text=%s',
				sessionId,
				lang,
				message.text
			);
		
		try {//invoke agent's method to set request and use detectIntent API
			const response = await agent.query(sessionId, lang, message.text);
			Object.assign(message, response);
			debug('dialogflow annotated message: %O', message);
			next();
		} catch (error) {
			debug('dialogflow returned error', error);
			next(error);
		}
	};
	
	//process 'file_shared' and 'direct_message' event emited from slack user
	middleware.receiveImage = async function(bot, message, next){
		
		console.log(`slackbot.js receiveImage \n ${JSON.stringify(message)}`);
		//ignore events except 'file_shared' and 'direct_message'
		if (!(message.type === 'file_shared' || message.type ===  'direct_message') || message.is_echo) {
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
		console.log(`slackbot.js receiveImage after \n ${JSON.stringify(message)}`);
		// the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
		var fileInfo = getUrl(bot, message.file_id);
		fileInfo.then(function(fInfo) {
			console.log(`slackbot.js geturl fileInfo \n ${JSON.stringify(fInfo)}`);
			var opts = {
				method: 'GET',
				url: fInfo.file.url_private,
				headers: {Authorization: 'Bearer ' + bot.config.token} // Authorization header with bot's access token
			};
			var dest_path = `/tmp/uploaded/${fInfo.file.name}`;
			
			//download image file
			pDownload(opts, dest_path)
				.then( ()=> console.log('downloaded file no issues'))
				.catch( e => console.error('error while downloading', e));
		}, function(reason) {
			console.log(reason);
		});
	}
	  
	middleware.hearsText = function(patterns, message) {
		const regexPatterns = util.makeArrayOfRegex(patterns);
		for (const pattern of regexPatterns) {
			if (pattern.test(message.intent) && message.confidence >= config.minimumConfidence) {
				console.log('dialogflow intent matched hear pattern', message.intent, pattern);
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

//Validate config and set defaults as required
function checkOptions(config = {}) {
	const defaults = {
		version: 'v2',
		minimumConfidence: 0.5,
		sessionIdProps: ['user', 'channel'],
		ignoreType: 'self_message',
		lang: 'jp'
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
	
	return config;
}

function getUrl(bot, file_id) {
	return new Promise(function (resolve, reject) {
		const messageObj = {
			token: bot.config.token,
			file: file_id
		};
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
	
		let responseSent = false; // flag to make sure that response is sent only once.
		const result = progress(
			request(opts, function(err, res, body) {
				console.log('FILE RETRIEVE STATUS', res.statusCode);
			})		
		).on('progress', state => {
			console.log(`slackbot.js pDownload state \n${JSON.stringify(state)}`);
		}).on('error', err => {
			if(responseSent)  return;
			responseSent = true;
			reject(err);
			console.log(err)  
		}).on('end', () => {});
		
		console.log(`slackbot.js pDownload result \n ${JSON.stringify(result)}`);
		//copy file to the unique directory through writestream
		result.pipe(file);
		//close stream if finished
		file.on('finish', () =>{
			file.close(() => {
				if(responseSent)  return;
				responseSent = true;
				resolve();
			});
		});
	});
}

//[END slackbot]