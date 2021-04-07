// import * as AWS from "aws-sdk";
import { PostAuthenticationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GetGroupCommand,
  CreateGroupCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = process.env.REGION ?? "us-east-2";
console.log(`[add-to-group.ts]env.region: ${process.env.REGION}`);
export const handler: PostAuthenticationTriggerHandler = async (
  event,
  _context,
  callback
) => {
  const cognitoClient = new CognitoIdentityProviderClient({
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
  const getGroupCmd = new GetGroupCommand(groupParams);
  const createGroupCmd = new CreateGroupCommand(groupParams);
  const addUserToAdminCmd = new AdminAddUserToGroupCommand(addUserParams);

  try {
    await cognitoClient.send(getGroupCmd);
  } catch (e) {
    await cognitoClient.send(createGroupCmd);
  }

  try {
    await cognitoClient.send(addUserToAdminCmd);
    callback(null, event);
  } catch (e) {
    callback(e);
  }
};
