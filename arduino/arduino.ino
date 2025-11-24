#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define DEBUG_MODE true 
#define COMM_SERIAL Serial 

// 1. PIN DEFINITIONS
#define PIN_MQ2         A7      
#define PIN_DHT         41      
#define PIN_TRIG        37      
#define PIN_ECHO        39      
#define PIN_BUZZER      5       
#define PIN_LED_RED     2
#define PIN_LED_YELLOW  4
#define PIN_LED_GREEN   3

// 2. CONSTANTS 
const float K_GAS   = 2.5;  
const float K_TEMP  = 2.0; 
const float K_HUM   = 1.0; 

// Thresholds
const float SCORE_WARNING      = 40.0;  
const float SCORE_DANGER       = 100.0; // High threshold to filter noise
const int   GAS_THRESHOLD_FIRE = 500;   // Absolute Emergency limit
const int   DIST_PROXIMITY     = 100;   // cm

// Stability 
const float ALPHA_CALIBRATION = 0.2; 
const float ALPHA_RUNTIME     = 0.01;

// Timer 3 runs at 10Hz (0.1s). So 50 ticks = 5.0 seconds.
const int ALARM_DURATION_TICKS = 50; 

// 3. GLOBAL VARIABLES
LiquidCrystal_I2C lcd(0x27, 16, 2); 
DHT dht(PIN_DHT, DHT11);

// Sensor Data
float curr_gas, curr_temp, curr_hum, curr_dist;
float base_gas, base_temp, base_hum;
float delta_gas, delta_temp, delta_hum; 
float risk_score = 0;

// System State
enum SystemState { STATE_BOOT, STATE_CALIBRATION, STATE_MONITORING };
SystemState currentState = STATE_BOOT;

// INTERRUPT FLAGS & COUNTERS
volatile bool flag_read_sensors = false; // Set by Timer 1
volatile int  calib_step_counter = 0;

// ALARM COUNTDOWNS (Managed by Timer 3)
// If value > 0, the alarm is ACTIVE.
volatile int timer_fire_ticks = 0;
volatile int timer_tala_ticks = 0;
volatile int timer_pres_ticks = 0; // Added Presence Timer
volatile bool blink_state = false; // Toggles every 0.1s

// 4. SETUP

void setup() {
  COMM_SERIAL.begin(9600); 
  lcd.init();
  lcd.backlight();
  dht.begin();

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  lcd.print("SYSTEM BOOT...");
  delay(1000); 

  // --- TIMER 1 SETUP (0.5Hz / 2s) - SENSORS ---
  noInterrupts();
  TCCR1A = 0; TCCR1B = 0; TCNT1  = 0;
  OCR1A = 31249;            // 16MHz/1024/0.5Hz - 1
  TCCR1B |= (1 << WGM12);   // CTC
  TCCR1B |= (1 << CS12) | (1 << CS10); // Prescaler 1024
  TIMSK1 |= (1 << OCIE1A);  // Enable Interrupt

  // --- TIMER 3 SETUP (10Hz / 0.1s) - ALARMS & BLINK ---
  TCCR3A = 0; TCCR3B = 0; TCNT3  = 0;
  OCR3A = 1561;             // 16MHz/1024/10Hz - 1 (approx 1562.5)
  TCCR3B |= (1 << WGM32);   // CTC
  TCCR3B |= (1 << CS32) | (1 << CS30); // Prescaler 1024
  TIMSK3 |= (1 << OCIE3A);  // Enable Interrupt
  interrupts();

  // Initial Read
  readSensors();
  base_gas = curr_gas; base_temp = curr_temp; base_hum = curr_hum;
  currentState = STATE_CALIBRATION;
}

// 5. INTERRUPT SERVICE ROUTINES (ISRs)

// ISR TIMER 1: Triggers Sensor Reading (Every 2s)
ISR(TIMER1_COMPA_vect) {
  flag_read_sensors = true;
}

// ISR TIMER 3: Handles Actuators & Countdowns (Every 0.1s)
ISR(TIMER3_COMPA_vect) {
  //Decrement Alarm Timers
  if (timer_fire_ticks > 0) timer_fire_ticks--;
  if (timer_tala_ticks > 0) timer_tala_ticks--;
  if (timer_pres_ticks > 0) timer_pres_ticks--; // Presence CountDown

  //Global Blink State
  blink_state = !blink_state;
}

