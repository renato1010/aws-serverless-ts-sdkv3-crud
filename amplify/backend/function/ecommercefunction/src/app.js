"use strict";
/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
/* Amplify Params - DO NOT EDIT
    AUTH_ECOMMERCEAPP333721BB_USERPOOLID
    ENV
    REGION
    STORAGE_PRODUCTTABLE_ARN
    STORAGE_PRODUCTTABLE_NAME
Amplify Params - DO NOT EDIT */
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const uuid_1 = require("uuid");
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const middleware_1 = __importDefault(require("aws-serverless-express/middleware"));
const region = process.env.REGION ?? "us-east-2";
console.log(`region.env[app.ts]: ${process.env.REGION}`);
// cognito
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region,
});
const userpoolId = process.env.AUTH_ECOMMERCEAPP333721BB_USERPOOLID;
// dynamo
const ddb_table_name = process.env.STORAGE_PRODUCTTABLE_NAME;
console.log({ TableName: ddb_table_name });
const docClient = new client_dynamodb_1.DynamoDBClient({ region });
// const express = require("express");
// const bodyParser = require("body-parser");
// const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");
// declare a new express app
const app = express_1.default();
exports.app = app;
app.use(body_parser_1.json());
app.use(middleware_1.default.eventContext());
// Enable CORS for all methods
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
async function getGroupsForUser(event) {
    let userSub = event.requestContext.identity.cognitoAuthenticationProvider.split(":CognitoSignIn:")[1];
    let userParams = {
        UserPoolId: userpoolId,
        Filter: `sub = "${userSub}"`,
    };
    const listUsersCmd = new client_cognito_identity_provider_1.ListUsersCommand(userParams);
    let userData = await cognito.send(listUsersCmd);
    const user = userData.Users?.[0] ?? undefined;
    var groupParams = {
        UserPoolId: userpoolId,
        Username: user?.Username ?? "",
    };
    const adminListGroupsForUserCmd = new client_cognito_identity_provider_1.AdminListGroupsForUserCommand(groupParams);
    const groupData = await cognito.send(adminListGroupsForUserCmd);
    return groupData;
}
async function canPerformAction(event, group) {
    return new Promise(async (resolve, reject) => {
        if (!event.requestContext.identity.cognitoAuthenticationProvider) {
            return reject();
        }
        const groupData = await getGroupsForUser(event);
        const groupsForUser = groupData.Groups?.map((group) => group.GroupName) ?? [];
        if (groupsForUser.includes(group)) {
            resolve(true);
        }
        else {
            reject("user not in group, cannot perform action..");
        }
    });
}
async function getItems() {
    var params = {
        TableName: ddb_table_name,
    };
    const scanCmd = new client_dynamodb_1.ScanCommand(params);
    try {
        const data = await docClient.send(scanCmd);
        console.log("data[getItems]: ", data);
        return data;
    }
    catch (err) {
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
    }
    catch (error) {
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
app.post("/products", async function (req, res) {
    const { event } = req.apiGateway;
    const { body } = req;
    try {
        await canPerformAction(event, "Admin");
        const input = {
            name: { S: body.name },
            price: { S: body.price },
            id: { S: uuid_1.v4() },
        };
        const params = {
            TableName: ddb_table_name,
            Item: input,
        };
        console.log(`post[products][params]: ${JSON.stringify(params, null, 2)}`);
        const putItemCmd = new client_dynamodb_1.PutItemCommand(params);
        await docClient.send(putItemCmd);
        res.json({ success: "item saved to database.." });
    }
    catch (error) {
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
        const updateItemCmd = new client_dynamodb_1.UpdateItemCommand(params);
        await docClient.send(updateItemCmd);
        res.json({ success: "successfully updated item" });
    }
    catch (error) {
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
app.delete("/products", async function (req, res) {
    const { event } = req.apiGateway;
    try {
        await canPerformAction(event, "Admin");
        var params = {
            TableName: ddb_table_name,
            Key: { id: req.body.id },
        };
        const deleteItemCmd = new client_dynamodb_1.DeleteItemCommand(params);
        await docClient.send(deleteItemCmd);
        res.json({ success: "successfully deleted item" });
    }
    catch (err) {
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
