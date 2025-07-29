#!/bin/bash
# 在家開發啟動腳本

echo "🏠 啟動家裡開發環境..."

# 啟動後端 (本地Oracle)
echo "📡 啟動後端服務 (本地Oracle)..."
cd backend
npm run dev:home &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 啟動前端 (連本地API)
echo "🌐 啟動前端服務 (連本地API)..."
cd ../frontend
npm run dev:home &
FRONTEND_PID=$!

echo "✅ 開發環境已啟動："
echo "   📡 後端: http://localhost:3001 (PID: $BACKEND_PID)"
echo "   🌐 前端: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 捕捉Ctrl+C信號
trap 'echo "🛑 正在停止服務..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 等待
wait