/**
 * http://usejsdoc.org/
 */

'use strict';

//import modules for setting slack connection and create an instance of middleware.
const Botkit = require('botkit');
const dialogflowMiddleware = require('./slackbot')({//config
	keyFilename: process.env.DIALOGFLOW_TOKEN  // service account private key file from GCP
});



//initiates controller obeject of Slack
const slackController = Botkit.slackbot();//reference https://botkit.ai/docs/readme-slack.html#create-a-controller

//get bot object which is a worker to connect to slack..
const slackBot = slackController.spawn({
  token: process.env.SLACK_TOKEN// Slack API Token connected to dialogflow's bot
});

//use receive middleware to process the message each time Slack emits a message to Botkit
slackController.middleware.receive
	.use(dialogflowMiddleware.receive);

// tell bot to start connection
slackBot.startRTM();

//catch message from slack
//controller.hears(patterns, types, middleware function, callback)

slackController
	.hears(
		['.*'], 
		'direct_message', dialogflowMiddleware.hears, 
		( bot, message ) => {
				slackController.trigger('input.unknown', [bot, message]);
		}
	);

slackController
	.on('input.unknown', (bot, message) => {
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	});
slackController
	.on('input.welcome', (bot, message) => {
		var replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	});
	