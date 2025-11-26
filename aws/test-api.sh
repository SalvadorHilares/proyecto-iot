#!/bin/bash
# Script de prueba para el API Gateway
# Reemplaza <API_GATEWAY_URL> con la URL que obtienes después del deploy

API_URL="<API_GATEWAY_URL>/telemetry"

# Ejemplo 1: Payload normal (sin alertas)
echo "=== Test 1: Payload normal ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01D39C3C00",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 2: Payload con alerta de fuego (flag bit 0 activo)
echo "=== Test 2: Alerta de fuego ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C01",
    "rssi": -78,
    "snr": 15,
    "devEui": "SENSOR_001"
  }'

echo -e "\n\n"

# Ejemplo 3: Payload con alerta de presencia (flag bit 2 activo)
echo "=== Test 3: Alerta de presencia ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01D39C3C04",
    "rssi": -90,
    "snr": 8
  }'

echo -e "\n\n"

# Ejemplo 4: Payload con múltiples alertas (fuego + tala)
echo "=== Test 4: Múltiples alertas ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C03",
    "rssi": -75,
    "snr": 18,
    "devEui": "SENSOR_002"
  }'

echo -e "\n\n"

# Ejemplo 5: Error - payload inválido (muy corto)
echo "=== Test 5: Error - payload inválido ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABB",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 6: Error - falta campo payload
echo "=== Test 6: Error - falta payload ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 7: Error - payload con caracteres inválidos (no hex)
echo "=== Test 7: Error - payload con caracteres inválidos ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "GGHHIIJJKKLL",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 8: Error - payload con longitud impar (hex inválido)
echo "=== Test 8: Error - payload longitud impar ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEF",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 9: Error - payload demasiado largo
echo "=== Test 9: Error - payload demasiado largo ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEFF001122334455",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 10: Error - JSON malformado
echo "=== Test 10: Error - JSON malformado ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  '

echo -e "\n\n"

# Ejemplo 11: Error - body vacío
echo "=== Test 11: Error - body vacío ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d ''

echo -e "\n\n"

# Ejemplo 12: Error - Content-Type incorrecto
echo "=== Test 12: Error - Content-Type incorrecto ==="
curl -X POST "$API_URL" \
  -H "Content-Type: text/plain" \
  -d 'payload=DC0139523C00'

echo -e "\n\n"

# Ejemplo 13: Timeout simulado (con timeout muy corto)
echo "=== Test 13: Simulación de timeout (timeout 1ms) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  --max-time 0.001 \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }' || echo "Timeout esperado"

echo -e "\n\n"

# Ejemplo 14: Payload con valores extremos (gas muy alto)
echo "=== Test 14: Payload con valores extremos ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "FF03FF7FFF0F",
    "rssi": -200,
    "snr": 200
  }'

echo -e "\n\n"

# Ejemplo 15: Payload con todos los flags activos
echo "=== Test 15: Payload con todas las alertas activas ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "F4013A4A3C07",
    "rssi": -50,
    "snr": 25,
    "devEui": "CRITICAL_SENSOR"
  }'

echo -e "\n\n"

# Ejemplo 16: Request sin headers
echo "=== Test 16: Request sin Content-Type ==="
curl -X POST "$API_URL" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 17: Payload con espacios y caracteres especiales
echo "=== Test 17: Payload con espacios (debe limpiarse) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC 01 39 52 3C 00",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 18: Payload en minúsculas (debe funcionar)
echo "=== Test 18: Payload en minúsculas (debe funcionar) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "dc0139523c00",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n\n"

# Ejemplo 19: Request con método incorrecto
echo "=== Test 19: Request con método GET (debe fallar) ==="
curl -X GET "$API_URL" \
  -H "Content-Type: application/json"

echo -e "\n\n"

# Ejemplo 20: Payload con valores negativos codificados
echo "=== Test 20: Payload con temperatura negativa ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01F6523C00",
    "rssi": -85,
    "snr": 12
  }'

echo -e "\n"

