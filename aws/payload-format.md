## Payload format (LoRa P2P uplink)

Shared between the Arduino firmware, the Python receiver script, and the AWS Lambda decoder.

| Byte(s) | Field | Encoding | Notes |
|---------|-------|----------|-------|
| 0-1 | `gas` | Unsigned 16-bit | Raw MQ-2 averaged value (0-1023). Stored little-endian. |
| 2 | `temp` | Signed 8-bit | Temperature in °C multiplied by 2 to keep 0.5°C resolution. Example: 28.5°C → `57`. |
| 3 | `hum` | Unsigned 8-bit | Humidity % (0-100). |
| 4 | `distance` | Unsigned 8-bit | Ultrasonic distance in cm divided by 2 (0-255 ⇒ 0-510 cm). Cap at 255 for “out of range”. |
| 5 | `flags` | Bit field | `b0`: fire alarm, `b1`: tala/logging, `b2`: presence, remaining bits reserved. |

### Example Arduino snippet

```cpp
uint8_t payload[6];

uint16_t gas = (uint16_t)curr_gas;
payload[0] = gas & 0xFF;
payload[1] = (gas >> 8) & 0xFF;

payload[2] = (int8_t)(curr_temp * 2);     // e.g., 28.5°C -> 57
payload[3] = (uint8_t)curr_hum;           // 0-100

uint8_t distEncoded = (uint8_t)min(255, (int)(curr_dist / 2));
payload[4] = distEncoded;

uint8_t flags = 0;
if (timer_fire_ticks > 0) flags |= 0b00000001;
if (timer_tala_ticks > 0) flags |= 0b00000010;
if (timer_pres_ticks > 0) flags |= 0b00000100;
payload[5] = flags;

// send payload with LoRa P2P (RAK3172 AT+SEND command)
// Ejemplo: AT+SEND=6,AABBCCDDEEFF
```

### Example decoded object (Lambda/Python)

```json
{
  "devEui": "UNKNOWN",
  "gas": 476,
  "temperature": 28.5,
  "humidity": 81,
  "distanceCm": 120,
  "flags": {
    "fire": true,
    "logging": false,
    "presence": true
  },
  "riskScore": 153.2,
  "timestamp": "2024-11-21T15:37:12.345Z"
}
```

### Python Script Decoding

El script `receiver-script.py` decodifica el payload hexadecimal recibido del RAK3172:

```python
# El RAK3172 envía: EVT:RXP2P:-85:12:AABBCCDDEEFF
# El script extrae el hex payload y lo decodifica:
payload_bytes = bytes.fromhex("AABBCCDDEEFF")
gas = int.from_bytes(payload_bytes[0:2], byteorder='little')
temperature = int.from_bytes([payload_bytes[2]], byteorder='little', signed=True) / 2.0
# ... etc
```

### API Gateway Request Format

El script Python envía al API Gateway:

```json
{
  "payload": "AABBCCDDEEFF",
  "rssi": -85,
  "snr": 12
}
```

La Lambda recibe este JSON, decodifica el hex payload y guarda en DynamoDB.

