# Propuesta: Sistema de Alertas con DynamoDB

## 📊 Análisis del Sistema Actual

### Estado Actual
- **AlertsPanel**: Usa datos mock/hardcodeados en el frontend
- **Alertas en tiempo real**: Se generan dinámicamente en `Index.tsx` pero no se persisten
- **Problema**: Las alertas se pierden al recargar la página o no se pueden consultar históricamente

### Necesidades Identificadas
1. **Persistencia**: Guardar alertas generadas para consulta histórica
2. **Estado**: Marcar alertas como resueltas/pendientes
3. **Historial**: Ver alertas pasadas y su resolución
4. **Notificaciones**: Diferenciar entre alertas críticas y notificaciones simples

---

## 🎯 Propuesta de Solución

### Opción 1: Tabla DynamoDB Separada (RECOMENDADA)

#### Estructura de la Tabla: `Alerts`

**Clave de Partición (PK)**: `ALERT#<alertId>`
**Clave de Ordenación (SK)**: `TS#<timestamp>`

**Atributos:**
```json
{
  "pk": "ALERT#temp-alert-1234567890",
  "sk": "TS#2025-11-28T21:45:40Z",
  "alertId": "temp-alert-1234567890",
  "type": "critical" | "warning" | "info",
  "status": "active" | "resolved" | "acknowledged",
  "title": "🔥 Temperatura Crítica Detectada",
  "description": "Sensor de temperatura excede límites seguros",
  "sensor": "Sensor DHT22 - Temperatura",
  "sensorType": "arduino" | "raspberry",
  "currentValue": 45.2,
  "threshold": 35,
  "unit": "°C",
  "reason": "La temperatura ha alcanzado...",
  "recommendation": "ACCIÓN INMEDIATA: ...",
  "severity": "critical",
  "timestamp": "2025-11-28T21:45:40Z",
  "resolvedAt": null,
  "resolvedBy": null,
  "devEui": "LORA_GATEWAY_01",
  "location": "Sector B3 - Zona Norte"
}
```

#### Índice Global Secundario (GSI)

**GSI1: Por Estado y Timestamp**
- PK: `STATUS#<status>` (ej: `STATUS#active`)
- SK: `TS#<timestamp>`
- Permite consultar alertas activas ordenadas por fecha

**GSI2: Por Tipo de Sensor**
- PK: `SENSOR#<sensorType>` (ej: `SENSOR#arduino`)
- SK: `TS#<timestamp>`
- Permite consultar alertas por tipo de sensor

---

### Opción 2: Agregar a la Tabla Existente (ALTERNATIVA)

Agregar un atributo `alerts` como lista en cada registro de telemetría, pero esto:
- ❌ Duplica datos
- ❌ Hace consultas más complejas
- ❌ No permite consultar alertas independientemente

**No recomendado** para este caso.

---

## 🔧 Implementación Propuesta

### Backend (Lambda Functions)

#### 1. Lambda: `createAlert`
**Endpoint**: `POST /alerts`

**Función**: Crear nueva alerta cuando se detecta un evento crítico

```javascript
// lambda-create-alert.js
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const alert = {
    pk: { S: `ALERT#${body.alertId}` },
    sk: { S: `TS#${body.timestamp}` },
    alertId: { S: body.alertId },
    type: { S: body.type },
    status: { S: "active" },
    // ... resto de campos
  };
  
  await ddb.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: alert
  }));
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
```

#### 2. Lambda: `getAlerts`
**Endpoint**: `GET /alerts`

**Parámetros de query**:
- `status`: `active` | `resolved` | `all`
- `sensorType`: `arduino` | `raspberry` | `all`
- `limit`: número de resultados (default: 50)
- `startTime`: timestamp opcional para paginación

**Función**: Consultar alertas con filtros

```javascript
// lambda-get-alerts.js
exports.handler = async (event) => {
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status || "active";
  
  // Usar GSI1 para consultar por estado
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "GSI1-Status-Timestamp",
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `STATUS#${status}` }
    },
    ScanIndexForward: false, // Más recientes primero
    Limit: parseInt(queryParams.limit || "50")
  }));
  
  return { statusCode: 200, body: JSON.stringify({ items: result.Items }) };
};
```

#### 3. Lambda: `resolveAlert`
**Endpoint**: `PUT /alerts/{alertId}/resolve`

**Función**: Marcar alerta como resuelta

```javascript
// lambda-resolve-alert.js
exports.handler = async (event) => {
  const alertId = event.pathParameters.alertId;
  
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: { S: `ALERT#${alertId}` },
      sk: { S: `TS#${timestamp}` } // Necesitarías obtener el SK original
    },
    UpdateExpression: "SET #status = :status, resolvedAt = :resolvedAt",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":status": { S: "resolved" },
      ":resolvedAt": { S: new Date().toISOString() }
    }
  }));
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
```

---

### Frontend

#### 1. Servicio API (`src/services/alerts.ts`)

```typescript
export interface Alert {
  alertId: string;
  type: "critical" | "warning" | "info";
  status: "active" | "resolved" | "acknowledged";
  title: string;
  description: string;
  sensor: string;
  sensorType: "arduino" | "raspberry";
  currentValue: number | string;
  threshold: number | string;
  unit: string;
  reason: string;
  recommendation: string;
  timestamp: string;
  resolvedAt?: string;
}

