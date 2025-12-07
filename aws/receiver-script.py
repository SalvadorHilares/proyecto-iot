import serial
import time
import binascii
import json
import requests
import threading

# ================= CONFIGURACIÓN =================
COM_PORT = 'COM7'   # <--- Verifica tu puerto
BAUD_RATE = 115200
API_URL = "https://v7rtnig6sf.execute-api.us-east-1.amazonaws.com/dev/telemetry"

# ================= ENVIAR A NUBE (CORREGIDO) =================
def enviar_nube_async(tipo_sensor, datos_dict):
    """
    Empaqueta los datos dentro de 'payload' y los envía.
    Estructura final:
    {
        "payload": {
            "sensor": "arduino",
            "timestamp": "...",
            "data": { ... }
        }
    }
    """
    
    # 1. Construimos la estructura exacta que pide tu API
    cuerpo_request = {
        "payload": {
            "sensor": tipo_sensor,  # "arduino" o "raspberry"
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "data": datos_dict
        }
    }

    def _post():
        try:
            # print(f"   ☁️  Enviando {tipo_sensor}...") # Debug
            response = requests.post(API_URL, json=cuerpo_request, timeout=5)
            
            if response.status_code in [200, 201]:
                print(f"   ✅ [AWS] {tipo_sensor.upper()} enviado OK.")
            else:
                print(f"   ⚠️  [AWS] Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"   ❌ [AWS] Fallo de conexión: {e}")

    # Hilo daemon para no bloquear
    threading.Thread(target=_post, daemon=True).start()

# ================= DECODIFICADORES =================
def decode_payload(hex_data):
    try:
        return binascii.unhexlify(hex_data).decode('utf-8')
    except:
        return ""

def procesar_entrada(texto_recibido, snr):
    """Detecta de quién es el mensaje y dispara el envío correspondiente"""
    
    try:
        # --- CASO 1: ARDUINO (ar:gas|temp|hum|fuego|pres) ---
        if texto_recibido.startswith("ar:"):
            raw = texto_recibido.split(":")[1].split("|")
            if len(raw) == 5:
                datos = {
                    "gas": float(raw[0]),
                    "temperatura": float(raw[1]),
                    "humedad": float(raw[2]),
                    "fuego": int(raw[3]),
                    "presencia": int(raw[4]),
                    "snr": snr # Agregamos la calidad de señal como dato útil
                }
                print(f"💌 [ARDUINO] G:{datos['gas']} T:{datos['temperatura']}")
                # DISPARAR ENVÍO
                enviar_nube_async("arduino", datos)

        # --- CASO 2: RASPBERRY (ra:clase|confianza|volumen) ---
        elif texto_recibido.startswith("ra:"):
            raw = texto_recibido.split(":")[1].split("|")
            if len(raw) == 3:
                datos = {
                    "clase_detectada": int(raw[0]),
                    "confianza": float(raw[1]),
                    "volumen_db": float(raw[2]),
                    "snr": snr
                }
                print(f"💌 [RASPBERRY] Clase:{datos['clase_detectada']} Vol:{datos['volumen_db']}")
                # DISPARAR ENVÍO
                enviar_nube_async("raspberry", datos)

    except Exception as e:
        print(f"❌ Error procesando datos: {e}")

# ================= MAIN =================
def main():
    try:
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
    except Exception as e:
        print(f"Error puerto: {e}")
        return

    print(f"✅ GATEWAY LISTO en {COM_PORT}")
    print("Esperando datos separados...")
    print("-" * 40)
    
    # Configuración RAK
    ser.write("AT+NWM=0\r\n".encode()); time.sleep(0.2)
    ser.write("AT+P2P=923800000:7:125:0:10:14\r\n".encode()); time.sleep(0.2)
    ser.write("AT+PRECV=65534\r\n".encode()); time.sleep(0.2)
    ser.reset_input_buffer()

    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline().decode(errors='ignore').strip()

                # Filtramos mensaje valido
                if "+EVT:RXP2P" in line and "ERROR" not in line:
                    parts = line.split(':')
                    if len(parts) >= 5:
                        snr = int(parts[3])
                        if snr < 5: continue # Filtro ruido
                        
                        hex_payload = parts[4]
                        mensaje_texto = decode_payload(hex_payload)
                        
                        # Procesar y enviar individualmente
                        procesar_entrada(mensaje_texto, snr)

        except KeyboardInterrupt:
            ser.close()
            break
        except Exception as e:
            print(e)

if __name__ == "__main__":
    main()