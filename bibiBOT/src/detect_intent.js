/**
 * http://usejsdoc.org/
 */

'use strict';

//import google api library
const {google} = require('googleapis');
const path = require('path');

async function detectIntent () {

	//get a client to access dilogflow api by using the service account(dev)
	const client = await google.auth.getClient({
		keyFile: path.join(__dirname, 'autumn-it-week-2018-69982756a8f8.json'),
		scopes: 'https://www.googleapis.com/auth/cloud-platform'
	});

	//instantiate dialogflow object from googleapis library
	const dialogflow = google.dialogflow({
		version: 'v2',
		auth: client
	});

	//get agent 'autumn-it-week-2018'
	const result = await dialogflow.projects.getAgent({
		parent: 'projects/autumn-it-week-2018'
	});

	console.log(result.data);
	
}

if (module === require.main) {
	detectIntent().catch(console.error);
}

// Exports for unit testing purposes
module.exports = { detectIntent };