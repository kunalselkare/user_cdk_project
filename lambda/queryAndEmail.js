const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

exports.handler = async () => {
  const TableName = process.env.TABLE_NAME;
  const IndexName = process.env.INDEX_NAME;
  const EmailRecipient = process.env.EMAIL_RECIPIENT;

  try {
    // Query the GSI for the latest 10 records
    const params = {
      TableName,
      IndexName,
      KeyConditionExpression: '#pk = :partitionKeyValue',
      ExpressionAttributeNames: {
        '#pk': 'globalKey', // GSI partition key attribute
      },
      ExpressionAttributeValues: {
        ':partitionKeyValue': 'global',
        
      },
      Limit: 10,
      ScanIndexForward: false, // Sort descending (latest records first)
    };

    const data = await dynamodb.query(params).promise();

    // Formatting the email body
    const emailBody = data.Items.map(item => JSON.stringify(item)).join('\n');

    // Send the email
    const emailParams = {
      Source: EmailRecipient,
      Destination: { ToAddresses: [EmailRecipient] },
      Message: {
        Subject: { Data: 'Latest 10 Records' },
        Body: { Text: { Data: emailBody } },
      },
    };
    await ses.sendEmail(emailParams).promise();

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
