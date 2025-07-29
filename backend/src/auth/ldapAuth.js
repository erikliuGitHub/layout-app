import ldap from 'ldapjs';

/**
 * Authenticates a user against an LDAP server.
 * This function performs a two-step authentication:
 * 1. Binds with an admin user to search for the target user's DN.
 * 2. Binds with the target user's DN and provided password to verify credentials.
 *
 * @param {string} username - The username to authenticate.
 * @param {string} password - The password for the username.
 * @param {object} ldapConfig - LDAP configuration object.
 * @param {string} ldapConfig.url - LDAP server URL (e.g., 'ldap://localhost:389').
 * @param {string} ldapConfig.adminDn - DN of an admin user for searching (e.g., 'cn=admin,dc=dev,dc=local').
 * @param {string} ldapConfig.adminPassword - Password for the admin user.
 * @param {string} ldapConfig.searchBase - Base DN for user searches (e.g., 'ou=users,dc=dev,dc=local').
 * @returns {Promise<object|null>} A promise that resolves with user data (e.g., { username: 'erik', dn: '...' }) on success, or null on failure.
 */
export async function authenticateLdapUser(username, password, ldapConfig) {
  const { url, adminDn, adminPassword, searchBase } = ldapConfig;

  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: [url] });

    client.on('error', (err) => {
      console.error('LDAP client error:', err);
      client.unbind();
      reject(new Error('LDAP client error'));
    });

    // Step 1: Bind with admin user to search for the target user's DN
    client.bind(adminDn, adminPassword, (err) => {
      if (err) {
        console.error('Admin bind failed:', err);
        client.unbind();
        reject(new Error('Admin bind failed'));
        return;
      }

      const searchOptions = {
        scope: 'sub',
        filter: `(uid=${username})`,
        attributes: ['dn', 'uid', 'cn', 'displayName']
      };

      client.search(searchBase, searchOptions, (searchErr, res) => {
        if (searchErr) {
          console.error('LDAP search failed:', searchErr);
          client.unbind();
          reject(new Error('LDAP search failed'));
          return;
        }

        let userDn = null;
        let user = null;

        res.on('searchEntry', (entry) => {
          userDn = entry.dn.toString(); // Ensure DN is a string
          
          // 安全地獲取屬性值
          const uidAttr = entry.attributes.find(a => a.type === 'uid');
          const cnAttr = entry.attributes.find(a => a.type === 'cn');
          const displayNameAttr = entry.attributes.find(a => a.type === 'displayName');
          
          user = {
            uid: uidAttr ? uidAttr.values[0] : username,
            displayName: cnAttr ? cnAttr.values[0] : (displayNameAttr ? displayNameAttr.values[0] : username)
          };
        });

        res.on('error', (err) => {
          console.error('Search error:', err.message);
          client.unbind();
          reject(new Error('LDAP search error'));
        });

        res.on('end', (result) => {
          if (!userDn) {
            console.log(`User ${username} not found in directory.`);
            client.unbind();
            resolve(null); // User not found
            return;
          }

          // Step 2: Bind with the target user's DN and provided password
          const userClient = ldap.createClient({ url: [url] });
          userClient.bind(userDn, password, (userBindErr) => {
            userClient.unbind();
            client.unbind(); // Unbind the admin client

            if (userBindErr) {
              console.log(`Authentication failed for user ${username}:`, userBindErr.message);
              resolve(null); // Authentication failed
            } else {
              console.log(`Authentication successful for user ${username}.`);
              resolve({ ...user, dn: userDn }); // Authentication successful
            }
          });
        });
      });
    });
  });
}
