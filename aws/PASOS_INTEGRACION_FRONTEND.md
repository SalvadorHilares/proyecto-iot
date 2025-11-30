# Pasos para Integrar Frontend con Datos Reales de DynamoDB

## ✅ Cambios Realizados en el Backend

### 1. Lambda de Lectura Actualizado (`lambda-telemetry-reader.js`)

**Cambios implementados:**
- ✅ Agregado filtro por `sensorType` (parámetro opcional en query string)
- ✅ Decodificación correcta de campos según tipo de sensor:
  - **Arduino**: `gas`, `temperature`, `humidity`, `flags: { fire, presence }`, `snr`
  - **Raspberry**: `audioConfidence`, `audioDanger`, `audioDb`, `snr`
- ✅ Retorna estructura plana compatible con el frontend
- ✅ Soporta parámetros: `devEui`, `limit`, `startTime`, `sensorType`

**Formato de respuesta:**
```json
{
  "success": true,
  "count": 1,
  "devEui": "LORA_GATEWAY_01",
  "sensorType": "arduino",
  "items": [
    {
      "pk": "DEV#LORA_GATEWAY_01",
      "sk": "TS#2025-11-28 21:45:40",
      "sensorType": "arduino",
      "timestamp": "2025-11-28 21:45:40",
      "snr": 12,
      "gas": 166.4,
      "temperature": 24.2,
      "humidity": 70,
      "flags": {
        "fire": false,
        "presence": true
      }
    }
  ]
}
```

---

## 📋 Pasos para Integrar el Frontend

### Paso 1: Crear Servicio API

**Archivo:** `proyecto-iot/src/services/api.ts`

```typescript
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
```

---

### Paso 2: Actualizar `Index.tsx` - Reemplazar Datos Simulados

**Archivo:** `proyecto-iot/src/pages/Index.tsx`

#### 2.1. Agregar imports

```typescript
import { getLatestSensorData, DynamoDBItem } from "@/services/api";
```

#### 2.2. Agregar estados para conexión

```typescript
const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("connected");
const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
const [arduinoLastUpdate, setArduinoLastUpdate] = useState<Date | null>(null);
const [raspberryLastUpdate, setRaspberryLastUpdate] = useState<Date | null>(null);
```

#### 2.3. Crear funciones de transformación

```typescript
// Función para transformar datos de Arduino al formato del frontend
const transformArduinoData = (item: DynamoDBItem | null) => {
  if (!item || item.sensorType !== "arduino") return null;

  return {
    temperature: {
      value: item.temperature || 0,
      unit: "°C",
      status: item.temperature && item.temperature > 35 ? "alert" : 
              item.temperature && item.temperature > 30 ? "warning" : "normal",
      trend: "stable" as const
    },
    humidity: {
      value: item.humidity || 0,
      unit: "%",
      status: item.humidity && item.humidity < 50 ? "warning" : "normal",
      trend: "stable" as const
    },
    smoke: {
      value: item.gas || 0,
      unit: "ppm",
      status: item.gas && item.gas > 50 ? "alert" : 
              item.gas && item.gas > 30 ? "warning" : "normal",
      trend: "stable" as const
    },
    infrared: {
      value: item.flags?.presence ? "Activo" : "Inactivo",
      status: item.flags?.presence ? "alert" : "normal",
      detections: item.flags?.presence ? 1 : 0
    }
  };
};

// Función para transformar datos de Raspberry al formato del frontend
const transformRaspberryData = (item: DynamoDBItem | null) => {
  if (!item || item.sensorType !== "raspberry") return null;

  return {
    sound: {
      value: item.audioDb || 0,
      unit: "dB",
      status: item.audioDanger ? "alert" : 
              item.audioDb && item.audioDb > 60 ? "warning" : "normal",
      trend: "stable" as const
    }
  };
};
```

#### 2.4. Reemplazar useEffect de simulación con llamadas reales

**Eliminar este bloque:**
```typescript
// Simulación de actualización de datos en tiempo real
useEffect(() => {
  const interval = setInterval(() => {
    setSensorData(prev => ({
      // ... código de simulación
    }));
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**Reemplazar con:**

```typescript
// Función para obtener y actualizar datos de Arduino (cada 2 segundos)
useEffect(() => {
  const fetchArduinoData = async () => {
    try {
      const data = await getLatestSensorData("LORA_GATEWAY_01", "arduino");
      if (data) {
        const transformed = transformArduinoData(data);
        if (transformed) {
          setSensorData(prev => ({
            ...prev,
            ...transformed
          }));
          setArduinoLastUpdate(new Date());
          setLastUpdate(new Date());
          setConnectionStatus("connected");
        }
      } else {
        // No hay datos disponibles
        setConnectionStatus("disconnected");
      }
    } catch (error) {
      console.error("Error fetching Arduino data:", error);
      setConnectionStatus("error");
    }
  };

  // Primera carga inmediata
  fetchArduinoData();

  // Actualizar cada 2 segundos
  const interval = setInterval(fetchArduinoData, 2000);

  return () => clearInterval(interval);
}, []);

