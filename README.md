# Layout Resource Plan System

A web-based management tool for tracking and planning IC layout resource assignments, including schematic and layout milestones, designer ownership, and weekly workload visualization.

## Features

### Tabs

* **Designer Tab**: Manage IP-level scheduling per designer
* **Layout Leader Tab**: Assign layout ownership, split IPs, and view milestones
* **Layout Tab**: Track weekly workload per layout owner and mark closure status
* **Gantt Tab**: Visualize timelines of all IPs across weeks in a Gantt chart

### Functions

* CSV import/export
* Dynamic Gantt rendering with weekly breakdowns
* Weekly input of man-day contribution
* IP duplication and deletion
* Designer and Layout Owner filtering
* Reopening closed tasks with audit tracking

---
## Overview flowchart
【前端流程】
App.jsx (src/App.jsx)
      │
      ▼
fetch('/api/layouts') → 後端 API 呼叫
      │
      ▼
結果：response.json() → { success, message, data } 或直接 data
      │
      ▼
for (const [projectId, rows] of Object.entries(data))  // 檢查每個專案資料
      │
      ▼
rows.map(row => ({ ...row, status, plannedMandays }))  // 計算狀態與人日
      │
      ▼
setProjectsData(dataWithStatus)  // 設定前端狀態
      │
      ▼
呈現到 DesignerTab.jsx, LayoutLeaderTab.jsx, LayoutTab.jsx (src/components)

【後端流程】
app.js (backend/app.js)
      │
      ▼
app.use('/api/layouts', layoutRoutes)  // 路由分發
      │
      ▼
layoutRoutes.js (backend/routes/layoutRoutes.js)
      │
      ▼
router.get('/layouts/:projectId', layoutController.getProjectLayouts)
router.post('/submit', layoutController.submitBatchUpdate)
router.post('/update', layoutController.updateTask)
      │
      ▼
layoutController.js (backend/controllers/layoutController.js)
      │
      ▼
getProjectLayouts → layoutTaskModel.getLayoutsByProject (backend/models/layoutTaskModel.js)
submitBatchUpdate → layoutTaskModel.updateTask (多筆)
updateTask → layoutTaskModel.updateTask (單筆)
      │
      ▼
layoutTaskModel.js (backend/models/layoutTaskModel.js)
      │
      ▼
執行 SQLite 資料查詢/更新
      │
      ▼
返回結果給 controller → routes → 前端 fetch 接收

【資料來源】
SQLite 資料庫 (backend/layout.db)

## File Structure Overview

```
my-layout-app-fixed/
├── src/
│   ├── App.jsx                 # Main application entry with routing and tab switching
│   ├── index.css              # Global styles
│   ├── components/
│   │   ├── DesignerTab.jsx    # Designer tab UI and logic
│   │   ├── LayoutLeaderTab.jsx# Layout Leader tab: owner assignment & IP split
│   │   ├── LayoutTab.jsx      # Layout tab: weekly work reporting
│   │   ├── GanttChart.jsx     # Gantt tab: visual scheduling overview
│   │   └── SplitIpModal.jsx   # Modal UI for IP splitting feature
│   ├── utils/
│   │   ├── dateUtils.js       # Utility functions: date calculation, working days
│   │   ├── ganttUtils.js      # ISO week helpers, Gantt bar calculations
│   │   └── csvUtils.js        # CSV import/export parser helpers
```
### Back-end
###Back-end

🔸 layoutRoutes.js
	•	負責定義路由 (例如 /update, /submit, /layouts/:projectId)
	•	每條路由會導向 layoutController.js 中對應的 controller 方法。

🔸 layoutController.js
	•	負責接收路由傳來的請求，執行對應的商業邏輯。
	•	呼叫 layoutTaskModel.js 中的 model 方法來與 DB 互動，並返回結果給前端。

🔸 layoutTaskModel.js
	•	負責與資料庫 (SQLite) 直接互動 (查詢、更新、版本檢查)。
	•	提供版本控制、資料 CRUD 功能，回傳結果供 controller 使用。
 
前端 (DesignerTab.jsx)
    │
    │ POST /api/layouts/submit { projectId, data[] }
    ▼
Express app (app.js)
    │
    │ app.use("/api/layouts", layoutRoutes)
    ▼
layoutRoutes.js
    │
    │ router.post("/submit", controller.submitBatchUpdate)
    ▼
layoutController.js
    │
    │ submitBatchUpdate(projectId, data[])
    │ ├─ for each item in data[]:
    │ │   └─ model.updateTask(id, version, updatedFields)
    │ ├─ Promise.allSettled(updatePromises)
    │ ├─ model.getLayoutsByProject(projectId) // 回傳最新專案資料
    │ └─ res.json({ success, updatedData })
    ▼
layoutTaskModel.js
    │
    └─ db UPDATE layout_tasks SET fields... WHERE id=? AND version=?
       ├─ 檢查版本
       ├─ 更新資料
       └─ 回傳更新結果 (含版本)

前端 fetch -> /layouts/:projectId
          |
          V
路由 layoutRoutes.js GET /layouts/:projectId
          |
          V
控制器 layoutController.js getProjectLayouts
          |
          V
模型 layoutTaskModel.js getLayoutsByProject (SQL 查詢)
          |
          V
資料庫 SQLite (查詢結果 rows)
          |
          V
控制器檢查 rows (回傳空陣列或資料)
          |
          V
前端接收 (檢查陣列再 .map)

## Sql command
   SELECT * FROM layout_tasks WHERE project_id='PJT-2025-Alpha';

## Development

### Setup

```bash
npm install
npm run dev
```

### Tech Stack

* React
* Vite
* react-datepicker

---

## Author

Developed by Erik Liu for internal layout resource planning.

## License

MIT (or customize for your internal use)
