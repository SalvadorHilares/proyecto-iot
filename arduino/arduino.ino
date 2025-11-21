#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN DE PINES Y HARDWARE
// ---------------------------------------------------------------------------

// Sensores
#define PIN_MQ2         A7      // MQ-2 PIN ANALOGIC
#define PIN_DHT         41       // DHT PIN DIGITAL
#define PIN_TRIG        37      // HC-SR04 Trigger
#define PIN_ECHO        39       // HC-SR04 Echo

// Actuadores
#define PIN_BUZZER      5      // PWM
#define PIN_LED_RED     2
#define PIN_LED_YELLOW  4
#define PIN_LED_GREEN   3

// Comunicación
// Usaremos Serial (USB) para debug. Si conectas la RPi a pines TX1/RX1, cambia a "Serial1"
#define RPI_SERIAL      Serial  

LiquidCrystal_I2C lcd(0x27, 16, 2);  // Dirección usual 0x27 o 0x3F
DHT dht(PIN_DHT, DHT11);

// ---------------------------------------------------------------------------
// 2. CONSTANTES Y VARIABLES GLOBALES
// ---------------------------------------------------------------------------

// Estados del Sistema
enum SystemState {
  STATE_BOOT,
  STATE_CALIBRATION,
  STATE_MONITORING
};

SystemState currentState = STATE_BOOT;

// Variable interrupcion
volatile bool tick_2s_flag = false; 

// Variables calibracion
float base_gas = 0;
float base_temp = 0;
float base_hum = 0;
int calibration_ticks = 0;
const int TARGET_CALIBRATION_TICKS = 15; 

// Constantes
const float K_GAS = 1.0;    // Peso para el humo
const float K_TEMP = 1.5;   // Peso para la temperatura
const float K_HUM = 0.5;    // Peso para la humedad (inverso)

const float SCORE_WARNING = 30.0; // Umbral Advertencia
const float SCORE_DANGER = 80.0;  // Umbral Fuego Confirmado
const int DIST_PROXIMITY = 100;   // cm (Alerta presencia)

// Variables de Lectura Actual
float curr_gas, curr_temp, curr_hum, curr_dist;
float risk_score = 0;
bool tala_alert_active = false;

// ---------------------------------------------------------------------------
// 3. CONFIGURACIÓN DE HARDWARE (SETUP)
// ---------------------------------------------------------------------------
void setup() {
  RPI_SERIAL.begin(115200); 
  lcd.init();
  lcd.backlight();
  dht.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // B. Fase 1: POWER ON (Estabilización - 5 Segundos)
  // El MQ-2 necesita precalentar su resistencia interna 
  lcd.setCursor(0, 0);
  lcd.print("SISTEMA ARBOL SOS");
  lcd.setCursor(0, 1);
  lcd.print("Estabilizando...");
  
  digitalWrite(PIN_LED_YELLOW, HIGH);
  delay(5000); 
  digitalWrite(PIN_LED_YELLOW, LOW);

  // C. Configuración del Timer 1 (Interrupción cada 2 segundos)
  // Frecuencia CPU = 16MHz. Prescaler = 1024.
  // Ticks necesarios = (2s * 16,000,000) / 1024 = 31250
  noInterrupts();           // Deshabilitar interrupciones
  TCCR1A = 0;               // Limpiar registros
  TCCR1B = 0;
  TCNT1  = 0;               // Inicializar contador
  OCR1A = 31249;            // Valor de comparación (31250 - 1)
  TCCR1B |= (1 << WGM12);   // Modo CTC (Clear Timer on Compare)
  TCCR1B |= (1 << CS12) | (1 << CS10); // Prescaler 1024
  TIMSK1 |= (1 << OCIE1A);  // Habilitar interrupción por comparación A
  interrupts();             // Habilitar interrupciones

  currentState = STATE_CALIBRATION;
  lcd.clear();
}

// ---------------------------------------------------------------------------
// 4. RUTINA DE SERVICIO DE INTERRUPCIÓN (ISR) - EL CORAZÓN
// ---------------------------------------------------------------------------
ISR(TIMER1_COMPA_vect) {
  tick_2s_flag = true; 
}

