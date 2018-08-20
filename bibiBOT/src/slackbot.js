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
	  console.log(message);
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
    debug(
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

  middleware.receiveImage = async function(bot, message, next){
	  
  }
  
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

  debug(`settings are ${JSON.stringify(config)}`);
  return config;
}

//[END slackbot]