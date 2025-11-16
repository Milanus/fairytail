# 🔧 Enable Firebase Email/Password Authentication - Step by Step

## 🎯 Problem Identified
Firebase Authentication is not enabled in your Firebase Console, which is why verification emails aren't being sent.

## 📋 Step-by-Step Instructions

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pohadky-8c785`

### Step 2: Navigate to Authentication
1. In the left sidebar, click on **"Authentication"**
2. If you see "Get started" button, click it to initialize Authentication

### Step 3: Enable Email/Password Provider
1. Click on the **"Sign-in method"** tab at the top
2. Click on **"Email/Password"** from the list of providers
3. Toggle the **"Enable"** switch to **ON**
4. Click **"Save"** button

### Step 4: Verify Email Templates (Optional but Recommended)
1. Go to **"Templates"** tab
2. Click on **"Email Address Verification"**
3. Ensure it's active (toggle should be ON)
4. Review the template content - it should contain the verification link

### Step 5: Check Authorized Domains
1. Go to **"Settings"** → **"Authorized domains"**
2. Ensure your domain is listed:
   - `localhost` (for development)
   - Your production domain (if deployed)

## ✅ What This Fixes

- ✅ Enables email verification functionality
- ✅ Allows account creation with email
- ✅ Sends verification emails
- ✅ Enables user authentication

## 🔍 After Enabling

### Test the Fix:
1. Go to your app: `http://localhost:3000/login?mode=signup`
2. Create a test account with a real email
3. Check that you receive the verification email
4. Click the verification link
5. Try logging in

### Expected Results:
- Account creation should work without errors
- You'll receive a verification email in your inbox
- The email will contain a verification link
- After clicking the link, you should be able to log in

## 🚨 Important Notes

- **Free Tier Limit**: Firebase allows 125,000 email sends/month on free tier
- **Email Delivery**: Check spam/junk folders for verification emails
- **Real Emails Only**: Use real email addresses for testing (not fake ones)

## 🔧 Troubleshooting After Enabling

If emails still don't send after enabling:

1. **Check Console for Errors**: Open Developer Tools (F12) → Console when creating account
2. **Wait a Few Minutes**: Sometimes there's a delay in propagation
3. **Try Different Email**: Test with Gmail, Yahoo, or other providers
4. **Check Network**: Verify no firewall blocks are interfering

## 💡 Pro Tips

- After enabling, the changes are immediate
- You don't need to redeploy your application
- The verification emails will use Firebase's default templates unless you customize them
- Test with a real email address, not a fake one

## 🎉 Success Confirmation

You'll know it's working when:
1. Account creation completes without errors
2. You receive a verification email in your inbox
3. The verification link works
4. You can successfully log in after verification