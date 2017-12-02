exports.handler = (event, context, callback) => {
    // TODO implement
    var params = {
  'KeyConditionExpression': "Id=:id", 
  'ExpressionAttributeValues':
  {
      ":id":"123"
  }, 
  'TableName': 'lambda-refarch-streamprocessing-EventData'
};


var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-east-1'});
// Create DynamoDB document client
//var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
var documentClient = new AWS.DynamoDB.DocumentClient();

documentClient.query(params, function(err, data) {
   if (err) console.log(err);
   else console.log(data);
});
 
    callback(null, 'success');
};