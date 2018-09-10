/**
 * http://usejsdoc.org/
 */

const hasha = require('hasha');
const uuidv1 = require('uuid/v1');
const debug = require('debug')('dialogflow-middleware');
const rp = require('request-promise-native');
const fs = require('fs');

/*
Botkit allows patterns to be an array or a comma separated string containing a list of regular expressions.
This function converts regex, string, or array of either into an array of RexExp.
*/
exports.makeArrayOfRegex = function(data) {
  const patterns = [];

  if (typeof data === 'string') {
    data = data.split(',');
  }

  if (data instanceof RegExp) {
    return [data];
  }

  for (const item of data) {
    if (item instanceof RegExp) {
      patterns.push(item);
    } else {
      patterns.push(new RegExp('^' + item + '$', 'i'));
    }
  }
  return patterns;
};

/**
 * Create a session ID using a hash of fields on the message.
 *
 * The Sessionid is an md5 hash of select message object properties, concatenated together.
 * In the event the message object doesn't have those object properties, use random uuid.
 *
 * @param {object} config - the configuration set on the middleware
 * @param {object} message - a message object
 * @return {string} session identifier
 */
exports.generateSessionId = function(config, message) {
  let props;

  if (typeof config.sessionIdProps === 'string') {
    props = [config.sessionIdProps];
  } else {
    props = config.sessionIdProps;
  }

  const hashElements = props
    .map(x => {
      if (message[x]) return message[x].trim();
    })
    .filter(x => typeof x === 'string');

  debug(
    'generateSessionId using props %j. Values on this message are %j',
    props,
    hashElements
  );
  if (hashElements.length > 0) {
    return hasha(hashElements.join(''), { algorithm: 'md5' });
  } else {
    return uuidv1();
  }
};

exports.getUsername = function getUsername(userid){
	let options = {
			uri: '',
			headers: {
				'Cache-Control': 'no-cache',
				'User-Agent': 'Request-Promise',
				json: true
			}
	};
	
    return new Promise((resolve, reject) => {
        //get token from https://api.slack.com/methods/users.info
            options.uri = "https://slack.com/api/users.info?token=xoxb-407231588053-415235176083-8aRRQWzVCt7aBAuk2ebAefZJ&user="+userid+"&pretty=1";
             rp(options).then(function (body) {
                resolve(JSON.parse(body));
                //console.log('Retrieved Info slack --- ' + JSON.parse(body));
           })
           .catch(function (err) {
                 resolve(err);
                 console.log('aborted - slack ' + JSON.stringify(err));
           });
       });
}

let dateFormat = require('dateformat');
exports.createFolder = function (username) {
	let folder, nowTime;

	nowTime = dateFormat(new Date(), "yymmddHHMMss");
	folder = `C:/tmp/uploaded/${username}_${nowTime}/`;
	return new Promise((resolve, reject) => {
		fs.mkdir(folder, function(err){
			if(err){
				console.log(err);
				reject(err);
			}else{
				console.log('create newDir');	
				resolve(folder);
			}		
		});
	})
}

//[END utill]