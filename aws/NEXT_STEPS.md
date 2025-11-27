# Próximos Pasos - API Gateway Desplegado ✅

## ✅ Estado Actual

- **API Gateway URL**: `https://zv4065j3ui.execute-api.us-east-1.amazonaws.com/dev/telemetry`
- **Lambda Function**: `amazonia-monitor-lorawan-dev-uplinkProcessor`
- **DynamoDB Table**: `EnvironmentalEvents` (creada automáticamente)

## 1. Probar el API Gateway con CURL

### Test Básico (Payload Normal)

```bash
curl -X POST "https://zv4065j3ui.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }'
```

**Respuesta esperada (200):**
```json
{
  "success": true,
  "devEui": "UNKNOWN",
  "timestamp": "2024-11-21T...",
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

### Test con Alerta de Fuego

```bash
curl -X POST "https://zv4065j3ui.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C01",
    "rssi": -78,
    "snr": 15,
    "devEui": "SENSOR_001"
  }'
```

### Usar Scripts de Prueba

```bash
# Pruebas básicas
chmod +x test-api.sh
./test-api.sh

# Pruebas de error y desconexión
chmod +x test-connection-errors.sh
./test-connection-errors.sh
```

## 2. Verificar Datos en DynamoDB

### Desde AWS CLI

```bash
aws dynamodb scan \
  --table-name EnvironmentalEvents \
  --limit 5 \
  --region us-east-1
```

### Desde AWS Console

1. Ve a **DynamoDB** → **Tables** → `EnvironmentalEvents`
2. Click en **"Explore table items"**
3. Deberías ver los items con:
   - `pk`: "DEV#UNKNOWN" (o "DEV#SENSOR_001")
   - `sk`: "TS#2024-11-21T..."
   - Todos los campos decodificados

## 3. Configurar el Script Python Receptor

El script `receiver-script.py` ya tiene la URL configurada. Solo necesitas:

### Instalar Dependencias

```bash
pip install -r requirements.txt
```

### Configurar Puerto Serial

Edita `receiver-script.py` y cambia:
```python
SERIAL_PORT = "COM3"  # Windows: COM3, Linux: /dev/ttyUSB0
```

### Ejecutar el Script

```bash
python receiver-script.py
```

El script:
- Lee del puerto serial donde está conectado el RAK3172 receptor
- Parsea mensajes en formato `EVT:RXP2P:POT:SNR:PAYLOAD`
- Decodifica el payload hexadecimal
- Calcula el riskScore
- Envía POST al API Gateway
- Registra todo en `receiver.log`

## 4. Ver Logs de Lambda

```bash
# Ver logs en tiempo real
npm run logs

# O con serverless directamente
npx serverless logs -f uplinkProcessor -t
```

## 5. Información del Stack

```bash
npm run info
```

Muestra:
- Endpoints
- Functions
- Resources (DynamoDB table, etc.)

## 6. Flujo Completo

```
Arduino → Raspberry Pi (UART) → RAK3172 TX (P2P)
                                    ↓
                            RAK3172 RX (P2P)
                                    ↓
                          receiver-script.py
                                    ↓
                          API Gateway (POST /telemetry)
                                    ↓
                          Lambda (decodifica + guarda)
                                    ↓
                          DynamoDB (EnvironmentalEvents)
                                    ↓
                          Frontend (lee de DynamoDB)
```

## 7. Troubleshooting

### Error 403 Forbidden
- Verifica que el IAM role tenga permisos para API Gateway

### Error 500 Internal Server Error
- Revisa los logs de Lambda: `npm run logs`
- Verifica que la tabla DynamoDB existe

### No se guardan datos en DynamoDB
- Verifica permisos del IAM role para DynamoDB
- Revisa logs de Lambda para ver errores específicos

### El script Python no se conecta
- Verifica el puerto serial: `ls /dev/tty*` (Linux) o Device Manager (Windows)
- Verifica baudrate (debe ser 9600)
- Verifica que el RAK3172 esté en modo P2P receptor

## 8. Próximos Pasos Opcionales

- [ ] Configurar SNS Topic para alertas críticas
- [ ] Agregar más validaciones en Lambda
- [ ] Implementar rate limiting en API Gateway
- [ ] Agregar autenticación (API Keys o Cognito)
- [ ] Configurar CloudWatch Alarms
- [ ] Implementar frontend para leer de DynamoDB

