'use strict';

var AWS = require('aws-sdk');
var crypto = require('crypto');
AWS.config.update(
    {region: "us-east-1",
     accessKeyId: "AKIAJEUTN637CQLYTITA",
     secretAccessKey: "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"}
     );
var rekognition = new AWS.Rekognition();
//const s3 = new AWS.S3();
//var doc = require('dynamodb-doc');
var ddb = new AWS.DynamoDB(
    {apiVersion: '2012-10-08'}
    );
var s3Key = "zhuping_authentication";


exports.handler = function(event, context, callback){

    
    var fileBuffer = new Buffer(event.base64Image, 'base64');
    var userId = event.userId;



        //get the s3 file key stored in dynamodb
       var params = {
        TableName: 'coms6998group13-index',
        IndexName: 'UserId-index',
        KeyConditionExpression: "UserId = :userId",
        ExpressionAttributeValues: {
                ":userId": userId
        },
        ProjectionExpression: "s3key"

        };

        var documentClient = new AWS.DynamoDB.DocumentClient();

        documentClient.query(params, function(err, data) {
        if (err) console.log(err);
        else {
            //console.log(data.Items[0].s3key);
            s3Key = data.Items[0].s3key;
            
            var params2 = {
            SourceImage: {
                //should be from user input
                Bytes: Buffer.from(event.base64Image,'base64')
                
            },
            TargetImage: {
                
                S3Object: {
                    Bucket: "coms6998group13",
                    Name: s3Key
                }
                
            },
            SimilarityThreshold: 70

        };
        console.log("rekognition");
        rekognition.compareFaces(params2, function (error, response) {
            if (error) {
                console.log(error);
            } else {
                if (response.FaceMatches!= null && response.FaceMatches.length > 0) {
                    console.log("Face similarity of " + response.FaceMatches[0].Similarity + "%");
                    console.log("Generating tokenId and store into dynamoDB");
                    
                    var userId = event.userId;
                    var tokenId = crypto.randomBytes(16).toString('hex');
                    var expire = Math.floor((new Date().getTime()+2000)/1000).toString();
                    var create = Math.floor(new Date().getTime()/1000).toString();
               
                    var params3 = {
                        TableName: "coms6998group13-ttl",
                        Item:{
                            "UserId": {S: userId},
                            "TokenId": {S: tokenId},
                            "creation": {N: create},
                            "expiration": {N: expire}
                        }
                    };
                    
                    ddb.putItem(params3, function(err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log("Added token");
                        }
                    });
                    
                    const token={
                        tokenId: tokenId,
                        userId: userId,
                        expiration: expire
                    };
                    callback(null,token);
                    
                }
                else{
                    console.log("Not this person");
                    callback(null,{ status: 'unauthorized', message: 'Unauthorized user' });
                }
            }

        });
        }
        //console.log(data.Items[0].s3key);
        });

      
}