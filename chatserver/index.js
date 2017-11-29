'use strict';

// libraries and imports
const AWS = require('aws-sdk');
const LEX = require('aws-sdk'); 
AWS.config.update({
  region: 'us-east-1',
  accessKeyId:'AKIAJIR2PL4ONZV6WIQQ',
  secretAccessKey: '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'
});
LEX.config.region = 'us-east-1'; // Region
LEX.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'us-east-1:f39dcc56-5b8d-4a59-8b8a-3dd968e96e28',
});

const uuidv4 = require('uuid/v4');
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// application-specific variables
const state = {};
const sockets = {};

// helper function for initializing state
var conversationId = uuidv4();
const initState = function() {
  return {
    name: '',
    messages: [],
    conversationId: conversationId // auto-assign conversationId
  };
};

// wraps a string as a text message
// ready to be sent through socket.io
const textMessage = function(text) {
  console.log('text: '+text);
  if (typeof text !== 'string') {
    throw new Error('text parameter needs to be a string');
  }

  return JSON.stringify({
    text: text
  });
};

io.on('connection', function(socket) {

  console.log(`socket ${socket.id} connected ${new Date().toISOString()}`);

  sockets[socket.id] = socket;

  let socketRef = socket;

  var resUserId = "";
  var resAgentId = "";
  var resMessage = "";

  socket.on('handshake', function(userObj) {
    console.log(`received handshake for user`, userObj);

    try {
      let user = JSON.parse(userObj);
      let userId = user.userId;
      resUserId += userId;


      // if a state object does not exist
      // for this user, create a new one
      if (!state[userId]) {
        state[userId] = initState();
        console.log(`State initialized for user`, user.name);
        state[userId].name = user.name;
      }

      var lexruntime = new LEX.LexRuntime();
      var lexUserId = 'chatbot-demo' + Date.now();
      var sessionAttributes = {};

      // event handler for messages from this particular user
      socketRef.on(userId, function(message) {
        console.log(`received message for ${userId}`, message);
        resMessage += message;
        resMessage += ". "; 

        let currentState = state[userId];

        // track the message
        currentState.messages.push(message);

        var params = {
          botAlias: '$LATEST',
          botName: 'AICustomerService',
          inputText: message,
          userId: lexUserId,
          sessionAttributes: sessionAttributes
        };

        lexruntime.postText(params, function(err, data) {
          if (err) {
            console.log(err, err.stack);
          }
          if (data) {
            sessionAttributes = data.sessionAttributes;
            io.emit(userId, textMessage(data.message));
            resMessage += data.message;
            resMessage += ". ";
            if(data.dialogState === 'Fulfilled') { 
              var Email = data.slots.Email;

              //upload to S3
              let str = JSON.stringify({
                userId: resUserId,
                conversationId: conversationId,
                utterances: resMessage,
                email: Email
              });
              console.log(typeof str + " of str: " + str);
              var paramsS3 = {
                Body: str, 
                Bucket: "cchw-chat-bucket", 
                Key: `conversationId: ${conversationId}`,
              };
              var s3 = new AWS.S3();
              s3.putObject(paramsS3, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);           // successful response
              });
              
              resMessage = ""; 
            }
          }
        });
      });
    } catch (handshakeError) {
      console.log('user handshake error', handshakeError);
    }
  });

  socket.on('agentHandshake', function(agentObj) {
    let agent = JSON.parse(agentObj);
    let agentId = agent.agentId;
    resAgentId += agentId;
    console.log(`received handshake for agent`, agentObj);
  });

  socket.on('disconnect', function() {
    console.log(`socket ${socket.id} disconnected at ${new Date().toISOString()}`);
    if (sockets[socket.id]) delete sockets[socket.id];
  });

});

// middleware
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

http.listen(port, function() {
  console.log('listening on *:' + port);
});

// serve up agent dashboard
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});
