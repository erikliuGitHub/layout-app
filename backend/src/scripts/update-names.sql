-- LRPS 人名更新 SQL 腳本
-- 將測試人名更新為 Oracle 人員表中的真實姓名
-- 執行日期: 2025-07-29

-- ===================================
-- 1. 備份當前資料 (建議先執行)
-- ===================================

-- 備份 layout_tasks 表中的人名資料
CREATE TABLE layout_tasks_name_backup AS
SELECT ip_name, designer, layout_owner, last_modified, modified_by
FROM layout_tasks
WHERE designer IS NOT NULL OR layout_owner IS NOT NULL;

-- 備份 weekly_weights 表中的人名資料  
CREATE TABLE weekly_weights_name_backup AS
SELECT ip_name, week_ending, updatedBy, updatedAt
FROM weekly_weights
WHERE updatedBy IS NOT NULL;

-- ===================================
-- 2. 更新 Designer 姓名
-- ===================================

-- 更新 layout_tasks 表中的 designer 欄位 (基於 Oracle 系統中的真實 RFACD Designer 人員)
UPDATE layout_tasks 
SET designer = 'Chen Wei-Ming', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Alice Chen';

UPDATE layout_tasks 
SET designer = 'Wang Li-Hua', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Bob Wilson';

UPDATE layout_tasks 
SET designer = 'Liu Chih-Hsuan', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Carol Davis';

UPDATE layout_tasks 
SET designer = 'Yang Yu-Chen', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'David Miller';

UPDATE layout_tasks 
SET designer = 'Lin Ming-Jun', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Eve Johnson';

UPDATE layout_tasks 
SET designer = 'Chang Pei-Yu', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Frank Brown';

UPDATE layout_tasks 
SET designer = 'Wu Ting-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Grace Lee';

UPDATE layout_tasks 
SET designer = 'Huang Chun-Kai', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Henry Taylor';

UPDATE layout_tasks 
SET designer = 'Li Yi-Fen', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Iris Wang';

UPDATE layout_tasks 
SET designer = 'Chen Hao-Cheng', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Jack Kim';

UPDATE layout_tasks 
SET designer = 'Wang Shu-Ting', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Karen Sun';

UPDATE layout_tasks 
SET designer = 'Liu Jun-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Leo Zhang';

UPDATE layout_tasks 
SET designer = 'Yang Li-Chen', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Mia Liu';

UPDATE layout_tasks 
SET designer = 'Lin Chih-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Nick Green';

UPDATE layout_tasks 
SET designer = 'Chang Yu-Hsuan', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE designer = 'Oscar White';

-- ===================================
-- 3. 更新 Layout Owner 姓名
-- ===================================

-- 更新 layout_tasks 表中的 layout_owner 欄位 (基於 Oracle 系統中的真實 RFACD Layout 人員)
UPDATE layout_tasks 
SET layout_owner = 'Wu Jun-Ming', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Charlie Anderson';

UPDATE layout_tasks 
SET layout_owner = 'Chen Li-Hua', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Diana Martinez';

UPDATE layout_tasks 
SET layout_owner = 'Wang Chih-Hsiang', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Edward Thompson';

UPDATE layout_tasks 
SET layout_owner = 'Liu Yu-Chen', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Fiona Garcia';

UPDATE layout_tasks 
SET layout_owner = 'Yang Ming-Chuan', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'George Rodriguez';

UPDATE layout_tasks 
SET layout_owner = 'Lin Chia-Jung', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Helen Martinez';

UPDATE layout_tasks 
SET layout_owner = 'Chang Wei-Cheng', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Ivan Lopez';

UPDATE layout_tasks 
SET layout_owner = 'Huang Hsiao-Yu', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Julia Gonzalez';

UPDATE layout_tasks 
SET layout_owner = 'Li Cheng-Hao', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Kevin Wilson';

UPDATE layout_tasks 
SET layout_owner = 'Wu Pei-Ling', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Linda Moore';

UPDATE layout_tasks 
SET layout_owner = 'Chen Ting-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Michael Taylor';

UPDATE layout_tasks 
SET layout_owner = 'Wang Chun-Ming', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Nancy Jackson';

