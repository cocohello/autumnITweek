/**
 * http://usejsdoc.org/
 */
'use strict';

/*変数宣言*/
//gapic(generated api client)
const gapicCfgAgent = require('./agent_client_config');
//gax is a set of modules which aids the development of APIs for clients and servers.
const gax = require('google-gax');
//library to load protofile
const merge = require('lodash.merge');
//Developer file created in Google's Protocol Buffer format
const protobuf = require('protobufjs');

const VERSION = require('../package.json').version;

//construct
class AgentClient {
	
}
