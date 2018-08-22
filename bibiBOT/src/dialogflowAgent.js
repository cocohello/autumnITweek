/**
 * http://usejsdoc.org/
 */

const dialogflow = require('dialogflow');
const structProtoToJson = require('./structjson').structProtoToJson;//to fix some bug in gRPC(return null becuase google protobuf sutruct contains it, so firstly need to convert to Json file and it back to proto)
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
  query(sessionId, languageCode, text) {
    const request = {
      session: this.app.sessionPath(this.projectId, sessionId),
      queryInput: {
        text: {
          text: text,
          languageCode: languageCode,
        },
      },
    };
    console.log(`agent.js query\n ${JSON.stringify(request)}`);
    //return the response by a standardized format using _normalize function.
    return new Promise((resolve, reject) => {
    	//detectIntent method will process a NLP and return structured, actionable data as a result
      this.app.detectIntent(request, function(error, response) {
        if (error) {
          debug('dialogflow api error: ', error);
          reject(error);
        } else {
          debug('!detectIntect!dialogflow api response: ', response);
          try {
            const data = DialogFlowAPI_V2._normalize(response);
            console.log(`agent detectIntent response\n ${JSON.stringify(data)}`);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  }

  // return standardized format
  static _normalize(response) {
    return {
      intent: _.get(response, 'queryResult.intent.displayName', null),
      entities: structProtoToJson(response.queryResult.parameters),
      action: _.get(response, 'queryResult.action', null),
      fulfillment: {
        text: _.get(response, 'queryResult.fulfillmentText', null),
        messages: _.get(response, 'queryResult.fulfillmentMessages', null),
      },
      confidence: _.get(response, 'queryResult.intentDetectionConfidence', null),
      nlpResponse: response,
    };
  }
}


//[END dialogflowAgent]