const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const ddb = new DynamoDBClient({});
const sns = new SNSClient({});

const TABLE_NAME = process.env.TABLE_NAME || "";
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
  // 1. Configuración CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400"
  };

  if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (!TABLE_NAME) {
    return { statusCode: 500, body: JSON.stringify({ error: "TABLE_NAME missing" }) };
  }

  // 2. Parseo del Body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Verificamos que exista payload
  if (!body.payload || !body.payload.data) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing payload or data" }) };
  }

  // 3. Extracción de datos (Ya vienen limpios desde Python)
  const incoming = body.payload;       // El objeto completo
  const sensorType = incoming.sensor;  // "arduino" o "raspberry"
  const data = incoming.data;          // { gas: 123, temp: 25... }
  
  // Usamos el timestamp de Python o el actual
  const timestamp = incoming.timestamp || new Date().toISOString();
  // ID del dispositivo (puedes pasarlo desde Python o usar genérico)
  const devEui = body.device_id || "LORA_GATEWAY_01"; 

  // Claves de DynamoDB
  const pk = `DEV#${devEui}`;
  const sk = `TS#${timestamp}`; // Cada dato es único por fecha

  // 4. Preparar el ITEM para DynamoDB
  // Inicializamos un objeto base
  let dbItem = {
    pk: { S: pk },
    sk: { S: sk },
    sensorType: { S: sensorType },
    timestamp: { S: timestamp },
    // Metadata común
    snr: { N: (data.snr || 0).toString() } 
  };

  // 5. Lógica Específica por Sensor
  let isFireEmergency = false;
  let messageSNS = "";

  if (sensorType === 'arduino') {
    // --- LÓGICA ARDUINO ---
    
    // Calculamos RiskScore aquí (o en Python, pero aquí es seguro)
    // Formula aproximada basada en tus datos previos
    const deltaGas = Math.max(0, (data.gas || 0) - 300);
    const deltaTemp = Math.max(0, (data.temperatura || 0) - 26);
    let riskScore = (2.5 * deltaGas) + (2.0 * deltaTemp);
    
    dbItem = {
      ...dbItem,
      gas: { N: (data.gas || 0).toString() },
      temperature: { N: (data.temperatura || 0).toString() },
      humidity: { N: (data.humedad || 0).toString() },
      riskScore: { N: riskScore.toFixed(2) },
      flags: {
        M: {
          fire: { BOOL: data.fuego === 1 },
          presence: { BOOL: data.presencia === 1 }
        }
      }
    };

    // Detectar emergencia para SNS
    if (data.fuego === 1) {
      isFireEmergency = true;
      messageSNS = `🔥 ALERTA DE INCENDIO (Arduino)\nGas: ${data.gas}\nTemp: ${data.temperatura}°C`;
    }

  } else if (sensorType === 'raspberry') {
    // --- LÓGICA RASPBERRY ---
    
    dbItem = {
      ...dbItem,
      audioClass: { N: (data.clase_detectada || 0).toString() },
      audioConfidence: { N: (data.confianza || 0).toString() },
      audioDb: { N: (data.volumen_db || 0).toString() }
    };

    // Si quieres alertas por sonido alto (ej. > 80dB)
    /* if (data.volumen_db > 80) {
       isFireEmergency = true;
       messageSNS = `🔊 ALERTA SONORA (Raspberry)\nNivel: ${data.volumen_db} dB`;
    } 
    */
  }

  // 6. Guardar en DynamoDB
  try {
    const putCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: dbItem,
    });
    await ddb.send(putCommand);
    console.log(`✅ Item guardado: ${sensorType}`);

    // 7. Enviar Alerta SNS (Si aplica)
    if (SNS_TOPIC_ARN && isFireEmergency) {
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: `🚨 ALERTA - ${devEui}`,
        Message: messageSNS,
      }));
      console.log("✅ Alerta SNS enviada");
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, id: sk })
    };

  } catch (err) {
    console.error("Error DB/SNS:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};