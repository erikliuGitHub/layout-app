# 🔧 LRPS 開發環境指南

## 🏠 彈性開發配置

這個專案支援在家裡和公司無縫切換開發，系統會自動適應不同的網路環境。

## 🚀 快速啟動

### 在家裡開發
```bash
# 方法1: 使用便利腳本 (推薦)
./dev-home.sh

# 方法2: 手動啟動
cd backend && npm run dev:home    # 連本地Oracle
cd frontend && npm run dev:home   # 連本地API
```

### 在公司開發 (遠程到家裡環境)
```bash
# 方法1: 使用便利腳本 (推薦)  
./dev-work.sh

# 方法2: 手動啟動
cd backend && npm run dev:work    # 連家裡Oracle
cd frontend && npm run dev:work   # 連家裡API
```

### 🏢 公司環境開發 (使用公司內部資源)
```bash
# 方法1: 使用便利腳本 (推薦)
./dev-company.sh

# 方法2: 手動啟動
cd backend && npm run dev:company    # 連公司Oracle+LDAP
cd frontend && npm run dev:company   # 連公司API
```

## 🔗 環境配置

### 後端環境
- **dev:home**: 連接本地Oracle (`localhost:1521`)
- **dev:work**: 連接家裡Oracle (`220.128.162.218:1521`)
- **dev:company**: 連接公司Oracle+LDAP (需設定 `.env.company`)

### 前端環境
- **dev:home**: 連接本地API (`localhost:3001`)
- **dev:work**: 連接家裡API (`220.128.162.218:3001`)
- **dev:company**: 連接公司API (自動偵測或手動指定)
- **dev**: 智能偵測 (預設模式)

## ⚙️ 自定義配置

### 🏢 公司環境設定
編輯 `backend/.env.company` 檔案：
```bash
# 設定公司Oracle資料庫
ORACLE_CONNECTION_STRING=your_company_oracle_host:1521/PROD
ORACLE_USER=your_oracle_username
ORACLE_PASSWORD=your_oracle_password

# 設定公司LDAP服務
LDAP_URL=ldap://your_company_ldap_host:389
LDAP_BIND_DN=cn=service_account,ou=service,dc=company,dc=com
LDAP_BIND_PASSWORD=your_ldap_password
LDAP_SEARCH_BASE=ou=employees,dc=company,dc=com
```

編輯 `frontend/src/config.js` 設定公司API端點：
```javascript
const API_ENDPOINTS = {
  company: 'http://your-company-server:3001/api'
};
```

### 強制指定API端點
建立 `.env.local` 檔案：
```bash
# 前端目錄下
echo "VITE_API_BASE_URL=http://your-custom-ip:3001/api" > frontend/.env.local
```

### 檢查當前配置
開啟瀏覽器開發者工具，查看Console輸出：
```
🌐 Available API Endpoints: {local: "...", home: "...", company: "..."}
🔗 Selected API Base URL: http://...
🌍 Current hostname: localhost
💡 Environment switching tips:
   - 本地: http://localhost:5173
   - 家裡: http://localhost:5173?env=home  
   - 公司: http://localhost:5173?env=company
```

## 🛠️ 故障排除

### 連線問題
1. **檢查服務狀態**：
   ```bash
   netstat -tulpn | grep 3001  # 檢查API服務
   netstat -tulpn | grep 1521  # 檢查Oracle服務
   ```

2. **測試網路連通性**：
   ```bash
   curl http://localhost:3001/api/test      # 本地API
   curl http://220.128.162.218:3001/api/test # 家裡API
   ```

3. **檢查防火牆**：
   - 家裡路由器需開啟：3001, 389, 1521 端口
   - 確認服務綁定到正確的IP

### 資料庫連線
- **本地開發**：確保Oracle容器運行
- **遠程連線**：檢查防火牆和VPN設定

## 📋 可用命令

### 後端
```bash
npm run dev          # 預設環境
npm run dev:home     # 家裡環境 (本地Oracle)
npm run dev:work     # 公司環境 (遠程到家裡Oracle)
npm run dev:company  # 公司環境 (公司Oracle+LDAP)
```

### 前端
```bash
npm run dev          # 智能偵測API
npm run dev:home     # 強制本地API
npm run dev:work     # 強制遠程API
npm run dev:company  # 公司API環境
```

### 🚀 一鍵啟動腳本
```bash
./dev-home.sh        # 家裡開發環境
./dev-work.sh        # 遠程到家裡環境  
./dev-company.sh     # 公司內部環境
```

## 🔐 認證流程

1. **LDAP認證**: 用於使用者登入驗證
2. **Oracle資料**: 用於人員清單和角色分配
3. **角色規則**: 
   - 包含`CAD/AL`的組織 → Layout角色
   - 其他組織 → Designer角色

## 📊 人員管理

- **資料來源**: `IF_ODR.V_RD_EMP_DATA` Oracle表
- **自動角色分配**: 基於`MC_STEXT`欄位
- **API端點**: `/api/users/*`

---

💡 **提示**: 使用便利腳本一鍵啟動完整開發環境：
- 家裡開發: `./dev-home.sh`
- 遠程開發: `./dev-work.sh` 
- 公司環境: `./dev-company.sh`