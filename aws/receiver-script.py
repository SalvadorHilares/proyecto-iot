#!/usr/bin/env python3
"""
RAK3172 P2P Receiver Script
Lee mensajes del RAK3172 receptor y los envía a AWS API Gateway

Formato esperado del RAK3172:
EVT:RXP2P:POT:SNR:PAYLOAD
Ejemplo: EVT:RXP2P:-85:12:AABBCCDDEEFF
"""

import serial
import re
import json
import requests
import logging
import time
import sys
from typing import Optional, Dict, Any
from datetime import datetime

# Configuración
SERIAL_PORT = "COM3"  # Windows: COM3, Linux: /dev/ttyUSB0
BAUDRATE = 9600
API_GATEWAY_URL = "https://zv4065j3ui.execute-api.us-east-1.amazonaws.com/dev/telemetry"
MAX_RETRIES = 3
RETRY_DELAY = 2  # segundos

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('receiver.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Patrón regex para parsear mensajes del RAK3172
MESSAGE_PATTERN = re.compile(r'EVT:RXP2P:(-?\d+):(-?\d+):([0-9A-Fa-f]+)')


def decode_payload(hex_payload: str) -> Dict[str, Any]:
    """
    Decodifica el payload hexadecimal de 6 bytes según payload-format.md
    
    Byte layout:
    - 0-1: gas (uint16 little-endian)
    - 2: temp (int8, temp * 2)
    - 3: hum (uint8, 0-100)
    - 4: distance (uint8, distance/2, 0-255)
    - 5: flags (bitfield)
    """
    try:
        # Convertir hex string a bytes
        payload_bytes = bytes.fromhex(hex_payload)
        
        if len(payload_bytes) < 6:
            raise ValueError(f"Payload too short: {len(payload_bytes)} bytes, expected 6")
        
        # Decodificar según formato
        gas = int.from_bytes(payload_bytes[0:2], byteorder='little', signed=False)
        temp_half_degrees = int.from_bytes([payload_bytes[2]], byteorder='little', signed=True)
        humidity = payload_bytes[3]
        distance_encoded = payload_bytes[4]
        flags_byte = payload_bytes[5]
        
        # Decodificar flags
        flags = {
            'fire': bool(flags_byte & 0b00000001),
            'logging': bool(flags_byte & 0b00000010),
            'presence': bool(flags_byte & 0b00000100)
        }
        
        # Convertir valores
        temperature = temp_half_degrees / 2.0
        distance_cm = distance_encoded * 2
        
        # Calcular risk score (misma lógica que Lambda)
        base_gas = 300
        base_temp = 26
        base_hum = 85
        
        delta_gas = max(0, gas - base_gas)
        delta_temp = max(0, temperature - base_temp)
        delta_hum = max(0, base_hum - humidity)
        
        risk_score = 2.5 * delta_gas + 2.0 * delta_temp + 1.0 * delta_hum
        if delta_temp > 2 and delta_hum > 5:
            risk_score += 20
        
        return {
            'gas': gas,
            'temperature': round(temperature, 1),
            'humidity': humidity,
            'distanceCm': distance_cm,
            'flags': flags,
            'riskScore': round(risk_score, 2)
        }
    except Exception as e:
        logger.error(f"Error decoding payload {hex_payload}: {e}")
        raise


def send_to_api_gateway(payload: str, rssi: int, snr: int) -> bool:
    """
    Envía el payload decodificado al API Gateway de AWS
    """
    if not API_GATEWAY_URL:
        logger.error("API_GATEWAY_URL no está configurado")
        return False
    
    try:
        # Preparar request body
        request_body = {
            'payload': payload,  # Mantener hex string original
            'rssi': rssi,
            'snr': snr
        }
        
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Intentar enviar con retries
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.post(
                    API_GATEWAY_URL,
                    json=request_body,
                    headers=headers,
                    timeout=10
                )
                response.raise_for_status()
                logger.info(f"Payload enviado exitosamente: {response.status_code}")
                return True
            except requests.exceptions.RequestException as e:
                logger.warning(f"Intento {attempt + 1}/{MAX_RETRIES} falló: {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                else:
                    raise
        
    except Exception as e:
        logger.error(f"Error enviando a API Gateway: {e}")
        return False


def process_message(line: str) -> None:
    """
    Procesa una línea recibida del RAK3172
    """
    line = line.strip()
    
    # Buscar patrón EVT:RXP2P:POT:SNR:PAYLOAD
    match = MESSAGE_PATTERN.search(line)
    if not match:
        # Ignorar líneas que no coincidan
        if line and not line.startswith('OK') and not line.startswith('ERROR'):
            logger.debug(f"Línea ignorada: {line}")
        return
    
    pot = int(match.group(1))  # dBm
    snr = int(match.group(2))  # dBm
    hex_payload = match.group(3).upper()
    
    logger.info(f"Paquete recibido - POT: {pot} dBm, SNR: {snr} dBm, Payload: {hex_payload}")
    
    try:
        # Decodificar payload
        decoded = decode_payload(hex_payload)
        logger.info(f"Datos decodificados: {decoded}")
        
        # Enviar a API Gateway
        if send_to_api_gateway(hex_payload, pot, snr):
            logger.info("Datos enviados exitosamente a AWS")
        else:
            logger.error("Error al enviar datos a AWS")
            
    except Exception as e:
        logger.error(f"Error procesando mensaje: {e}")


def main():
    """
    Función principal - lee del puerto serial continuamente
    """
    global API_GATEWAY_URL
    
    # Verificar que API_GATEWAY_URL esté configurado
    if not API_GATEWAY_URL:
        logger.error("ERROR: API_GATEWAY_URL no está configurado")
        logger.error("Por favor, edita este script y configura API_GATEWAY_URL con la URL de tu API Gateway")
        logger.error("Ejemplo: API_GATEWAY_URL = 'https://abc123.execute-api.us-east-1.amazonaws.com/dev/telemetry'")
        sys.exit(1)
    
    logger.info(f"Iniciando receptor LoRa P2P")
    logger.info(f"Puerto serial: {SERIAL_PORT}")
    logger.info(f"Baudrate: {BAUDRATE}")
    logger.info(f"API Gateway: {API_GATEWAY_URL}")
    
    try:
        # Abrir puerto serial
        ser = serial.Serial(
            port=SERIAL_PORT,
            baudrate=BAUDRATE,
            timeout=1,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE
        )
        logger.info(f"Puerto serial abierto: {ser.name}")
        
        # Leer continuamente
        buffer = ""
        while True:
            if ser.in_waiting > 0:
                # Leer bytes disponibles
                data = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                buffer += data
                
                # Procesar líneas completas
                while '\n' in buffer or '\r' in buffer:
                    if '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                    else:
                        line, buffer = buffer.split('\r', 1)
                    
                    if line.strip():
                        process_message(line)
            else:
                time.sleep(0.1)  # Pequeña pausa para no saturar CPU
                
    except serial.SerialException as e:
        logger.error(f"Error de puerto serial: {e}")
        logger.error(f"Asegúrate de que el puerto {SERIAL_PORT} existe y está disponible")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Interrupción recibida, cerrando...")
        if 'ser' in locals():
            ser.close()
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error inesperado: {e}")
        if 'ser' in locals():
            ser.close()
        sys.exit(1)


if __name__ == "__main__":
    main()

