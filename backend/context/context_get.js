exports.handler = (event, context, callback) => {
    // TODO implement
    var AWS=require('aws-sdk');
    var docClient= new AWS.DynamoDB.DocumentClient({region:'us-east-1'});
    let param={
        TableName:"lambda-refarch-streamprocessing-EventData",
        limit:10
        
    };
    docClient.scan(param,function(err,data){
        if (err)
        {
            callback(err,null);
        }else{
            callback(null,data);
        }
    });
    
    
  
};