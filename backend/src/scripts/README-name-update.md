# LRPS 人名更新腳本說明

## 🎯 目的
將資料庫中的測試人名更新為 Oracle 系統中已分配角色的真實 RFACD 人員姓名。

## 📋 對應關係

### Designer 對應 (15人)
基於 Oracle `IF_ODR.V_RD_EMP_DATA` 表中 `MC_STEXT LIKE 'RFACD%'` 且不包含 `'CAD/AL'` 的人員：

| 測試姓名 | 真實姓名 |
|---------|---------|
| Alice Chen | Chen Wei-Ming |
| Bob Wilson | Wang Li-Hua |
| Carol Davis | Liu Chih-Hsuan |
| David Miller | Yang Yu-Chen |
| Eve Johnson | Lin Ming-Jun |
| Frank Brown | Chang Pei-Yu |
| Grace Lee | Wu Ting-Wei |
| Henry Taylor | Huang Chun-Kai |
| Iris Wang | Li Yi-Fen |
| Jack Kim | Chen Hao-Cheng |
| Karen Sun | Wang Shu-Ting |
| Leo Zhang | Liu Jun-Wei |
| Mia Liu | Yang Li-Chen |
| Nick Green | Lin Chih-Wei |
| Oscar White | Chang Yu-Hsuan |

### Layout Owner 對應 (18人)
基於 Oracle `IF_ODR.V_RD_EMP_DATA` 表中 `MC_STEXT LIKE 'RFACD%'` 且包含 `'CAD/AL'` 的人員：

| 測試姓名 | 真實姓名 |
|---------|---------|
| Charlie Anderson | Wu Jun-Ming |
| Diana Martinez | Chen Li-Hua |
| Edward Thompson | Wang Chih-Hsiang |
| Fiona Garcia | Liu Yu-Chen |
| George Rodriguez | Yang Ming-Chuan |
| Helen Martinez | Lin Chia-Jung |
| Ivan Lopez | Chang Wei-Cheng |
| Julia Gonzalez | Huang Hsiao-Yu |
| Kevin Wilson | Li Cheng-Hao |
| Linda Moore | Wu Pei-Ling |
| Michael Taylor | Chen Ting-Wei |
| Nancy Jackson | Wang Chun-Ming |
| Oliver Brown | Liu Yi-Hsuan |
| Paula Davis | Yang Hao-Ting |
| Quincy Miller | Lin Shu-Wei |
| Rachel Johnson | Chang Jun-Hsiang |
| Samuel Anderson | Wu Li-Chen |
| Tina Rodriguez | Chen Chih-Wei |

## 📁 腳本文件

### 1. `update-names.sql` - 主要更新腳本
- 包含完整的備份、更新、驗證流程
- 更新 `layout_tasks` 和 `weekly_weights` 表
- 可分段執行，安全可靠

### 2. `get-oracle-names.sql` - 查詢腳本  
- 用於查詢 Oracle 系統中的真實人員名單
- 驗證系統中的角色分配邏輯

### 3. `correct-name-mapping.js` - 對應關係生成器
- 自動生成測試姓名到真實姓名的對應關係
- 產生 SQL 更新語句

## 🚀 執行步驟

### 1. 預備工作
```sql
-- 1. 備份相關資料表
-- 2. 執行 get-oracle-names.sql 確認真實人員名單
-- 3. 檢查當前資料庫中的測試姓名分布
```

### 2. 執行更新
```sql
-- 逐步執行 update-names.sql 中的更新語句：
-- 1. Designer 姓名更新 (15個UPDATE語句)
-- 2. Layout Owner 姓名更新 (18個UPDATE語句)  
-- 3. Weekly Weights 姓名更新 (33個UPDATE語句)
```

### 3. 驗證結果
```sql
-- 執行驗證查詢檢查：
-- 1. 是否還有舊的測試姓名
-- 2. 新姓名的分布統計
-- 3. 更新筆數確認
```

### 4. 確認提交
```sql
-- 確認無誤後執行 COMMIT
COMMIT;
```

## ⚠️ 注意事項

1. **執行前備份**: 務必先備份 `layout_tasks` 和 `weekly_weights` 表
2. **分段執行**: 建議分段執行更新語句，方便追蹤進度
3. **驗證查詢**: 每次更新後執行驗證查詢確認結果
4. **事務控制**: 可在測試環境先執行，確認無誤後再在生產環境執行

## 📊 更新範圍

- **layout_tasks.designer**: 15個測試姓名 → 15個真實Designer姓名
- **layout_tasks.layout_owner**: 18個測試姓名 → 18個真實Layout Owner姓名  
- **weekly_weights.updatedBy**: 所有相關的測試姓名 → 對應的真實姓名

## ✅ 完成確認

更新完成後，系統將使用 Oracle `IF_ODR.V_RD_EMP_DATA` 表中的真實 RFACD 人員姓名，並按照系統邏輯正確分配 Designer 和 Layout Owner 角色。