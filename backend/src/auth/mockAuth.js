/**
 * Mock authentication function for development/testing purposes.
 * Simulates successful authentication for specific hardcoded credentials.
 *
 * @param {string} username - The username to authenticate.
 * @param {string} password - The password for the username.
 * @returns {Promise<object|null>} A promise that resolves with user data on success, or null on failure.
 */
export async function authenticateMockUser(username, password) {
  return new Promise((resolve) => {
    // Simulate a network delay
    setTimeout(() => {
      if (username === 'dev' && password === 'password') {
        console.log('Mock authentication successful for user: dev');
        resolve({ username: 'dev', dn: 'mock_dn_dev' });
      } else if (username === 'erik' && password === 'password') {
        console.log('Mock authentication successful for user: erik');
        resolve({ username: 'erik', dn: 'mock_dn_erik' });
      } else {
        console.log('Mock authentication failed for user:', username);
        resolve(null);
      }
    }, 500);
  });
}
