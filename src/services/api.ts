// src/services/api.ts

const API_GATEWAY_URL = "https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev";

export interface DynamoDBItem {
  pk: string;
  sk: string;
  sensorType: "arduino" | "raspberry";
  timestamp: string;
  snr: number;
  // Campos Arduino
  gas?: number;
  temperature?: number;
  humidity?: number;
  flags?: {
    fire: boolean;
    presence: boolean;
  };
  // Campos Raspberry
  audioConfidence?: number;
  audioDanger?: boolean;
  audioDb?: number;
}

export interface TelemetryResponse {
  success: boolean;
  count: number;
  devEui: string;
  sensorType: string;
  items: DynamoDBItem[];
}

/**
 * Obtiene los datos más recientes de telemetría desde DynamoDB
 * @param devEui - Device EUI (ej: "LORA_GATEWAY_01")
 * @param limit - Número máximo de items a retornar (default: 1)
 * @param sensorType - Filtrar por tipo de sensor (opcional)
 */
export async function getTelemetryData(
  devEui: string = "LORA_GATEWAY_01",
  limit: number = 1,
  sensorType?: "arduino" | "raspberry"
): Promise<TelemetryResponse> {
  try {
    const params = new URLSearchParams({
      devEui: devEui,
      limit: limit.toString(),
    });

    if (sensorType) {
      params.append("sensorType", sensorType);
    }

    const response = await fetch(`${API_GATEWAY_URL}/telemetry?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching telemetry data:", error);
    throw error;
  }
}

/**
 * Obtiene el dato más reciente de un tipo de sensor específico
 */
export async function getLatestSensorData(
  devEui: string = "LORA_GATEWAY_01",
  sensorType: "arduino" | "raspberry"
): Promise<DynamoDBItem | null> {
  try {
    const response = await getTelemetryData(devEui, 1, sensorType);
    if (response.items && response.items.length > 0) {
      // El Lambda ya retorna ordenado descendente, tomar el primero
      return response.items[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching latest ${sensorType} data:`, error);
    return null;
  }
}

/**
 * Obtiene todos los datos históricos de un tipo de sensor (hasta 187 elementos)
 * @param devEui - Device EUI
 * @param sensorType - Tipo de sensor
 * @param limit - Límite máximo (default: 187)
 */
export async function getAllSensorData(
  devEui: string = "LORA_GATEWAY_01",
  sensorType: "arduino" | "raspberry",
  limit: number = 187
): Promise<DynamoDBItem[]> {
  try {
    const response = await getTelemetryData(devEui, limit, sensorType);
    if (response.items && response.items.length > 0) {
      // Ordenar por timestamp descendente (más recientes primero)
      return response.items.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error(`Error fetching all ${sensorType} data:`, error);
    return [];
  }
}