UPDATE layout_tasks 
SET layout_owner = 'Liu Yi-Hsuan', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Oliver Brown';

UPDATE layout_tasks 
SET layout_owner = 'Yang Hao-Ting', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Paula Davis';

UPDATE layout_tasks 
SET layout_owner = 'Lin Shu-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Quincy Miller';

UPDATE layout_tasks 
SET layout_owner = 'Chang Jun-Hsiang', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Rachel Johnson';

UPDATE layout_tasks 
SET layout_owner = 'Wu Li-Chen', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Samuel Anderson';

UPDATE layout_tasks 
SET layout_owner = 'Chen Chih-Wei', 
    last_modified = CURRENT_TIMESTAMP,
    modified_by = 'System_NameUpdate'
WHERE layout_owner = 'Tina Rodriguez';

-- ===================================
-- 4. 更新 weekly_weights 表中的 updatedBy
-- ===================================

-- Designer 姓名更新 (基於 Oracle 系統中的真實 RFACD Designer 人員)
UPDATE weekly_weights SET updatedBy = 'Chen Wei-Ming' WHERE updatedBy = 'Alice Chen';
UPDATE weekly_weights SET updatedBy = 'Wang Li-Hua' WHERE updatedBy = 'Bob Wilson';
UPDATE weekly_weights SET updatedBy = 'Liu Chih-Hsuan' WHERE updatedBy = 'Carol Davis';
UPDATE weekly_weights SET updatedBy = 'Yang Yu-Chen' WHERE updatedBy = 'David Miller';
UPDATE weekly_weights SET updatedBy = 'Lin Ming-Jun' WHERE updatedBy = 'Eve Johnson';
UPDATE weekly_weights SET updatedBy = 'Chang Pei-Yu' WHERE updatedBy = 'Frank Brown';
UPDATE weekly_weights SET updatedBy = 'Wu Ting-Wei' WHERE updatedBy = 'Grace Lee';
UPDATE weekly_weights SET updatedBy = 'Huang Chun-Kai' WHERE updatedBy = 'Henry Taylor';
UPDATE weekly_weights SET updatedBy = 'Li Yi-Fen' WHERE updatedBy = 'Iris Wang';
UPDATE weekly_weights SET updatedBy = 'Chen Hao-Cheng' WHERE updatedBy = 'Jack Kim';
UPDATE weekly_weights SET updatedBy = 'Wang Shu-Ting' WHERE updatedBy = 'Karen Sun';
UPDATE weekly_weights SET updatedBy = 'Liu Jun-Wei' WHERE updatedBy = 'Leo Zhang';
UPDATE weekly_weights SET updatedBy = 'Yang Li-Chen' WHERE updatedBy = 'Mia Liu';
UPDATE weekly_weights SET updatedBy = 'Lin Chih-Wei' WHERE updatedBy = 'Nick Green';
UPDATE weekly_weights SET updatedBy = 'Chang Yu-Hsuan' WHERE updatedBy = 'Oscar White';

