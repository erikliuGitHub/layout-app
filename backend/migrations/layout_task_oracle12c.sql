
-- Converted for Oracle 12c compatibility

CREATE TABLE layout_task (
  id NUMBER PRIMARY KEY,
  layout_owner VARCHAR2(50),
  layout_id VARCHAR2(50),
  stage VARCHAR2(50),
  owner VARCHAR2(50),
  percent NUMBER,
  start_time DATE,
  end_time DATE,
  updated_at TIMESTAMP
);

-- Optional: Auto-increment trigger and sequence (Oracle 12c workaround)

CREATE SEQUENCE layout_task_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER trg_layout_task_id
BEFORE INSERT ON layout_task
FOR EACH ROW
WHEN (NEW.id IS NULL)
BEGIN
  SELECT layout_task_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/
