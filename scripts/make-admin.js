/**
 * Script to make a user an admin in both Firestore and Realtime Database
 * 
 * Usage:
 * 1. Set your Firebase credentials in .env.local
 * 2. Run: node scripts/make-admin.js <user-email>
 * 
 * Example: node scripts/make-admin.js admin@example.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();
const rtdb = admin.database();

async function makeUserAdmin(email) {
  try {
    console.log(`\n🔍 Looking for user with email: ${email}`);

    // Get user by email from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.displayName || 'No name'} (${userRecord.uid})`);

    // Update in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      isAdmin: true,
      adminPermissions: {
        canDeleteUsers: true,
        canEditStories: true,
        canDeleteStories: true,
        canApproveStories: true,
        canManageAdmins: true,
        canViewAnalytics: true,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Updated admin status in Firestore');

    // Update in Realtime Database
    const userRef = rtdb.ref(`users/${userRecord.uid}`);
    const snapshot = await userRef.once('value');
    
    if (snapshot.exists()) {
      await userRef.update({
        isAdmin: true,
        adminPermissions: {
          canDeleteUsers: true,
          canEditStories: true,
          canDeleteStories: true,
          canApproveStories: true,
          canManageAdmins: true,
          canViewAnalytics: true,
        },
        updatedAt: Date.now(),
      });
      console.log('✅ Updated admin status in Realtime Database');
    } else {
      // Create user in Realtime Database if doesn't exist
      await userRef.set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || '',
        isAdmin: true,
        emailVerified: userRecord.emailVerified,
        adminPermissions: {
          canDeleteUsers: true,
          canEditStories: true,
          canDeleteStories: true,
          canApproveStories: true,
          canManageAdmins: true,
          canViewAnalytics: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log('✅ Created user with admin status in Realtime Database');
    }

    console.log(`\n🎉 SUCCESS! User ${email} is now an admin with full permissions!`);
    console.log('\nAdmin permissions granted:');
    console.log('  ✓ Delete users');
    console.log('  ✓ Edit stories');
    console.log('  ✓ Delete stories');
    console.log('  ✓ Approve stories');
    console.log('  ✓ Manage admins');
    console.log('  ✓ View analytics');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 User not found. Please make sure:');
      console.log('  1. The user has registered an account');
      console.log('  2. The email address is correct');
      console.log('\nTo create a new admin user, register at /login first.');
    }
    
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('\n❌ Error: Email address required');
  console.log('\nUsage: node scripts/make-admin.js <user-email>');
  console.log('Example: node scripts/make-admin.js admin@example.com\n');
  process.exit(1);
}

makeUserAdmin(email);
