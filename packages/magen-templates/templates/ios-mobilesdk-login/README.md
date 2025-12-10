# iOS Mobile SDK Login Customization Template

This template demonstrates how to customize the Salesforce Mobile SDK login screen for iOS applications. It builds on the `ios-mobilesdk` template and adds comprehensive login UI customization capabilities.

## Features

✅ **Custom Login Screen** - Fully customizable Salesforce OAuth login experience  
✅ **Hide Gear Icon** - Prevent users from changing login servers  
✅ **Custom Branding** - Match your company's colors and fonts  
✅ **Navigation Bar Control** - Show/hide and customize the navigation bar  
✅ **Custom View Controller** - Extend `SFLoginViewController` for advanced customization  
✅ **Well-Documented** - Extensive code comments and configuration examples

## What's Included

### Files

- **CustomLoginViewController.swift** - Custom login view controller with navigation bar customization
- **LoginConfiguration.swift** - Convenient configuration methods for common scenarios
- **AppDelegate.swift** - Enhanced with login configuration setup
- **LOGIN_CUSTOMIZATION.md** - Comprehensive guide to login customization options

### Customization Options

1. **Hide Settings Icon Only** - Simplest option, prevents server selection
2. **Hide Entire Navigation Bar** - Minimal, clean login experience
3. **Custom Styling** - Brand the login screen with your colors and fonts
4. **Custom View Controller** - Complete control over login behavior and UI

## Quick Start

### 1. Generate a New Project

```bash
npx @salesforce/mobile-mcp-tools create-app
# Select "ios-mobilesdk-login" template
```

### 2. Configure Login Options

In `AppDelegate.swift`, choose your preferred configuration:

```swift
// Option 1: Just hide the gear icon (simplest)
LoginConfiguration.hideGearIcon()

// Option 2: Custom branding
LoginConfiguration.configureBranding(
    navBarColor: UIColor.systemBlue,
    textColor: .white
)

// Option 3: Full customization with custom view controller
LoginConfiguration.configureWithCustomViewController()
```

### 3. Build and Run

```bash
cd YourProjectName
pod install
open YourProjectName.xcworkspace
# Build and run in Xcode
```

## Configuration Examples

### Hide Gear Icon Only

The simplest customization - prevents users from selecting a different login server:

```swift
let loginConfig = SFSDKLoginViewControllerConfig()
loginConfig.showSettingsIcon = false
UserAccountManager.shared.loginViewControllerConfig = loginConfig
```

### Custom Branding

Match your company's brand:

```swift
let loginConfig = SFSDKLoginViewControllerConfig()
loginConfig.showSettingsIcon = false
loginConfig.navBarColor = UIColor(red: 0.0, green: 0.5, blue: 1.0, alpha: 1.0)
loginConfig.navBarTextColor = .white
loginConfig.navBarFont = UIFont.systemFont(ofSize: 18, weight: .semibold)
UserAccountManager.shared.loginViewControllerConfig = loginConfig
```

### Custom View Controller

For advanced customization:

```swift
class CustomLoginViewController: SFLoginViewController {
    override func setupNavigationBar() {
        super.setupNavigationBar()
        self.title = "My App Login"
    }
    
    override func backButtonAction() {
        // Custom back button behavior
    }
}

// In AppDelegate
let loginConfig = SFSDKLoginViewControllerConfig()
loginConfig.loginViewControllerCreationBlock = {
    return CustomLoginViewController(nibName: nil, bundle: nil)
}
UserAccountManager.shared.loginViewControllerConfig = loginConfig
```

## Template Variables

When generating a project, you'll be prompted for:

- `projectName` - Your application name
- `organization` - Your organization name
- `bundleIdentifier` - iOS bundle identifier (e.g., com.example.myapp)
- `salesforceMobileSDKVersion` - SDK version (default: 13.1)
- `salesforceLoginHost` - Login server (default: login.salesforce.com)
- `salesforceConsumerKey` - Connected App Consumer Key
- `salesforceCallbackUrl` - OAuth callback URL

## Requirements

- iOS 17.0+
- Xcode 15.0+
- CocoaPods
- Salesforce Connected App configured with OAuth

## Documentation

See `LOGIN_CUSTOMIZATION.md` for detailed documentation including:

- All available configuration properties
- Advanced customization examples
- Best practices and security considerations
- Troubleshooting guide

## Based On

This template is based on the `ios-mobilesdk` template and adds login customization on top of the base Salesforce Mobile SDK integration.

## Use Cases

Perfect for:

- **Enterprise Apps** - Lock users to specific Salesforce orgs
- **White-Label Apps** - Brand the login experience
- **ISV Apps** - Custom login flows and branding
- **Production Apps** - Professional, polished login experience

## Resources

- [Salesforce Mobile SDK Documentation](https://developer.salesforce.com/docs/platform/mobile-sdk/overview)
- [Customizing the iOS Login Screen](https://developer.salesforce.com/docs/platform/mobile-sdk/guide/oauth-hide-gear-icon.html)
- [SFSDKLoginViewControllerConfig API Reference](https://forcedotcom.github.io/SalesforceMobileSDK-iOS/)

## License

See LICENSE.txt in the repository root.

## Support

For issues and questions:
- Check the `LOGIN_CUSTOMIZATION.md` guide
- Review Salesforce Mobile SDK documentation
- Open an issue in the mobile-mcp-tools repository

