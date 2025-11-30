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
    const devEui = queryParams.devEui || "LORA_GATEWAY_01";
    const limit = parseInt(queryParams.limit || "10", 10);
    const startTime = queryParams.startTime; // ISO timestamp opcional
    const sensorType = queryParams.sensorType; // "arduino" o "raspberry" (opcional)

    // Validar limit
    const maxLimit = 100;
    const validLimit = Math.min(Math.max(1, limit), maxLimit);

    // Construir la query
    const pk = devEui.startsWith("DEV#") ? devEui : `DEV#${devEui}`;
    
    let queryCommand;
    const expressionAttributeValues = {
      ":pk": { S: pk },
    };

    // Construir KeyConditionExpression
    let keyConditionExpression = "pk = :pk";
    
    if (startTime) {
      keyConditionExpression += " AND sk >= :startTime";
      expressionAttributeValues[":startTime"] = { S: `TS#${startTime}` };
    }

    // Construir FilterExpression para sensorType si se especifica
    let filterExpression = null;
    if (sensorType) {
      filterExpression = "sensorType = :sensorType";
      expressionAttributeValues[":sensorType"] = { S: sensorType };
    }
    
    queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(filterExpression && { FilterExpression: filterExpression }),
      Limit: validLimit,
      ScanIndexForward: false, // Orden descendente (más recientes primero)
    });

    const result = await ddb.send(queryCommand);

    // Convertir items de DynamoDB a formato JSON normal
    const items = (result.Items || []).map((item) => {
      // Extraer campos comunes
      const sk = item.sk?.S || "";
      const timestamp = sk.replace("TS#", "");
      const itemSensorType = item.sensorType?.S || "unknown";
      const snr = parseFloat(item.snr?.N || "0");
      
      // Base item
      const baseItem = {
        pk: item.pk?.S || "",
        sk: sk,
        sensorType: itemSensorType,
        timestamp: item.timestamp?.S || timestamp,
        snr: snr,
      };

      // Decodificar según el tipo de sensor
      if (itemSensorType === "arduino") {
        // Campos específicos de Arduino
        return {
          ...baseItem,
          gas: parseFloat(item.gas?.N || "0"),
          temperature: parseFloat(item.temperature?.N || "0"),
          humidity: parseFloat(item.humidity?.N || "0"),
          flags: {
            fire: item.flags?.M?.fire?.BOOL || false,
            presence: item.flags?.M?.presence?.BOOL || false,
          },
        };
      } else if (itemSensorType === "raspberry") {
        // Campos específicos de Raspberry
        return {
          ...baseItem,
          audioConfidence: parseFloat(item.audioConfidence?.N || "0"),
          audioDanger: item.audioDanger?.BOOL || false,
          audioDb: parseFloat(item.audioDb?.N || "0"),
        };
      } else {
        // Tipo desconocido - retornar todos los campos disponibles
        const unknownItem = { ...baseItem };
        
        // Intentar extraer campos comunes que puedan existir
        if (item.gas) unknownItem.gas = parseFloat(item.gas.N || "0");
        if (item.temperature) unknownItem.temperature = parseFloat(item.temperature.N || "0");
        if (item.humidity) unknownItem.humidity = parseFloat(item.humidity.N || "0");
        if (item.audioConfidence) unknownItem.audioConfidence = parseFloat(item.audioConfidence.N || "0");
        if (item.audioDanger) unknownItem.audioDanger = item.audioDanger.BOOL || false;
        if (item.audioDb) unknownItem.audioDb = parseFloat(item.audioDb.N || "0");
        if (item.flags) {
          unknownItem.flags = {
            fire: item.flags.M?.fire?.BOOL || false,
            presence: item.flags.M?.presence?.BOOL || false,
          };
        }
        
        return unknownItem;
      }
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        count: items.length,
        devEui: devEui.replace("DEV#", ""),
        sensorType: sensorType || "all",
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

