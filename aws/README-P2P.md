# Guía de Integración LoRa P2P con AWS

Este proyecto integra sensores LoRa P2P (RAK3172) con AWS usando API Gateway, Lambda y DynamoDB.

## Arquitectura

```
Arduino → Raspberry Pi (UART) → RAK3172 Transmisor (P2P)
                                              ↓
                                    [Aire - LoRa P2P]
                                              ↓
RAK3172 Receptor → Script Python → API Gateway → Lambda → DynamoDB
```

## Prerrequisitos

### Hardware
- RAK3172 transmisor conectado a Raspberry Pi
- RAK3172 receptor conectado a PC/laptop con Internet
- Ambos módulos configurados en modo P2P con mismos parámetros

### Software
- Python 3.7+
- Acceso a puerto serial (permisos en Linux: `sudo usermod -a -G dialout $USER`)
- Credenciales AWS configuradas (AWS CLI o variables de entorno)

## Instalación

### 1. Instalar dependencias Python

```bash
pip install -r requirements.txt
```

O manualmente:
```bash
pip install pyserial requests
```

### 2. Desplegar infraestructura AWS

```bash
cd proyecto-iot/aws
npx serverless deploy --stage dev --region us-east-1 --table EnvironmentalEvents
```

Después del deploy, copia la URL del API Gateway que aparece en los outputs:
```
endpoints:
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/telemetry
```

### 3. Configurar el script receptor

Edita `receiver-script.py` y configura:

```python
SERIAL_PORT = "COM3"  # Windows: COM3, Linux: /dev/ttyUSB0 o /dev/ttyACM0
BAUDRATE = 9600
API_GATEWAY_URL = "https://abc123.execute-api.us-east-1.amazonaws.com/dev/telemetry"
```

**Encontrar el puerto serial:**
- **Windows**: Administrador de dispositivos → Puertos (COM y LPT)
- **Linux**: `ls /dev/tty*` o `dmesg | grep tty`

### 4. Configurar RAK3172 Receptor

El RAK3172 receptor debe estar configurado en modo P2P. Ejemplo de comandos AT:

```
AT+NWM=0          // Modo LoRa (no LoRaWAN)
AT+P2P=915000000:10:0:1:8:14  // Frecuencia:SF:BW:CR:Preamble:Power
AT+PRECV=65534    // Activar recepción continua
```

**Importante**: Los parámetros deben coincidir con el transmisor.

## Uso

### Ejecutar el script receptor

```bash
python receiver-script.py
```

### Probar el API Gateway directamente

Puedes probar el API Gateway con CURL antes de usar el script receptor. Ver `test-api.md` para ejemplos completos.

**Ejemplo rápido:**
```bash
curl -X POST "https://TU-URL.execute-api.us-east-1.amazonaws.com/dev/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }'
```

Reemplaza `TU-URL` con la URL que obtienes después de `serverless deploy`.

El script:
1. Abre el puerto serial
2. Lee mensajes del formato `EVT:RXP2P:POT:SNR:PAYLOAD`
3. Decodifica el payload hexadecimal
4. Envía POST al API Gateway
5. Registra todo en `receiver.log`

### Ver logs

```bash
# Ver logs en tiempo real
tail -f receiver.log

# O simplemente ver en consola (ya está configurado)
```

### Verificar datos en AWS

1. **CloudWatch Logs**: `/aws/lambda/uplinkProcessor-dev`
2. **DynamoDB**: Tabla `EnvironmentalEvents` (o la que configuraste)
3. **API Gateway**: Métricas en la consola de AWS

## Formato de Mensajes

### Entrada del RAK3172

```
EVT:RXP2P:-85:12:AABBCCDDEEFF
```

- `-85`: Potencia de recepción (RSSI) en dBm
- `12`: Relación señal/ruido (SNR) en dBm
- `AABBCCDDEEFF`: Payload hexadecimal (6 bytes)

### Payload Decodificado

Ver `payload-format.md` para detalles del formato de 6 bytes.

## Troubleshooting

### Error: "Puerto serial no encontrado"

- Verifica que el RAK3172 esté conectado
- En Linux, verifica permisos: `sudo chmod 666 /dev/ttyUSB0`
- Lista puertos disponibles: `python -m serial.tools.list_ports`

### Error: "API_GATEWAY_URL no está configurado"

- Edita `receiver-script.py` y configura la variable `API_GATEWAY_URL`
- Obtén la URL después de hacer `serverless deploy`

### No se reciben mensajes

- Verifica que ambos RAK3172 estén en modo P2P
- Verifica que los parámetros (frecuencia, SF, BW) coincidan
- Verifica que el transmisor esté enviando: `AT+SEND=6,<hex>`
- Revisa la distancia entre módulos (máximo ~2-5km en campo abierto)

### Error 403/401 en API Gateway

- Verifica que la URL sea correcta
- Verifica que el método sea POST
- Revisa logs de CloudWatch para más detalles

### Datos no aparecen en DynamoDB

1. Revisa logs de Lambda en CloudWatch
2. Verifica que la tabla existe: `aws dynamodb list-tables`
3. Verifica permisos IAM del rol `LabRole`

## Estructura de Datos en DynamoDB

```
pk: "DEV#UNKNOWN" (o "DEV#<devEui>" si se especifica)
sk: "TS#2024-11-21T15:37:12.345Z"
gas: 476
temperature: 28.5
humidity: 81
distanceCm: 120
riskScore: 153.2
flags: { fire: true, logging: false, presence: true }
metadata: { devEui: "UNKNOWN", rssi: -85, snr: 12, source: "P2P" }
```

## Próximos Pasos

- Configurar alertas SNS cuando `riskScore` supere umbral
- Agregar autenticación al API Gateway (API Key o IAM)
- Implementar downlinks para control remoto de sensores
- Agregar dashboard en tiempo real usando WebSockets

## Referencias

- [RAK3172 Datasheet](https://docs.rakwireless.com/Product-Categories/WisDuo/RAK3172-Module/Overview/)
- [PySerial Documentation](https://pyserial.readthedocs.io/)
- [Serverless Framework Docs](https://www.serverless.com/framework/docs)

