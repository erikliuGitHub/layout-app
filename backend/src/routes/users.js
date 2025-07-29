import express from 'express';
import { 
  getAllUsers, 
  getUsersByRole, 
  getDesignersAndLayoutOwners,
  findByPernr 
} from '../../models/userModel.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 獲取所有用戶
router.get('/', async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] GET /users - Fetching all users`);
  
  try {
    const users = await getAllUsers();
    
    res.json({
      success: true,
      data: users,
      message: `獲取 ${users.length} 個用戶資料`,
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching users:`, err);
    res.status(500).json({
      success: false,
      message: '獲取用戶資料失敗',
      errors: [err.message],
      requestId
    });
  }
});

// 根據角色獲取用戶
router.get('/role/:role', async (req, res) => {
  const requestId = uuidv4();
  const { role } = req.params;
  console.log(`[${requestId}] GET /users/role/${role} - Fetching users by role`);
  
  try {
    if (!['DESIGNER', 'LAYOUT'].includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '無效的角色類型',
        errors: ['角色必須是 DESIGNER 或 LAYOUT'],
        requestId
      });
    }
    
    const users = await getUsersByRole(role.toUpperCase());
    
    res.json({
      success: true,
      data: users,
      message: `獲取 ${role} 角色的 ${users.length} 個用戶`,
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching users by role:`, err);
    res.status(500).json({
      success: false,
      message: '獲取用戶資料失敗',
      errors: [err.message],
      requestId
    });
  }
});

// 獲取設計師和佈局負責人列表 (用於下拉選單)
router.get('/lists', async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] GET /users/lists - Fetching designer and layout owner lists`);
  
  try {
    const result = await getDesignersAndLayoutOwners();
    
    res.json({
      success: true,
      data: {
        designers: result.designers,
        layoutOwners: result.layoutOwners,
        summary: {
          totalUsers: result.allUsers.length,
          designers: result.designers.length,
          layoutOwners: result.layoutOwners.length
        }
      },
      message: '成功獲取用戶列表',
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching user lists:`, err);
    res.status(500).json({
      success: false,
      message: '獲取用戶列表失敗',
      errors: [err.message],
      requestId
    });
  }
});

// 根據員工編號獲取用戶資料
router.get('/:pernr', async (req, res) => {
  const requestId = uuidv4();
  const { pernr } = req.params;
  console.log(`[${requestId}] GET /users/${pernr} - Fetching user by PERNR`);
  
  try {
    const user = await findByPernr(pernr);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到該員工',
        errors: [`員工編號 ${pernr} 不存在`],
        requestId
      });
    }
    
    res.json({
      success: true,
      data: user,
      message: '成功獲取用戶資料',
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching user by PERNR:`, err);
    res.status(500).json({
      success: false,
      message: '獲取用戶資料失敗',
      errors: [err.message],
      requestId
    });
  }
});

// 獲取角色統計
router.get('/stats/roles', async (req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] GET /users/stats/roles - Fetching role statistics`);
  
  try {
    const allUsers = await getAllUsers();
    
    const stats = allUsers.reduce((acc, user) => {
      acc[user.ROLE] = (acc[user.ROLE] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        total: allUsers.length,
        breakdown: stats,
        percentage: {
          DESIGNER: ((stats.DESIGNER || 0) / allUsers.length * 100).toFixed(1) + '%',
          LAYOUT: ((stats.LAYOUT || 0) / allUsers.length * 100).toFixed(1) + '%'
        }
      },
      message: '成功獲取角色統計',
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching role statistics:`, err);
    res.status(500).json({
      success: false,
      message: '獲取角色統計失敗',
      errors: [err.message],
      requestId
    });
  }
});

export default router;