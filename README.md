# Fruit Demon List (Firebase Live)

This project now reads and writes the list directly from **Firebase Realtime Database**.

## 1) Configure Firebase

Edit `firebase-config.js` and replace all `REPLACE_ME` values with your Firebase web app config.

## 1.5) Quick migration guide (from old JSON)

1. Keep your existing `list.json` (or `Demon List/list.json`) in the repo for first run.
2. Deploy/run the site once with Firebase configured.
3. If Firebase path is empty, the app now auto-imports the legacy JSON into Firebase.
4. After confirming the list appears from Firebase, you can delete the old JSON file(s).

## 2) Database structure

The app uses this path:

- `fruit-demon-list/data` → list JSON object, e.g. `{ "levels": [...] }`
- `fruit-demon-list/meta/editorPin` → PIN required to unlock the website editor

You can change the root path by editing `window.FIREBASE_LIST_PATH` in `firebase-config.js`.

## 3) Security rules (example)

Use Firebase rules that let everyone read the list, but only allow writes when authenticated (recommended), e.g.:

```json
{
  "rules": {
    "fruit-demon-list": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

If you keep public writes, anyone can modify your list.

## 4) Live editing behavior

- The website always listens for realtime updates from Firebase.
- Opening the editor requires entering the PIN.
- Saving, deleting, and adding entries writes directly to Firebase.
- No JSON export/download step is needed.

## 5) PIN guide

- Preferred: set `fruit-demon-list/meta/editorPin` in Firebase so you can rotate the PIN without redeploying.
- Fallback: `window.EDITOR_PIN` in `firebase-config.js` is used only if Firebase PIN is missing.
- Important: front-end PIN checks are not a full security boundary. Use strict Firebase Rules/Auth for real protection.
