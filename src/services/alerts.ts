// src/services/alerts.ts

const API_GATEWAY_URL = "https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev";

export interface Alert {
  id?: string;
  alertId: string;
  type: "critical" | "warning" | "info";
  status: "active" | "resolved" | "acknowledged";
  title: string;
  description: string;
  sensor: string;
  sensorType: "arduino" | "raspberry" | "unknown";
  currentValue: number | string;
  threshold: number | string;
  unit: string;
  reason: string;
  recommendation: string;
  timestamp: string;
  resolvedAt?: string;
  devEui?: string;
  location?: string;
  severity?: string;
  exceedPercentage?: number;
}

export interface AlertsResponse {
  success: boolean;
  count: number;
  status: string;
  sensorType: string;
  items: Alert[];
}

/**
 * Obtiene alertas desde la API con filtros opcionales
 */
export async function getAlerts(
  status: "active" | "resolved" | "all" = "all",
  sensorType: "arduino" | "raspberry" | "all" = "all",
  limit: number = 50
): Promise<Alert[]> {
  try {
    const params = new URLSearchParams({
      status: status,
      sensorType: sensorType,
      limit: limit.toString(),
    });

    const response = await fetch(`${API_GATEWAY_URL}/alerts?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AlertsResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching alerts:", error);
    throw error;
  }
}

/**
 * Crea una nueva alerta en DynamoDB
 */
export async function createAlert(alert: Partial<Alert>): Promise<{ success: boolean; alertId: string }> {
  try {
    // Validar campos requeridos
    if (!alert.alertId || !alert.timestamp) {
      throw new Error("alertId and timestamp are required");
    }

    const response = await fetch(`${API_GATEWAY_URL}/alerts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alertId: alert.alertId,
        type: alert.type || "info",
        status: alert.status || "active",
        title: alert.title || "",
        description: alert.description || "",
        sensor: alert.sensor || "",
        sensorType: alert.sensorType || "unknown",
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        unit: alert.unit || "",
        reason: alert.reason || "",
        recommendation: alert.recommendation || "",
        timestamp: alert.timestamp,
        devEui: alert.devEui || "LORA_GATEWAY_01",
        location: alert.location,
        severity: alert.severity,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating alert:", error);
    throw error;
  }
}

/**
 * Marca una alerta como resuelta
 */
export async function resolveAlert(alertId: string): Promise<{ success: boolean; alertId: string }> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/alerts/${alertId}/resolve`, {
      method: "PUT",
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
    console.error("Error resolving alert:", error);
    throw error;
  }
}

