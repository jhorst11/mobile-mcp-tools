# {{projectName}}

A simple iOS application demonstrating Salesforce Mobile SDK integration.

## Overview

This app demonstrates:

- Salesforce OAuth authentication
- REST API queries for Accounts
- SwiftUI-based user interface

## Prerequisites

- Xcode 15.0 or later
- iOS 15.0 or later
- Salesforce Developer Account
- Connected App configured in Salesforce

## Setup

### 1. Install Dependencies

```bash
cd {{projectName}}
pod install
```

### 2. Configure Connected App

1. Create a Connected App in your Salesforce org
2. Enable OAuth settings
3. Add callback URL: `{{salesforceCallbackUrl}}`
4. Enable OAuth scopes: API, Web, Refresh Token

### 3. Update Configuration

Open `bootconfig.plist` and update:

- `remoteAccessConsumerKey`: Your Connected App Consumer Key
- `oauthRedirectURI`: Your callback URL (should match Connected App)

### 4. Run the App

1. Open `{{projectName}}.xcworkspace` (not .xcodeproj)
2. Select your target device/simulator
3. Build and run (⌘R)

## Project Structure

```
{{projectName}}/
├── {{projectName}}.xcodeproj/         # Xcode project
│   └── xcshareddata/xcschemes/
│       └── {{projectName}}.xcscheme
├── {{projectName}}/
│   ├── AppDelegate.swift              # App lifecycle and SDK setup
│   ├── SceneDelegate.swift            # Scene lifecycle
│   ├── InitialViewController.swift    # Initial view controller
│   ├── AccountsListView.swift         # Account list with SwiftUI
│   ├── AccountsListModel.swift        # Account data model
│   ├── Bridging-Header.h              # Objective-C/Swift bridge
│   ├── Info.plist                     # App configuration
│   ├── {{projectName}}.entitlements   # Keychain access
│   ├── Assets.xcassets/               # App icon and images
│   ├── bootconfig.plist               # Salesforce SDK configuration
│   ├── userstore.json                 # SmartStore configuration
│   ├── usersyncs.json                 # Sync configuration
│   └── PrivacyInfo.xcprivacy          # Privacy manifest
└── Podfile                            # CocoaPods dependencies
```

## Customization

See the extension points in the template documentation for guidance on:

- Adding support for additional SObjects
- Customizing the UI
- Adding offline capabilities with SmartStore

## Resources

- [Salesforce Mobile SDK for iOS](https://developer.salesforce.com/docs/platform/mobile-sdk/guide/ios.html)
- [Mobile SDK Sample Apps](https://github.com/forcedotcom/SalesforceMobileSDK-iOS)
- [Connected App Setup](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm)

## License

See LICENSE file for details.
