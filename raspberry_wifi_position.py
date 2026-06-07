#!/usr/bin/env python3
import argparse
import json
import math
import re
import subprocess
import time
import urllib.error
import urllib.request

API_KEY = "AIzaSyDcjgVtCEZGSOepoX4c5mBsZ0UtbjvTEpU"
DATABASE_URL = "https://flathead-d96d6-default-rtdb.europe-west1.firebasedatabase.app"
SCAN_INTERVAL_SECONDS = 1.5
MISSING_NETWORK_PENALTY = 25
AUTO_LEARN_SCORE_THRESHOLD = 18


def now_ms():
    return int(time.time() * 1000)


def firebase_key(text):
    return re.sub(r"[.#$/\[\]]", "_", str(text)).strip() or "unknown"


def request_json(method, url, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def sign_in_anonymously():
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    response = request_json("POST", url, {"returnSecureToken": True})
    return response["idToken"]


def db_url(path, token):
    path = path.strip("/")
    return f"{DATABASE_URL}/{path}.json?auth={token}"


def firebase_get(path, token):
    return request_json("GET", db_url(path, token))


def firebase_put(path, token, value):
    return request_json("PUT", db_url(path, token), value)


def run_command(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL)


def scan_with_iwlist(interface):
    output = run_command(["iwlist", interface, "scan"])
    networks = {}
    current_bssid = None
    current_ssid = None
    current_rssi = None

    for line in output.splitlines():
        address_match = re.search(r"Address: ([0-9A-Fa-f:]{17})", line)
        if address_match:
            if current_bssid and current_rssi is not None:
                key = firebase_key(current_bssid)
                networks[key] = {
                    "ssid": current_ssid or "hidden",
                    "bssid": current_bssid,
                    "rssi": current_rssi,
                }
            current_bssid = address_match.group(1)
            current_ssid = None
            current_rssi = None
            continue

        ssid_match = re.search(r'ESSID:"(.*)"', line)
        if ssid_match:
            current_ssid = ssid_match.group(1) or "hidden"
            continue

        rssi_match = re.search(r"Signal level=(-?\d+)", line)
        if rssi_match:
            current_rssi = int(rssi_match.group(1))

    if current_bssid and current_rssi is not None:
        key = firebase_key(current_bssid)
        networks[key] = {
            "ssid": current_ssid or "hidden",
            "bssid": current_bssid,
            "rssi": current_rssi,
        }

    return networks


def scan_with_nmcli():
    output = run_command(["nmcli", "-t", "-f", "SSID,BSSID,SIGNAL", "dev", "wifi", "list", "--rescan", "yes"])
    networks = {}

    for line in output.splitlines():
        parts = re.split(r"(?<!\\):", line)
        if len(parts) < 3:
            continue

        ssid = parts[0].replace("\\:", ":") or "hidden"
        bssid = ":".join(parts[1:-1]).replace("\\:", ":")
        signal = parts[-1]

        try:
            rssi = int(int(signal) / 2 - 100)
        except ValueError:
            continue

        key = firebase_key(bssid or ssid)
        networks[key] = {"ssid": ssid, "bssid": bssid, "rssi": rssi}

    return networks


def scan_wifi(interface):
    try:
        networks = scan_with_nmcli()
        if networks:
            return networks
    except Exception:
        pass

    return scan_with_iwlist(interface)


def compare_networks(current, fingerprint):
    current_keys = set(current.keys())
    fingerprint_keys = set(fingerprint.keys())
    all_keys = current_keys | fingerprint_keys

    if not all_keys:
        return math.inf

    score = 0
    for key in all_keys:
        if key in current and key in fingerprint:
            score += abs(float(current[key]["rssi"]) - float(fingerprint[key]["rssi"]))
        else:
            score += MISSING_NETWORK_PENALTY

    return score / len(all_keys)


def estimate_position(current_networks, fingerprints):
    best = None

    for key, fingerprint in (fingerprints or {}).items():
        networks = fingerprint.get("networks", {})
        score = compare_networks(current_networks, networks)

        if best is None or score < best["score"]:
            confidence = max(0, min(100, 100 - score * 2.5))
            best = {
                "key": key,
                "name": fingerprint.get("name", key),
                "x": fingerprint.get("x", 0),
                "z": fingerprint.get("z", 0),
                "score": round(score, 2),
                "confidence": round(confidence),
                "source": "raspberry-pi-wifi",
                "updatedAt": now_ms(),
            }

    return best


def next_auto_place_name(fingerprints):
    highest = 0

    for fingerprint in (fingerprints or {}).values():
        name = str(fingerprint.get("name", ""))
        match = re.fullmatch(r"Ort (\d+)", name)
        if match:
            highest = max(highest, int(match.group(1)))

    return f"Ort {highest + 1}"


def auto_learn_place(networks, fingerprints, token):
    name = next_auto_place_name(fingerprints)
    key = firebase_key(name)
    fingerprint = {
        "name": name,
        "x": 0,
        "z": 0,
        "autoLearned": True,
        "networks": networks,
        "updatedAt": now_ms(),
    }

    firebase_put(f"position/fingerprints/{key}", token, fingerprint)

    estimate = {
        "key": key,
        "name": name,
        "x": 0,
        "z": 0,
        "score": 0,
        "confidence": 100,
        "source": "raspberry-pi-wifi-auto-learn",
        "autoLearned": True,
        "updatedAt": now_ms(),
    }
    firebase_put("position/estimate", token, estimate)
    return estimate


def calibrate(args, token):
    networks = scan_wifi(args.interface)
    if not networks:
        raise RuntimeError("Keine WLAN-Netzwerke gefunden.")

    name = args.calibrate
    fingerprint = {
        "name": name,
        "x": args.x,
        "z": args.z,
        "autoLearned": False,
        "networks": networks,
        "updatedAt": now_ms(),
    }

    firebase_put(f"position/fingerprints/{firebase_key(name)}", token, fingerprint)
    print(f"Referenzpunkt gespeichert: {name} mit {len(networks)} Netzwerken")


def run_position_loop(args, token):
    print("Starte WLAN-Ortung. Stoppen mit Strg+C.")

    while True:
        networks = scan_wifi(args.interface)
        current = {
            "device": "raspberry-pi",
            "networks": networks,
            "updatedAt": now_ms(),
        }
        firebase_put("position/wifi/current", token, current)

        fingerprints = firebase_get("position/fingerprints", token) or {}
        estimate = estimate_position(networks, fingerprints)

        if args.auto_learn and networks and (not estimate or estimate["score"] > args.auto_learn_threshold):
            estimate = auto_learn_place(networks, fingerprints, token)
            print(f"Neuer Ort automatisch gespeichert: {estimate['name']} | Netze={len(networks)}")
        elif estimate:
            firebase_put("position/estimate", token, estimate)
            print(
                f"Ort: {estimate['name']} | Vertrauen: {estimate['confidence']}% | "
                f"Score={estimate['score']} | Netze={len(networks)}"
            )
        else:
            print(f"Scan OK: {len(networks)} Netze. Auto-Lernen ist ausgeschaltet oder keine Netze gefunden.")

        time.sleep(args.interval)


def main():
    parser = argparse.ArgumentParser(description="WLAN-Fingerprinting Ortung fuer Raspberry Pi")
    parser.add_argument("--interface", default="wlan0", help="WLAN-Interface, meistens wlan0")
    parser.add_argument("--interval", type=float, default=SCAN_INTERVAL_SECONDS, help="Scan-Intervall in Sekunden")
    parser.add_argument("--calibrate", help="Name des Referenzpunktes, z.B. Schreibtisch")
    parser.add_argument("--x", type=float, default=0, help="X-Koordinate des Referenzpunktes")
    parser.add_argument("--z", type=float, default=0, help="Z-Koordinate des Referenzpunktes")
    parser.add_argument("--no-auto-learn", action="store_false", dest="auto_learn", help="Neue Orte nicht automatisch speichern")
    parser.add_argument("--auto-learn-threshold", type=float, default=AUTO_LEARN_SCORE_THRESHOLD, help="Hoeherer Wert lernt weniger neue Orte")
    parser.set_defaults(auto_learn=True)
    args = parser.parse_args()

    token = sign_in_anonymously()

    if args.calibrate:
        calibrate(args, token)
    else:
        run_position_loop(args, token)


if __name__ == "__main__":
    main()
