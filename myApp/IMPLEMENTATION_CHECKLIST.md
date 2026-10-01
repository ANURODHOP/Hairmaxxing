# RevenueCat Implementation Checklist

**Start Date:** May 21, 2026  
**Status:** Implementation Phase → Setup Phase

---

## ✅ PHASE 1: MIGRATION COMPLETE

All code implementation is done. These are already finished:

- [x] Created `src/services/revenuecat.ts` - SDK wrapper
- [x] Created `src/hooks/usePremium.ts` - React hook
- [x] Updated `src/context/AuthContext.js` - Auto-sync with Firebase
- [x] Updated `src/screens/Dashboard.jsx` - RevenueCat offerings UI
- [x] Updated `functions/index.js` - RevenueCat webhook handler
- [x] Created `.env.example` - Key template
- [x] Updated `package.json` - Added react-native-purchases
- [x] Removed all Stripe code - No legacy code remains
- [x] Created migration documentation
- [x] Created technical summary

**You can now proceed to the setup phase below.**

---

## 📋 PHASE 2: SETUP (DO THIS NOW)

### 2.1 Environment Variables
- [ ] Create `.env` file in project root (copy from `.env.example`)
- [ ] Go to https://dashboard.revenuecat.com → Settings → Keys
- [ ] Copy iOS Public SDK Key (`appl_...`)
- [ ] Copy Android Public SDK Key (`goog_...`)
- [ ] Paste into `.env` file
- [ ] Verify `.env` is in `.gitignore`
- [ ] **DO NOT commit `.env` to git**

### 2.2 Apple App Store Connect Setup
- [ ] Log in to App Store Connect
- [ ] Go to My Apps → HairMaxxing
- [ ] Click In-App Purchases
- [ ] Create Subscription Group named `hairmaxxing_pro`
- [ ] Create Renewable Subscription: `com.anonymous.myApp.weekly`
  - [ ] Set price (recommended: $3.99/week)
  - [ ] Add to group `hairmaxxing_pro`
  - [ ] Save and wait for approval
- [ ] Create Renewable Subscription: `com.anonymous.myApp.monthly`
  - [ ] Set price (recommended: $9.99/month)
  - [ ] Add to group `hairmaxxing_pro`
  - [ ] Save and wait for approval
- [ ] Create Renewable Subscription: `com.anonymous.myApp.threeMonth`
  - [ ] Set price (recommended: $24.99/3 months)
  - [ ] Add to group `hairmaxxing_pro`
  - [ ] Save and wait for approval

### 2.3 Google Play Console Setup
- [ ] Log in to Google Play Console
- [ ] Go to HairMaxxing → Products → Manage products
- [ ] Create In-App Product: `com.anonymous.myApp.weekly`
  - [ ] Set price (same as iOS for consistency)
  - [ ] Save
- [ ] Create In-App Product: `com.anonymous.myApp.monthly`
  - [ ] Set price (same as iOS for consistency)
  - [ ] Save
- [ ] Create In-App Product: `com.anonymous.myApp.threeMonth`
  - [ ] Set price (same as iOS for consistency)
  - [ ] Save

### 2.4 RevenueCat Dashboard Configuration
- [ ] Go to https://dashboard.revenuecat.com
- [ ] Click Products in left sidebar
- [ ] Create Entitlement:
  - [ ] Name: `premium`
  - [ ] Description: "Access to HairMaxxing Pro features"
- [ ] Create Product: `weekly`
  - [ ] iOS Product ID: `com.anonymous.myApp.weekly`
  - [ ] Google Product ID: `com.anonymous.myApp.weekly`
  - [ ] Link to `premium` entitlement
- [ ] Create Product: `monthly`
  - [ ] iOS Product ID: `com.anonymous.myApp.monthly`
  - [ ] Google Product ID: `com.anonymous.myApp.monthly`
  - [ ] Link to `premium` entitlement
- [ ] Create Product: `threeMonth`
  - [ ] iOS Product ID: `com.anonymous.myApp.threeMonth`
  - [ ] Google Product ID: `com.anonymous.myApp.threeMonth`
  - [ ] Link to `premium` entitlement
- [ ] Create Offering: `default`
  - [ ] Add all 3 products
  - [ ] Set `monthly` as MOST POPULAR tier

