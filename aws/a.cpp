#include <Arduino.h>

#define LORA Serial1   // Cambia según tu placa
#define BAUDRATE 115200

void sendAT(String cmd){
  LORA.print(cmd + "\r\n");
  Serial.println(">>> " + cmd);
  delay(200);
}

void setup() {
  Serial.begin(115200);
  LORA.begin(BAUDRATE);

  delay(1000);
  Serial.println("Configurando RAK3172 receptor...");

  sendAT("AT");
  sendAT("AT+NWM=0");   // P2P mode
  sendAT("AT+P2P=923800000:7:125:0:10:14");  // Frecuencia, SF7, BW125, CR 4/5, preámbulo 10, potencia 14

  // Modo recepción continua
  sendAT("AT+PRECV=65535");

  Serial.println("📡 LISTO. Escuchando paquetes...\n");
}

void loop() {
  if (LORA.available()) {
    String line = LORA.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      Serial.println("[UART] " + line);

      // Cuando llega un paquete válido
      if (line.startsWith("+EVT:RXP2P")) {
        // Ejemplo: +EVT:RXP2P:-63:9:AABBCC
        int lastColon = line.lastIndexOf(':');
        String payloadHex = line.substring(lastColon + 1);

        Serial.print("📩 PAYLOAD HEX: ");
        Serial.println(payloadHex);

        // Convertir HEX → texto
        String decoded = "";
        for (int i = 0; i < payloadHex.length(); i += 2) {
          String byteHex = payloadHex.substring(i, i+2);
          char c = (char) strtol(byteHex.c_str(), NULL, 16);
          decoded += c;
        }

        Serial.print("📨 MENSAJE DECODIFICADO: ");
        Serial.println(decoded);
      }
    }
  }
}
