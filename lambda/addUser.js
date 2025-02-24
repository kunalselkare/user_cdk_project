const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  const TableName = process.env.TABLE_NAME;

  const body = JSON.parse(event.body);
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const params = {
    TableName,
    Item: {
      id,
      createdAt,
      globalKey: 'global', // Fixed value for GSI partition key
      ...body, // Add user data
    },
  };

  try {
    await dynamodb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User added successfully!' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error adding user.' }),
    };
  }
};
