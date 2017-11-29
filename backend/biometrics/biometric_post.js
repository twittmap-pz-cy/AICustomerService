'use strict';

var AWS = require('aws-sdk');
AWS.config.update({region: "us-east-1",
                   accessKeyId: "AKIAJEUTN637CQLYTITA",
                   secretAccessKey: "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"});
var fs = require('fs');
var s3 = new AWS.S3();
var ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});



exports.handler = function(event, context, callback){


    var fileBuffer = new Buffer(event.base64Image, 'base64');
    //var userId = context.identity.user;
    var userId = event.userId;
    //use userId and current time as key
    var key = userId + '_authentication';
    //var key = userId;
    //validate image is on right type

        //adding to s3
        var bucket = "coms6998group13";
        var params1 = {
            Body: fileBuffer,
            Key: key,
            Bucket: bucket,
            ContentEncoding: 'base64',
            ContentType: 'image/jpg',
            ACL: 'public-read-write'
        };

        s3.putObject(params1, function(err, data){
            if (err) {
                callback(null,{ status: 'error', message: 'Unexpected Error, unable to add biometric to the database.' }); 
            } else {
                callback(null,{ status: 'success', message: 'The biometric has been successfully added to the database.' }); 
            }
        });


        //adding index to dynamodb
        var table = "coms6998group13-index";
        //var UserId = userId;
        //var TimeStamp = timeStamp;

        var params2 = {
            TableName:table,
            Item:{
            "UserId": {S: userId},
            "TimeStamp": {S: "Nov 2017"},
            "s3key": {S: key}
        }
        };

        console.log("Adding a new item...");
        ddb.putItem(params2, function(err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Added item:", JSON.stringify(data));
            }
        });









}