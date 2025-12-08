# iOS Base Template

A minimal iOS application template using SwiftUI and modern iOS development practices.

## Features

- SwiftUI-based app structure
- Modern iOS 17+ compatibility
- Clean, minimal codebase
- Asset catalog configured
- Info.plist with standard settings

## Variables

- **appName** (required): The display name of the application
- **bundleId** (required): Bundle identifier (e.g., `com.example.myapp`)
- **organizationName** (optional): Organization name for copyright headers
- **deploymentTarget** (optional): Minimum iOS version (15.0, 16.0, 17.0, 18.0)

## Usage

```bash
# Generate a new app
magen-template generate ios-base --out ./MyNewApp

# With custom variables
magen-template generate ios-base \
  --out ./MyNewApp \
  --var appName="My Awesome App" \
  --var bundleId="com.mycompany.awesome"
```

## File Structure

```
template/
├── {{appName}}App.swift    # Main app entry point
├── ContentView.swift       # Main view
├── Info.plist             # App configuration
└── Assets.xcassets/       # Asset catalog
    ├── AppIcon.appiconset/
    └── AccentColor.colorset/
```

## Next Steps After Generation

1. Open the project in Xcode
2. Configure signing & capabilities
3. Add your app logic
4. Build and run on simulator or device

## Extending This Template

This template serves as a base for more specialized templates. To create a derived template:

1. Use `magen-template template create my-template --from ios-base`
2. Make your modifications
3. Run `magen-template template finalize my-template`

The system will create a layer patch tracking your changes.
