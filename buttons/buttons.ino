// buttons.ino — 4 push buttons with INPUT_PULLUP + debounce
// Sends structured serial messages on state change:
//   B1:1\n  = Button 1 pressed
//   B1:0\n  = Button 1 released
// Baud: 115200

const int BUTTON_PINS[] = {2, 3, 4, 5};
const int NUM_BUTTONS = 4;
const unsigned long DEBOUNCE_MS = 50;

bool buttonState[NUM_BUTTONS];
bool lastReading[NUM_BUTTONS];
unsigned long lastDebounceTime[NUM_BUTTONS];

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
    buttonState[i] = HIGH;
    lastReading[i] = HIGH;
    lastDebounceTime[i] = 0;
  }

  // Send initial state of all buttons
  for (int i = 0; i < NUM_BUTTONS; i++) {
    Serial.print("B");
    Serial.print(i + 1);
    Serial.print(":");
    Serial.println(buttonState[i] == LOW ? 1 : 0);
  }
}

void loop() {
  for (int i = 0; i < NUM_BUTTONS; i++) {
    bool reading = digitalRead(BUTTON_PINS[i]);

    if (reading != lastReading[i]) {
      lastDebounceTime[i] = millis();
    }
    lastReading[i] = reading;

    if ((millis() - lastDebounceTime[i]) >= DEBOUNCE_MS) {
      if (reading != buttonState[i]) {
        buttonState[i] = reading;

        // Send: B<num>:<state>  (1=pressed, 0=released)
        Serial.print("B");
        Serial.print(i + 1);
        Serial.print(":");
        Serial.println(buttonState[i] == LOW ? 1 : 0);
      }
    }
  }
}
