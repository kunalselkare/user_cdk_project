const cdk = require('aws-cdk-lib');
const { Stack, Duration } = cdk;
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const apiGateway = require('aws-cdk-lib/aws-apigateway');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const iam = require('aws-cdk-lib/aws-iam');

class UserDataStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // DynamoDB table
    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: 'UserTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

    // Add a GSI for global latest records query
    userTable.addGlobalSecondaryIndex({
      indexName: 'GlobalIndex',
      partitionKey: { name: 'globalKey', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda function to add user data
    const addUserFunction = new lambda.Function(this, 'AddUserFunction', {
      functionName: 'AddUserLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'addUser.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: userTable.tableName,
      },
    });
    userTable.grantWriteData(addUserFunction);

    // API Gateway to add users
    const api = new apiGateway.RestApi(this, 'UserApi', {
      restApiName: 'User Service',
    });
    const addUserIntegration = new apiGateway.LambdaIntegration(addUserFunction);
    const usersResource = api.root.addResource('users');
    usersResource.addMethod('POST', addUserIntegration);

    // Lambda function to query latest records and send email
    const queryAndEmailFunction = new lambda.Function(this, 'QueryAndEmailFunction', {
      functionName: 'QueryAndEmailLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'queryAndEmail.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: userTable.tableName,
        INDEX_NAME: 'GlobalIndex',
        EMAIL_RECIPIENT: 'kunalselkare3@gmail.com', 
      },
    });
    userTable.grantReadData(queryAndEmailFunction);

    // Grant SES permissions to the queryAndEmailFunction
    queryAndEmailFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // EventBridge rule to trigger queryAndEmailFunction every X hours
    const rule = new events.Rule(this, 'ScheduleRule', {
      schedule: events.Schedule.rate(Duration.hours(6)), // Replace 6 with your desired interval
    });
    rule.addTarget(new targets.LambdaFunction(queryAndEmailFunction));
  }
}

module.exports = { UserDataStack };
