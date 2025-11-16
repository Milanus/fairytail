# 🔧 Firebase Email Verification Troubleshooting Guide

## 🚨 Common Causes of Email Verification Issues

### 1. **Email Templates Not Configured**
Firebase requires email templates to be configured for verification emails to be sent.

**Check in Firebase Console:**
1. Go to Firebase Console → Authentication → Templates
2. Look for "Email Address Verification" template
3. If not customized, it should show the default template

### 2. **API Key or Configuration Issues**
Sometimes environment variables or API keys have issues.

**Check in Browser Console:**
Look for these specific error messages:
- `auth/api-key-not-valid`
- `auth/network-request-failed`
- `auth/too-many-requests`
- `auth/unauthorized-domain`

### 3. **Domain Authorization**
Firebase may block emails if the domain isn't authorized.

**Check authorized domains:**
- Firebase Console → Authentication → Settings → Authorized domains
- Ensure your domain (localhost or your production domain) is listed

### 4. **Quota/Billing Issues**
Free tier has daily limits on email sends.

## 🔍 Debugging Steps

### Step 1: Check Browser Console
Open Developer Tools (F12) → Console tab when creating an account.
Look for error messages and copy them.

### Step 2: Check Firebase Console Authentication
1. Go to Firebase Console → Authentication → Users
2. See if users are being created even without email verification
3. Check the "Email verified" column

### Step 3: Check Email Templates
1. Firebase Console → Authentication → Templates
2. Verify "Email Address Verification" template exists and is active

### Step 4: Check Network Tab
In Developer Tools → Network tab, filter by "XHR" or "Fetch"
Look for failed requests when creating account.

## 🛠️ Quick Fixes

### Fix 1: Verify Email Templates
If no templates are configured, Firebase will use defaults which should work.

### Fix 2: Check Authorized Domains
Add your domain to authorized domains list:
- `localhost` (for development)
- Your production domain

### Fix 3: Clear Browser Data
Try in incognito/private mode to rule out browser issues.

### Fix 4: Check Environment Variables
Verify all Firebase config in `.env.local` is correct.

## 🔧 Testing Email Verification

### Manual Test:
1. Create a test account with a real email
2. Check Firebase Console → Authentication → Users
3. See if `emailVerified` is `false`
4. Manually mark as verified to test if login works

### Code Test:
Add this temporary logging to see if email verification is called:
```javascript
// Add this in signUpWithEmail function temporarily
console.log("About to send verification email to:", user.email);
await sendEmailVerification(user);
console.log("Verification email sent successfully");
```

## 📞 When to Contact Firebase Support

If you've checked all the above and emails still don't send:
1. Check Firebase status dashboard
2. Review billing/quota usage
3. Contact Firebase support with specific error messages

## 💡 Pro Tips

- Use real email addresses for testing (not fake ones)
- Check spam/junk folders
- Try different email providers (Gmail, Yahoo, etc.)
- Test on different browsers
- Ensure your Firebase project is in production mode (not test mode for verified domains)