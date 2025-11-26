const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const ddb = new DynamoDBClient({});
const sns = new SNSClient({});

const TABLE_NAME = process.env.TABLE_NAME || "";
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const decodePayload = (buffer) => {
  if (buffer.length < 6) {
    throw new Error(`Payload too short: ${buffer.length}`);
  }

  const gas = buffer.readUInt16LE(0);
  const tempHalfDegrees = buffer.readInt8(2);
  const humidity = buffer.readUInt8(3);
  const distanceCm = buffer.readUInt8(4) * 2;
  const flagsByte = buffer.readUInt8(5);

  const flags = {
    fire: (flagsByte & 0b00000001) > 0,
    logging: (flagsByte & 0b00000010) > 0,
    presence: (flagsByte & 0b00000100) > 0,
  };

  // Same risk score logic as Arduino (approximation)
  const baseGas = 300; // adjust based on calibration
  const baseTemp = 26;
  const baseHum = 85;

  const deltaGas = Math.max(0, gas - baseGas);
  const deltaTemp = Math.max(0, tempHalfDegrees / 2 - baseTemp);
  const deltaHum = Math.max(0, baseHum - humidity);
  let riskScore = 2.5 * deltaGas + 2.0 * deltaTemp + 1.0 * deltaHum;
  if (deltaTemp > 2 && deltaHum > 5) {
    riskScore += 20;
  }

  return {
    gas,
    temperature: tempHalfDegrees / 2,
    humidity,
    distanceCm,
    flags,
    riskScore: Number(riskScore.toFixed(2)),
  };
};

// Helper to convert hex string to Buffer
const hexToBuffer = (hex) => {
  // Remove any whitespace or separators
  const cleanHex = hex.replace(/\s+/g, "").toUpperCase();
  if (cleanHex.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${cleanHex.length}`);
  }
  return Buffer.from(cleanHex, "hex");
};

exports.handler = async (event) => {
  if (!TABLE_NAME) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "TABLE_NAME env var is required" }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON in request body" }),
    };
  }

  if (!requestBody.payload) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing 'payload' field in request body" }),
    };
  }

  let payloadBuffer;
  try {
    payloadBuffer = hexToBuffer(requestBody.payload);
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Invalid hex payload: ${error.message || error}` }),
    };
  }

  const decoded = decodePayload(payloadBuffer);
  const devEui = requestBody.devEui || "UNKNOWN";

  const timestamp = new Date().toISOString();
  const pk = `DEV#${devEui}`;
  const sk = `TS#${timestamp}`;

  const putCommand = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: { S: pk },
      sk: { S: sk },
      gas: { N: decoded.gas.toString() },
      temperature: { N: decoded.temperature.toString() },
      humidity: { N: decoded.humidity.toString() },
      distanceCm: { N: decoded.distanceCm.toString() },
      riskScore: { N: decoded.riskScore.toString() },
      flags: {
        M: {
          fire: { BOOL: decoded.flags.fire },
          logging: { BOOL: decoded.flags.logging },
          presence: { BOOL: decoded.flags.presence },
        },
      },
      metadata: {
        M: {
          devEui: { S: devEui },
          rssi: { N: ((requestBody.rssi || 0)).toString() },
          snr: { N: ((requestBody.snr || 0)).toString() },
          source: { S: "P2P" }, // Indicates this came from P2P, not LoRaWAN
        },
      },
    },
  });

  await ddb.send(putCommand);

  if (SNS_TOPIC_ARN && decoded.flags.fire) {
    const message = `🔥 Alerta crítica detectada\n` +
      `Dispositivo: ${devEui}\n` +
      `Gas: ${decoded.gas}\n` +
      `Temp: ${decoded.temperature}°C\n` +
      `Humedad: ${decoded.humidity}%\n` +
      `RiskScore: ${decoded.riskScore}`;

    await sns.send(new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Subject: `🔥 Alerta de incendio - ${devEui}`,
      Message: message,
    }));
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      devEui,
      timestamp,
      decoded,
    }),
  };
};

