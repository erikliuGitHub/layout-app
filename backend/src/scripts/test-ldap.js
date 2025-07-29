import ldap from 'ldapjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const ldapUrl = process.env.LDAP_URL;
const adminDn = process.env.LDAP_BIND_DN;
const adminPassword = process.env.LDAP_BIND_PASSWORD;
const searchBase = process.env.LDAP_SEARCH_BASE;

// User credentials to test
const usernameToTest = '700435';
const passwordToTest = '1';

if (!ldapUrl || !adminDn || !adminPassword || !searchBase) {
  console.error('Error: LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD, and LDAP_SEARCH_BASE must be defined in your .env file.');
  process.exit(1);
}

const client = ldap.createClient({ url: [ldapUrl] });

client.on('error', (err) => {
  console.error('LDAP client error:', err);
  process.exit(1);
});

console.log(`Step 1: Binding with admin user (${adminDn}) to search for the user...`);

client.bind(adminDn, adminPassword, (err) => {
  if (err) {
    console.error('Admin bind failed!', err);
    client.unbind();
    process.exit(1);
  }

  console.log('Admin bind successful. Now searching for user...');

  const searchOptions = {
    scope: 'sub',
    filter: `(uid=${usernameToTest})`,
    attributes: ['dn']
  };

  client.search(searchBase, searchOptions, (searchErr, res) => {
    if (searchErr) {
      console.error('LDAP search failed:', searchErr);
      client.unbind();
      process.exit(1);
    }

    let userDn = null;

    res.on('searchEntry', (entry) => {
      console.log('Found user entry:', entry.dn);
      userDn = entry.dn;
    });

    res.on('error', (err) => {
      console.error('Search error:', err.message);
      client.unbind();
      process.exit(1);
    });

    res.on('end', (result) => {
      if (!userDn) {
        console.error(`User ${usernameToTest} not found in directory.`);
        client.unbind();
        process.exit(1);
        return;
      }

      console.log(`\nStep 2: Found user DN. Now attempting to bind with user's credentials...`);
      console.log(`User DN: ${userDn}`);

      // Create a new client for the user bind test
      const userClient = ldap.createClient({ url: [ldapUrl] });
      userClient.bind(userDn.toString(), passwordToTest, (userBindErr) => {
        if (userBindErr) {
          console.error('\n*** User authentication FAILED! ***');
          console.error('Error:', userBindErr);
        } else {
          console.log('\n*** User authentication SUCCESSFUL! ***');
          console.log(`Successfully verified credentials for ${usernameToTest}.`);
        }
        userClient.unbind();
        client.unbind(); // Unbind the admin client as well
        process.exit(userBindErr ? 1 : 0);
      });
    });
  });
});