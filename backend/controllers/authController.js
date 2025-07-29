import * as userModel from '../models/userModel.js';
import { authenticateLdapUser } from '../src/auth/ldapAuth.js';

// LDAP Login - authenticates with LDAP and checks if user exists in database
export async function login(req, res) {
  const { pernr, password } = req.body;

  // Basic validation
  if (!pernr || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '請輸入工號和密碼',
      requestId: generateRequestId()
    });
  }

  try {
    // LDAP configuration
    const ldapConfig = {
      url: process.env.LDAP_URL || 'ldap://localhost:389',
      adminDn: process.env.LDAP_BIND_DN || 'cn=admin,dc=dev,dc=local',
      adminPassword: process.env.LDAP_BIND_PASSWORD || 'admin',
      searchBase: process.env.LDAP_SEARCH_BASE || 'ou=users,dc=dev,dc=local'
    };

    // Step 1: Authenticate with LDAP
    console.log(`Attempting LDAP authentication for user: ${pernr}`);
    const ldapUser = await authenticateLdapUser(pernr, password, ldapConfig);
    
    if (!ldapUser) {
      console.log(`LDAP authentication failed for user: ${pernr}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials',
        requestId: generateRequestId()
      });
    }

    console.log(`LDAP authentication successful for user: ${pernr}`);

    // Step 2: Check if user exists in our database
    const user = await userModel.findByPernr(pernr);
    
    if (!user) {
      console.log(`User ${pernr} authenticated with LDAP but not found in database`);
      return res.status(401).json({ 
        success: false, 
        message: 'User not authorized for this application',
        requestId: generateRequestId()
      });
    }

    console.log(`Login success for user: ${user.NAME} (${user.PERNR})`);
    
    res.json({ 
      success: true, 
      message: '登入成功', 
      user: {
        pernr: user.PERNR.replace(/^0+/, ''), // 移除前導零
        EMP_NAME: user.NAME
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: '伺服器內部錯誤',
      requestId: generateRequestId()
    });
  }
}

// Generate a simple request ID for tracking
function generateRequestId() {
  return Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 12);
}
