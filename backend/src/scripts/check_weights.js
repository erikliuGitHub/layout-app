const { executeQuery } = require('../config/db');

async function checkWeights() {
  try {
    console.log('\n1. Checking table structure:');
    const structureResult = await executeQuery(`
      SELECT column_name, data_type, data_length, nullable 
      FROM user_tab_columns 
      WHERE table_name = 'LAYOUT_WEEKLY_WEIGHTS'
    `);
    console.log(structureResult.rows);

    console.log('\n2. Checking all weights data:');
    const allWeightsResult = await executeQuery(`
      SELECT 
        w.LAYOUT_ID,
        t.PROJECT_ID,
        t.IP_NAME,
        w.WEEK,
        w.WEIGHT,
        w.UPDATED_AT,
        w.UPDATED_BY,
        w.ROLE,
        w.VERSION
      FROM LAYOUT_WEEKLY_WEIGHTS w
      JOIN LAYOUT_TASKS t ON w.LAYOUT_ID = t.ID
      ORDER BY t.PROJECT_ID, t.IP_NAME, w.WEEK
    `);
    console.log(allWeightsResult.rows);

    console.log('\n3. Checking current week weights:');
    const currentWeekResult = await executeQuery(`
      SELECT 
        t.PROJECT_ID,
        t.IP_NAME,
        t.LAYOUT_OWNER,
        w.WEEK,
        w.WEIGHT,
        w.UPDATED_AT,
        w.UPDATED_BY
      FROM LAYOUT_TASKS t
      LEFT JOIN LAYOUT_WEEKLY_WEIGHTS w ON t.ID = w.LAYOUT_ID
      WHERE w.WEEK = '2025-W23'
      ORDER BY t.PROJECT_ID, t.IP_NAME
    `);
    console.log(currentWeekResult.rows);

    console.log('\n4. Checking for duplicate weights:');
    const duplicatesResult = await executeQuery(`
      SELECT 
        t.PROJECT_ID,
        t.IP_NAME,
        w.WEEK,
        COUNT(*) as weight_count
      FROM LAYOUT_TASKS t
      JOIN LAYOUT_WEEKLY_WEIGHTS w ON t.ID = w.LAYOUT_ID
      GROUP BY t.PROJECT_ID, t.IP_NAME, w.WEEK
      HAVING COUNT(*) > 1
    `);
    console.log(duplicatesResult.rows);

  } catch (error) {
    console.error('Error checking weights:', error);
  }
}

checkWeights(); 