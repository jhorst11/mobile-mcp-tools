# iOS Salesforce Base Template

A layered iOS application template that extends `ios-base` with Salesforce Mobile SDK integration.

## Features

- **Salesforce Mobile SDK**: Pre-configured authentication and data management
- **SmartStore**: Local data storage with Salesforce sync capabilities
- **UIKit Architecture**: Scene-based app delegate structure
- **CocoaPods Integration**: Automated dependency management

## Requirements

- **iOS 17.0+**
- **Xcode 16.0+**
- **CocoaPods 1.12.1+**

## Getting Started

### 1. Generate Your App

```bash
magen-template generate ios-salesforce-base --out MyApp
cd MyApp
```

### 2. Install Dependencies

```bash
pod install
```

### 3. Configure Xcode Build Settings

**IMPORTANT**: Due to Xcode's script sandboxing, you need to disable `ENABLE_USER_SCRIPT_SANDBOXING` for the project:

1. Open `MyApp.xcworkspace` in Xcode (not `.xcodeproj`)
2. Select the **MyApp** project in the navigator
3. Select the **MyApp** target
4. Go to **Build Settings**
5. Search for "User Script Sandboxing"
6. Set **ENABLE_USER_SCRIPT_SANDBOXING** to **No**

Alternatively, you can do this via the command line before opening Xcode:

```bash
# For the main target
echo 'ENABLE_USER_SCRIPT_SANDBOXING = NO;' >> MyApp.xcodeproj/project.pbxproj
```

### 4. Build and Run

1. Open `MyApp.xcworkspace`
2. Select a simulator or device
3. Press **Cmd+R** to build and run

## Template Variables

This template inherits variables from `ios-base` and adds Salesforce-specific configuration:

### Inherited from ios-base
- `projectName`: Your application name
- `bundleIdentifier`: iOS bundle ID (e.g., `com.example.myapp`)
- `organization`: Your organization name

### Salesforce Configuration
- `salesforceMobileSDKVersion`: Mobile SDK version (default: `13.1`)
- `salesforceConsumerKey`: Your Connected App's Consumer Key
- `salesforceLoginHost`: Salesforce login URL (default: `login.salesforce.com`)
- `salesforceCallbackUrl`: OAuth callback URL (default: `sfdc://success`)
- `salesforceOAuthScopes`: OAuth scopes (default: `web api refresh_token`)

## Project Structure

```
MyApp/
├── MyApp/
│   ├── AppDelegate.swift          # App lifecycle and SDK initialization
│   ├── SceneDelegate.swift        # Scene management
│   ├── InitialViewController.swift # Main view controller
│   ├── Bridging-Header.h          # Objective-C bridge
│   ├── bootconfig.plist           # Salesforce SDK configuration
│   ├── userstore.json             # SmartStore schema
│   ├── usersyncs.json             # SmartSync configuration
│   └── Info.plist                 # App configuration
├── Podfile                        # CocoaPods dependencies
└── MyApp.xcodeproj/               # Xcode project

```

## Key Files

### AppDelegate.swift
Initializes the Salesforce Mobile SDK and handles app lifecycle events.

### InitialViewController.swift
The main view controller that:
- Displays authentication status
- Observes Salesforce login/logout events
- Shows user information when authenticated

### bootconfig.plist
Configures the Salesforce Mobile SDK with your Connected App details.

## Customization

### Modify SmartStore Schema
Edit `userstore.json` to define your local database structure.

### Add OAuth Scopes
Update `salesforceOAuthScopes` in `variables.json` or during generation:

```bash
magen-template generate ios-salesforce-base \
  --out MyApp \
  --var salesforceOAuthScopes="api web chatter_api"
```

### Change Login Host
For sandbox testing:

```bash
magen-template generate ios-salesforce-base \
  --out MyApp \
  --var salesforceLoginHost="test.salesforce.com"
```

## Troubleshooting

### Build Error: "Sandbox: rsync deny file-write-create"

This error occurs when `ENABLE_USER_SCRIPT_SANDBOXING` is set to `YES` (the default in Xcode 14+). Follow step 3 in "Getting Started" to disable it.

### Build Error: "No such module 'SalesforceSDKCore'"

Make sure you:
1. Opened `MyApp.xcworkspace` (not `.xcodeproj`)
2. Ran `pod install` successfully
3. Cleaned the build folder (Product → Clean Build Folder)

### Authentication Not Working

Verify your `bootconfig.plist` has the correct:
- `remoteAccessConsumerKey` (your Connected App's Consumer Key)
- `oauthRedirectURI` (must match your Connected App's callback URL)
- `oauthScopes` (must be enabled in your Connected App)

## Next Steps

- Configure your Salesforce Connected App with the callback URL
- Implement business logic in `InitialViewController.swift`
- Define your data model in `userstore.json`
- Set up sync configurations in `usersyncs.json`

## Resources

- [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS)
- [Salesforce Mobile SDK Documentation](https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/)
- [Creating a Connected App](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm)

## License

See the main project LICENSE file.