// 6. SENSOR & HELPER FUNCTIONS

float readAverageMQ2() {
  long sum = 0;
  // 50 samples * 500us = ~25ms Total Block 
  const int SAMPLES = 50; 
  for(int i=0; i<SAMPLES; i++) {
    sum += analogRead(PIN_MQ2);
    delayMicroseconds(500); 
  }
  return (float)sum / SAMPLES;
}

void readSensors() {
  curr_gas = readAverageMQ2(); 
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) curr_temp = t;
  if (!isnan(h)) curr_hum = h;

  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long duration = pulseIn(PIN_ECHO, HIGH, 25000); 
  if (duration == 0) curr_dist = 999; 
  else curr_dist = duration * 0.034 / 2;
  if (curr_dist == 0) curr_dist = 999;
}

void updateBaselines(float alpha) {
    base_gas  = (alpha * curr_gas)  + ((1.0 - alpha) * base_gas);
    base_temp = (alpha * curr_temp) + ((1.0 - alpha) * base_temp);
    base_hum  = (alpha * curr_hum)  + ((1.0 - alpha) * base_hum);
}




// 7. DEEP DEBUG & ACTUATORS

void handleActuators() {
  bool fire_active = (timer_fire_ticks > 0);
  bool tala_active = (timer_tala_ticks > 0);
  bool pres_active = (timer_pres_ticks > 0);

  if (fire_active || tala_active) {
      digitalWrite(PIN_BUZZER, HIGH);
      
      if (blink_state) digitalWrite(PIN_LED_RED, HIGH);
      else digitalWrite(PIN_LED_RED, LOW);
      
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_GREEN, LOW);

      lcd.setCursor(0, 0);
      if (fire_active && tala_active) lcd.print("CRITICAL: ALL!! ");
      else if (fire_active)           lcd.print("DANGER: FIRE!   ");
      else                            lcd.print("ALERT: LOGGING! ");

      lcd.setCursor(0, 1);
      lcd.print("Tmr:" + String(fire_active ? timer_fire_ticks : timer_tala_ticks) + "   ");
  }
  else if (pres_active) {
      digitalWrite(PIN_BUZZER, LOW); // Silent warning
      digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, HIGH); // Solid Yellow

      lcd.setCursor(0, 0); lcd.print("MOVEMENT DET.   ");
      lcd.setCursor(0, 1); lcd.print("Tmr: " + String(timer_pres_ticks) + " D:" + String((int)curr_dist) + " ");
  }
  // --- PRIORITY 3: NORMAL ---
  else {
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_GREEN, HIGH);

      lcd.setCursor(0, 0); lcd.print("SYSTEM ARMED    ");
      lcd.setCursor(0, 1); lcd.print("G:" + String((int)curr_gas) + " S:" + String((int)risk_score) + "   ");
  }
}


