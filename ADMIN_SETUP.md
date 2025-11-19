# Admin Setup Guide

This guide explains how to set up and use admin accounts in your Fairytail application.

## 🚀 Quick Start: Make Yourself Admin

### Method 1: Using the Admin Script (Recommended)

1. **Install required dependencies:**
   ```bash
   npm install firebase-admin dotenv
   ```

2. **Set up Firebase Admin credentials:**
   
   Add these to your `.env.local` file:
   ```env
   # Your existing Firebase config
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Firebase Admin SDK (get from Firebase Console > Project Settings > Service Accounts)
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   ```

3. **First, create a user account:**
   - Go to `/login` in your browser
   - Click "Sign Up"
   - Register with your email and password
   - Verify your email if required

4. **Make the user an admin:**
   ```bash
   node scripts/make-admin.js your-email@example.com
   ```

5. **Login and access admin panel:**
   - Go to `/login`
   - Sign in with your credentials
   - Navigate to `/admin` to access the admin panel

### Method 2: Direct Database Update (Alternative)

If you prefer to manually update the database:

1. **Go to Firebase Console:**
   - Open your Firebase project
   - Navigate to Firestore Database

2. **Find your user document:**
   - Go to the `users` collection
   - Find your user by UID or email

3. **Add admin field:**
   - Click on your user document
   - Add a new field:
     - Field name: `isAdmin`
     - Type: `boolean`
     - Value: `true`

4. **Update Realtime Database:**
   - Go to Realtime Database
   - Navigate to `users/{your-uid}`
   - Add the same `isAdmin: true` field

5. **Logout and login again** to refresh your session

## 🎯 Admin Features

Once you're logged in as an admin, you can:

### User Management
- ✅ View all users from both Firestore and Realtime Database
- ✅ See sync status (which database each user exists in)
- ✅ Sync users between databases with one click
- ✅ Grant or revoke admin rights to other users
- ✅ Delete users from both databases

### Story Management
- ✅ Approve or reject pending stories
- ✅ Edit any story
- ✅ Delete any story
- ✅ Mark stories as featured
- ✅ Add AI-generated images and audio to stories

### Admin Permissions
When you make a user an admin, they automatically get:
- `canDeleteUsers` - Delete user accounts
- `canEditStories` - Edit any story
- `canDeleteStories` - Delete any story
- `canApproveStories` - Approve pending stories
- `canManageAdmins` - Grant/revoke admin rights
- `canViewAnalytics` - View analytics (future feature)

## 📊 Admin Panel Features

### Database Sync Dashboard
The admin panel shows:
- **Green badge**: Users synced in both databases ✓
- **Orange badge**: Users only in Firestore (need sync)
- **Red badge**: Users only in Realtime Database (orphaned)

### Sync All Users Button
Click "🔄 Sync All Users to Realtime DB" to:
- Copy all Firestore users to Realtime Database
- Ensure database consistency
- Fix sync issues automatically

### User Table Columns
- **Email** - User's email address
- **Username** - Display name
- **Admin** - Shows 👑 Admin badge if user is admin
- **Database** - Shows which database(s) contain the user
- **Created** - Account creation date
- **Last Login** - Last login timestamp
- **Actions** - Make Admin / Remove Admin / Delete buttons

## 🔒 Security Notes

- Only admins can access the `/admin` page
- Only admins can grant/revoke admin rights
- All admin actions are logged to console
- User deletion requires confirmation
- Admin status is synced across both databases

## 🛠️ Troubleshooting

### "Access Denied" when accessing /admin
- Make sure you're logged in
- Verify `isAdmin: true` is set in both Firestore and Realtime Database
- Logout and login again to refresh your session

### Script fails with "User not found"
- Make sure the user has registered an account first
- Check the email address is correct
- Verify Firebase Admin credentials are correct

### Users not syncing
- Check Firebase permissions/rules
- Verify both databases are accessible
- Check console for error messages

## 📝 Example Usage

```bash
# Install dependencies
npm install firebase-admin dotenv

# Make a user admin
node scripts/make-admin.js admin@example.com

# Output:
# 🔍 Looking for user with email: admin@example.com
# ✅ Found user: Admin User (abc123xyz)
# ✅ Updated admin status in Firestore
# ✅ Updated admin status in Realtime Database
# 🎉 SUCCESS! User admin@example.com is now an admin with full permissions!
```

## 🎓 Next Steps

After becoming an admin:
1. Login at `/login`
2. Navigate to `/admin`
3. Review the sync status dashboard
4. Click "Sync All Users" if needed
5. Manage users and stories as needed

For more information, see the main README.md file.
