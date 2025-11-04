# RamzArzNegaran - Contact Management CRM

A lightweight contact management CRM app for teams with real-time synchronization, role-based permissions, and call logging capabilities.

## Features

- 📱 **Multi-Device Sync**: Real-time contact synchronization across all team devices
- 👥 **Role-Based Permissions**: Owner and User roles with proper contact ownership controls
- 📞 **Call Logging**: Automatic tracking of incoming/outgoing calls with duration
- 🚫 **Duplicate Prevention**: Database-level unique phone number constraints per organization
- 🔍 **Search & Filter**: Quick contact search by name or phone number

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, but recommended)

## Local Development Setup

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 2. Environment Setup

The app requires environment variables for Supabase integration. Create a `.env` file in the root directory:

```bash
# Copy example environment file
cp .env.example .env

# Or create .env with your Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server

```bash
# Start Expo development server
npm start

# Or using yarn
yarn start
```

This will start the Expo development server and show a QR code.

### 4. Run on Different Platforms

#### Web Browser
```bash
npm run web
# Or press 'w' in the terminal after running npm start
```

#### iOS Simulator (macOS only)
```bash
npm run ios
# Or press 'i' in the terminal after running npm start
```

#### Android Emulator/Device
```bash
npm run android
# Or press 'a' in the terminal after running npm start
```

#### Physical Mobile Device
1. Install Expo Go app from App Store/Google Play
2. Scan the QR code shown in terminal
3. The app will load on your device

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Contacts (Home)
│   │   ├── calls.tsx      # Call History
│   │   └── team.tsx       # Team Management
│   ├── login.tsx          # Authentication
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── services/              # API and data services
└── constants/             # TypeScript types
```

## Development Commands

```bash
# Start development server
npm start

# Run on web
npm run web

# Run on iOS
npm run ios

# Run on Android
npm run android

# Lint code
npm run lint

# Reset project structure
npm run reset-project
```

## Building for Production

### Prerequisites for Production Builds

1. **Install EAS CLI**:
```bash
npm install -g @expo/cli eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure Build Profiles**:
Create `eas.json` in the root directory:
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### Android Builds

#### Development Build (Debug)
```bash
# Build and install on connected device
eas build --profile development --platform android --local

# Or build for Expo
eas build --profile development --platform android
```

#### Preview Build (APK for testing)
```bash
# Build APK for testing
eas build --profile preview --platform android

# Build for both platforms
eas build --profile preview --platform all
```

#### Production Build
```bash
# Build AAB for Play Store
eas build --profile production --platform android

# Build for both platforms
eas build --profile production --platform all
```

### iOS Builds

#### Development Build
```bash
# Build for iOS simulator or device
eas build --profile development --platform ios
```

#### TestFlight Build
```bash
# Build for TestFlight distribution
eas build --profile preview --platform ios
```

#### Production Build
```bash
# Build for App Store
eas build --profile production --platform ios
```

### Automated Builds with EAS

#### Build Status
```bash
# Check build status
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

#### Build Configuration
Each build profile can be customized in `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Distribution

### Internal Distribution (Android)
```bash
# Build and distribute internally
eas build --profile preview --platform android --non-interactive

# Install via Expo Go or download APK
```

### App Store Deployment

#### iOS App Store
1. Build for production: `eas build --profile production --platform ios`
2. Upload to App Store Connect: `eas submit --platform ios`
3. Review and release in App Store Connect

#### Google Play Store
1. Build AAB: `eas build --profile production --platform android`
2. Upload to Play Console: `eas submit --platform android`
3. Review and release in Play Console

## Testing

### Local Testing
```bash
# Start development server with clear cache
npx expo start --clear

# Test on different devices simultaneously
npx expo start --device
```

### Pre-build Checks
```bash
# Run linter
npm run lint

# Check for common issues
npx expo doctor
```

## Troubleshooting

### Common Build Issues

1. **Metro bundler cache issues**:
```bash
npx expo start --clear
```

2. **Node modules issues**:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

3. **iOS build issues**:
```bash
# Clean iOS build
npx expo run:ios --clear
```

4. **Android build issues**:
```bash
# Clean Android build
npx expo run:android --clear
```

5. **EAS Build issues**:
```bash
# Clear EAS cache
eas build:list --all

# Check build logs
eas build:view [BUILD_ID]
```

### Environment Issues

1. **Supabase Connection**: Check your `.env` file and ensure valid Supabase credentials
2. **Network Issues**: Verify internet connection and Supabase service status
3. **Permissions**: Ensure all required permissions are configured in `app.json`

### Performance Optimization

1. **Bundle Analysis**:
```bash
npx expo start --analyze
```

2. **Memory Issues**: Clear Metro cache and restart development server
3. **Slow Builds**: Use `--local` flag for faster builds during development

## Support

For technical support:
- Check the [Expo documentation](https://docs.expo.dev/)
- Review [EAS Build documentation](https://docs.expo.dev/build/introduction/)
- Check browser console (F12) for development issues
- Review build logs in EAS dashboard

## Environment Variables Reference

Required environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

Optional environment variables:
- `EXPO_PUBLIC_APP_ENV`: Environment (development, staging, production)

development build
NODE_ENV=development eas build --platform android --local

npx expo install --check
npx expo install --fix
