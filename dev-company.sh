#!/bin/bash
# 公司環境開發啟動腳本
# Company Environment Development Startup Script

echo "🏢 啟動公司環境開發模式..."

# 啟動後端 (公司Oracle+LDAP)
echo "📡 啟動後端服務 (連公司Oracle+LDAP)..."
cd backend
npm run dev:company &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 啟動前端 (連公司API)
echo "🌐 啟動前端服務 (連公司API)..."
cd ../frontend
npm run dev:company &
FRONTEND_PID=$!

echo "✅ 公司開發環境已啟動："
echo "   📡 後端: http://localhost:3001 -> Oracle@Company (PID: $BACKEND_PID)"
echo "   🌐 前端: http://localhost:5173 -> API@Company (PID: $FRONTEND_PID)"
echo ""
echo "🔗 訪問方式："
echo "   - 自動偵測: http://localhost:5173"
echo "   - 強制公司環境: http://localhost:5173?env=company"
echo ""
echo "⚙️  配置檔案: backend/.env.company"
echo "💡 請確認已正確設定公司的Oracle和LDAP連線資訊"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 捕捉Ctrl+C信號
trap 'echo "🛑 正在停止服務..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 等待
wait