# 🏢 LRPS 公司環境整合指南

本指南將幫助您將 LRPS 系統整合到公司環境中，使用公司內部的 Oracle 資料庫和 LDAP 服務。

## 📋 準備工作

### 1. 收集公司資源資訊

#### Oracle 資料庫資訊
- 📍 **主機地址**: `company-oracle.internal.com`
- 🔌 **連接埠**: `1521`
- 🗃️ **服務名稱**: `PROD` (或您的實際服務名)
- 👤 **使用者名稱**: 需要有適當權限的帳戶
- 🔑 **密碼**: 對應的資料庫密碼

#### LDAP 服務資訊
- 📍 **LDAP伺服器**: `ldap.company.com`
- 🔌 **連接埠**: `389` (或 `636` 用於SSL)
- 🔗 **綁定DN**: `cn=service_account,ou=service,dc=company,dc=com`
- 🔑 **綁定密碼**: 服務帳戶密碼
- 🔍 **搜尋基礎**: `ou=employees,dc=company,dc=com`

#### 網路資訊
- 🌐 **應用伺服器IP**: LRPS後端將部署的伺服器地址
- 🔥 **防火牆規則**: 確保必要端口已開放 (3001, 1521, 389)

## ⚙️ 配置步驟

### 步驟 1: 後端資料庫配置

編輯 `backend/.env.company`：

```bash
# 公司Oracle資料庫配置
DB_TYPE=oracle
ORACLE_USER=your_company_db_username
ORACLE_PASSWORD=your_company_db_password
ORACLE_CONNECTION_STRING=company-oracle.internal.com:1521/PROD

# 公司LDAP服務配置
AUTH_MODE=ldap
LDAP_URL=ldap://ldap.company.com:389
LDAP_BIND_DN=cn=lrps_service,ou=service_accounts,dc=company,dc=com
LDAP_BIND_PASSWORD=your_ldap_service_password
LDAP_SEARCH_BASE=ou=employees,dc=company,dc=com

# 範例配置 (請替換為實際值)
# ORACLE_CONNECTION_STRING=10.1.2.100:1521/HRPROD
# LDAP_URL=ldap://dc01.company.local:389
# LDAP_BIND_DN=cn=lrps_app,ou=applications,dc=company,dc=local
# LDAP_SEARCH_BASE=ou=users,ou=hr,dc=company,dc=local
```

### 步驟 2: 前端API端點配置

編輯 `frontend/src/config.js`：

```javascript
const API_ENDPOINTS = {
  local: 'http://localhost:3001/api',
  home: 'http://220.128.162.218:3001/api',
  company: 'http://lrps-server.company.com:3001/api', // 替換為實際公司伺服器
};
```

更新主機名稱判斷邏輯：

```javascript
// 公司環境判斷 (請根據實際公司域名調整)
if (hostname.includes('company.com') || 
    hostname.includes('corp.local') || 
    hostname === 'lrps.company.com') {
  console.log('🏢 偵測到公司環境');
  return API_ENDPOINTS.company;
}
```

### 步驟 3: 資料庫架構準備

在公司Oracle資料庫中建立必要的表格：

```sql
-- 執行資料庫遷移腳本
-- 位置: backend/migrations/
@001_create_layouts_table.sql
@layout_weekly_weights.sql

-- 確認人員資料表存在
-- IF_ODR.V_RD_EMP_DATA 表應包含:
-- - PERNR (人員編號)
-- - EMP_NAME (員工姓名)  
-- - MC_STEXT (組織代碼文字)
```

### 步驟 4: 防火牆和網路設定

確保以下端口已開放：

```bash
# 應用服務端口
3001/tcp  # LRPS API服務

# 資料庫連接端口  
1521/tcp  # Oracle資料庫

# LDAP認證端口
389/tcp   # LDAP (非加密)
636/tcp   # LDAPS (SSL加密)
```

## 🚀 測試和驗證

### 1. 測試後端連線

```bash
# 啟動公司環境後端
cd backend
npm run dev:company

# 檢查輸出訊息：
# ✅ Oracle連線成功
# ✅ LDAP服務可達
```

### 2. 測試前端連線

```bash
# 啟動公司環境前端  
cd frontend
npm run dev:company

# 或訪問指定環境
# http://localhost:5173?env=company
```

### 3. 完整環境測試

```bash
# 一鍵啟動公司環境
./dev-company.sh

# 訪問系統並測試：
# - LDAP登入功能
# - 人員資料載入
# - 角色分配正確性
```

## 🛠️ 常見問題

### Q1: Oracle連線失敗
```
錯誤: ORA-12541: TNS:no listener
解決: 檢查Oracle服務狀態和網路連通性
```

### Q2: LDAP認證失敗
```
錯誤: InvalidCredentialsError
解決: 確認LDAP綁定DN和密碼正確性
```

### Q3: 人員資料載入失敗
```
錯誤: Table or view does not exist
解決: 確認IF_ODR.V_RD_EMP_DATA表存在和權限
```

### Q4: 前端無法連接後端
```
錯誤: Network Error
解決: 檢查API端點配置和防火牆設定
```

## 📊 監控和維護

### 日誌檢查
```bash
# 後端日誌
tail -f backend/logs/app.log

# 系統日誌 (Linux)
journalctl -u lrps-backend -f
```

### 效能監控
- 資料庫連線池狀態
- LDAP查詢響應時間  
- API請求成功率

### 定期維護
- 檢查證書有效期 (LDAPS)
- 更新密碼 (定期輪替)
- 備份配置檔案

## 🔐 安全考量

### 1. 密碼管理
- 使用強密碼策略
- 定期更新服務帳戶密碼
- 考慮使用密碼管理工具

### 2. 網路安全
- 限制源IP訪問
- 使用VPN或專線連接
- 啟用LDAPS (SSL/TLS)

### 3. 權限控制
- 最小權限原則
- 定期檢視帳戶權限
- 監控異常訪問

## 📞 支援聯絡

如需技術支援，請聯絡：
- **IT部門**: it-support@company.com
- **系統管理員**: sysadmin@company.com
- **LRPS開發團隊**: lrps-dev@company.com

---

💡 **提示**: 建議先在測試環境完成所有配置驗證，再部署到生產環境。