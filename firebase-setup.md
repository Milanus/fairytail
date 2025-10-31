# Firebase Setup Guide for Fairy Tale Platform

## How to Find Your Firebase Credentials

1. **Go to the Firebase Console**:
   - Visit https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create a New Project** (if you don't have one):
   - Click "Create a project"
   - Enter a project name (e.g., "fairy-tale-platform")
   - Accept the terms and conditions
   - Click "Create project"

3. **Register Your Web App**:
   - In the Firebase Console, click on the gear icon next to "Project Overview" in the left sidebar
   - Select "Project settings"
   - Click the "</>" icon to add a web app
   - Enter an app nickname (e.g., "fairy-tale-web")
   - Click "Register app"
   - Firebase will display your app's configuration details

4. **Locate Your Configuration Credentials**:
   - After registering your app, you'll see a code snippet with the configuration object
   - The configuration object will contain these values:
     - `apiKey`: A long string with numbers, letters, and dashes
     - `authDomain`: Your project ID followed by ".firebaseapp.com"
     - `projectId`: Your Firebase project ID
     - `storageBucket`: Your project ID followed by ".appspot.com"
     - `messagingSenderId`: A numerical ID
     - `appId`: A string starting with "1:" followed by numbers and colons

5. **Alternative Way to Find Credentials**:
   - In the Firebase Console, click on the gear icon next to "Project Overview"
   - Select "Project settings"
   - Scroll down to find your apps under "Your apps"
   - Click on your web app to view its configuration

## Using These Credentials

Once you have these credentials, you'll need to:

1. Create a `.env.local` file in your project root
2. Add the credentials as environment variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   ```

3. Create a Firebase configuration file in your Next.js app to initialize Firebase with these credentials

## Enabling Firebase Services

For your fairy tale platform, you'll need to enable:

1. **Firestore Database**:
   - In the Firebase Console, click "Firestore Database" in the left sidebar
   - Click "Create database"
   - Choose "Start in test mode" for development
   - Select a location for your database

2. **Authentication** (optional but recommended):
   - In the Firebase Console, click "Authentication" in the left sidebar
   - Click "Get started"
   - Enable sign-in methods like Email/Password, Google, etc.

These credentials will allow your Next.js application to communicate with Firebase services.