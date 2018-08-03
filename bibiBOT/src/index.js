/**
 * http://usejsdoc.org/
 */


'use strict';

const AgtClient = require('./agent_client');
const CtxClient = require('./context_client');
const EntTpClient = require('./entity_types_client');
const IntClient = require('./intent_client');
const SsEntTpClient = require('./session_entity_type_client');
const SsClient = require('./session_client');

module.exports.AgtClient = AgtClient;
module.exports.CtxClient = CtxClient;
module.exports.EntTpClient = EntTpClient;
module.exports.IntClient = IntClient;
module.exports.SsEntTpClient = SsEntTpClient;
module.exports.SsClient = SsClient;