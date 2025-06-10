# LRPS — Layout Resource Plan System

一個用於追蹤與規劃 IC 佈局資源分配的網頁系統，支援專案進度、設計師/佈局負責人管理、週工時統計與甘特圖視覺化。

---

## 目錄
- [功能特色](#功能特色)
- [系統架構與流程](#系統架構與流程)
- [專案目錄結構](#專案目錄結構)
- [快速啟動](#快速啟動)
- [技術棧](#技術棧)
- [團隊協作規範](#團隊協作規範)
- [資料庫遷移/備份](#資料庫遷移備份)
- [聯絡窗口](#聯絡窗口)
- [License](#license)

---

## 功能特色
- **多分頁管理**：設計師、佈局負責人、週工時、甘特圖視覺化
- **CSV 匯入/匯出**
- **IP 任務分割、複製、刪除**
- **週工時填報與統計**
- **任務狀態追蹤、關閉/重開**
- **動態過濾、搜尋、排序**
- **資料庫版本控管**

---

## 系統架構與流程

### 前端
- React + Vite SPA
- 主要元件：DesignerTab、LayoutLeaderTab、LayoutTab、GanttChart
- 透過 fetch API 與後端溝通

### 後端
- Node.js + Express
- RESTful API 提供資料 CRUD
- SQLite（可遷移至 Oracle）
- 主要檔案：app.js、routes/layoutRoutes.js、controllers/layoutController.js、models/layoutTaskModel.js

### 資料流
1. 前端發送 API 請求（如 /api/layouts/:projectId）
2. 後端路由分發 → controller 處理邏輯 → model 操作資料庫
3. 回傳 JSON 結果給前端，更新畫面

---

## 專案目錄結構

```
my-layout-app-fixed/
├── backend/                # 後端 Node.js/Express 專案
│   ├── src/                # 主程式碼
│   ├── routes/             # API 路由
│   ├── controllers/        # 業務邏輯
│   ├── models/             # 資料庫操作
│   ├── migrations/         # 資料庫遷移腳本
│   ├── layout.db           # SQLite 資料庫
│   └── package.json
├── frontend/               # 前端 React/Vite 專案
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/     # 主要元件
│   │   ├── utils/          # 工具函式
│   │   └── index.css
│   ├── public/             # 靜態資源、字型、logo
│   └── package.json
└── README.md
```

---

## 快速啟動

### 1. 安裝前端

```bash
cd frontend
npm install
npm run dev
```
- 預設啟動於 http://localhost:5173

### 2. 安裝後端

```bash
cd backend
npm install
npm run dev
```
- 預設啟動於 http://localhost:3001

### 3. 資料庫
- 預設使用 SQLite（backend/layout.db）
- 可依需求遷移至 Oracle，詳見 `docs/database-migration.md`

---

## 技術棧

- 前端：React, Vite, Tailwind CSS, Radix UI, dayjs, papaparse
- 後端：Node.js, Express, SQLite, dotenv
- 其他：ESLint, Prettier, Docker（可選）

---

## 團隊協作規範

- **Git 分支策略**：main（穩定）、dev（開發）、feature/xxx、bugfix/xxx
- **Commit message**：語意化（feat: 新功能、fix: 修 bug、docs: 文件...）
- **Pull Request**：需經 code review
- **程式碼風格**：統一用 Prettier/ESLint，自動格式化
- **Issue 回報**：請詳述重現步驟、預期/實際結果

---

## 資料庫遷移/備份

- 請參考 `docs/database-migration.md`  
- 提供 SQLite 匯出、Oracle 遷移腳本、備份/還原流程

---

## 聯絡窗口

- **專案建立者（Creator）**：Erik Liu  
- **主要貢獻者（Contributors）**：  
  - 請於後續版本依實際參與人員補充
- **聯絡方式**：請洽公司內部協作平台或專案負責人

---

## License

MIT（或依公司內部規範調整）

---

如需更詳細的 API、資料庫、元件說明，請參考 docs/ 目錄下的文件。