void printDeepDebug() {
    if (!DEBUG_MODE) {
        // Protocolo: HEADER,valor1,valor2...
        if (timer_fire_ticks > 0) {
            COMM_SERIAL.print("ALERTA_FUEGO,");
            COMM_SERIAL.println(risk_score, 0); // Mandamos el Score
        }
        else if (timer_pres_ticks > 0) {
            COMM_SERIAL.print("ALERTA_PRESENCIA,");
            COMM_SERIAL.println(curr_dist, 0); // Mandamos la distancia en cm
        }
        else {
            COMM_SERIAL.print("NORMAL,");
            COMM_SERIAL.print(delta_gas, 1); 
            COMM_SERIAL.print(",");
            COMM_SERIAL.print(delta_temp, 1); 
            COMM_SERIAL.print(",");
            COMM_SERIAL.println(delta_hum, 1);
        }
        return;
    }

    unsigned long uptime = millis() / 1000;
    COMM_SERIAL.print("\n========== [TIME: "); COMM_SERIAL.print(uptime); COMM_SERIAL.println("s] ==========");
    
    // 1. Raw vs Base
    COMM_SERIAL.print("[SENSORS] | Gas: "); COMM_SERIAL.print(curr_gas); COMM_SERIAL.print("/"); COMM_SERIAL.print(base_gas);
    COMM_SERIAL.print(" | Temp: "); COMM_SERIAL.print(curr_temp); COMM_SERIAL.print("/"); COMM_SERIAL.print(base_temp);
    COMM_SERIAL.print(" | Hum: "); COMM_SERIAL.print(curr_hum); COMM_SERIAL.print("/"); COMM_SERIAL.println(base_hum);

    // 2. Logic
    COMM_SERIAL.print("[LOGIC  ] | Score: "); COMM_SERIAL.print(risk_score);
    COMM_SERIAL.print(" | Threshold: "); COMM_SERIAL.println(SCORE_DANGER);

    // 3. Timers
    COMM_SERIAL.print("[ALARMS ] | FIRE_TMR: "); COMM_SERIAL.print(timer_fire_ticks);
    COMM_SERIAL.print(" | TALA_TMR: "); COMM_SERIAL.print(timer_tala_ticks);
    COMM_SERIAL.print(" | PRES_TMR: "); COMM_SERIAL.println(timer_pres_ticks);
    
    COMM_SERIAL.println("=========================================");
}


// 8. MAIN LOOP
void loop() {
  
  if (COMM_SERIAL.available() > 0) {
    String msg = COMM_SERIAL.readStringUntil('\n');
    msg.trim();
    if (msg == "ALERTA_TALA") {
       timer_tala_ticks = ALARM_DURATION_TICKS; 
    }
  }

  switch (currentState) {
    case STATE_CALIBRATION:
      if (flag_read_sensors) {
        flag_read_sensors = false;
        readSensors();
        updateBaselines(ALPHA_CALIBRATION);
        calib_step_counter++;
        
        lcd.setCursor(0, 0); lcd.print("CALIBRATING...  ");
        lcd.setCursor(0, 1); lcd.print(String(calib_step_counter) + "/15  " + "G:" + String((int)curr_gas));
        
        if (calib_step_counter >= 15) {
          currentState = STATE_MONITORING;
          lcd.clear();
        }
      }
      break;

    case STATE_MONITORING:
      if (flag_read_sensors) {
        flag_read_sensors = false;
        readSensors();

        // 1. CALCULATIONS
        delta_gas = curr_gas - base_gas;
        delta_temp = curr_temp - base_temp;
        delta_hum = base_hum - curr_hum;

        if(delta_gas < 0) delta_gas = 0;
        if(delta_temp < 0) delta_temp = 0;
        if(delta_hum < 0) delta_hum = 0;

        risk_score = (K_GAS * delta_gas) + (K_TEMP * delta_temp) + (K_HUM * delta_hum);
        if (delta_temp > 2.0 && delta_hum > 5.0) risk_score += 20.0;

        // 2. FIRE LOGIC (WITH PERSISTENCE)
        static int fire_persistence = 0;
        
        bool massive_fire = (curr_gas > GAS_THRESHOLD_FIRE);
        bool potential_fire = (risk_score > SCORE_DANGER);

        if (massive_fire) {
             timer_fire_ticks = ALARM_DURATION_TICKS;
             fire_persistence = 0;
        } 
        else if (potential_fire) {
             fire_persistence++;
             // REQUIRE 2 CONSECUTIVE CYCLES (4 Seconds) of High Score
             if (fire_persistence >= 2) {
                 timer_fire_ticks = ALARM_DURATION_TICKS;
                 fire_persistence = 0; 
             }
        } 
        else {
             fire_persistence = 0;
             // Only update baseline if air is clean
             if (curr_gas < base_gas) updateBaselines(0.05); // Fast recover
             else updateBaselines(0.002); // Slow drift
        }

        // 3. PRESENCE LOGIC (WITH TIMER LATCH)
        if (curr_dist < DIST_PROXIMITY) {
            timer_pres_ticks = ALARM_DURATION_TICKS; 
        }

        // 4. DEBUG
        printDeepDebug(); 
      }

      handleActuators();
      break;
  }
}
