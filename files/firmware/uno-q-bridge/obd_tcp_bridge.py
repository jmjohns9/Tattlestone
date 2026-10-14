#!/usr/bin/env python3
"""Tellstone Network Mode bridge for the Arduino UNO Q (Linux side).

Forwards bytes between one TCP client (the Tellstone app) and an OBD adapter
on a serial device: the OBDLink MX bound over Bluetooth (/dev/rfcomm0) or a
USB STN1110/ELM327 (/dev/ttyUSB0, /dev/ttyACM0).

Traffic passes through untouched except for one guard: Mode 04 (clear DTCs)
is dropped, so the app's read-only promise holds for any client.

Stdlib only (no pyserial):
    python3 obd_tcp_bridge.py --device /dev/rfcomm0 --baud 115200 --port 35000
"""
import argparse
import os
import select
import socket
import termios
import tty

BAUDS = {9600: termios.B9600, 38400: termios.B38400, 115200: termios.B115200}


def open_serial(path: str, baud: int) -> int:
    fd = os.open(path, os.O_RDWR | os.O_NOCTTY)
    tty.setraw(fd)
    attrs = termios.tcgetattr(fd)
    attrs[4] = attrs[5] = BAUDS[baud]          # ispeed, ospeed
    attrs[2] |= termios.CLOCAL | termios.CREAD  # ignore modem lines
    termios.tcsetattr(fd, termios.TCSANOW, attrs)
    return fd


def is_blocked(line: bytes) -> bool:
    return line.replace(b" ", b"").upper() == b"04"


def serve(device: str, baud: int, port: int) -> None:
    server = socket.create_server(("0.0.0.0", port), reuse_port=False)
    print(f"Bridge listening on :{port} -> {device} @ {baud}", flush=True)
    while True:
        client, addr = server.accept()
        client.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        print(f"Client {addr[0]} connected", flush=True)
        try:
            fd = open_serial(device, baud)
        except OSError as e:
            print(f"Cannot open {device}: {e}", flush=True)
            client.close()
            continue
        line = b""
        try:
            while True:
                ready, _, _ = select.select([client, fd], [], [])
                if client in ready:
                    data = client.recv(512)
                    if not data:
                        break
                    # App -> adapter a line at a time so the guard sees whole commands
                    for b in data:
                        ch = bytes([b])
                        if ch == b"\r":
                            if is_blocked(line):
                                client.sendall(b"?\r\r>")  # an ELM327's answer to an unknown command
                                print("Blocked Mode 04 (clear DTCs)", flush=True)
                            else:
                                os.write(fd, line + b"\r")
                            line = b""
                        elif ch != b"\n" and len(line) < 64:
                            line += ch
                if fd in ready:
                    client.sendall(os.read(fd, 512))  # adapter -> app, unchanged
        except OSError as e:
            print(f"Link error: {e}", flush=True)
        finally:
            os.close(fd)
            client.close()
            print("Client disconnected", flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--device", default="/dev/rfcomm0")
    p.add_argument("--baud", type=int, default=115200, choices=sorted(BAUDS))
    p.add_argument("--port", type=int, default=35000)
    a = p.parse_args()
    serve(a.device, a.baud, a.port)
