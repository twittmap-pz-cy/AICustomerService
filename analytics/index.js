'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const io = require('socket.io');
const express = require('express');
const app = express();

aws.config.update({
  region: 'us-east-1',
  accessKeyId:'AKIAJIR2PL4ONZV6WIQQ',
  secretAccessKey: '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'
});

const s3 = new aws.S3();
//const s3 = new aws.S3({ apiVersion: '2006-03-01' });



exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    //const bucket = "cchw-chat-bucket";
    //const key = "conversationId: 08b1a6a5-60a3-4c31-ac4b-ac5611f1c668";
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            console.log(err);
            const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
            console.log(message);
            callback(message);
        } else {
            //console.log(`\nutterances: ${JSON.parse(data.Body).agentId}\n`);
            
            
            var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
            var natural_language_understanding = new NaturalLanguageUnderstandingV1({
                'username': '96593132-ddaa-4653-9f28-1147c7136ee8',
                'password': 'VSoVCZPKPioU',
                'version_date': '2017-02-27'
            });

            var parameters = {
                'text': JSON.parse(data.Body).utterances,
                //'text': 'Beijing University of Post and Telecommunications is an Chinese university focusing on telecommunications and Internet, headquartered in Beijing, China, with 800 students in just one school every year.',
                'features': {
                    'entities': {
                        'emotion': true,
                        'sentiment': true,
                        'limit': 2
                    },
                    'keywords': {
                        'emotion': true,
                        'sentiment': true,
                        'limit': 2
                    }
                }
            }
            
            natural_language_understanding.analyze(parameters, function(err, response) {
                if (err) {
                    console.log('error:', err);
                } else {
                    var resSentiment = JSON.stringify(response, null, 2);
                    //console.log('resSentiment: ', resSentiment, '\n\n\n');
                    
                    // send emails
                    var ses = new aws.SES();
                    var from = 'yu.chengyun@yandex.com';
                    var to = [JSON.parse(data.Body).email];
                    //var to = ['cy2468@columbia.edu']; 
                    ses.sendEmail( { 
                        Source: from, 
                        Destination: { ToAddresses: to },
                        Message: {
                            Subject: {
                                Data: 'Your Conversation Analysis Result'
                            },
                            Body: {
                                Text: {
                                Data: resSentiment,
                                }
                            }
                        }
                    }, function(err, data) {
                        if(err) throw err
                        console.log('Email sent.');
                    });
                }
            });
            
            

            console.log('\nCONTENT TYPE:', data.ContentType,'\n');
            callback(null, data.ContentType);
        }
    });
};
