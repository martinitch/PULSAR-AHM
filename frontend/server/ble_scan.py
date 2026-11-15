"""Real Bluetooth scan and link for the development server.

Stdout: one JSON line per event. Stdin: "stop" to finish.
  python ble_scan.py scan
  python ble_scan.py connect AA:BB:CC:DD:EE:FF
"""
from __future__ import annotations

import asyncio
import json
import sys
import threading
import time

from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

ESPRESSIF = 0x02E5
# Standard characteristics read when the ESP (or another device) exposes them.
CHARS = {
    "00002a37-0000-1000-8000-00805f9b34fb": "hr",
    "00002a35-0000-1000-8000-00805f9b34fb": "bp",
    "00002a18-0000-1000-8000-00805f9b34fb": "glucose",
    "00002a1c-0000-1000-8000-00805f9b34fb": "temp",
    "00002a5e-0000-1000-8000-00805f9b34fb": "spo2",
    "00002a5f-0000-1000-8000-00805f9b34fb": "spo2",
}


def emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def watch_stop(loop: asyncio.AbstractEventLoop, stop: asyncio.Event) -> None:
    sys.stdin.readline()
    loop.call_soon_threadsafe(stop.set)


def looks_esp(name: str, manufacturer: dict[int, bytes]) -> bool:
    if ESPRESSIF in manufacturer:
        return True
    folded = name.upper()
    return "ESP32" in folded or "ESP-32" in folded or folded.startswith("ESP") or "ESPRESSIF" in folded


def advertised_name(device: BLEDevice, adv: AdvertisementData) -> str:
    raw = (adv.local_name or device.name or "").strip()
    if not raw or raw.casefold() == "unknown" or raw.upper() == device.address.upper():
        return ""
    return raw


def decode_sfloat(raw: int) -> float:
    mantissa = raw & 0x0FFF
    exponent = raw >> 12
    if mantissa >= 0x0800:
        mantissa -= 0x1000
    if exponent >= 0x0008:
        exponent -= 0x0010
    if mantissa in (0x07FF, -2048):
        return float("nan")
    return mantissa * (10 ** exponent)


def decode_float(raw: int) -> float:
    exp_byte = (raw >> 24) & 0xFF
    exponent = exp_byte - 256 if exp_byte >= 128 else exp_byte
    mantissa = raw & 0x00FFFFFF
    if mantissa & 0x00800000:
        mantissa -= 0x01000000
    if mantissa in (0x7FFFFF, -0x800000):
        return float("nan")
    return mantissa * (10 ** exponent)


def parse_reading(kind: str, data: bytes) -> dict:
    view = data
    if kind == "hr" and len(view) >= 2:
        hr = int.from_bytes(view[1:3], "little") if view[0] & 0x01 else view[1]
        return {"heartRate": hr} if 0 < hr < 250 else {}
    if kind == "bp" and len(view) >= 7:
        flags = view[0]
        kpa = flags & 0x01
        systolic = decode_sfloat(int.from_bytes(view[1:3], "little"))
        diastolic = decode_sfloat(int.from_bytes(view[3:5], "little"))
        if kpa:
            systolic *= 7.50062
            diastolic *= 7.50062
        if systolic != systolic or diastolic != diastolic:
            return {}
        out: dict = {"systolic": round(systolic), "diastolic": round(diastolic)}
        offset = 7 + (7 if flags & 0x02 else 0)
        if flags & 0x04 and len(view) >= offset + 2:
            pulse = decode_sfloat(int.from_bytes(view[offset:offset + 2], "little"))
            if pulse == pulse:
                out["pulse"] = round(pulse)
        return out
    if kind == "glucose" and len(view) >= 10 and (view[0] & 0x02):
        flags = view[0]
        offset = 3 + 7 + (2 if flags & 0x01 else 0)
        if len(view) < offset + 2:
            return {}
        raw = decode_sfloat(int.from_bytes(view[offset:offset + 2], "little"))
        if raw != raw:
            return {}
        mg = raw * 18015.6 if flags & 0x04 else raw * 100000
        rounded = round(mg)
        return {"glucoseMgDl": rounded} if 0 < rounded < 600 else {}
    if kind == "temp" and len(view) >= 5:
        value = decode_float(int.from_bytes(view[1:5], "little"))
        if value != value:
            return {}
        celsius = (value - 32) * 5 / 9 if view[0] & 0x01 else value
        if 30 < celsius < 45:
            return {"temperatureC": round(celsius, 1)}
        return {}
    if kind == "spo2" and len(view) >= 5:
        spo2 = decode_sfloat(int.from_bytes(view[1:3], "little"))
        pulse = decode_sfloat(int.from_bytes(view[3:5], "little"))
        if spo2 != spo2:
            return {}
        out = {"spo2": round(spo2, 1)}
        if pulse == pulse:
            out["pulse"] = round(pulse)
        return out
    return {}


async def scan(stop: asyncio.Event) -> None:
    last: dict[str, tuple[float, str]] = {}
    lock = threading.Lock()

    def on_adv(device: BLEDevice, adv: AdvertisementData) -> None:
        name = advertised_name(device, adv)
        esp = looks_esp(name, adv.manufacturer_data)
        if not name and not esp:
            return
        shown = name or device.address
        now = time.monotonic()
        with lock:
            prev = last.get(device.address)
            if prev and prev[1] == shown and now - prev[0] < 0.8:
                return
            last[device.address] = (now, shown)
        emit({
            "evt": "device",
            "id": device.address,
            "name": shown,
            "rssi": int(adv.rssi or 0),
            "esp": esp,
        })

    scanner = BleakScanner(on_adv, scanning_mode="active")
    try:
        await scanner.start()
    except Exception as exc:
        emit({"evt": "error", "error": str(exc)})
        return
    emit({"evt": "ready"})
    await stop.wait()
    await scanner.stop()


async def connect(address: str, stop: asyncio.Event) -> None:
    def on_value(kind: str, data: bytearray) -> None:
        reading = parse_reading(kind, bytes(data))
        if reading:
            emit({"evt": "reading", **reading})

    try:
        async with BleakClient(address, timeout=20.0) as client:
            services: list[str] = []
            for service in client.services:
                services.append(service.uuid)
                for char in service.characteristics:
                    kind = CHARS.get(char.uuid.lower())
                    if not kind:
                        continue
                    props = char.properties
                    if "notify" in props or "indicate" in props:
                        def callback(_char: BleakGATTCharacteristic, data: bytearray, k: str = kind) -> None:
                            on_value(k, data)
                        await client.start_notify(char, callback)
                    elif "read" in props:
                        on_value(kind, bytearray(await client.read_gatt_char(char)))
            emit({"evt": "connected", "id": address, "services": services[:24]})
            await stop.wait()
    except Exception as exc:
        emit({"evt": "error", "error": str(exc)})
        return
    emit({"evt": "disconnected", "id": address})


async def amain() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "scan"
    stop = asyncio.Event()
    threading.Thread(target=watch_stop, args=(asyncio.get_running_loop(), stop), daemon=True).start()
    if mode == "connect":
        address = sys.argv[2] if len(sys.argv) > 2 else ""
        if not address:
            emit({"evt": "error", "error": "adresse manquante"})
            return
        await connect(address, stop)
        return
    await scan(stop)


if __name__ == "__main__":
    try:
        asyncio.run(amain())
    except Exception as exc:
        emit({"evt": "error", "error": str(exc)})
        sys.exit(1)