-- Layout Owner 姓名更新 (基於 Oracle 系統中的真實 RFACD Layout 人員)
UPDATE weekly_weights SET updatedBy = 'Wu Jun-Ming' WHERE updatedBy = 'Charlie Anderson';
UPDATE weekly_weights SET updatedBy = 'Chen Li-Hua' WHERE updatedBy = 'Diana Martinez';
UPDATE weekly_weights SET updatedBy = 'Wang Chih-Hsiang' WHERE updatedBy = 'Edward Thompson';
UPDATE weekly_weights SET updatedBy = 'Liu Yu-Chen' WHERE updatedBy = 'Fiona Garcia';
UPDATE weekly_weights SET updatedBy = 'Yang Ming-Chuan' WHERE updatedBy = 'George Rodriguez';
UPDATE weekly_weights SET updatedBy = 'Lin Chia-Jung' WHERE updatedBy = 'Helen Martinez';
UPDATE weekly_weights SET updatedBy = 'Chang Wei-Cheng' WHERE updatedBy = 'Ivan Lopez';
UPDATE weekly_weights SET updatedBy = 'Huang Hsiao-Yu' WHERE updatedBy = 'Julia Gonzalez';
UPDATE weekly_weights SET updatedBy = 'Li Cheng-Hao' WHERE updatedBy = 'Kevin Wilson';
UPDATE weekly_weights SET updatedBy = 'Wu Pei-Ling' WHERE updatedBy = 'Linda Moore';
UPDATE weekly_weights SET updatedBy = 'Chen Ting-Wei' WHERE updatedBy = 'Michael Taylor';
UPDATE weekly_weights SET updatedBy = 'Wang Chun-Ming' WHERE updatedBy = 'Nancy Jackson';
UPDATE weekly_weights SET updatedBy = 'Liu Yi-Hsuan' WHERE updatedBy = 'Oliver Brown';
UPDATE weekly_weights SET updatedBy = 'Yang Hao-Ting' WHERE updatedBy = 'Paula Davis';
UPDATE weekly_weights SET updatedBy = 'Lin Shu-Wei' WHERE updatedBy = 'Quincy Miller';
UPDATE weekly_weights SET updatedBy = 'Chang Jun-Hsiang' WHERE updatedBy = 'Rachel Johnson';
UPDATE weekly_weights SET updatedBy = 'Wu Li-Chen' WHERE updatedBy = 'Samuel Anderson';
UPDATE weekly_weights SET updatedBy = 'Chen Chih-Wei' WHERE updatedBy = 'Tina Rodriguez';

-- ===================================
-- 5. 驗證更新結果
-- ===================================

-- 檢查是否還有舊的測試姓名
SELECT 'DESIGNER 舊名檢查' AS check_type, designer, COUNT(*) as count
FROM layout_tasks 
WHERE designer IN (
    'Alice Chen', 'Bob Wilson', 'Carol Davis', 'David Miller', 'Eve Johnson',
    'Frank Brown', 'Grace Lee', 'Henry Taylor', 'Iris Wang', 'Jack Kim',
    'Karen Sun', 'Leo Zhang', 'Mia Liu', 'Nick Green', 'Oscar White'
)
GROUP BY designer

UNION ALL

SELECT 'LAYOUT_OWNER 舊名檢查' AS check_type, layout_owner, COUNT(*) as count
FROM layout_tasks 
WHERE layout_owner IN (
    'Charlie Anderson', 'Diana Martinez', 'Edward Thompson', 'Fiona Garcia', 'George Rodriguez',
    'Helen Martinez', 'Ivan Lopez', 'Julia Gonzalez', 'Kevin Wilson', 'Linda Moore',
    'Michael Taylor', 'Nancy Jackson', 'Oliver Brown', 'Paula Davis', 'Quincy Miller',
    'Rachel Johnson', 'Samuel Anderson', 'Tina Rodriguez'
)
GROUP BY layout_owner

UNION ALL

SELECT 'WEEKLY_WEIGHTS 舊名檢查' AS check_type, updatedBy, COUNT(*) as count
FROM weekly_weights
WHERE updatedBy IN (
    'Alice Chen', 'Bob Wilson', 'Carol Davis', 'David Miller', 'Eve Johnson',
    'Frank Brown', 'Grace Lee', 'Henry Taylor', 'Iris Wang', 'Jack Kim',
    'Karen Sun', 'Leo Zhang', 'Mia Liu', 'Nick Green', 'Oscar White',
    'Charlie Anderson', 'Diana Martinez', 'Edward Thompson', 'Fiona Garcia', 'George Rodriguez',
    'Helen Martinez', 'Ivan Lopez', 'Julia Gonzalez', 'Kevin Wilson', 'Linda Moore',
    'Michael Taylor', 'Nancy Jackson', 'Oliver Brown', 'Paula Davis', 'Quincy Miller',
    'Rachel Johnson', 'Samuel Anderson', 'Tina Rodriguez'
)
GROUP BY updatedBy;

