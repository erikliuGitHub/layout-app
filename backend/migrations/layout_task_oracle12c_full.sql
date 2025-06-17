
-- layout_task table adjusted for Oracle 12c compatibility

CREATE TABLE layout_task (
  id NUMBER PRIMARY KEY,
  layout_owner VARCHAR2(255),
  layout_id VARCHAR2(255),
  stage VARCHAR2(255),
  owner VARCHAR2(255),
  percent NUMBER,
  start_time DATE,
  end_time DATE,
  updated_at TIMESTAMP,
  version NUMBER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence and Trigger for auto-increment ID
CREATE SEQUENCE layout_task_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER trg_layout_task_id
BEFORE INSERT ON layout_task
FOR EACH ROW
WHEN (NEW.id IS NULL)
BEGIN
  SELECT layout_task_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/
