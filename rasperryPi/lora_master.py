import serial
import time
import json
import os

# ================= CONFIGURACIÓN =================
# Ajusta el puerto si cambia (usa 'ls /dev/tty*' para verificar)
LORA_PORT = "/dev/ttyUSB0"
BAUD_RATE = 115200

# Archivos en memoria RAM compartida
FILE_ARDUINO = '/dev/shm/data_arduino.json'
FILE_CNN = '/dev/shm/data_cnn.json'

# ================= FUNCIONES DE AYUDA =================
def to_hex(s):
    """Convierte texto a Hexadecimal para el RAK3172"""
    return s.encode().hex().upper()

def send_at(cmd, ser, wait=0.3):
    """
    Envía comando AT. Si ser es None (Modo Simulación), solo imprime.
    """
    print(f">>> {cmd}") # Debug en terminal

    if ser:
        try:
            # Limpiar buffer para evitar lecturas de basura vieja
            ser.reset_input_buffer()

            ser.write((cmd + "\r\n").encode())
            time.sleep(wait)
            resp = ser.read_all().decode(errors="ignore").strip()
            if resp:
                print(f"    └── HW: {resp}")
            return resp
        except Exception as e:
            print(f"    └── ❌ Error HW: {e}")
            return None
    else:
        return "OK"

# ================= SETUP =================
def setup_lora():
    try:
        print(f"🔌 Conectando al RAK3172 en {LORA_PORT}...")
        ser = serial.Serial(LORA_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)

        # Secuencia de inicialización
        send_at("AT", ser)
        send_at("AT+NWM=0", ser)                   # P2P Mode
        send_at("AT+P2P=923800000:7:125:0:10:14", ser) # Freq y params
        send_at("AT+PRECV=0", ser)                 # Solo TX

        print("✅ Configuración LoRa completada.\n")
        return ser

    except Exception as e:
        print(f"⚠️  ERROR HARDWARE: No se pudo abrir {LORA_PORT} ({e})")
        print("--> 🖥️  ENTRANDO EN MODO SIMULACIÓN (Solo Terminal)\n")
        return None

# ================= LECTOR JSON =================
def read_json(path):
    if not os.path.exists(path): return None
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except:
        return None

# ================= BUCLE PRINCIPAL =================
def main():
    lora = setup_lora()

    # Timestamps para control de cambios
    last_ard_ts = 0
    last_cnn_ts = 0

    print("=== MASTER CONTROLLER ACTIVO ===")
    print("Formato Arduino: ar:<gas>|<temp>|<hum>|<fuego>|<presencia>")
    print("Formato RasPi:   ra:<tala>|<conf>|<db>")
    print("Esperando datos...\n")

    while True:
        try:
            # 1. Leer estado actual de la RAM
            ard = read_json(FILE_ARDUINO)
            cnn = read_json(FILE_CNN)

            # --- ENVÍO ARDUINO ---
            if ard and ard['timestamp'] != last_ard_ts:
                last_ard_ts = ard['timestamp']

                # Extraer valores (con valores por defecto si faltan)
                gas = ard.get('gas', 0)
                temp = ard.get('temp', 0)
                hum = ard.get('hum', 0)

                # Convertir Booleanos a 1 o 0
                fuego = 1 if ard.get('fire_active', False) else 0
                presencia = 1 if ard.get('pres_active', False) else 0

                # Formato solicitado: ar:<gas>|<temp>|<hum>|<fuego>|<presencia>
                msg = f"ar:{gas}|{temp}|{hum}|{fuego}|{presencia}"

                # Enviar
                hex_msg = to_hex(msg)
                send_at(f"AT+PSEND={hex_msg}", lora)

            # --- ENVÍO CNN (RASPBERRY) ---
            if cnn and cnn['timestamp'] != last_cnn_ts:
                last_cnn_ts = cnn['timestamp']

                # Lógica TALA: 1 si es DANGER, 0 si es SAFE o WARNING
                status_str = cnn.get('status', 'SAFE')
                tala = 1 if status_str == "DANGER" else 0

                conf = cnn.get('conf', 0)
                db = cnn.get('db', 0)

                # Formato solicitado: ra:<tala>|<conf>|<db>
                msg = f"ra:{tala}|{conf}|{db}"

                # Enviar
                hex_msg = to_hex(msg)
                send_at(f"AT+PSEND={hex_msg}", lora)

            # Ciclo rápido (100ms)
            time.sleep(0.1)

        except KeyboardInterrupt:
            print("\nDeteniendo sistema...")
            if lora: lora.close()
            break
        except Exception as e:
            print(f"Error en loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()