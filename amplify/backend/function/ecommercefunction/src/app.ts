/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

/* Amplify Params - DO NOT EDIT
	AUTH_ECOMMERCEAPP333721BB_USERPOOLID
	ENV
	REGION
	STORAGE_PRODUCTTABLE_ARN
	STORAGE_PRODUCTTABLE_NAME
Amplify Params - DO NOT EDIT */
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

import { v4 as uuidv4 } from "uuid";
import express from "express";
import { json as bodyParserJson } from "body-parser";
import awsServerlessExpressMiddleware from "aws-serverless-express/middleware";

const region = process.env.REGION ?? "us-east-2";
console.log(`region.env[app.ts]: ${process.env.REGION}`);

// cognito
const cognito = new CognitoIdentityProviderClient({
  region,
});
const userpoolId = process.env.AUTH_ECOMMERCEAPP333721BB_USERPOOLID;
// dynamo
const ddb_table_name = process.env.STORAGE_PRODUCTTABLE_NAME;
console.log({ TableName: ddb_table_name });
const docClient = new DynamoDBClient({ region });

// const express = require("express");
// const bodyParser = require("body-parser");
// const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

// declare a new express app
const app = express();
app.use(bodyParserJson());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

async function getGroupsForUser(event: any) {
  let userSub = event.requestContext.identity.cognitoAuthenticationProvider.split(
    ":CognitoSignIn:"
  )[1];
  let userParams = {
    UserPoolId: userpoolId,
    Filter: `sub = "${userSub}"`,
  };
  const listUsersCmd = new ListUsersCommand(userParams);
  let userData = await cognito.send(listUsersCmd);
  const user = userData.Users?.[0] ?? undefined;
  var groupParams = {
    UserPoolId: userpoolId,
    Username: user?.Username ?? "",
  };
  const adminListGroupsForUserCmd = new AdminListGroupsForUserCommand(
    groupParams
  );
  const groupData = await cognito.send(adminListGroupsForUserCmd);
  return groupData;
}

async function canPerformAction(event: any, group: any) {
  return new Promise(async (resolve, reject) => {
    if (!event.requestContext.identity.cognitoAuthenticationProvider) {
      return reject();
    }
    const groupData = await getGroupsForUser(event);
    const groupsForUser =
      groupData.Groups?.map((group) => group.GroupName) ?? [];
    if (groupsForUser.includes(group)) {
      resolve(true);
    } else {
      reject("user not in group, cannot perform action..");
    }
  });
}

async function getItems() {
  var params = {
    TableName: ddb_table_name,
  };
  const scanCmd = new ScanCommand(params);
  try {
    const data = await docClient.send(scanCmd);
    console.log("data[getItems]: ", data);
    return data;
  } catch (err) {
    return err;
  }
}

/**********************
 * Example get method *
 **********************/

app.get("/products", async function (req, res) {
  try {
    const data = await getItems();
    res.json({ data });
  } catch (error) {
    res.json({ error });
  }
});

app.get("/products/*", function (req, res) {
  // Add your code here
  res.json({ success: "get call succeed!", url: req.url });
});

/****************************
 * Example post method *
 ****************************/

app.post("/products", async function (req: any, res: any) {
  const { event } = req.apiGateway;
  const { body } = req;
  try {
    await canPerformAction(event, "Admin");
    const input = {
      name: { S: body.name },
      price: { S: body.price },
      id: { S: uuidv4() },
    };
    const params = {
      TableName: ddb_table_name,
      Item: input,
    };
    console.log(`post[products][params]: ${JSON.stringify(params, null, 2)}`);
    const putItemCmd = new PutItemCommand(params);
    await docClient.send(putItemCmd);
    res.json({ success: "item saved to database.." });
  } catch (error) {
    res.json({ error });
  }
});

app.post("/products/*", function (req, res) {
  // Add your code here
  res.json({ success: "post call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example put method *
 ****************************/

app.put("/products", async function (req, res) {
  try {
    const params = {
      TableName: ddb_table_name,
      Key: { id: req.body.id },
      UpdateExpression: "set price = :newprice",
      ExpressionAttributeValues: { ":newprice": { N: "100" } },
    };
    const updateItemCmd = new UpdateItemCommand(params);
    await docClient.send(updateItemCmd);
    res.json({ success: "successfully updated item" });
  } catch (error) {
    res.json({ error });
  }
});

app.put("/products/*", function (req, res) {
  // Add your code here
  res.json({ success: "put call succeed!", url: req.url, body: req.body });
});

/****************************
 * Example delete method *
 ****************************/

app.delete("/products", async function (req: any, res: any) {
  const { event } = req.apiGateway;
  try {
    await canPerformAction(event, "Admin");
    var params = {
      TableName: ddb_table_name,
      Key: { id: req.body.id },
    };
    const deleteItemCmd = new DeleteItemCommand(params);
    await docClient.send(deleteItemCmd);
    res.json({ success: "successfully deleted item" });
  } catch (err) {
    res.json({ error: err });
  }
});

app.delete("/products/*", function (req, res) {
  // Add your code here
  res.json({ success: "delete call succeed!", url: req.url });
});

app.listen(3000, function () {
  console.log("App started");
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
export { app };
