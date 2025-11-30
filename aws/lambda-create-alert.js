const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const ddb = new DynamoDBClient({});

const ALERTS_TABLE_NAME = process.env.ALERTS_TABLE_NAME || "";

exports.handler = async (event) => {
  // CORS headers manuales
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
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
    // Parsear body
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    // Validar campos requeridos
    if (!body.alertId || !body.timestamp) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "alertId and timestamp are required" }),
      };
    }

    // Generar claves de DynamoDB
    const pk = `ALERT#${body.alertId}`;
    const sk = `TS#${body.timestamp}`;
    const status = body.status || "active";
    const sensorType = body.sensorType || "unknown";

    // Construir item para DynamoDB
    const item = {
      pk: { S: pk },
      sk: { S: sk },
      alertId: { S: body.alertId },
      type: { S: body.type || "info" },
      status: { S: status },
      title: { S: body.title || "" },
      description: { S: body.description || "" },
      sensor: { S: body.sensor || "" },
      sensorType: { S: sensorType },
      timestamp: { S: body.timestamp },
      reason: { S: body.reason || "" },
      recommendation: { S: body.recommendation || "" },
      devEui: { S: body.devEui || "LORA_GATEWAY_01" },
    };

    // Agregar campos opcionales
    if (body.currentValue !== undefined) {
      if (typeof body.currentValue === "number") {
        item.currentValue = { N: body.currentValue.toString() };
      } else {
        item.currentValue = { S: body.currentValue.toString() };
      }
    }

    if (body.threshold !== undefined) {
      if (typeof body.threshold === "number") {
        item.threshold = { N: body.threshold.toString() };
      } else {
        item.threshold = { S: body.threshold.toString() };
      }
    }

    if (body.unit) {
      item.unit = { S: body.unit };
    }

    if (body.location) {
      item.location = { S: body.location };
    }

    if (body.severity) {
      item.severity = { S: body.severity };
    }

    // Agregar atributos para GSI (necesarios para las consultas)
    // GSI1 usa status como PK y sk como SK
    // GSI2 usa sensorType como PK y sk como SK
    // Estos atributos ya están definidos arriba (status y sensorType)

    // Guardar en DynamoDB
    await ddb.send(
      new PutItemCommand({
        TableName: ALERTS_TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        alertId: body.alertId,
        message: "Alert created successfully",
      }),
    };
  } catch (error) {
    console.error("Error creating alert:", error);
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