// Función para obtener y actualizar datos de Raspberry (cada 5 segundos)
useEffect(() => {
  const fetchRaspberryData = async () => {
    try {
      const data = await getLatestSensorData("LORA_GATEWAY_01", "raspberry");
      if (data) {
        const transformed = transformRaspberryData(data);
        if (transformed) {
          setSensorData(prev => ({
            ...prev,
            ...transformed
          }));
          setRaspberryLastUpdate(new Date());
          setLastUpdate(new Date());
          setConnectionStatus("connected");
        }
      } else {
        // No hay datos disponibles
        setConnectionStatus("disconnected");
      }
    } catch (error) {
      console.error("Error fetching Raspberry data:", error);
      setConnectionStatus("error");
    }
  };

  // Primera carga inmediata
  fetchRaspberryData();

  // Actualizar cada 5 segundos
  const interval = setInterval(fetchRaspberryData, 5000);

  return () => clearInterval(interval);
}, []);
```

#### 2.5. Agregar indicador de estado de conexión en el header

**En el header, agregar después del botón de Guardabosques:**

```typescript
<Badge 
  variant={connectionStatus === "connected" ? "default" : "destructive"} 
  className="gap-2"
>
  <div className={`w-2 h-2 rounded-full ${
    connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
  }`} />
  {connectionStatus === "connected" ? "Conectado" : "Desconectado"}
  {lastUpdate && (
    <span className="text-xs ml-2">
      {new Date(lastUpdate).toLocaleTimeString()}
    </span>
  )}
</Badge>
```

---

### Paso 3: Actualizar Sistema de Alertas Basado en Datos Reales

**Modificar el useEffect de alertas simuladas:**

```typescript
// Detectar alertas basadas en datos reales
useEffect(() => {
  const checkAlerts = () => {
    const alerts: any[] = [];

    // Alerta de temperatura crítica
    if (sensorData.temperature.value > 35) {
      alerts.push({
        id: `temp-alert-${Date.now()}`,
        title: "🔥 Temperatura Crítica Detectada",
        description: "Sensor de temperatura excede límites seguros",
        sensor: "Sensor DHT22 - Temperatura",
        currentValue: sensorData.temperature.value,
        threshold: 35,
        unit: "°C",
        reason: `La temperatura ha alcanzado ${sensorData.temperature.value}°C, superando el umbral crítico de 35°C en ${(sensorData.temperature.value - 35).toFixed(1)}°C (${((sensorData.temperature.value - 35) / 35 * 100).toFixed(1)}% de exceso). Este nivel térmico representa un riesgo inmediato para el ecosistema.`,
        recommendation: "ACCIÓN INMEDIATA: Activar protocolo de emergencia térmica. Desplegar equipo de guardabosques al sector afectado.",
        severity: "critical" as const,
        icon: Thermometer,
        timestamp: new Date(),
      });
    }

    // Alerta de humo/gas
    if (sensorData.smoke.value > 50) {
      alerts.push({
        id: `smoke-alert-${Date.now()}`,
        title: "💨 Calidad de Aire Crítica",
        description: "Concentración peligrosa de partículas",
        sensor: "Sensor MQ-135 - Calidad de Aire",
        currentValue: sensorData.smoke.value,
        threshold: 50,
        unit: "ppm",
        reason: `El sensor ha detectado ${sensorData.smoke.value} ppm de partículas contaminantes, superando el umbral seguro de 50 ppm en un ${((sensorData.smoke.value - 50) / 50 * 100).toFixed(1)}%.`,
        recommendation: "ALERTA MÁXIMA: Activar protocolo de respuesta a incendios. Contactar con bomberos forestales.",
        severity: "critical" as const,
        icon: Flame,
        timestamp: new Date(),
      });
    }

    // Alerta de presencia (infrarrojo)
    if (sensorData.infrared.value === "Activo" && sensorData.infrared.detections > 0) {
      alerts.push({
        id: `presence-alert-${Date.now()}`,
        title: "🚨 Detección de Movimiento",
        description: "Actividad detectada en zona protegida",
        sensor: "Sensor Infrarrojo PIR",
        currentValue: "Detección activa",
        threshold: "Sin actividad",
        unit: "",
        reason: `Se ha detectado movimiento en una zona de alta protección. ${sensorData.infrared.detections} detección(es) registrada(s).`,
        recommendation: "Desplegar patrulla de guardabosques inmediatamente. Activar cámaras de vigilancia remotas.",
        severity: "critical" as const,
        icon: Radio,
        timestamp: new Date(),
      });
    }

    // Alerta de sonido peligroso (Raspberry)
    if (sensorData.sound.value > 80) {
      alerts.push({
        id: `sound-alert-${Date.now()}`,
        title: "🔊 Nivel Sonoro Crítico",
        description: "Sonido peligroso detectado",
        sensor: "Sensor Acústico - Raspberry",
        currentValue: sensorData.sound.value,
        threshold: 80,
        unit: "dB",
        reason: `Se ha detectado un nivel sonoro de ${sensorData.sound.value} dB, superando el umbral seguro de 80 dB.`,
        recommendation: "Investigar fuente del sonido. Posible actividad no autorizada o emergencia.",
        severity: "warning" as const,
        icon: Volume2,
        timestamp: new Date(),
      });
    }

    // Procesar alertas críticas
    alerts.forEach(alert => {
      if (alert.severity === "critical") {
        setCriticalAlert(alert);
        setShowCriticalModal(true);
        setAlertCount(prev => prev + 1);
      } else if (alert.severity === "warning") {
        setWarnings(prev => [...prev, {
          id: alert.id,
          message: alert.description,
          sensor: alert.sensor,
          value: `${alert.currentValue}${alert.unit}`,
          timestamp: new Date(),
        }]);
        setAlertCount(prev => prev + 1);
      }
    });
  };

  // Verificar alertas cada vez que cambien los datos
  checkAlerts();
}, [sensorData]);
```

---

### Paso 4: Crear Directorio de Servicios

**Asegurarse de que existe el directorio:**
```bash
mkdir -p proyecto-iot/src/services
```

---

### Paso 5: Verificar URL del API Gateway

**IMPORTANTE:** Actualizar la URL en `src/services/api.ts` si es diferente:
```typescript
const API_GATEWAY_URL = "https://TU-API-GATEWAY-URL.execute-api.us-east-1.amazonaws.com/dev";
```

---

## 🧪 Testing

### 1. Probar el endpoint GET manualmente

```bash
# Obtener último dato de Arduino
curl "https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev/telemetry?devEui=LORA_GATEWAY_01&limit=1&sensorType=arduino"

