# ios-native-login

iOS application template with Salesforce Mobile SDK and native login for Experience Cloud. This template provides a minimal implementation of native login with a customizable SwiftUI login interface.

## Features

- **Native Login UI**: Custom SwiftUI-based login interface for Experience Cloud users
- **Username/Password Authentication**: Standard login flow with username and password
- **Webview Fallback**: Option to fall back to webview-based authentication
- **Salesforce Mobile SDK Integration**: Built on top of ios-mobilesdk template

## Prerequisites

Before using this template, you must:

1. Set up Headless Identity in your Salesforce org
2. Configure a connected app for the authorization code and credentials flow
3. Set the connected app's callback URL to `https://{your_Experience_Cloud_site_domain}/services/oauth2/echo`

For more information, see the [Salesforce Native Login documentation](https://developer.salesforce.com/docs/platform/mobile-sdk/guide/native-login-experience-cloud.html).

## Variables

- **projectName** (`string`) (required): The display name of the iOS application - default: `MyApp`
- **bundleIdentifier** (`string`) (required): The bundle identifier of the iOS application - default: `com.example.myapp`
- **organization** (`string`) (required): The organization name of the iOS application - default: `Example Inc.`
- **salesforceMobileSDKVersion** (`string`) (required): Salesforce Mobile SDK version to use - default: `13.1`
- **salesforceLoginHost** (`string`) (required): Salesforce login host (e.g. login.salesforce.com) - default: `login.salesforce.com`
- **salesforceConsumerKey** (`string`) (required): Salesforce Connected App Consumer Key (Client ID)
- **salesforceCallbackUrl** (`string`) (required): OAuth callback URL configured in Connected App
- **salesforceCommunityUrl** (`string`) (required): Experience Cloud community URL (e.g. https://your-community.force.com)

## Usage

```bash
magen-template generate ios-native-login --out ~/MyApp \
  --var projectName="MyApp" \
  --var bundleIdentifier="com.example.myapp" \
  --var organization="Example Inc." \
  --var salesforceConsumerKey="your-client-id" \
  --var salesforceCallbackUrl="your-redirect-uri" \
  --var salesforceCommunityUrl="https://your-community.force.com"
```

## Implementation Details

The template includes:

- **NativeLoginView.swift**: SwiftUI view providing the native login interface
- **NativeLoginViewFactory.swift**: Factory class for creating the native login view controller
- **SceneDelegate.swift**: Configured to use native login via `SalesforceManager.shared.useNativeLogin()`

The native login UI is displayed automatically when authentication is required. Users can authenticate with username/password or fall back to webview-based authentication.

## Development

This template is based on `ios-mobilesdk`. To modify:

1. Edit files in `work/` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: `magen-template template layer ios-native-login`
4. Test: `magen-template template test ios-native-login`

**Note**: Only `template.json`, `layer.patch`, and `README.md` are checked into version control.
The `work/` directory is for development only (add to .gitignore).
