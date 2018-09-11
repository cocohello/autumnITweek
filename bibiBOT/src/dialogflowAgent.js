/**
 * http://usejsdoc.org/
 */

'use strict';

const dialogflow = require('dialogflow');
const structjson = require('./structjson');//to fix some bug in gRPC(return null becuase google protobuf sutruct contains it, so firstly need to convert to Json file and it back to proto)
const _ = require('lodash');
const debug = require('debug')('dialogflow-middleware');

//export dialogflow module to hand it to the slack bot
module.exports = function(config) {
    return new DialogFlowAPI_V2(config);
};


class DialogFlowAPI_V2 {
//create contructor for dialogflow
	constructor(config) {//config is a parameter contains GCP service account key
	this.config = config;

	const opts = {
		keyFilename: config.keyFilename,
	};

	if (config.projectId) {
		opts.projectId = config.projectId;
	} else {
		try {
			const keyFile = require(config.keyFilename);
			this.projectId = keyFile.project_id;
		} catch (err) {
			throw new Error('projectId must be provided or available in the keyFile.');
		}
	}
	if (config.credentials) {
		opts.credentials = config.credentials;
	}
	if (config.email) {
		opts.email = config.email;
	}
	if (config.port) {
		opts.port = config.port;
	}
	if (config.promise) {
		opts.promise = config.promise;
	}
	if (opts.servicePath) {
		opts.servicePath = config.servicePath;
	}

	//initiates sessionClient
	this.app = new dialogflow.SessionsClient(opts);
	}
//******* process user's query********//
	detectTextIntent(sessionId, languageCode, text) {
		const request = {
			session: this.app.sessionPath(this.projectId, sessionId),
			queryInput: {
				text: {
					text: text,
					languageCode: languageCode,
				},
			}
		};
		console.log(`dialogflowAgent.js detectTextIntent request\n ${JSON.stringify(request)}\n`);
		//return the response by a standardized format using _normalize function.
		return new Promise((resolve, reject) => {
    	//detectIntent method will process a NLP and return structured, actionable data as a result
			this.app.detectIntent(request, function(error, response) {
				if (error) {
					debug('dialogflow api error: ', error);
					reject(error);
				} else {
					debug('!detectIntect!dialogflow api response: \n', response);
					try {
						const data = DialogFlowAPI_V2._normalize(response);
						console.log(`dialogflowAgent.js detectTextIntent response\n ${JSON.stringify(data)}\n`);
						resolve(data);
					} catch (err) {
						reject(err);
					}
				}
			});
		});
	}
  
  
	detectWebIntent (sessionId, languageCode, parameters) {
		const webhookRequest = require('request');
		const request = {
			session : this.app.sessionPath(this.projectId, sessionId),
			responseId : parameters.resForSelf.responseId,
			queryResult : parameters.resForSelf.queryResult
		};
		const opts = {
			'url' : 'https://bbbotserver.herokuapp.com/',
			'json' : request,
			'Content-Type' : 'application/json',
		};
		console.log(`dialogflowAgent.js detectWebIntent request \n ${JSON.stringify(opts)}\n`);
		
		return new Promise((resolve, reject) => {
			//this method will send a request to the customized webhook and return response as a result
			webhookRequest.post(opts, function(err, res, body) {
				console.log('REQUEST RETRIEVE STATUS', res.statusCode);
				if (err) {
					debug('dialogflow api error: ', err);
					reject(err);
				} else {
					debug('detectWebIntent post response: \n', res);
					console.log(`dialogflowAgent.js detectWebIntent response\n ${JSON.stringify(res)}\n`);
					resolve(res);
				}
			})
		}).then(res => {
			if (res.body.followupEventInput.name) {				//check if response has followupEvent.
				return DialogFlowAPI_V2.detectEventIntent(this.app, this.app.sessionPath(this.projectId, sessionId), languageCode, res.body.followupEventInput.name, parameters.parameter);
			}
		})
	}

	// return standardized format
	static _normalize(response) {
		console.log('dialogflowAgent.js _normalize\n'+JSON.stringify(response)+'\n');
		return {
			intent: _.get(response, 'queryResult.intent.displayName', null),
			entities: structjson.structProtoToJson(response.queryResult.parameters),
			action: _.get(response, 'queryResult.action', null),
			fulfillment: {
				text: _.get(response, 'queryResult.fulfillmentText', null),
				messages: _.get(response, 'queryResult.fulfillmentMessages', null),
			},
			source: response.queryResult.webhookSource,
			attachment: response.queryResult.webhookPayload,
			confidence: _.get(response, 'queryResult.intentDetectionConfidence', null),
			nlpResponse: response,
		};
	}

	static detectEventIntent(app, sessionId, languageCode, eventName, parameter) {
		const request = {
			session: sessionId,
			queryInput: {
				event: {
					name: eventName,
					parameters: structjson.jsonToStructProto(parameter),
					languageCode: languageCode,
				},
			}
		};
		console.log(`dialogflowAgent.js detectEventIntent request\n ${JSON.stringify(request)}`);
		//return the response by a standardized format using _normalize function.
		return new Promise((resolve, reject) => {
			//detectIntent method will process a NLP and return structured, actionable data as a result
			app.detectIntent(request, function(error, response) {
				if (error) {
					debug('dialogflow api error: ', error);
					reject(error);
				} else {
					try {
						response.queryResult.outputContexts[0].parameters = request.queryInput.event.parameters;
						console.log(`dialogflowAgent.js detectEventIntent response\n ${JSON.stringify(response.queryResult.outputContexts[0].parameters)}`);
						resolve(response);
					} catch (err) {
						reject(err);
					}
				}
			});
		}).then( response => {
			const webhookRequest = require('request');
			const request = {
				session : sessionId,
				responseId : response.responseId,
				queryResult : response.queryResult
			};
			const opts = {
				'url' : 'https://bbbotserver.herokuapp.com/work_result',
				'json' : request,
				'Content-Type' : 'application/json',
			};
			console.log(`dialogflowAgent.js detectWebIntent workresult request \n ${JSON.stringify(opts)}\n`);
			
			return new Promise((resolve, reject) => {
				//this method will send a request to the customized webhook and return response as a result
				webhookRequest.post(opts, function(err, res, body) {
					console.log('REQUEST RETRIEVE STATUS', res.statusCode);
					if (err) {
						debug('dialogflow api error: ', err);
						reject(err);
					} else {
						debug('detectWebIntent work result post response: \n', res);
						const data = DialogFlowAPI_V2._normalize(res.body);
						console.log(`dialogflowAgent.js detectWebIntent workresult response \n ${JSON.stringify(data)}\n`);
						resolve(data);
					}
				})
			})
		});
	}

	//[END class]
}


//[END dialogflowAgent]