### 2.5 Webhook Configuration
- [ ] Note your Firebase project ID (from Firebase Console)
- [ ] Webhook URL will be: `https://us-central1-PROJECT_ID.cloudfunctions.net/revenuecatWebhook`
- [ ] Go to RevenueCat Dashboard → Settings → Webhooks
- [ ] Click "Add Webhook"
- [ ] Enter webhook URL above
- [ ] Select events:
  - [ ] INITIAL_PURCHASE
  - [ ] RENEWAL
  - [ ] CANCELLATION
  - [ ] EXPIRATION
  - [ ] SUBSCRIPTION_PAUSED
  - [ ] SUBSCRIPTION_EXTENDED
  - [ ] PRODUCT_CHANGE
- [ ] Save and copy the Webhook Secret that appears
- [ ] Run Firebase command:
  ```bash
  firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
  ```
  (Paste the secret when prompted)

---

## 🧪 PHASE 3: TESTING (BEFORE RELEASE)

### 3.1 Local Testing
- [ ] Run `npm install` to get react-native-purchases
- [ ] Run `expo prebuild` to generate native folders
- [ ] Connect iPhone to Mac
- [ ] Run `npm run ios` to build to device
- [ ] Check Xcode console for RevenueCat initialization log

### 3.2 iOS Sandbox Testing
- [ ] Go to iPhone Settings → App Store → Sandbox Account
- [ ] Sign in with your Sandbox Apple ID (from App Store Connect)
- [ ] Open HairMaxxing app
- [ ] Tap "Unlock Premium"
- [ ] Select monthly plan and tap "Unlock Premium"
- [ ] Sandbox payment prompt appears
- [ ] Complete purchase (use test card, no charge)
- [ ] Check that app redirects to `/month`
- [ ] Check Firebase Console:
  - [ ] Go to Firestore → users → [your UID]
  - [ ] Verify `isPremium: true`
  - [ ] Verify `entitlement: "premium"`
  - [ ] Verify `expiresAt` timestamp is set
  - [ ] Verify `updatedAt` is recent
- [ ] Check Cloud Functions logs:
  ```bash
  firebase functions:log
  ```
  Should see: `✅ Initial Purchase`

### 3.3 Android Testing
- [ ] Build and run on Android emulator or device:
  ```bash
  npm run android
  ```
- [ ] Tap "Unlock Premium"
- [ ] Select plan and complete purchase
- [ ] Verify same Firestore updates as iOS

### 3.4 Restore Purchases Test
- [ ] Tap "Restore purchases" on Dashboard
- [ ] Verify it finds and restores the test subscription
- [ ] Redirect to `/month` on success

### 3.5 Expiration Test
- [ ] In Firebase Console, manually edit expiresAt to a past timestamp
- [ ] Restart app
- [ ] Verify user is redirected to Dashboard (subscription expired)
- [ ] Tap "Unlock Premium" again to verify flow still works

### 3.6 Premium Feature Access Test
- [ ] With active subscription, go to Analyze screen
- [ ] Upload 3 photos and run hair analysis
- [ ] Should complete successfully ✅
- [ ] Edit Firestore to set `isPremium: false`
- [ ] Try analysis again
- [ ] Should return "NO_SUBSCRIPTION" error ✅

### 3.7 Webhook Test
- [ ] Monitor Cloud Functions logs while making a test purchase
- [ ] Should see webhook logs:
  - [ ] "✅ Initial Purchase" or "🔄 Renewal"
  - [ ] User ID logged
  - [ ] Firestore update logged
- [ ] Check Firestore immediately after purchase
- [ ] Should see updated `isPremium` and `expiresAt`

---

## 🚀 PHASE 4: PRODUCTION RELEASE

### 4.1 Pre-Release Verification
- [ ] All Phase 3 tests passed ✅
- [ ] No Stripe references remain in code
- [ ] `.env` file exists locally (NOT in git)
- [ ] `.env` is in `.gitignore`
- [ ] Webhook secret set in Firebase
- [ ] All 6 products created (3 iOS + 3 Android/Google)
- [ ] RevenueCat dashboard fully configured
- [ ] Read through REVENUECAT_MIGRATION.md one more time

