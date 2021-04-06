"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const region = process.env.REGION ?? "us-east-2";
console.log(`[add-to-group.ts]env.region: ${process.env.REGION}`);
const handler = async (event, _context, callback) => {
    const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
        region,
    });
    const adminEmails = [
        "renatoperezc@gmail.com",
        "renatoperezpersonal@gmail.com",
    ];
    if (adminEmails.indexOf(event.request.userAttributes.email) === -1) {
        callback(null, event);
    }
    const groupParams = {
        GroupName: process.env.GROUP,
        UserPoolId: event.userPoolId,
    };
    const addUserParams = {
        GroupName: process.env.GROUP,
        UserPoolId: event.userPoolId,
        Username: event.userName,
    };
    const getGroupCmd = new client_cognito_identity_provider_1.GetGroupCommand(groupParams);
    const createGroupCmd = new client_cognito_identity_provider_1.CreateGroupCommand(groupParams);
    const addUserToAdminCmd = new client_cognito_identity_provider_1.AdminAddUserToGroupCommand(addUserParams);
    try {
        await cognitoClient.send(getGroupCmd);
    }
    catch (e) {
        await cognitoClient.send(createGroupCmd);
    }
    try {
        await cognitoClient.send(addUserToAdminCmd);
        callback(null, event);
    }
    catch (e) {
        callback(e);
    }
};
exports.handler = handler;
