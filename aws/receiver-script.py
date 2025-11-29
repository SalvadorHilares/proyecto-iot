import serial
import time

PORT = "COM6"
BAUD = 115200

def to_hex(s):
    return s.encode().hex().upper()

def send_at(cmd, ser, wait=0.3):
    ser.write((cmd + "\r\n").encode())
    time.sleep(wait)
    resp = ser.read_all().decode(errors="ignore")
    print(f">>> {cmd}")
    print(resp)
    return resp

ser = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(2)

print("Conectando al RAK3172...\n")

send_at("AT+NWM=0", ser)
send_at("AT+P2P=923800000:7:125:0:10:14", ser)

print("\nConfiguración lista. Enviando cada 10 segundos...\n")

while True:
    msg = "Hola desde Python"
    hex_msg = to_hex(msg)
    send_at(f"AT+PSEND={hex_msg}", ser)
    time.sleep(10)