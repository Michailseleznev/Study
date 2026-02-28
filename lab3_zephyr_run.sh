#!/usr/bin/env bash
set -euo pipefail

# Practical work 3: Zephyr + native_sim echo server
# Run this script inside Ubuntu Desktop VM terminal.

echo "[1/8] Installing host dependencies"
sudo apt update

ARCH="$(dpkg --print-architecture)"
if [[ "$ARCH" == "arm64" ]]; then
  # gcc-multilib/g++-multilib are typically unavailable on ARM64.
  sudo apt install --no-install-recommends -y \
    git cmake ninja-build gperf ccache dfu-util device-tree-compiler wget \
    python3-dev python3-venv python3-tk xz-utils file make gcc g++ libsdl2-dev libmagic1
else
  sudo apt install --no-install-recommends -y \
    git cmake ninja-build gperf ccache dfu-util device-tree-compiler wget \
    python3-dev python3-venv python3-tk xz-utils file make gcc gcc-multilib g++-multilib \
    libsdl2-dev libmagic1
fi

echo "[2/8] Installing traffic tools"
sudo apt install -y wireshark tcpdump netcat-openbsd

echo "[3/8] Creating Python virtual environment"
python3 -m venv ~/zephyrproject/.venv
# shellcheck source=/dev/null
source ~/zephyrproject/.venv/bin/activate
python -m pip install --upgrade pip
pip install west

echo "[4/8] Initializing Zephyr workspace"
if [[ ! -d ~/zephyrproject/.west ]]; then
  west init ~/zephyrproject
fi
cd ~/zephyrproject
west update
west zephyr-export
west packages pip --install

echo "[5/8] Installing Zephyr SDK"
cd ~/zephyrproject/zephyr
west sdk install

echo "[6/8] Building echo_server for native_sim"
west build -b native_sim samples/net/sockets/echo_server -- -DEXTRA_CONF_FILE=overlay-nsos.conf

echo "[7/8] Starting server (Terminal #1 stays open)"
west build -t run

# Further steps (in other terminals):
# Terminal #2:
#   ss -tnlp | grep zephyr
#   sudo tcpdump -A -i lo port <PORT>
# Terminal #3:
#   nc 127.0.0.1 <PORT>
#   Username=admin&password=Supersecret123
