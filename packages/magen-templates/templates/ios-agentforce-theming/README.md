# iOS Agentforce Theming Template

A layered template that extends `ios-agentforce` with comprehensive custom theming capabilities for the Salesforce Agentforce SDK.

## Description

This template demonstrates professional implementation of the Agentforce iOS SDK's theming system, providing complete customization of the chat interface's visual appearance. It implements all semantic color tokens defined in the Salesforce design system, with full support for light mode, dark mode, and automatic system appearance adaptation.

**Reference Documentation**: [Agentforce iOS SDK Branding and Theming](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-branding-theming.html)

## What's New in This Layer

### Added Files

1. **CustomThemeManager.swift** - Comprehensive theme manager implementation
   - Extends `AgentforceDefaultThemeManager`
   - Implements light and dark mode color palettes
   - Includes 40+ semantic color tokens with detailed documentation
   - Supports `.light`, `.dark`, and `.system` theme modes

### Modified Files

1. **ContentView.swift** - Enhanced with custom theming
   - Initializes `CustomThemeManager` with system mode
   - Passes theme manager to `AgentforceClient`
   - Displays theme mode indicator
   - Uses custom brand colors for UI elements
   - Added helper properties for theme access

2. **AgentforceViewModel.swift** - Theme state management
   - Added `currentThemeMode` property
   - Added `toggleThemeMode()` method
   - Documented best practices for theme switching

3. **project.pbxproj** - Build configuration
   - Added `CustomThemeManager.swift` to build

## Key Features

### Comprehensive Color System

All color tokens from the Agentforce SDK are implemented and documented:

- **Surface Colors** (6 tokens): View and container backgrounds
- **On-Surface Colors** (3 tokens): Text and icons
- **Accent Colors** (5 tokens): Interactive elements and branding
- **Brand Colors** (2 tokens): Core brand identity
- **Error Colors** (4 tokens): Error states and validation
- **Success Colors** (3 tokens): Success confirmations
- **Warning Colors** (2 tokens): Caution indicators
- **Info Colors** (2 tokens): Informational messages
- **Disabled Colors** (4 tokens): Non-interactive states

### Documentation Excellence

Every color token includes:
- **Purpose**: What the color is used for
- **Usage Examples**: Where it appears in the UI
- **Accessibility Notes**: Contrast requirements
- **Mode Considerations**: Light vs. dark mode differences

### Theme Mode Support

Three operating modes:
- **Light Mode**: Custom light color palette
- **Dark Mode**: Custom dark color palette optimized for low-light viewing
- **System Mode** (Default): Automatically adapts to iOS appearance settings

## Usage

### Generating a Project

```bash
# Using magen-template CLI
magen-template generate ios-agentforce-theming \
  --out ~/MyThemedApp \
  --var projectName=MyThemedApp \
  --var bundleIdentifier=com.example.mythemed \
  --var organization="My Company" \
  --var esDeveloperName=YourAgentName \
  --var organizationId=00D000000000000 \
  --var serviceApiUrl=https://your-instance.salesforce.com
```

### Customizing Theme Colors

Edit `CustomThemeManager.swift` to change brand colors:

```swift
// In CustomLightColors class
var accent1: Color { 
    Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) 
}

var brandBase50: Color { 
    Color(red: YOUR_R, green: YOUR_G, blue: YOUR_B) 
}
```

Ensure you update both `CustomLightColors` and `CustomDarkColors` classes to maintain consistency across appearance modes.

### Changing Default Theme Mode

Edit `ContentView.swift` initialization:

```swift
// Use light mode always
self.themeManager = CustomThemeManager(themeMode: .light)

// Use dark mode always  
self.themeManager = CustomThemeManager(themeMode: .dark)

// Use system appearance (recommended)
self.themeManager = CustomThemeManager(themeMode: .system)
```

## Architecture

### Theme Integration Flow

```
CustomThemeManager (created in ContentView.init)
    ↓
Passed to AgentforceClient
    ↓
SDK applies colors to all UI components
    ↓
Chat interface displays with custom branding
```