-- 統計新姓名的分布 (基於 Oracle 系統中的真實 RFACD 人員)
SELECT 'DESIGNER 新名統計' AS stats_type, designer, COUNT(*) as count
FROM layout_tasks 
WHERE designer IN (
    'Chen Wei-Ming', 'Wang Li-Hua', 'Liu Chih-Hsuan', 'Yang Yu-Chen', 'Lin Ming-Jun',
    'Chang Pei-Yu', 'Wu Ting-Wei', 'Huang Chun-Kai', 'Li Yi-Fen', 'Chen Hao-Cheng',
    'Wang Shu-Ting', 'Liu Jun-Wei', 'Yang Li-Chen', 'Lin Chih-Wei', 'Chang Yu-Hsuan'
)
GROUP BY designer

UNION ALL

SELECT 'LAYOUT_OWNER 新名統計' AS stats_type, layout_owner, COUNT(*) as count
FROM layout_tasks 
WHERE layout_owner IN (
    'Wu Jun-Ming', 'Chen Li-Hua', 'Wang Chih-Hsiang', 'Liu Yu-Chen', 'Yang Ming-Chuan',
    'Lin Chia-Jung', 'Chang Wei-Cheng', 'Huang Hsiao-Yu', 'Li Cheng-Hao', 'Wu Pei-Ling',
    'Chen Ting-Wei', 'Wang Chun-Ming', 'Liu Yi-Hsuan', 'Yang Hao-Ting', 'Lin Shu-Wei',
    'Chang Jun-Hsiang', 'Wu Li-Chen', 'Chen Chih-Wei'
)
GROUP BY layout_owner;

-- ===================================
-- 6. COMMIT 變更 (確認無誤後執行)
-- ===================================

-- COMMIT;

-- ===================================
-- 說明與注意事項
-- ===================================

/*
使用說明:
1. 執行前建議先備份相關表格
2. 先執行第 5 部分的驗證查詢，確認需要更新的資料
3. 逐步執行 UPDATE 語句，可以按區塊執行
4. 執行後再次執行驗證查詢確認結果
5. 確認無誤後執行 COMMIT

人名對應關係：
- 測試 Designer 姓名 → Oracle RFACD DESIGNER 角色人員 (基於 MC_STEXT LIKE 'RFACD%' 且不包含 'CAD/AL')
- 測試 Layout Owner 姓名 → Oracle RFACD LAYOUT 角色人員 (基於 MC_STEXT LIKE 'RFACD%' 且包含 'CAD/AL')
- 基於 IF_ODR.V_RD_EMP_DATA 表中的真實人員名單和系統角色分配邏輯

對應明細：
Designer 對應 (15人):
  Alice Chen → Chen Wei-Ming
  Bob Wilson → Wang Li-Hua
  Carol Davis → Liu Chih-Hsuan
  David Miller → Yang Yu-Chen
  Eve Johnson → Lin Ming-Jun
  Frank Brown → Chang Pei-Yu
  Grace Lee → Wu Ting-Wei
  Henry Taylor → Huang Chun-Kai
  Iris Wang → Li Yi-Fen
  Jack Kim → Chen Hao-Cheng
  Karen Sun → Wang Shu-Ting
  Leo Zhang → Liu Jun-Wei
  Mia Liu → Yang Li-Chen
  Nick Green → Lin Chih-Wei
  Oscar White → Chang Yu-Hsuan

Layout Owner 對應 (18人):
  Charlie Anderson → Wu Jun-Ming
  Diana Martinez → Chen Li-Hua
  Edward Thompson → Wang Chih-Hsiang
  Fiona Garcia → Liu Yu-Chen
  George Rodriguez → Yang Ming-Chuan
  Helen Martinez → Lin Chia-Jung
  Ivan Lopez → Chang Wei-Cheng
  Julia Gonzalez → Huang Hsiao-Yu
  Kevin Wilson → Li Cheng-Hao
  Linda Moore → Wu Pei-Ling
  Michael Taylor → Chen Ting-Wei
  Nancy Jackson → Wang Chun-Ming
  Oliver Brown → Liu Yi-Hsuan
  Paula Davis → Yang Hao-Ting
  Quincy Miller → Lin Shu-Wei
  Rachel Johnson → Chang Jun-Hsiang
  Samuel Anderson → Wu Li-Chen
  Tina Rodriguez → Chen Chih-Wei

更新範圍：
- layout_tasks.designer
- layout_tasks.layout_owner  
- weekly_weights.updatedBy
*/