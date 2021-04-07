# AWS Serverless API Functions, Full Typescript and Node SDK V3

Here we'll show a full CRUD Api (1 endpoint) over an AWS Lambda Function, this function looks much alike  
an Express API Server, the twist is I opt in for Typescript instead of the Original JS code, also  
Implemented NodeJS SDK V3 instead of V2,

## Credits

This example and code is based on book **Full Stack Serverless** by [Nader Dabit](https://twitter.com/dabit3)  
I changed the project a bit using `Typescript` insted of `JavaScript` on code examples, and other minor changes  
You can check the original code [here](https://github.com/dabit3/full-stack-serverless-code/tree/master/serverless-functions-in-depth-part-2/src). If you want to run the code  
Youl need to install Amplify and get your own `src/aws-exports.js` file that you will need to configure the project  
If have no prior exp with **Amplify** watch this [video](https://youtu.be/fWbM5DLh25U) to learn how to configure the Amplify CLI

## Transpile Typescript code

Amplify docs has a guide for this, please check: [Build options](https://docs.amplify.aws/cli/function/build-options)
I twisted a little my [`tsconfig.json`](https://github.com/renato1010/aws-serverless-ts-sdkv3-crud/blob/master/amplify/backend/function/ecommerceapp333721bbPostConfirmation/tsconfig.json)

## Two Functions

The focus of this particular project is on backend, that consist of several AWS services  
API, Auth, DynamoDB and Lambda Functions. The main teachnical features are on the two Lambda functions
So I'll cover those in detail.

## Function 1: Post-Confirmation(Auth/Cognito) event handler

Initialize project

```bash
amplify init
```

Follow the steps to set project _name_, _environment name_, _default editor_ (accept defaults and choose _AWS Profile_)

### Create Authentication service

Also create a Lambda trigger to automatically add users to the Admin Group based on a pre-stablished list

```bash
amplify add auth
```

Select options like this

- ? Do you want to use the default authentication and security configuration?: Default configuration
- ? How do you want users to be able to sign in?: Username
- ? Do you want to configure advanced settings?: Yes
- ? What attributes are required for signing up?: Email
- ? Do you want to enable any of the following capabilities?: Add User to Group
- ? Enter the name of the group to which users will be added.: Admin
- ? Do you want to edit your add-to-group function now?: Y

**update the adminEmails array to add yours only those emails will be added to Admin Groups after Signup  
comfirmation** in [add-to-group.ts](https://github.com/renato1010/aws-serverless-ts-sdkv3-crud/blob/master/amplify/backend/function/ecommerceapp333721bbPostConfirmation/src/add-to-group.ts), Cognito will send a code to confirm Email  
// line 21

```typescript
const adminEmails = ["Admin1@gmail.com", "Admin2@gmail.com"];
```

### Move from AWS Node SDK V2 to V3

There are several differences between SDK Version 2 and Version 3, I will explain the most important patterns one by one.
First: V3 is modular so instead of:

```typescript
import * as AWS from "aws-sdk";
```

We'll do imports from individual services packages, of course you'll need ton `npm install` all those.  
AWS SDK V3 is written in Typescript so no need to import @types/

```typescript
import {
  CognitoIdentityProviderClient,
  GetGroupCommand,
  CreateGroupCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
```

**The SDK V3 is huge, but the main patter is like this:**  
You import the Service Client, and then send/call specific _Commands_ all those are classes that will need to instantiate
in this function will work like this:

1. Create the Cognito Identity Provider Client pass the region(env var):

```typescript
const region = process.env.REGION ?? "us-east-2";
const cognitoClient = new CognitoIdentityProviderClient({
  region,
});
```

2. We'll check if Cognito 'Admin' group exist:

```typescript
const groupParams = {
  GroupName: process.env.GROUP,
  UserPoolId: event.userPoolId,
};
const getGroupCmd = new GetGroupCommand(groupParams);
```

3. If no exist we'll create one:

```typescript
const createGroupCmd = new CreateGroupCommand(groupParams);
```

4. Finally add user to admin Group. Our code previously check if new user email is in the Admin emails array  
   if it doesn't the function is truncated

```typescript
if (adminEmails.indexOf(event.request.userAttributes.email) === -1) {
  callback(null, event);
}
```

```typescript
const addUserParams = {
  GroupName: process.env.GROUP,
  UserPoolId: event.userPoolId,
  Username: event.userName,
};
const addUserToAdminCmd = new AdminAddUserToGroupCommand(addUserParams);
try {
  await cognitoClient.send(addUserToAdminCmd);
  callback(null, event);
} catch (e) {
  callback(e);
}
```

## Function 2: CRUP API Lambda Function (Express style)

The second function [`ecommercefunction>src>app.ts`](https://github.com/renato1010/aws-serverless-ts-sdkv3-crud/blob/master/amplify/backend/function/ecommercefunction/src/app.ts) is practically an express server, that will send _Commands_ to a **DynamoDB** table

### Add the DynamoDB database

```bash
amplify add storage
```

use this options:

- ? Please select from one of the below mentioned services: NoSQL Database
- ? Please provide a friendly name for your resource that will be used to label  
  this category in the project: producttable
- ? Please provide table name: producttable
- ? What would you like to name this column: id
- ? Please choose the data type: string
- ? Would you like to add another column? N
- ? Please choose partition key for the table: id
- ? Do you want to add a sort key to your table? N
- ? Do you want to add global secondary indexes to your table? N
- ? Do you want to add a Lambda Trigger for your Table? N

### Then add the API

```bash
amplify add api
```

with these options:

- ? Please select from one of the below mentioned services: REST
- ? Provide a friendly name for your resource to be used as a label for this
  category in the project: ecommerceapi
- ? Provide a path: /products
- ? Choose a Lambda source: Create a new Lambda function
- ? Provide a friendly name for your resource to be used as a label for this
  category in the project: ecommercefunction
- ? Provide the AWS Lambda function name: ecommercefunction
- ? Choose the function runtime that you want to use: NodeJS
- ? Choose the function template that you want to use: Serverless express
  unction (Integration with Amazon API Gateway)
- ? Do you want to access other resources created in this project from your
  Lambda function? Y
- ? Select the category: storage, auth
- ? Select the operations you want to permit for <app_name>: create, read, update,
  delete
- ? Select the operations you want to permit for producttable: create, read,
  update, delete
- ? Do you want to invoke this function on a recurring schedule? N
- ? Do you want to configure Lambda layers for this function? N
- ? Do you want to edit the local Lambda function now? N
- ? Restrict API access: Y
- ? Who should have access? Authenticated and Guest users
- ? What kind of access do you want for Authenticated users? create, read,
  update, delete
- ? What kind of access do you want for Guest users? read
- ? Do you want to add another path? N

### from SDK V2 to V3

With this function we'll interact with 2 services **Cognito** and **DynamoDB**, Cognito/Auth is used because
we want that some methods POST, PUT, and DELETE will be executed only when user has 'Admin' capabilities
As we did with the previous function we'll import the modularized services like this:

```typescript
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
```

### create service clients

```typescript
// cognito
const cognito = new CognitoIdentityProviderClient({
  region,
});
// dynamodb
const docClient = new DynamoDBClient({ region });
```

### List all products GET /products

This Command/query is called Scan in DynamoDB lingo

```typescript
const ddb_table_name = process.env.STORAGE_PRODUCTTABLE_NAME;
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
```

### Create a new product POST /products

`canPerformAction` function is in charge to check if user is 'Admin'

```typescript
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
```

### Delete a product DELETE /products

```typescript
const ddb_table_name = process.env.STORAGE_PRODUCTTABLE_NAME;
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
```

**That's it there you have a full CRUD serverless**
![screenshot](screenshots/full-serverless-CRUD-2021-04-06%2021-06.gif)
