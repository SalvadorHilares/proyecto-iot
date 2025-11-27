#!/bin/bash
# Script para probar casos de error y desconexión
# Reemplaza <API_GATEWAY_URL> con la URL que obtienes después del deploy

API_URL="https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev/telemetry"

echo "=========================================="
echo "TESTING: Casos de Error y Desconexión"
echo "=========================================="
echo ""

# Test 1: Simulación de timeout (conexión muy lenta)
echo "=== Test 1: Timeout de conexión (1ms) ==="
timeout 0.001 curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  --max-time 0.001 \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }' 2>&1 || echo "✓ Timeout detectado correctamente"
echo ""

# Test 2: URL incorrecta (simula servidor caído)
echo "=== Test 2: URL incorrecta (404) ==="
curl -X POST "${API_URL%telemetry}nonexistent" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n" 2>&1
echo ""

# Test 3: Payload corrupto (caracteres no hex)
echo "=== Test 3: Payload con caracteres inválidos ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "ZZZZZZZZZZZZ",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 4: Payload incompleto (muy corto)
echo "=== Test 4: Payload incompleto (2 bytes) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABB",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 5: Payload con longitud impar
echo "=== Test 5: Payload longitud impar ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEF",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 6: JSON completamente malformado
echo "=== Test 6: JSON malformado ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{ esto no es json válido }' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 7: Body completamente vacío
echo "=== Test 7: Body vacío ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 8: Sin Content-Type header
echo "=== Test 8: Sin Content-Type header ==="
curl -X POST "$API_URL" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 9: Método HTTP incorrecto (GET en vez de POST)
echo "=== Test 9: Método HTTP incorrecto (GET) ==="
curl -X GET "$API_URL" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 10: Payload demasiado largo
echo "=== Test 10: Payload demasiado largo (24 bytes) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "AABBCCDDEEFF00112233445566778899AABBCCDD",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 11: Valores RSSI/SNR extremos (debe aceptarse pero puede ser inválido)
echo "=== Test 11: Valores RSSI/SNR extremos ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -999,
    "snr": 999
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 12: Payload con espacios y caracteres especiales
echo "=== Test 12: Payload con espacios (debe limpiarse) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC 01 39 52 3C 00",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 13: Payload con tabs y newlines
echo "=== Test 13: Payload con tabs y newlines ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"payload\": \"DC\t01\n39\t52\n3C\t00\",
    \"rssi\": -85,
    \"snr\": 12
  }" -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 14: Request con múltiples Content-Type headers
echo "=== Test 14: Headers duplicados ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Content-Type: text/plain" \
  -d '{
    "payload": "DC0139523C00",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 15: Payload con valores que causan overflow
echo "=== Test 15: Payload con valores extremos (overflow potencial) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "FFFFFFFFFF0F",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 16: Request muy grande (body enorme)
echo "=== Test 16: Request body muy grande ==="
LARGE_PAYLOAD=$(python3 -c "print('A' * 10000)")
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"payload\": \"${LARGE_PAYLOAD}\",
    \"rssi\": -85,
    \"snr\": 12
  }" -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 17: Payload con encoding incorrecto
echo "=== Test 17: Payload con caracteres especiales (no hex) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": "DC01ñ9523C00",
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 18: Simulación de rate limiting (múltiples requests rápidos)
echo "=== Test 18: Múltiples requests rápidos (rate limiting) ==="
for i in {1..5}; do
  echo "Request $i:"
  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"payload\": \"DC0139523C00\",
      \"rssi\": -85,
      \"snr\": 12,
      \"devEui\": \"STRESS_TEST_$i\"
    }" -w " Status: %{http_code}\n" -s
  sleep 0.1
done
echo ""

# Test 19: Payload null/undefined en JSON
echo "=== Test 19: Payload null ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": null,
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

# Test 20: Payload como número en vez de string
echo "=== Test 20: Payload como número (tipo incorrecto) ==="
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": 123456789012,
    "rssi": -85,
    "snr": 12
  }' -w "\nHTTP Status: %{http_code}\n"
echo ""

echo "=========================================="
echo "Testing completado"
echo "=========================================="