// ---------------------------------------------------------------------------
// 5. FUNCIONES AUXILIARES DE SENSORES
// ---------------------------------------------------------------------------

void readSensors() {
  // 1. MQ-2 (Analógico)
  // Leemos el valor raw (0-1023). En un entorno real, convertiríamos a Rs/Ro.
  curr_gas = analogRead(PIN_MQ2); 

  // 2. DHT11 (Digital Lento)
  // Respetamos el intervalo de 2s indicado en la hoja de datos 
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  
  // Validación básica para no meter ruido en el cálculo
  if (!isnan(t)) curr_temp = t;
  if (!isnan(h)) curr_hum = h;

  // 3. HC-SR04 (Ultrasonido)
  // Trigger de 10us
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  // Timeout de 30ms (aprox 5 metros) para evitar bloqueo si no hay eco
  long duration = pulseIn(PIN_ECHO, HIGH, 30000); 
  if (duration == 0) curr_dist = 999; // Fuera de rango
  else curr_dist = duration * 0.034 / 2;
}

// ---------------------------------------------------------------------------
// 6. BUCLE PRINCIPAL (LOOP)
// ---------------------------------------------------------------------------
void loop() {
  // Verificamos siempre si la RPi manda alerta de tala
  if (RPI_SERIAL.available() > 0) {
    String msg = RPI_SERIAL.readStringUntil('\n');
    msg.trim(); // Quitar espacios
    if (msg == "ALERTA_TALA") {
      tala_alert_active = true;
    } else if (msg == "OK_NORMAL") {
      tala_alert_active = false;
    }
  }

  // --- MÁQUINA DE ESTADOS ---
  
  switch (currentState) {
    
    // ============================================================
    // ESTADO B: CALIBRACIÓN (30 Segundos)
    // ============================================================
    case STATE_CALIBRATION:
      if (tick_2s_flag) {
        tick_2s_flag = false; // Consumir flag
        
        readSensors();
        
        // Acumular valores para el promedio
        base_gas += curr_gas;
        base_temp += curr_temp;
        base_hum += curr_hum;
        
        calibration_ticks++;
        
        // Feedback visual
        lcd.setCursor(0, 0);
        lcd.print("Calibrando...");
        lcd.setCursor(0, 1);
        lcd.print("T: " + String(calibration_ticks * 2) + "/30s");
        
        // Parpadeo LED Amarillo durante calibración
        digitalWrite(PIN_LED_YELLOW, !digitalRead(PIN_LED_YELLOW));

        // Condición de Salida
        if (calibration_ticks >= TARGET_CALIBRATION_TICKS) {
          base_gas /= TARGET_CALIBRATION_TICKS;
          base_temp /= TARGET_CALIBRATION_TICKS;
          base_hum /= TARGET_CALIBRATION_TICKS;
          
          currentState = STATE_MONITORING;
          lcd.clear();
          digitalWrite(PIN_LED_YELLOW, LOW);
        }
      }
      break;

    // ============================================================
    // ESTADO C: MONITOREO ACTIVO
    // ============================================================
    case STATE_MONITORING:
      
      // 1. Tareas Sincronizadas (Cada 2 segundos)
      if (tick_2s_flag) {
        tick_2s_flag = false;
        
        readSensors();
        
        // --- Cálculo de Riesgo Ponderado ---
        // Delta positivo = peligro (más gas, más temp, menos humedad)
        float delta_gas = (curr_gas - base_gas);
        float delta_temp = (curr_temp - base_temp);
        float delta_hum = (base_hum - curr_hum); // Inverso: bajar humedad es peligroso
        
        // Evitar valores negativos que resten riesgo
        if(delta_gas < 0) delta_gas = 0;
        if(delta_temp < 0) delta_temp = 0;
        
        risk_score = (K_GAS * delta_gas) + (K_TEMP * delta_temp) + (K_HUM * delta_hum);
        
        // --- Transmisión UART (Heartbeat de datos) ---
        RPI_SERIAL.print("S:DATOS,G:");
        RPI_SERIAL.print(curr_gas);
        RPI_SERIAL.print(",T:");
        RPI_SERIAL.print(curr_temp);
        RPI_SERIAL.print(",H:");
        RPI_SERIAL.print(curr_hum);
        RPI_SERIAL.print(",D:");
        RPI_SERIAL.print(curr_dist);
        RPI_SERIAL.print(",R:"); // Enviamos también el puntaje calculado
        RPI_SERIAL.println(risk_score);
        
        // Transmisión Extraordinaria
        if (risk_score > SCORE_DANGER) {
           RPI_SERIAL.print("ALERTA:PELIGRO_PUNTAJE:");
           RPI_SERIAL.println(risk_score);
        }
      }

      // 2. Evaluación Lógica y Actuación (Se ejecuta rápido en cada ciclo del loop)
      // El estado de los actuadores se refresca constantemente para asegurar respuesta inmediata
      // a eventos como Tala (que llega por Serial asíncrono) o Proximidad.

      // PRIORIDAD 1: TALA ILEGAL (Externa)
      if (tala_alert_active) {
        actuateAlarm("ALERTA: TALA", true); // Sirena ON
      }
      // PRIORIDAD 2: INCENDIO (Interna - Algoritmo)
      else if (risk_score > SCORE_DANGER) {
        actuateAlarm("PELIGRO: FUEGO", true);
      }
      // PRIORIDAD 3: PRESENCIA (Silenciosa)
      else if (curr_dist < DIST_PROXIMITY) {
        // Alerta silenciosa: Solo LCD y LED Amarillo fijo, SIN buzzer
        updateLEDs(false, true, false); 
        digitalWrite(PIN_BUZZER, LOW);
        lcd.setCursor(0, 0);
        lcd.print("MOVIMIENTO DET.");
        lcd.setCursor(0, 1);
        lcd.print("Dist: " + String(curr_dist) + "cm  ");
      }
      // PRIORIDAD 4: ADVERTENCIA AMBIENTAL
      else if (risk_score > SCORE_WARNING) {
        updateLEDs(false, true, false);
        digitalWrite(PIN_BUZZER, LOW);
        lcd.setCursor(0, 0);
        lcd.print("Riesgo Elevado  ");
        lcd.setCursor(0, 1);
        lcd.print("Score: " + String(risk_score) + "   ");
      }
      // ESTADO NORMAL
      else {
        updateLEDs(false, false, true); // Solo Verde
        digitalWrite(PIN_BUZZER, LOW);
        
        // Mostrar datos cíclicos en LCD (o estáticos)
        lcd.setCursor(0, 0);
        lcd.print("Monitoreando... ");
        lcd.setCursor(0, 1);
        lcd.print("T:" + String((int)curr_temp) + " H:" + String((int)curr_hum) + "% OK ");
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// 7. FUNCIONES DE CONTROL DE ACTUADORES
// ---------------------------------------------------------------------------

void updateLEDs(bool red, bool yellow, bool green) {
  digitalWrite(PIN_LED_RED, red);
  digitalWrite(PIN_LED_YELLOW, yellow);
  digitalWrite(PIN_LED_GREEN, green);
}

// Rutina de alarma sonora y visual
void actuateAlarm(String lcdMsg, bool soundEnabled) {
  // Parpadeo rápido del LED Rojo (efecto visual de emergencia)
  // Usamos millis para no bloquear con delay()
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  if (millis() - lastBlink > 100) { // 100ms parpadeo rápido
    lastBlink = millis();
    ledState = !ledState;
    digitalWrite(PIN_LED_RED, ledState);
  }
  
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  
  if (soundEnabled) {
    // Tono de sirena básico
    digitalWrite(PIN_BUZZER, HIGH); 
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
  
  lcd.setCursor(0, 0);
  lcd.print(lcdMsg);
  // Limpiar segunda línea para claridad
  lcd.setCursor(0, 1);
  lcd.print("ACCION REQUERIDA");
}