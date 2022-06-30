const AWS = require("aws-sdk");
AWS.config.update({
  region: "us-east-1",
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTable = "women-necessity";
const womenCarePath = "/womencare";
const orderPath = "/order";
const ordersPath = "/orders";

exports.handler = async function (event) {
  console.log("Request event: ", event);
  let response;
  switch (true) {
    case event.httpMethod === "GET" && event.path === womenCarePath:
      response = buildResponse(200);
      break;
    case event.httpMethod === "GET" && event.path === orderPath:
      response = await getOrder(event.queryStringParameters.orderId);
      break;
    case event.httpMethod === "GET" && event.path === ordersPath:
      response = await getOrders();
      break;
    case event.httpMethod === "POST" && event.path === orderPath:
      response = await saveOrder(JSON.parse(event.body));
      break;
    case event.httpMethod === "PATCH" && event.path === orderPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyOrder(
        requestBody.orderId,
        requestBody.updateKey,
        requestBody.updateValue
      );
      break;
    case event.httpMethod === "DELETE" && event.path === orderPath:
      response = await deleteOrder(JSON.parse(event.body).orderId);
      break;
    default:
      response = buildResponse(404, "404 Not Found");
  }
  return response;
};

async function getOrder(orderId) {
  const params = {
    TableName: dynamodbTable,
    Key: {
      orderId: orderId,
    },
  };
  return await dynamodb
    .get(params)
    .promise()
    .then(
      response => {
        return buildResponse(200, response.Item);
      },
      error => {
        console.error("it will handle customer's error:  ", error);
      }
    );
}

async function getOrders() {
  const params = {
    TableName: dynamodbTable,
  };
  const allOrders = await scanDynamoRecords(params, []);
  const body = {
    orders: allOrders,
  };
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error("it will handle customer's error:  ", error);
  }
}

async function saveOrder(requestBody) {
  const params = {
    TableName: dynamodbTable,
    Item: requestBody,
  };
  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
          Message: "SUCCESSFULLY DONE",
          Item: requestBody,
        };
        return buildResponse(200, body);
      },
      error => {
        console.error("it will handle customer's error:  ", error);
      }
    );
}

async function modifyOrder(orderId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTable,
    Key: {
      orderId: orderId,
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dynamodb
    .update(params)
    .promise()
    .then(
      response => {
        const body = {
          Operation: "UPDATE",
          Message: "SUCCESSFULLY DONE",
          UpdatedAttributes: response,
        };
        return buildResponse(200, body);
      },
      error => {
        console.error("it will handle customer's error: ", error);
      }
    );
}

async function deleteOrder(orderId) {
  const params = {
    TableName: dynamodbTable,
    Key: {
      orderId: orderId,
    },
    ReturnValues: "ALL_DONE",
  };
  return await dynamodb
    .delete(params)
    .promise()
    .then(
      response => {
        const body = {
          Operation: "DELETE",
          Message: "SUCCESSFULLY DONE",
          Item: response,
        };
        return buildResponse(200, body);
      },
      error => {
        console.error("it will handle customer's error: ", error);
      }
    );
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
