# Setup Guide

## Prerequisites

- **Node.js**: v16 or higher
- **npm**: v7 or higher (or yarn)
- **Xcode**: v14+ (macOS only, for iOS development)
- **Android Studio**: Latest version (for Android development)
- **CocoaPods**: For iOS dependency management

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd tuemensa
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp env/.env.example env/.env
# Edit env/.env with your configuration
```

### 4. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 5. Android Setup

Ensure you have:
- Android SDK installed
- ANDROID_HOME environment variable set
- Java 11 installed

## Running the App

### Start Development Server

```bash
npm run dev
```

### Run on iOS Simulator

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

## Project Structure

See [README.md](../README.md) for detailed project structure.

## Troubleshooting

### Metro Bundler Issues

If Metro bundler has issues, try:
```bash
npm run dev -- --reset-cache
```

### iOS Build Errors

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android Build Errors

```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Development Workflow

1. Make changes to source files
2. Metro bundler automatically reloads
3. For native changes, rebuild the app
4. Run tests: `npm test`
5. Check code quality: `npm run lint`

## Additional Resources

- [React Native Documentation](https://reactnative.dev)
- [Navigation Setup Guide](./NAVIGATION.md)
- [State Management Guide](./STATE_MANAGEMENT.md)
