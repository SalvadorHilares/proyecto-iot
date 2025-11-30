const { DynamoDBClient, QueryCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");

const ddb = new DynamoDBClient({});

const ALERTS_TABLE_NAME = process.env.ALERTS_TABLE_NAME || "";

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
    // Obtener parámetros de query string
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || "all";
    const sensorType = queryParams.sensorType || "all";
    const limit = Math.min(parseInt(queryParams.limit || "50", 10), 100);
    const startTime = queryParams.startTime;

    let result;

    if (status !== "all") {
      // Consultar por estado usando GSI1
      const queryParams = {
        TableName: ALERTS_TABLE_NAME,
        IndexName: "GSI1-Status-Timestamp",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": { S: status },
        },
        ScanIndexForward: false, // Más recientes primero
        Limit: limit,
      };

      // Si también se filtra por sensorType, agregar FilterExpression
      if (sensorType !== "all") {
        queryParams.FilterExpression = "sensorType = :sensorType";
        queryParams.ExpressionAttributeValues[":sensorType"] = { S: sensorType };
      }

      result = await ddb.send(new QueryCommand(queryParams));
    } else if (sensorType !== "all") {
      // Consultar por sensorType usando GSI2
      const queryParams = {
        TableName: ALERTS_TABLE_NAME,
        IndexName: "GSI2-SensorType-Timestamp",
        KeyConditionExpression: "sensorType = :sensorType",
        ExpressionAttributeValues: {
          ":sensorType": { S: sensorType },
        },
        ScanIndexForward: false, // Más recientes primero
        Limit: limit,
      };

      result = await ddb.send(new QueryCommand(queryParams));
    } else {
      // Obtener todas las alertas (limitadas) - usar Scan
      const scanParams = {
        TableName: ALERTS_TABLE_NAME,
        Limit: limit,
      };

      result = await ddb.send(new ScanCommand(scanParams));
    }

    // Convertir items de DynamoDB a formato JSON normal
    const items = (result.Items || []).map((item) => {
      const alert = {
        id: item.alertId?.S || "",
        alertId: item.alertId?.S || "",
        type: item.type?.S || "info",
        status: item.status?.S || "active",
        title: item.title?.S || "",
        description: item.description?.S || "",
        sensor: item.sensor?.S || "",
        sensorType: item.sensorType?.S || "unknown",
        timestamp: item.timestamp?.S || "",
        reason: item.reason?.S || "",
        recommendation: item.recommendation?.S || "",
        devEui: item.devEui?.S || "LORA_GATEWAY_01",
      };

      // Decodificar valores numéricos o string
      if (item.currentValue?.N) {
        alert.currentValue = parseFloat(item.currentValue.N);
      } else if (item.currentValue?.S) {
        alert.currentValue = item.currentValue.S;
      }

      if (item.threshold?.N) {
        alert.threshold = parseFloat(item.threshold.N);
      } else if (item.threshold?.S) {
        alert.threshold = item.threshold.S;
      }

      if (item.unit) {
        alert.unit = item.unit.S;
      }

      if (item.location) {
        alert.location = item.location.S;
      }

      if (item.severity) {
        alert.severity = item.severity.S;
      }

      // Calcular porcentaje de exceso si es posible
      if (
        typeof alert.currentValue === "number" &&
        typeof alert.threshold === "number"
      ) {
        alert.exceedPercentage =
          ((alert.currentValue - alert.threshold) / alert.threshold) * 100;
      }

      return alert;
    });

    // Ordenar por timestamp descendente (más recientes primero)
    items.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        count: items.length,
        status: status,
        sensorType: sensorType,
        items: items,
      }),
    };
  } catch (error) {
    console.error("Error reading alerts from DynamoDB:", error);
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

