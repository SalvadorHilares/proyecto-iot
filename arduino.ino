//#include <Wire.h> 
#include <LiquidCrystal_I2C.h>
#include <DHT.h>


#define DHTPIN 2
#define DHTTYPE DHT11
#define InfrPIN 3
#define HumoPIN A7

#define LedRED 4 
#define LedGreen 5
#define Buzzer 6

// Inicializamos el sensor DHT11
DHT dht(DHTPIN, DHTTYPE);
// 16 columnas x 2 filas
LiquidCrystal_I2C lcd(0x27,16,2); 

//registro para contar cuantos segundos
volatile uint8_t secondCounter = 0;
uint8_t flag_timer = 0;
float h=0,t=0;
//MQ
int adc_MQ=0;
float v_MQ; 
//sensor proximidad
uint8_t infr = 0;

//Funcion
float puntaje = 0; 


// --- Interrupt Service Routine (ISR) ---
ISR(TIMER1_COMPA_vect) {
  secondCounter++;
  // Check if 3 seconds have passed
  if (secondCounter >= 3) {
    flag_timer = 1;
    secondCounter = 0;
  }
}


void setup() {
  Serial.begin(9600);
  // start the DHT sensor and LCD
  dht.begin();
  lcd.init();
  // Initialize LEDs and Buzzer, sensor.
  pinMode(LedRED, OUTPUT);
  pinMode(LedGreen, OUTPUT);
  pinMode(Buzzer, OUTPUT);
  pinMode(DHTPIN,INPUT);
  pinMode(InfrPIN,INPUT);

  //Timer1 config
  noInterrupts();
  TCCR1A = 0;
  TCCR1B = 0;
  // Set the Compare Match Register value for 1Hz (1 second)
  OCR1A = 15624;
  // Set CS12 and CS10 bits for 1024 prescaler
  TCCR1B |= (1 << CS12) | (1 << CS10);  
  // Turn on CTC mode (Clear Timer on Compare Match)
  TCCR1B |= (1 << WGM12); 
  // Enable Timer1 Compare Match Interrupt
  TIMSK1 |= (1 << OCIE1A); 
  // Re-enable interrupts
  interrupts();


  //Encender la luz de fondo.
  lcd.backlight();
  // Start with Green ON (System safe)
  digitalWrite(LedGreen, HIGH); 
  digitalWrite(LedRED, LOW);
  digitalWrite(Buzzer, LOW);
}


void loop() {

  if(flag_timer == 1){
    flag_timer = 0; // Reset flag
    
    // --- 1. READ SENSORS ---
    h = dht.readHumidity();
    t = dht.readTemperature();
    adc_MQ = analogRead(HumoPIN);
    infr = digitalRead(InfrPIN);


    // --- 2. CALCULATE SCORE ---
    // Map sensors to 0-100 scale
    float smokeFactor = constrain(map(adc_MQ, 100, 600, 0, 100), 0, 100);
    float tempFactor = constrain(map(t, 20, 60, 0, 100), 0, 100);
    float humFactor = constrain(map(h, 100, 20, 0, 100), 0, 100);
    
    // Calculate Weighted Average
    puntaje = (smokeFactor * 0.6) + (tempFactor * 0.3) + (humFactor * 0.1);

    // IR Override (If IR sees fire, set to Max)
    if (infr == LOW) { 
       puntaje = 100.0;
    }

    // --- 3. ALARM LOGIC  ---
    if (puntaje >= 70) { 
        // --- DANGER MODE ---
        digitalWrite(LedGreen, LOW);   
        digitalWrite(LedRED, HIGH); 
        digitalWrite(Buzzer, HIGH);  
        
        lcd.setCursor(0, 1);
        lcd.print("PELIGRO!!       "); 
    } 
    else {
        // --- SAFE MODE ---
        digitalWrite(LedGreen, HIGH);  
        digitalWrite(LedRED, LOW);   
        digitalWrite(Buzzer, LOW);
        
        lcd.setCursor(0, 1);
        if(puntaje < 30) {
            lcd.print("Normal          ");
        } else {
            lcd.print("Alerta          ");
        }
    }

    // --- 4. DEBUG & DISPLAY ---
    Serial.print("Score: "); Serial.println(puntaje);
    
    lcd.setCursor(0, 0);
    lcd.print("Riesgo: ");
    lcd.print((int)puntaje);
    lcd.print("% ");
  }
}