
-- Converted layout_task table for Oracle 12c

CREATE TABLE layout_task (
  id NUMBER PRIMARY KEY,
  layoutOwner VARCHAR2(50),
  layoutId VARCHAR2(50),
  stage VARCHAR2(50),
  owner VARCHAR2(50),
  percent NUMBER,
  startTime DATE,
  endTime DATE,
  updatedAt TIMESTAMP,
  version NUMBER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence and trigger for auto-increment simulation (Oracle 12c does not support IDENTITY natively)
CREATE SEQUENCE layout_task_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER trg_layout_task_id
BEFORE INSERT ON layout_task
FOR EACH ROW
WHEN (NEW.id IS NULL)
BEGIN
  SELECT layout_task_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/
