
import oracledb from 'oracledb';
import { getConnection } from '../src/config/db.js';

// 角色分配規則
const ROLE_RULES = {
  RFACD_PREFIX: 'RFACD',           // RFACD組織前綴
  LAYOUT_KEYWORDS: ['CAD/AL1', 'CAD/AL2'], // Layout相關關鍵字
};

/**
 * 根據組織代碼自動分配角色
 * @param {string} mcStext - 組織代碼文字
 * @returns {string|null} - 角色 ('LAYOUT', 'DESIGNER', 或 null)
 */
export function assignRoleByOrganization(mcStext) {
  if (!mcStext) return null;
  
  const orgCode = mcStext.toUpperCase();
  
  // 首先檢查是否屬於RFACD組織
  if (!orgCode.startsWith(ROLE_RULES.RFACD_PREFIX)) {
    return null; // 不是RFACD組織，不分配角色
  }
  
  // 是RFACD組織，檢查是否為Layout
  const isLayout = ROLE_RULES.LAYOUT_KEYWORDS.some(keyword => 
    orgCode.includes(keyword)
  );
  
  return isLayout ? 'LAYOUT' : 'DESIGNER';
}

/**
 * 檢查用戶是否屬於RFACD組織
 * @param {string} mcStext - 組織代碼文字
 * @returns {boolean}
 */
export function isRFACDUser(mcStext) {
  if (!mcStext) return false;
  return mcStext.toUpperCase().startsWith(ROLE_RULES.RFACD_PREFIX);
}

/**
 * 根據PERNR查詢單個用戶
 */
export async function findByPernr(pernr) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT PERNR, EMP_NAME, MC_STEXT 
       FROM IF_ODR.V_RD_EMP_DATA 
       WHERE PERNR = :pernr`,
      [pernr.padStart(8, '0')], // Pad with leading zeros to 8 characters
      { outFormat: oracledb.OBJECT }
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const role = assignRoleByOrganization(user.MC_STEXT);
      
      // 只返回RFACD組織的用戶
      if (role === null) {
        return null; // 不是RFACD組織
      }
      
      return {
        PERNR: user.PERNR,
        NAME: user.EMP_NAME,
        MC_STEXT: user.MC_STEXT,
        ROLE: role
      };
    } else {
      return null;
    }
  } catch (err) {
    console.error('Error finding user by PERNR:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

/**
 * 獲取所有活躍用戶並自動分配角色
 */
export async function getAllUsers() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT PERNR, EMP_NAME, MC_STEXT
       FROM IF_ODR.V_RD_EMP_DATA 
       WHERE ROWNUM <= 100
       ORDER BY PERNR`,
      {},
      { outFormat: oracledb.OBJECT }
    );

    // 只返回RFACD組織的人員，並過濾掉沒有角色的用戶
    return result.rows
      .map(user => ({
        PERNR: user.PERNR,
        NAME: user.EMP_NAME,
        MC_STEXT: user.MC_STEXT,
        ROLE: assignRoleByOrganization(user.MC_STEXT)
      }))
      .filter(user => user.ROLE !== null); // 只保留有角色的用戶（RFACD組織）
  } catch (err) {
    console.error('Error getting all users:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

/**
 * 根據角色獲取用戶列表
 */
export async function getUsersByRole(role) {
  const allUsers = await getAllUsers();
  return allUsers.filter(user => user.ROLE === role);
}

/**
 * 獲取Designer和Layout Owner列表 (用於前端下拉選單)
 */
export async function getDesignersAndLayoutOwners() {
  try {
    const allUsers = await getAllUsers();
    
    const designers = allUsers.filter(user => user.ROLE === 'DESIGNER');
    const layoutOwners = allUsers.filter(user => user.ROLE === 'LAYOUT');
    
    return {
      designers: designers.map(user => user.NAME),
      layoutOwners: layoutOwners.map(user => user.NAME),
      allUsers: allUsers
    };
  } catch (err) {
    console.error('Error getting designers and layout owners:', err);
    throw err;
  }
}
