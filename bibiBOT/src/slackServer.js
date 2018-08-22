/**
 * http://usejsdoc.org/
 */

'use strict';

//import modules for setting slack connection and create an instance of middleware.
const debug = require('debug')('dialogflow-middleware');
const Botkit = require('botkit');//reference https://botkit.ai/docs/readme-slack.html#create-a-controller
const dialogflowMiddleware = require('./slackbot')({//config
	keyFilename: process.env.DIALOGFLOW_TOKEN  // service account private key file from GCP
});

//initiates controller obeject of Slack
const slackController 
	= Botkit.slackbot({
		require_delivery: true,
		scopes : ['bot', 'files:read']});

//use receive middleware to process the message when Slack emits a message each time to Botkit 
slackController.middleware.receive
.use(dialogflowMiddleware.receiveText);

//get bot object which is a worker to connect to slack..
const slackBot = slackController.spawn({
  token: process.env.SLACK_TOKEN// Slack API Token connected to dialogflow's bot
});

// tell bot to start connection
slackBot.startRTM();

//catch text message from slack
//controller.hears(patterns, types, middleware function, callback)
slackController
	.hears(
		['.*'], 
		'direct_message', dialogflowMiddleware.hearsText, 
		( bot, message ) => {
			
			switch(message.action){
				case 'input.welcome' : 
					slackController.trigger('input.welcome', [bot, message]);
					break;
				case 'input.work1' : 
					slackController.trigger('input.work1', [bot, message]);
					break;
				case 'intent_work1.intent_work1-custom' : 
					slackController.trigger('intent_work1.intent_work1-custom', [bot, message]);
					break;
				default : 
					slackController.trigger('input.unknown', [bot, message]);
			}
			
		}
	);

slackController
	.on('input.welcome', (bot, message) => {
		console.log('\n input.welcome');
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('input.work1', (bot, message) => {
		console.log('\n input.work1');
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('input.unkown', (bot, message) => {
		console.log('\n input.unkown');
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	}).on('intent_work1.intent_work1-custom', (bot, message) => {
		console.log('\n intent_work1.intent_work1-custom');
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	});


slackController.on('file_shared', function(bot, message) {
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
});


function getUrl(bot, file_id) {
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
}