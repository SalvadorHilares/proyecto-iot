const { DynamoDBClient, UpdateItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");

const ddb = new DynamoDBClient({});

const ALERTS_TABLE_NAME = process.env.ALERTS_TABLE_NAME || "";

exports.handler = async (event) => {
  // CORS headers manuales
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "PUT,OPTIONS",
    "Access-Control-Max-Age": "86400"
  };

  // Manejar preflight OPTIONS
  if (
    event.requestContext?.http?.method === "OPTIONS" ||
    event.httpMethod === "OPTIONS"
  ) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (!ALERTS_TABLE_NAME) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "ALERTS_TABLE_NAME environment variable not set" }),
    };
  }

  try {
    // Obtener alertId de los path parameters
    const alertId = event.pathParameters?.alertId;
    
    if (!alertId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "alertId is required in path parameters" }),
      };
    }

    // Buscar la alerta para obtener el SK (timestamp)
    const pk = `ALERT#${alertId}`;
    
    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: ALERTS_TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: pk },
        },
        Limit: 1,
        ScanIndexForward: false, // Más reciente primero
      })
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Alert not found" }),
      };
    }

    const alertItem = queryResult.Items[0];
    const sk = alertItem.sk?.S || "";

    // Actualizar el estado a "resolved"
    const resolvedAt = new Date().toISOString();

    await ddb.send(
      new UpdateItemCommand({
        TableName: ALERTS_TABLE_NAME,
        Key: {
          pk: { S: pk },
          sk: { S: sk },
        },
        UpdateExpression: "SET #status = :status, resolvedAt = :resolvedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": { S: "resolved" },
          ":resolvedAt": { S: resolvedAt },
        },
        ReturnValues: "ALL_NEW",
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        alertId: alertId,
        status: "resolved",
        resolvedAt: resolvedAt,
        message: "Alert resolved successfully",
      }),
    };
  } catch (error) {
    console.error("Error resolving alert:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};

