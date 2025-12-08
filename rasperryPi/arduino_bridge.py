#arduino
import serial
import re
import json
import time
import os

# Configuration
SERIAL_PORT = '/dev/ttyACM0'
BAUD_RATE = 9600
MEM_FILE = '/dev/shm/data_arduino.json'

def main():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        ser.flush()
        print(f"Listening to Arduino on {SERIAL_PORT}...")
    except Exception as e:
        print(f"Error opening port: {e}")
        return

    # Data structure to hold latest state
    current_data = {
        "gas": 0.0, "temp": 0.0, "hum": 0.0,
        "fire_active": False, "pres_active": False,
        "timestamp": 0
    }

    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()

                # 1. Parse SENSORS line
                # [SENSORS] | Gas: 245.76/246.97 | Temp: 28.10/28.00 | Hum: 56.00/56.22
                if "[SENSORS]" in line:
                    # Regex to get the first value (current) before the slash
                    gas_match = re.search(r'Gas: ([\d\.]+)', line)
                    temp_match = re.search(r'Temp: ([\d\.]+)', line)
                    hum_match = re.search(r'Hum: ([\d\.]+)', line)

                    if gas_match: current_data["gas"] = float(gas_match.group(1))
                    if temp_match: current_data["temp"] = float(temp_match.group(1))
                    if hum_match: current_data["hum"] = float(hum_match.group(1))

                # 2. Parse ALARMS line
                # [ALARMS ] | FIRE_TMR: 0 | TALA_TMR: 0 | PRES_TMR: 0
                elif "[ALARMS" in line:
                    fire_match = re.search(r'FIRE_TMR: (\d+)', line)
                    pres_match = re.search(r'PRES_TMR: (\d+)', line)

                    # If TMR > 0, the alarm is ACTIVE
                    if fire_match:
                        current_data["fire_active"] = int(fire_match.group(1)) > 0
                    if pres_match:
                        current_data["pres_active"] = int(pres_match.group(1)) > 0

                    # Save to RAM (Only after getting alarm data to ensure sync)
                    current_data["timestamp"] = time.time()
                    with open(MEM_FILE, 'w') as f:
                        json.dump(current_data, f)

                    # Optional: Visual feedback
                    print(f"Saved: Gas={current_data['gas']}, Temp={current_data['temp']}, Hum={current_data['hum']}. Fire={current_data['fire_active']},Pres={current_data['fire_active']}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()