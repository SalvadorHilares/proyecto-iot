const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const ddb = new DynamoDBClient({});

const TABLE_NAME = process.env.TABLE_NAME || "";

exports.handler = async (event) => {
  // CORS headers manuales
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Max-Age": "86400"
  };

  // Manejar preflight OPTIONS
  if (
    event.requestContext?.http?.method === "OPTIONS" ||
    event.httpMethod === "OPTIONS" ||
    (event.requestContext && !event.requestContext.http && event.httpMethod === "OPTIONS")
  ) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "TABLE_NAME environment variable not set" }),
    };
  }

  try {
    // Obtener parámetros de query string (compatible con ambos formatos de API Gateway)
    const queryParams = event.queryStringParameters || {};
    const devEui = queryParams.devEui || "UNKNOWN";
    const limit = parseInt(queryParams.limit || "10", 10);
    const startTime = queryParams.startTime; // ISO timestamp opcional

    // Validar limit
    const maxLimit = 100;
    const validLimit = Math.min(Math.max(1, limit), maxLimit);

    // Construir la query
    const pk = `DEV#${devEui}`;
    
    let queryCommand;
    
    if (startTime) {
      // Query con rango de tiempo específico
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND sk >= :startTime",
        ExpressionAttributeValues: {
          ":pk": { S: pk },
          ":startTime": { S: `TS#${startTime}` },
        },
        Limit: validLimit,
        ScanIndexForward: false, // Orden descendente (más recientes primero)
      });
    } else {
      // Query para obtener los últimos N registros
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: pk },
        },
        Limit: validLimit,
        ScanIndexForward: false, // Orden descendente (más recientes primero)
      });
    }

    const result = await ddb.send(queryCommand);

    // Convertir items de DynamoDB a formato JSON normal
    const items = (result.Items || []).map((item) => {
      const decoded = {
        gas: parseFloat(item.gas?.N || "0"),
        temperature: parseFloat(item.temperature?.N || "0"),
        humidity: parseFloat(item.humidity?.N || "0"),
        distanceCm: parseFloat(item.distanceCm?.N || "0"),
        riskScore: parseFloat(item.riskScore?.N || "0"),
        flags: {
          fire: item.flags?.M?.fire?.BOOL || false,
          logging: item.flags?.M?.logging?.BOOL || false,
          presence: item.flags?.M?.presence?.BOOL || false,
        },
      };

      // Extraer timestamp del sk
      const sk = item.sk?.S || "";
      const timestamp = sk.replace("TS#", "");

      // Extraer metadata
      const metadata = {
        devEui: item.metadata?.M?.devEui?.S || "UNKNOWN",
        rssi: parseFloat(item.metadata?.M?.rssi?.N || "0"),
        snr: parseFloat(item.metadata?.M?.snr?.N || "0"),
        source: item.metadata?.M?.source?.S || "P2P",
      };

      return {
        timestamp,
        devEui: metadata.devEui,
        decoded,
        metadata,
      };
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        count: items.length,
        devEui,
        items,
      }),
    };
  } catch (error) {
    console.error("Error reading from DynamoDB:", error);
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

