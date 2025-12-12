# iOS Agentforce Theming Template

This template extends the `ios-agentforce` template with comprehensive custom theming capabilities for the Salesforce Agentforce SDK. It demonstrates how to implement custom branding and color schemes while maintaining the SDK's design system and accessibility standards.

## Overview

The `ios-agentforce-theming` template adds:
- **Custom Theme Manager**: Full implementation of `AgentforceThemeManager` protocol
- **Light & Dark Mode Support**: Complete color palettes for both modes
- **Semantic Color Tokens**: Organized color system following Salesforce design principles
- **System Integration**: Automatic adaptation to iOS appearance settings
- **Comprehensive Documentation**: Detailed code comments explaining each color token

## Features

### Custom Theming Implementation

- **CustomThemeManager**: Central theme management class extending `AgentforceDefaultThemeManager`
- **Semantic Color System**: All 40+ color tokens properly implemented and documented
- **Theme Modes**: Support for light, dark, and system (auto-switching) modes
- **Brand Consistency**: Custom brand colors applied throughout the SDK UI

### Color Token Categories

Based on the [Agentforce iOS SDK Branding and Theming documentation](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-branding-theming.html), the template implements:

1. **Surface Colors**: View and container backgrounds (surface1-3, surfaceContainer1-3)
2. **On-Surface Colors**: Text and icons on surfaces (onSurface1-3)
3. **Accent Colors**: Interactive elements and primary actions (accent1-3, accentContainer1, onAccent1)
4. **Brand Colors**: Company branding (brandBase50, errorBase50)
5. **Feedback Colors**: 
   - Error states (error1, errorContainer1, onError1, borderError1)
   - Success states (successContainer1, onSuccess1, borderSuccess1)
   - Warning states (feedbackWarning1, feedbackWarningContainer1)
   - Info states (info1, infoContainer1)
6. **Disabled States**: Non-interactive components (disabledContainer1-2, onDisabled1-2)

## Requirements

- iOS 18.0+
- Xcode 15.0+
- CocoaPods
- Valid Salesforce organization with Agentforce configured

## Template Variables

Inherits all variables from `ios-agentforce`:

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `projectName` | string | Yes | The display name of the iOS application |
| `bundleIdentifier` | string | Yes | The bundle identifier (e.g., com.example.myapp) |
| `organization` | string | Yes | The organization name |
| `esDeveloperName` | string | Yes | The Einstein Service Developer Name for the agent configuration |
| `organizationId` | string | Yes | Your Salesforce Organization ID |
| `serviceApiUrl` | string | Yes | The Salesforce Service API URL |

## Project Structure

```
{{projectName}}/
├── {{projectName}}App.swift          # Main app entry point
├── ContentView.swift                 # Main chat interface view with theming
├── AgentforceViewModel.swift         # View model with theme state management
├── CredentialProvider.swift          # Guest authentication provider
├── CustomThemeManager.swift          # Custom theme manager implementation (NEW)
├── Info.plist                        # App configuration
└── Assets.xcassets                   # App assets
```

## Key Implementation Details

### CustomThemeManager.swift

The custom theme manager provides:
- Override of `lightColors()` method with custom light mode palette
- Override of `darkColors()` method with custom dark mode palette
- Support for `.light`, `.dark`, and `.system` theme modes
- Detailed documentation for each color token's purpose and usage

**Example Color Definitions:**

```swift
// Primary brand color for interactive elements
var accent1: Color { Color(red: 0.0, green: 0.48, blue: 0.8) }

// Branded button backgrounds
var accentContainer1: Color { Color(red: 0.0, green: 0.48, blue: 0.8) }

// Error text and icons
var error1: Color { Color(red: 0.8, green: 0.2, blue: 0.2) }
```

### ContentView.swift

Updated to use the custom theme manager:
- Initializes `CustomThemeManager` with `.system` mode
- Passes theme manager to `AgentforceClient` during initialization
- Displays theme mode indicator for demonstration
- Uses custom brand colors for UI elements

### AgentforceViewModel.swift

Enhanced with theme management:
- Tracks current theme mode preference
- Provides `toggleThemeMode()` method for runtime switching
- Documents best practices for theme state management

## Customization Guide

### Changing Brand Colors

To customize the brand colors, edit `CustomThemeManager.swift`:

1. **Update Light Mode Colors**:
```swift
class CustomLightColors: AgentforceColors {
    var accent1: Color { Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) }
    var accentContainer1: Color { Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) }
    var brandBase50: Color { Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) }
    // ... update other colors as needed
}
```

2. **Update Dark Mode Colors**:
```swift
class CustomDarkColors: AgentforceColors {
    var accent1: Color { Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) }
    // ... ensure dark mode colors maintain contrast
}
```

### Best Practices

1. **Semantic Usage**: Always use semantic color tokens (e.g., `accent2` for links) rather than hardcoded colors
2. **Accessibility**: Ensure sufficient contrast ratios (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
3. **Consistency**: Maintain the same semantic meaning across light and dark modes
4. **Testing**: Test colors in both light and dark modes, and in various lighting conditions
5. **Brand Alignment**: Coordinate with design team to ensure colors match brand guidelines

### Theme Mode Configuration

To change the default theme mode, update `ContentView.swift`:

```swift
// Force light mode
self.themeManager = CustomThemeManager(themeMode: .light)

// Force dark mode
self.themeManager = CustomThemeManager(themeMode: .dark)

// Respect system settings (recommended)
self.themeManager = CustomThemeManager(themeMode: .system)
```

## Installation

After generating the project from this template:

1. Navigate to the project directory:
   ```bash
   cd path/to/{{projectName}}
   ```

2. Install CocoaPods dependencies:
   ```bash
   pod install
   ```

3. Open the workspace:
```bash
   open {{projectName}}.xcworkspace
   ```

4. Build and run the project in Xcode

## Architecture

### Theme Application Flow

1. **Initialization**: `CustomThemeManager` is created with desired theme mode
2. **Client Setup**: Theme manager is passed to `AgentforceClient` during initialization
3. **SDK Integration**: Agentforce SDK automatically applies custom colors to all UI components
4. **Mode Switching**: Theme mode can be changed by creating new client instance (runtime switching requires client recreation)

### Color Token Resolution

```
CustomThemeManager
    ↓
lightColors() / darkColors()
    ↓
CustomLightColors / CustomDarkColors
    ↓
Individual Color Tokens (e.g., accent1, surface1)
    ↓
Agentforce SDK UI Components
```

## Known Limitations

Based on the Agentforce SDK documentation:

- **Font Customization**: Not yet supported by the SDK
- **Dimension Customization**: Not yet supported by the SDK  
- **Shape Customization**: Not yet supported by the SDK
- **Runtime Theme Switching**: Requires recreating the `AgentforceClient` instance

## Future Enhancements

Potential additions for future template layers:

- **Settings UI**: In-app theme mode switcher
- **Persistent Preferences**: Save theme selection to UserDefaults
- **Brand Presets**: Multiple predefined color schemes
- **Advanced Theming**: Custom views and view providers
- **A11y Validator**: Automated accessibility contrast checking

## Documentation References

- [Agentforce iOS SDK Branding and Theming](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-branding-theming.html)
- [iOS Quick Start Guide](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-quick-start.html)
- [Agentforce SDK Documentation](https://developer.salesforce.com/docs/einstein/genai/guide/intro-agent-sdk.html)

## License

This template follows the Salesforce Mobile SDK licensing terms.
