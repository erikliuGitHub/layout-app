CREATE TABLE layout_tasks (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    ip_name VARCHAR(100) NOT NULL,
    designer VARCHAR(100),
    layout_owner VARCHAR(100),
    schematic_freeze DATE,
    lvs_clean DATE,
    layout_leader_schematic_freeze DATE,
    layout_leader_lvs_clean DATE,
    weekly_weights JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    CONSTRAINT unique_project_ip UNIQUE (project_id, ip_name)
);

-- 新增索引以優化查詢
CREATE INDEX idx_layout_tasks_project_id ON layout_tasks(project_id);
CREATE INDEX idx_layout_tasks_weekly_weights ON layout_tasks USING GIN (weekly_weights);

-- 新增 weekly weight 歷史記錄表
CREATE TABLE weekly_weight_history (
    id SERIAL PRIMARY KEY,
    layout_task_id INTEGER REFERENCES layout_tasks(id),
    week VARCHAR(10) NOT NULL,
    value DECIMAL(3,2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL,
    CONSTRAINT unique_version UNIQUE (layout_task_id, week, version)
);

-- 修改 layout_tasks 表，簡化 weekly_weights 欄位
ALTER TABLE layout_tasks 
    ALTER COLUMN weekly_weights TYPE JSONB 
    USING weekly_weights::jsonb;

-- 新增索引
CREATE INDEX idx_weekly_weight_history_layout_task_id ON weekly_weight_history(layout_task_id);
CREATE INDEX idx_weekly_weight_history_week ON weekly_weight_history(week);
CREATE INDEX idx_weekly_weight_history_updated_by ON weekly_weight_history(updated_by); 