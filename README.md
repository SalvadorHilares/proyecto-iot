# Proyecto IoT – Integración LoRaWAN + AWS

Este repositorio contiene:

- `arduino/` – Firmware del nodo sensor (lecturas MQ-2, DHT11, ultrasonido, etc.).
- `rasperryPi/` – Scripts Python para inferencia de audio (CNN) y gestión LoRa Master.
- `aws/` – Guía y código para integrar los sensores vía **LoRaWAN + AWS IoT Core**, incluyendo Lambda y formato de payload.

## Carpetas clave

| Carpeta | Descripción |
|---------|-------------|
| `arduino/` | Sketch principal + documentación de payload. |
| `rasperryPi/` | Scripts Python para inferencia de audio (CNN) y gestión LoRa Master. |
| `aws/README.md` | Paso a paso para onboarding de gateway, dispositivos, IoT Rule y Lambda. |
| `aws/payload-format.md` | Estructura binaria que comparten Arduino y la Lambda. |
| `aws/lambda-uplink-processor.ts` | Ejemplo de Lambda (Node.js 18) para decodificar y almacenar los uplinks. |

## Flujo resumido
1. Arduino empaqueta lecturas y las envía vía módulo LoRaWAN.
2. Gateway LoRaWAN (Basics Station 2.0.4+) se conecta a AWS IoT Core for LoRaWAN.
3. IoT Core recibe uplinks y, mediante una IoT Rule, invoca la Lambda.
4. La Lambda decodifica el payload y lo persiste en DynamoDB, SNS, etc.
5. Tu dashboard/servicios consultan DynamoDB o la API para mostrar alertas.

Sigue `aws/README.md` para la guía completa de configuración.