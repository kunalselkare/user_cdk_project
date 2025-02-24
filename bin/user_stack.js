#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { UserDataStack } = require('../lib/user_stack');

const app = new cdk.App();
new UserDataStack(app, 'UserDataStack', {
    // Stack properties can be passed here
});
