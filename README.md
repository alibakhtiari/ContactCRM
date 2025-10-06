# ContactCRM - Shared Mobile Contact CRM

A lightweight shared contacts CRM app for teams with real-time sync, role-based permissions, and automatic call logging.

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

The app is already configured with Supabase. The environment variables are automatically provided by OnSpace.

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

### 5. Test User Credentials

The app comes with a predefined admin user:
- **Email**: `ali.bakhtiarii@gmail.com`
- **Password**: Available in Supabase auth dashboard

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

# Run tests
npm test

# Lint code
npm run lint
```

## Building for Production

### Android APK
```bash
# Build APK
eas build --platform android --profile preview

# Or for production
eas build --platform android
```

### iOS App
```bash
# Build for iOS
eas build --platform ios
```

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
   ```bash
   npx expo start --clear
   ```

2. **Node modules issues**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **Expo CLI not found**:
   ```bash
   npm install -g @expo/cli
   ```

### Database Issues

If you encounter database connection issues:
1. Check your internet connection
2. Verify Supabase project status
3. Check browser console for detailed error messages

## Support

For technical support or questions:
- Contact: contact@onspace.ai
- Check browser console (F12) for error details
- Review Supabase dashboard for database issues