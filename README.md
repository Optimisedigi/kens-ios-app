# Never Miss Twice 🎯

A habit tracker app built with Expo (React Native). The core philosophy: **you can miss a day, but never two in a row.**

## Features

- **Tap to complete** — log habits with satisfying haptic feedback
- **Visual status** — green (done), yellow (warning), red (missed twice)
- **Calendar grid** — see your history at a glance, like a GitHub contribution graph
- **Smart notifications** — get reminded before you're about to miss twice
- **Dark theme** — clean, minimal, easy on the eyes
- **Streak stats** — current streak, longest streak, completion rate

## Get Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the app:
   ```bash
   npx expo start
   ```

3. Scan the QR code with **Expo Go** on your phone

## Tech Stack

- Expo SDK 54 with Expo Router
- TypeScript
- AsyncStorage for persistence
- expo-notifications for local reminders
- expo-haptics for tactile feedback
