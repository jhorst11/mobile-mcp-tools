# Example iOS App Template

This is a simple example template demonstrating the `magen-templates` system.

## Features

- Basic SwiftUI structure
- Welcome screen with project name and organization
- Demonstrates Handlebars variable substitution
- Shows proper template structure

## Usage

Generate a project from this template:

```bash
npx magen-templates generate \
  --template ios-example-app \
  --output ./MyNewApp \
  --projectName MyNewApp \
  --organization "My Company"
```

## What Gets Generated

- A simple SwiftUI app with ContentView
- App entry point with project name
- Basic navigation structure

## Extension Points

### Add New View

You can add new views following the pattern in `ContentView.swift`:

```swift
struct MyNewView: View {
    var body: some View {
        Text("My New View")
    }
}
```

Then add navigation in ContentView.