export async function getAlerts(
  status?: "active" | "resolved" | "all",
  sensorType?: "arduino" | "raspberry" | "all",
  limit: number = 50
): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (sensorType) params.append("sensorType", sensorType);
  params.append("limit", limit.toString());
  
  const response = await fetch(`${API_GATEWAY_URL}/alerts?${params}`);
  const data = await response.json();
  return data.items;
}

export async function createAlert(alert: Partial<Alert>): Promise<void> {
  await fetch(`${API_GATEWAY_URL}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alert)
  });
}

export async function resolveAlert(alertId: string): Promise<void> {
  await fetch(`${API_GATEWAY_URL}/alerts/${alertId}/resolve`, {
    method: "PUT"
  });
}
```

#### 2. Actualizar `Index.tsx`

Cuando se detecta una alerta, guardarla en DynamoDB:

```typescript
// En el useEffect de checkAlerts
alerts.forEach(async (alert) => {
  if (alert.severity === "critical") {
    // Guardar en DynamoDB
    await createAlert({
      ...alert,
      alertId: alert.id,
      status: "active",
      timestamp: new Date().toISOString()
    });
    
    // Mostrar modal
    setCriticalAlert(alert);
    setShowCriticalModal(true);
  }
});
```

#### 3. Actualizar `AlertsPanel.tsx`

Cargar alertas desde DynamoDB en lugar de datos mock:

```typescript
useEffect(() => {
  const loadAlerts = async () => {
    const alerts = await getAlerts("active", "all", 50);
    setAlerts(alerts);
  };
  loadAlerts();
  
  // Refrescar cada 30 segundos
  const interval = setInterval(loadAlerts, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 📋 Cambios Necesarios en Backend

### 1. Actualizar `serverless.yml`

```yaml
functions:
  # ... funciones existentes ...
  
  createAlert:
    handler: lambda-create-alert.handler
    events:
      - http:
          path: alerts
          method: post
          cors: true
  
  getAlerts:
    handler: lambda-get-alerts.handler
    events:
      - http:
          path: alerts
          method: get
          cors: true
  
  resolveAlert:
    handler: lambda-resolve-alert.handler
    events:
      - http:
          path: alerts/{alertId}/resolve
          method: put
          cors: true

resources:
  Resources:
    # ... tabla existente ...
    
    AlertsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.alertsTableName}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: pk
            AttributeType: S
          - AttributeName: sk
            AttributeType: S
          - AttributeName: status
            AttributeType: S
          - AttributeName: sensorType
            AttributeType: S
        KeySchema:
          - AttributeName: pk
            KeyType: HASH
          - AttributeName: sk
            KeyType: RANGE
        GlobalSecondaryIndexes:
          - IndexName: GSI1-Status-Timestamp
            KeySchema:
              - AttributeName: status
                KeyType: HASH
              - AttributeName: sk
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
          - IndexName: GSI2-SensorType-Timestamp
            KeySchema:
              - AttributeName: sensorType
                KeyType: HASH
              - AttributeName: sk
                KeyType: RANGE
            Projection:
              ProjectionType: ALL
```

---

## ✅ Ventajas de esta Solución

1. **Persistencia**: Las alertas se guardan y no se pierden
2. **Historial**: Puedes consultar alertas pasadas
3. **Estado**: Saber qué alertas están activas/resueltas
4. **Escalable**: Fácil agregar más filtros o funcionalidades
5. **Separación**: Alertas separadas de telemetría (mejor organización)

---

## 🚀 Plan de Implementación

### Fase 1: Backend (Rama backend)
1. Crear tabla DynamoDB `Alerts`
2. Crear Lambda `createAlert`
3. Crear Lambda `getAlerts`
4. Crear Lambda `resolveAlert`
5. Actualizar `serverless.yml`
6. Desplegar

### Fase 2: Frontend (Rama frontend)
1. Crear `src/services/alerts.ts`
2. Actualizar `Index.tsx` para guardar alertas
3. Actualizar `AlertsPanel.tsx` para cargar desde API
4. Probar integración completa

---

## 📝 Notas Importantes

- **Costo**: DynamoDB Pay-Per-Request es muy económico para este volumen
- **Rendimiento**: Las consultas con GSI son rápidas
- **CORS**: Ya está configurado en los Lambdas existentes
- **Seguridad**: Considerar agregar autenticación si es necesario

---

## ❓ Preguntas para Decidir

1. ¿Necesitas autenticación para resolver alertas? No es necesario por el momento.
2. ¿Quieres notificaciones push/email cuando hay alertas críticas? No es necesario por el momento.
3. ¿Necesitas exportar alertas a CSV/PDF? No es necesario por el momento.
4. ¿Quieres dashboard de estadísticas de alertas? Si, lo necesito para poder ver los datos de las alertas, KPIs, etc.

