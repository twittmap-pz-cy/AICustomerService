
console.log('Loading function');

var AWS = require('aws-sdk');
var doc = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  var stackName = context.functionName.split('-').slice(0, -2).join('-');
  var tableName = stackName + '-EventData';

  var putItems = [];

  /*
  * This assumes the batch size configured in the the event source mapping
  * is set to a maximum of 25 records. Depending on the characteristics of
  * your system it may make sense to consume larger batches from the stream
  * and manage the batch sizes sent to DynamoDB within the funtion.
  */
  event.Records.forEach(function(record) {
    payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
    console.log('Decoded payload:', payload);

    var tweet = JSON.parse(payload);

    console.log('User:', tweet.user.name);
    console.log('Timestamp:', tweet.created_at);

    putItems.push({
      PutRequest: {
          Item: {
              Username: tweet.user.name,
              Id: tweet.id_str,
              Timestamp: Math.floor((new Date().getTime())/1000),
              Expirationtime: Math.floor((new Date().getTime()+2000)/1000),
              Location:tweet.user.location
          }
      }
    });
  });

  var tableItems = {};
  tableItems[tableName] = putItems;
  writeItems(tableItems, 0, context);
};

function writeItems(items, retries, context) {
  doc.batchWrite({ RequestItems: items })
    .promise()
    .then((data) => {
      if(Object.keys(data.UnprocessedItems).length) {
          console.log('Unprocessed items remain, retrying.');
          var delay = Math.min(Math.pow(2, retries) * 100, context.getRemainingTimeInMillis() - 200);
          setTimeout(function() {writeItems(data.UnprocessedItems, retries + 1)}, delay);
        } else {
          context.succeed();
        }
    })
    .catch((err) => {
      console.log('DDB call failed: ' + err, err.stack);
      return context.fail(err);
    });   
}