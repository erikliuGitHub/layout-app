#!/bin/bash
# 在公司開發啟動腳本

echo "🏢 啟動公司開發環境..."

# 啟動後端 (家裡Oracle)
echo "📡 啟動後端服務 (連家裡Oracle)..."
cd backend
npm run dev:work &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 啟動前端 (連家裡API)
echo "🌐 啟動前端服務 (連家裡API)..."
cd ../frontend
npm run dev:work &
FRONTEND_PID=$!

echo "✅ 開發環境已啟動："
echo "   📡 後端: http://localhost:3001 -> Oracle@220.128.162.218 (PID: $BACKEND_PID)"
echo "   🌐 前端: http://localhost:5173 -> API@220.128.162.218 (PID: $FRONTEND_PID)"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 捕捉Ctrl+C信號
trap 'echo "🛑 正在停止服務..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 等待
wait