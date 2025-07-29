// Remove dotenv import here as it's handled in app.js
import { authenticateLdapUser } from '../auth/ldapAuth.js';
import { authenticateMockUser } from '../auth/mockAuth.js';

const AUTH_MODE = process.env.AUTH_MODE || 'mock'; // Default to mock if not set

const ldapConfig = {
  url: process.env.LDAP_URL,
  adminDn: process.env.LDAP_BIND_DN,
  adminPassword: process.env.LDAP_BIND_PASSWORD,
  searchBase: process.env.LDAP_SEARCH_BASE,
};

/**
 * Authenticates a user based on the configured AUTH_MODE.
 * If AUTH_MODE is 'ldap', it uses LDAP authentication.
 * Otherwise (or if AUTH_MODE is 'mock'), it uses mock authentication.
 *
 * @param {string} username - The username to authenticate.
 * @param {string} password - The password for the username.
 * @returns {Promise<object|null>} A promise that resolves with user data on success, or null on failure.
 */
export async function authenticateUser(username, password) {
  if (AUTH_MODE === 'ldap') {
    console.log('Using LDAP authentication mode.');
    // Validate LDAP config before attempting to authenticate
    if (!ldapConfig.url || !ldapConfig.adminDn || !ldapConfig.adminPassword || !ldapConfig.searchBase) {
      console.error('LDAP configuration is incomplete. Please check your .env file.');
      return null;
    }
    return authenticateLdapUser(username, password, ldapConfig);
  } else {
    console.log('Using MOCK authentication mode.');
    return authenticateMockUser(username, password);
  }
}
