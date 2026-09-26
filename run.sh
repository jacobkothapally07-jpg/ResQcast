#!/usr/bin/env bash
# ==============================================================================
# 🚀 RakshaCast-Forge One-Click Launcher & Verification
# ==============================================================================

set -e
cd "$(dirname "$0")"

echo "=============================================================================="
echo "  🛡️ RAKSHACAST-FORGE: MULTIMODAL DISASTER INTELLIGENCE PLATFORM              "
echo "  Microsoft HackForge Edition - Problem Statement 2                           "
echo "=============================================================================="

# Check Python environment
if [ -d "../backend/venv" ]; then
    PYTHON_BIN="../backend/venv/bin/python"
elif [ -d "venv" ]; then
    PYTHON_BIN="venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "🧪 Running Automated Evaluation Test Suite..."
PYTHONPATH=backend $PYTHON_BIN backend/test_suite.py

echo ""
echo "🚀 Starting RakshaCast-Forge Server on http://0.0.0.0:8088..."
echo "=============================================================================="
echo "  👉 OPEN DASHBOARD: http://localhost:8088"
echo "  👉 LIVE WEBSOCKET: ws://localhost:8088/ws"
echo "=============================================================================="

cd backend
PORT=8088 PYTHONPATH=. $PYTHON_BIN main.py
