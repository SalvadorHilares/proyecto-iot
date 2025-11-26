# Guía de Pruebas del API Gateway

Después de hacer `serverless deploy`, obtendrás una URL como:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/telemetry
```

## Ejemplos de CURL

### 1. Payload Normal (Sin Alertas)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01D39C3C00",
    "rssi": -85,
    "snr": 12
  }'
```

**Decodificación del payload `DC01D39C3C00`:**
- Bytes 0-1 (DC01): gas = 476 (little-endian: 0x01DC = 476)
- Byte 2 (D3): temp = 211/2 = 105.5°C (probablemente error, ejemplo)
- Byte 3 (9C): hum = 156% (probablemente error, ejemplo)
- Byte 4 (3C): distance = 60*2 = 120 cm
- Byte 5 (00): flags = 0 (sin alertas)

### 2. Alerta de Fuego (Flag bit 0 = 1)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C01",
    "rssi": -78,
    "snr": 15,
    "devEui": "SENSOR_001"
  }'
```

**Decodificación:**
- gas = 500 (0x01F4)
- temp = 29°C (0x3A / 2)
- hum = 74% (0x4A)
- distance = 120 cm (0x3C * 2)
- flags = 0x01 = fuego activo

### 3. Alerta de Presencia (Flag bit 2 = 1)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01D39C3C04",
    "rssi": -90,
    "snr": 8
  }'
```

**Flags = 0x04** = presencia detectada

### 4. Múltiples Alertas (Fuego + Tala)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C03",
    "rssi": -75,
    "snr": 18,
    "devEui": "SENSOR_002"
  }'
```

**Flags = 0x03** = fuego (bit 0) + tala (bit 1) activos

### 5. Ejemplo Realista (Temperatura 28.5°C, Humedad 82%)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }'
```

**Decodificación:**
- gas = 476 (0x01DC)
- temp = 28.5°C (0x39 = 57, 57/2 = 28.5)
- hum = 82% (0x52)
- distance = 120 cm (0x3C * 2)
- flags = 0x00 (normal)

## Formato del Request

```json
{
  "payload": "AABBCCDDEEFF",  // REQUERIDO: 6 bytes en hexadecimal
  "rssi": -85,                // OPCIONAL: Potencia de recepción en dBm
  "snr": 12,                  // OPCIONAL: Relación señal/ruido en dBm
  "devEui": "SENSOR_001"      // OPCIONAL: Identificador del dispositivo
}
```

## Respuestas Esperadas

### Éxito (200)
```json
{
  "success": true,
  "devEui": "UNKNOWN",
  "timestamp": "2024-11-21T15:37:12.345Z",
  "decoded": {
    "gas": 476,
    "temperature": 28.5,
    "humidity": 82,
    "distanceCm": 120,
    "flags": {
      "fire": false,
      "logging": false,
      "presence": false
    },
    "riskScore": 45.2
  }
}
```

### Error - Payload Inválido (400)
```json
{
  "error": "Invalid hex payload: Invalid hex string length: 4"
}
```

### Error - Falta Payload (400)
```json
{
  "error": "Missing 'payload' field in request body"
}
```

### Error - JSON Inválido (400)
```json
{
  "error": "Invalid JSON in request body"
}
```

## Verificar en DynamoDB

Después de enviar un request exitoso, verifica en DynamoDB:

```bash
aws dynamodb scan \
  --table-name EnvironmentalEvents \
  --limit 5 \
  --region us-east-1
```

O desde la consola de AWS:
1. Ve a DynamoDB → Tables → `EnvironmentalEvents`
2. Click en "Explore table items"
3. Deberías ver los nuevos items con:
   - `pk`: "DEV#UNKNOWN" (o "DEV#SENSOR_001" si especificaste devEui)
   - `sk`: "TS#2024-11-21T15:37:12.345Z"
   - Todos los campos decodificados

## Scripts de Prueba

### Script Completo de Pruebas Básicas

Usa `test-api.sh` para pruebas básicas:
```bash
chmod +x test-api.sh
# Edita el archivo y reemplaza <API_GATEWAY_URL> con tu URL
./test-api.sh
```

### Script de Pruebas de Error y Desconexión

Usa `test-connection-errors.sh` para casos extremos:
```bash
chmod +x test-connection-errors.sh
# Edita el archivo y reemplaza <API_GATEWAY_URL> con tu URL
./test-connection-errors.sh
```

Este script prueba:
- Timeouts de conexión
- URLs incorrectas (404)
- Payloads corruptos
- JSON malformado
- Headers incorrectos
- Rate limiting
- Valores extremos
- Y más casos edge

## Generar Payloads de Prueba

Puedes usar este script Python para generar payloads válidos:

```python
import struct

# Datos de ejemplo
gas = 476          # 0-1023
temp = 28.5        # °C
hum = 82           # 0-100
distance = 120     # cm
flags = 0b00000001 # fuego activo

# Codificar
payload = bytearray(6)
payload[0:2] = struct.pack('<H', gas)  # little-endian uint16
payload[2] = int(temp * 2)              # temp * 2
payload[3] = hum
payload[4] = distance // 2
payload[5] = flags

# Convertir a hex
hex_payload = payload.hex().upper()
print(f'Payload: {hex_payload}')
```

## Casos de Error y Edge Cases

### Error - Payload con Caracteres Inválidos

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "GGHHIIJJKKLL",
    "rssi": -85,
    "snr": 12
  }'
```

**Respuesta esperada (400):**
```json
{
  "error": "Invalid hex payload: Invalid hex string length: 12"
}
```

### Error - Payload Longitud Impar

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEF",
    "rssi": -85,
    "snr": 12
  }'
```

**Respuesta esperada (400):**
```json
{
  "error": "Invalid hex payload: Invalid hex string length: 11"
}
```

### Error - Payload Demasiado Largo

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEFF001122334455",
    "rssi": -85,
    "snr": 12
  }'
```

**Respuesta esperada (400):**
```json
{
  "error": "Payload too short: 12"
}
```
(Nota: El error dice "too short" porque el decoder espera exactamente 6 bytes)

### Error - JSON Malformado

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85
  '
```

**Respuesta esperada (400):**
```json
{
  "error": "Invalid JSON in request body"
}
```

### Error - Body Vacío

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d ''
```

**Respuesta esperada (400):**
```json
{
  "error": "Invalid JSON in request body"
}
```

### Error - Content-Type Incorrecto

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: text/plain" \
  -d 'payload=DC0139523C00'
```

**Respuesta esperada:** API Gateway puede rechazar o retornar error 415/400

### Simulación de Timeout

```bash
# Timeout muy corto (1ms) para simular pérdida de conexión
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  --max-time 0.001 \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }'
```

**Resultado:** Timeout de conexión (curl retorna código de error)

### Payload con Valores Extremos

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "FF03FF7FFF0F",
    "rssi": -200,
    "snr": 200
  }'
```

**Decodificación:**
- gas = 1023 (máximo)
- temp = 127.5°C (extremo)
- hum = 255% (imposible, pero se decodifica)
- distance = 510 cm (máximo)
- flags = 0x0F (todas las alertas)

### Payload con Espacios (debe limpiarse automáticamente)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC 01 39 52 3C 00",
    "rssi": -85,
    "snr": 12
  }'
```

**Resultado:** Debe funcionar (el script limpia espacios automáticamente)

### Payload en Minúsculas

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "dc0139523c00",
    "rssi": -85,
    "snr": 12
  }'
```

**Resultado:** Debe funcionar (se convierte a mayúsculas)

### Método HTTP Incorrecto

```bash
curl -X GET "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json"
```

**Respuesta esperada:** 403 Forbidden o 405 Method Not Allowed

### Temperatura Negativa (codificada correctamente)

```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01F6523C00",
    "rssi": -85,
    "snr": 12
  }'
```

**Decodificación:**
- temp = -10°C (0xF6 = -10 en signed int8, -10/2 = -5°C... espera, revisar)
- Byte 2 = 0xF6 = 246 en unsigned, pero -10 en signed int8
- -10 / 2 = -5°C

## Manejo de Desconexión en el Frontend

Para manejar desconexiones y errores en el frontend, implementa:

### 1. Detección de Timeout

```javascript
fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(5000) // 5 segundos timeout
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.error('Timeout: El servidor no respondió a tiempo');
      // Mostrar alerta de desconexión
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Error de red: Sin conexión a internet');
      // Mostrar alerta de sin conexión
    } else {
      console.error('Error:', error);
    }
  });
```

### 2. Reintentos Automáticos

```javascript
async function sendWithRetry(url, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Si es error 4xx, no reintentar
      if (response.status >= 400 && response.status < 500) {
        const error = await response.json();
        throw new Error(error.error || 'Client error');
      }
      
      // Si es error 5xx, reintentar
      throw new Error(`Server error: ${response.status}`);
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Backoff
    }
  }
}
```

### 3. Estados de Conexión

```javascript
let connectionStatus = 'connected'; // 'connected', 'disconnected', 'reconnecting'

async function checkConnection() {
  try {
    const response = await fetch(apiUrl + '/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    connectionStatus = 'connected';
    return true;
  } catch (error) {
    connectionStatus = 'disconnected';
    return false;
  }
}

// Verificar cada 30 segundos
setInterval(checkConnection, 30000);
```

## Notas

- El payload debe ser exactamente 6 bytes (12 caracteres hex)
- Los valores RSSI y SNR son opcionales pero recomendados
- Si hay alerta de fuego (`flags.fire = true`) y configuraste SNS_TOPIC_ARN, se enviará una notificación
- El `devEui` es opcional, por defecto será "UNKNOWN"
- El script Python limpia automáticamente espacios y convierte a mayúsculas
- Para testing de desconexión, usa `--max-time` en curl o interrumpe la conexión de red