### Color Resolution

```
lightColors() or darkColors()
    ↓
CustomLightColors or CustomDarkColors
    ↓
Specific color token (e.g., accent1)
    ↓
Applied to SDK UI component
```

## Best Practices

### 1. Semantic Color Usage

Always use semantic tokens rather than hardcoded colors:

```swift
// ✅ Good - semantic and theme-aware
Text("Hello").foregroundColor(themeManager.lightColors().onSurface1)

// ❌ Bad - hardcoded color
Text("Hello").foregroundColor(.black)
```

### 2. Accessibility

Ensure sufficient contrast ratios:
- **Normal text**: 4.5:1 contrast ratio minimum (WCAG AA)
- **Large text**: 3:1 contrast ratio minimum
- **UI components**: 3:1 contrast ratio for boundaries

### 3. Testing

Test your custom colors:
- In both light and dark modes
- On different devices (iPhone, iPad)
- In various lighting conditions
- With accessibility features enabled (Increase Contrast, Reduce Transparency)

### 4. Brand Consistency

Coordinate with your design team:
- Match official brand colors
- Maintain visual hierarchy
- Ensure colors work together harmoniously
- Consider cultural color associations

## Limitations

As documented by Salesforce, the following are not yet supported:

- **Font Customization**: Custom fonts cannot be applied
- **Dimension Customization**: Spacing and sizing cannot be modified
- **Shape Customization**: Corner radius and borders cannot be customized
- **Runtime Theme Switching**: Changing theme requires recreating `AgentforceClient`

## Examples

### Corporate Blue Theme

```swift
// Light mode
var accent1: Color { Color(red: 0.0, green: 0.48, blue: 0.8) }
var accentContainer1: Color { Color(red: 0.0, green: 0.48, blue: 0.8) }
var brandBase50: Color { Color(red: 0.0, green: 0.48, blue: 0.8) }

// Dark mode
var accent1: Color { Color(red: 0.3, green: 0.6, blue: 0.9) }
var accentContainer1: Color { Color(red: 0.2, green: 0.5, blue: 0.8) }
var brandBase50: Color { Color(red: 0.3, green: 0.6, blue: 0.9) }
```

### Tech Startup Green

```swift
// Light mode
var accent1: Color { Color(red: 0.0, green: 0.7, blue: 0.4) }
var accentContainer1: Color { Color(red: 0.0, green: 0.7, blue: 0.4) }
var brandBase50: Color { Color(red: 0.0, green: 0.7, blue: 0.4) }

// Dark mode
var accent1: Color { Color(red: 0.2, green: 0.85, blue: 0.5) }
var accentContainer1: Color { Color(red: 0.1, green: 0.6, blue: 0.3) }
var brandBase50: Color { Color(red: 0.2, green: 0.85, blue: 0.5) }
```

## Troubleshooting

### Colors Not Applying

- Verify `CustomThemeManager` is passed to `AgentforceClient`
- Check that you're using the correct color tokens
- Ensure you've implemented both light and dark mode colors

### Poor Contrast

- Use a contrast checker tool (e.g., WebAIM Contrast Checker)
- Test with "Increase Contrast" accessibility setting enabled
- Adjust color brightness values

### Theme Not Switching

- Remember that theme changes require recreating the `AgentforceClient`
- Verify theme mode is being set correctly
- Check that system appearance is configured properly in iOS settings

## Version History

- **1.0.0** - Initial release with complete theming implementation

## Resources

- [Agentforce iOS SDK Branding and Theming](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-branding-theming.html)
- [iOS Quick Start Guide](https://developer.salesforce.com/docs/einstein/genai/guide/agent-sdk-ios-quick-start.html)
- [Agentforce SDK Documentation](https://developer.salesforce.com/docs/einstein/genai/guide/intro-agent-sdk.html)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

## License

This template follows the Salesforce Mobile SDK licensing terms.