# Obtener último dato de Raspberry
curl "https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev/telemetry?devEui=LORA_GATEWAY_01&limit=1&sensorType=raspberry"
```

### 2. Verificar en el navegador

1. Abrir DevTools (F12)
2. Ir a la pestaña "Network"
3. Verificar que las llamadas a `/telemetry` se realizan cada 2s (Arduino) y 5s (Raspberry)
4. Verificar que los datos se actualizan en el dashboard

---

## 📝 Checklist de Implementación

- [ ] Crear `src/services/api.ts`
- [ ] Actualizar `src/pages/Index.tsx`:
  - [ ] Agregar imports del servicio API
  - [ ] Agregar estados de conexión
  - [ ] Crear funciones de transformación
  - [ ] Reemplazar useEffect de simulación
  - [ ] Agregar indicador de estado
  - [ ] Actualizar sistema de alertas
- [ ] Verificar URL del API Gateway
- [ ] Probar en desarrollo (`npm run dev`)
- [ ] Verificar que los datos se actualizan correctamente
- [ ] Verificar que las alertas se generan cuando corresponda

---

## 🚀 Despliegue

Una vez que todo funcione en desarrollo:

1. **Build del frontend:**
   ```bash
   npm run build
   ```

2. **Desplegar backend (si hiciste cambios):**
   ```bash
   cd aws
   npm run deploy
   ```

3. **Desplegar frontend** (según tu método de hosting)

---

## ⚠️ Notas Importantes

1. **Frecuencias de actualización:**
   - Arduino: cada 2 segundos
   - Raspberry: cada 5 segundos

2. **Manejo de errores:**
   - Si no hay datos, el estado cambia a "disconnected"
   - Si hay error de red, el estado cambia a "error"
   - Los datos anteriores se mantienen hasta que haya nuevos datos

3. **Optimización:**
   - Considera agregar un debounce si hay demasiadas actualizaciones
   - Considera usar React Query o SWR para mejor manejo de caché

4. **CORS:**
   - El Lambda ya tiene CORS configurado para `*`
   - Si tienes problemas, verifica la configuración en `serverless.yml`