### 4.2 Build Preparation
- [ ] Increment version number in `app.json`
- [ ] Update release notes
- [ ] Run `npm lint` to catch any issues
- [ ] Run `expo prebuild --clean` to regenerate native code
- [ ] Verify `.env` file is loaded:
  ```bash
  echo $EXPO_PUBLIC_REVENUECAT_IOS_KEY
  echo $EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
  ```
  (Should print your keys, not empty)

### 4.3 EAS Build & Submit
- [ ] Build for iOS:
  ```bash
  eas build --platform ios
  ```
- [ ] Build for Android:
  ```bash
  eas build --platform android
  ```
- [ ] Monitor build logs for errors
- [ ] Once builds complete, submit to stores:
  ```bash
  eas submit --platform ios
  eas submit --platform android
  ```

### 4.4 App Review
- [ ] Apple review: Wait for approval (usually 24-48 hours)
- [ ] Google review: Wait for approval (usually 2-4 hours)
- [ ] Monitor review feedback for any issues
- [ ] If rejected, address feedback and resubmit

### 4.5 Post-Launch
- [ ] Monitor RevenueCat Dashboard for:
  - [ ] Purchase volume
  - [ ] Conversion rates
  - [ ] Revenue by plan
- [ ] Monitor Firebase Console for:
  - [ ] Cloud Function errors
  - [ ] Firestore document updates
  - [ ] Auth activity
- [ ] Be ready to debug webhook issues if they arise
- [ ] Monitor user feedback for purchase-related complaints

---

## 🔧 OPTIONAL: Advanced Setup

### Firestore Security Rules (Recommended)
- [ ] Update Firestore Rules to prevent manual premium grants:
```javascript
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  // Prevent users from manually setting premium status
  allow update: if !request.resource.data.get('isPremium', false).changed();
}
```

### Webhook Signature Verification (Recommended)
- [ ] Uncomment signature verification code in `functions/index.js`
- [ ] Implement HMAC verification for security
- [ ] Test webhook with invalid signatures

---

## 📝 NOTES & TROUBLESHOOTING

**If products don't appear in app:**
- [ ] Verify product IDs match exactly (case-sensitive)
- [ ] Verify products are in RevenueCat dashboard
- [ ] Clear app cache and restart
- [ ] Check Cloud Functions logs

**If webhook doesn't update Firestore:**
- [ ] Verify webhook URL is correct
- [ ] Verify webhook secret is set in Firebase
- [ ] Check Cloud Functions logs for errors
- [ ] Test webhook manually in RevenueCat dashboard

**If purchase flow crashes:**
- [ ] Check iPhone/Android logs in Xcode/Android Studio
- [ ] Verify .env file exists and is loaded
- [ ] Verify RevenueCat API keys are correct
- [ ] Check revenuecatService.ts initialization logs

**If restore purchases doesn't work:**
- [ ] User must be signed in to same App Store/Google Play account
- [ ] Verify product IDs match between stores
- [ ] Check RevenueCat logs for restore attempts

---

## 📊 SUCCESS CRITERIA

You'll know it's working when:

✅ User can select plan on Dashboard  
✅ Native payment UI appears on tap  
✅ Purchase completes without browser redirect  
✅ Firestore `isPremium` field updates within 2 seconds  
✅ User is redirected to `/month` after purchase  
✅ Cloud Functions logs show webhook events  
✅ Premium features work for subscriber  
✅ Premium features are blocked for non-subscribers  
✅ Restore purchases works cross-device  
✅ Subscription expiration is enforced  

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Task | Duration | Cumulative |
|---|---|---|---|
| 1 | Code migration (done) | 0h (completed) | ✅ Done |
| 2 | Setup & config | 2-4h | 2-4h |
| 3 | Testing | 4-6h | 6-10h |
| 4 | Release | 24-72h | 30-82h |

**Total estimated time:** 2-3 business days from now

---

## 🎯 GO-LIVE DECISION TREE

```
All tests pass?
├─ YES → Proceed to launch
└─ NO → Debug per Phase 3 checklist
        → Re-test
        → Repeat until all pass

Launch to production?
├─ YES → Deploy with confidence! 🚀
└─ NO → Extend testing or hold
```

---

**Last Updated:** May 21, 2026  
**Status:** Ready for Phase 2 setup  
**Next Action:** Add environment variables and create products  

Good luck! 🍀
