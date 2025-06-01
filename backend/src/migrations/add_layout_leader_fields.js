const { db } = require('../config/db');

// 添加 layout leader 相關欄位
const addLayoutLeaderFields = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        // 添加新欄位
        db.run(`
          ALTER TABLE layout_tasks 
          ADD COLUMN layout_leader_schematic_freeze TEXT;
        `);

        db.run(`
          ALTER TABLE layout_tasks 
          ADD COLUMN layout_leader_lvs_clean TEXT;
        `);

        db.run('COMMIT');
        console.log('Successfully added layout leader fields');
        resolve();
      } catch (err) {
        console.error('Error adding layout leader fields:', err);
        db.run('ROLLBACK');
        reject(err);
      }
    });
  });
};

// 執行遷移
addLayoutLeaderFields()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  }); 