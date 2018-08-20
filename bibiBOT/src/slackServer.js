/**
 * http://usejsdoc.org/
 */

'use strict';

//import modules for setting slack connection and create an instance of middleware.
const debug = require('debug')('dialogflow-middleware');
const Botkit = require('botkit');
const dialogflowMiddleware = require('./slackbot')({//config
	keyFilename: process.env.DIALOGFLOW_TOKEN  // service account private key file from GCP
});

//initiates controller obeject of Slack
const slackController = Botkit.slackbot({require_delivery: true});//reference https://botkit.ai/docs/readme-slack.html#create-a-controller

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
	});


//catch file message from slack
const request = require('request');
const fs = require('fs');

slackController
.hears(
	['.*'], 
	'file_shared',  
	( bot, message ) => {
	    var destination_path = '/tmp/uploaded';
	    // the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
	    var url = message.file.url_private;

	    var opts = {
	        method: 'GET',
	        url: url,
	        headers: {
	          Authorization: 'Bearer ' + bot.config.bot.token, // Authorization header with bot's access token
	        }
	    };

	    request(opts, function(err, res, body) {
	        // body contains the content
	        console.log('FILE RETRIEVE STATUS',res.statusCode);          
	    }).pipe(fs.createWriteStream(destination_path)); // pipe output to filesystem
		}
);

