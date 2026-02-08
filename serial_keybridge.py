#!/usr/bin/env python3
"""
serial_keybridge.py — Arduino serial → keyboard bridge (local, OS-level)

Reads B1:1/B1:0 messages from Arduino and simulates real keypresses
so the game (or any app) receives WASD input without Web Serial API.

Button mapping:
  B1 → W (forward)
  B2 → A (left)
  B3 → S (backward)
  B4 → D (right)

Usage:
  pip3 install pyserial pynput
  python3 serial_keybridge.py

Press Ctrl+C to quit.
"""

import sys
import glob
import time
import serial
from pynput.keyboard import Controller, Key, KeyCode

BAUD = 115200
BUTTON_TO_KEY = {
    'B1': 'w',
    'B2': 'a',
    'B3': 's',
    'B4': 'd',
}

keyboard = Controller()
held_keys: dict[str, bool] = {}


def find_arduino_port() -> str | None:
    """Auto-detect Arduino serial port on macOS."""
    candidates = glob.glob('/dev/cu.usbmodem*')
    if candidates:
        return candidates[0]
    candidates = glob.glob('/dev/cu.usbserial*')
    if candidates:
        return candidates[0]
    return None


def process_line(line: str):
    """Parse 'B1:1' or 'B2:0' and press/release the mapped key."""
    line = line.strip()
    if not line:
        return

    parts = line.split(':')
    if len(parts) != 2:
        return

    button_id = parts[0]
    try:
        pressed = int(parts[1]) == 1
    except ValueError:
        return

    key_char = BUTTON_TO_KEY.get(button_id)
    if not key_char:
        return

    already_held = held_keys.get(button_id, False)

    if pressed and not already_held:
        keyboard.press(key_char)
        held_keys[button_id] = True
        print(f'  {button_id} -> {key_char.upper()} DOWN')
    elif not pressed and already_held:
        keyboard.release(key_char)
        held_keys[button_id] = False
        print(f'  {button_id} -> {key_char.upper()} UP')


def main():
    port_path = find_arduino_port()
    if not port_path:
        print('No Arduino found. Plug it in and try again.')
        sys.exit(1)

    print(f'Connecting to {port_path} at {BAUD} baud...')

    try:
        ser = serial.Serial(port_path, BAUD, timeout=1)
    except serial.SerialException as e:
        print(f'Failed to open port: {e}')
        sys.exit(1)

    # Wait for Arduino reset
    time.sleep(2)
    print('Connected! Press Ctrl+C to quit.\n')

    try:
        while True:
            raw = ser.readline()
            if raw:
                line = raw.decode('utf-8', errors='ignore').strip()
                if line:
                    process_line(line)
    except KeyboardInterrupt:
        print('\nQuitting...')
    finally:
        # Release any held keys
        for button_id, is_held in held_keys.items():
            if is_held:
                key_char = BUTTON_TO_KEY.get(button_id)
                if key_char:
                    keyboard.release(key_char)
        ser.close()
        print('Done.')


if __name__ == '__main__':
    main()
