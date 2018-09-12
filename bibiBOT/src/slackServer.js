/**
 * http://usejsdoc.org/
 */

'use strict';

//import modules for setting slack connection and create an instance of middleware.
const fs = require('fs');
const debug = require('debug');
const Botkit = require('botkit');//reference https://botkit.ai/docs/readme-slack.html#create-a-controller
const dialogflowMiddleware = require('./slackbot')({//config
	keyFilename: process.env.DIALOGFLOW_TOKEN  // service account private key file from GCP which can reference by environment variable
});

//initiates controller obeject of Slack
const slackController 
	= Botkit.slackbot({
		require_delivery: true,
		scopes : ['bot', 'files:read', 'users:read']});

//use receive middleware to process the event when Slack emits a event(message) each time to Botkit 
slackController.middleware.receive
.use(dialogflowMiddleware.receiveText)
.use(dialogflowMiddleware.receiveSelfMsg)
.use(dialogflowMiddleware.receiveFile);

//get bot object which is a worker to connect to slack.
const slackBot = slackController.spawn({
  token: process.env.SLACK_TOKEN// Slack API Token connected to dialogflow's bot
});


/*should add some logic restart connection when it downed.*/
// tell bot to start connection
slackBot.startRTM(function(err,bot,payload) {
	  if (err) {
		    throw new Error('Could not connect to Slack');
		  }

		  /*// close the RTM for the sake of it in 5 seconds
		  setTimeout(function() {
		      bot.closeRTM();
		  }, 5000);*/
		});
slackController.on('rtm_close', function (bot, err) {
    console.log('** The RTM api just closed, reason', err);
    try {
        // sometimes connection closing, so, we should restart bot
        if (bot.doNotRestart != true) {
            let token = bot.config.token;
            console.log('Trying to restart bot ' + token);
            restartBot(bot);
        }
    } catch (err) {
        console.error('Restart bot failed', err);
    }
});

function restartBot(bot) {
    bot.startRTM(function (err) {
        if (err) {
            console.error('Error restarting bot to Slack:', err);
        }
        else {
            let token = bot.config.token;
            console.log('Restarted bot for %s', token);
        }
        /*setTimeout(function() {
		      bot.closeRTM();
		  }, 5000);*/
    });
}

//catch text message from slack
//controller.hears(patterns, types, middleware function, callback)
slackController
	.hears(
		['.*'], 
		['direct_message','self_message'], dialogflowMiddleware.hearsText, 
		( bot, message ) => {
			
			switch(message.action){
				case 'input.welcome' : 
					slackController.trigger('input.welcome', [bot, message]);
					break;
				case 'input.work1' : 
					slackController.trigger('input.work1', [bot, message]);
					break;
				case 'intent_work1-uploadfile' : 
					slackController.trigger('intent_work1-uploadfile', [bot, message]);
					break;
				case 'intent_work1-uploadfile-event_trigger' :
					slackController.trigger('intent_work1-uploadfile-event_trigger', [bot, message]);
					break;
				case 'input.work2' : 
					slackController.trigger('input.work2', [bot, message]);
					break;
				case 'intent_work2-event_trigger' : 
					slackController.trigger('intent_work2-event_trigger', [bot, message]);
					break;
				default : 
					slackController.trigger('input.unknown', [bot, message]);
			}
			
		}
	);

var replyText
slackController
	.on('input.welcome', (bot, message) => {
		console.log('input.welcome \n');
		replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('input.unkown', (bot, message) => {
		console.log('input.unkown \n');
		replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('input.work1', (bot, message) => {
		console.log('input.work1 \n');
		replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('intent_work1-uploadfile', (bot, message) => {
		console.log('intent_work1-uploadfile \n');
		replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	})
	.on('intent_work1-uploadfile-event_trigger', (bot, message) => {
		console.log('intent_work1-uploadfile-event_trigger \n');
		replyText = message.fulfillment.text;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
		bot.api.files.upload({
	        file: fs.createReadStream(message.source),
	        channels: message.channel
	    }, function (error, done) {
	    	if(error){
	    		console.log('slackServer.js fileupload'+JSON.stringify(error));
	    	}else{
	    		console.log(JSON.stringify(done));
	    	}
	    });
		
		
	})
	.on('input.work2', (bot, message) => {
		console.log('input.work2 \n');
		replyText = message.fulfillment.text;
		bot.reply(message, replyText);
	})
	.on('intent_work2-event_trigger', (bot, message) => {
		console.log('intent_work2-event_trigger \n');
		replyText = message.attachment;  // message object has new fields added by Dialogflow
		bot.reply(message, replyText);
	});


//[END slackServer]