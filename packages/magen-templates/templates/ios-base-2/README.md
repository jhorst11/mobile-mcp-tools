# ios-base-2

ios-base-2 template based on ios-base

## Variables

- **appName** (`string`) (required): The display name of the iOS application - default: `MyApp`
- **bundleId** (`string`) (required): Bundle identifier for the iOS application - default: `com.example.myapp`
- **organizationName** (`string`) (optional): Organization name for copyright headers - default: `My Company`
- **deploymentTarget** (`string`) (optional): Minimum iOS deployment target - default: `17.0`

## Usage

```bash
magen-template generate ios-base-2 --out ~/MyApp --var appName="MyApp"
```

## Development

This template is based on `ios-base`. To modify:

1. Edit files in `work/` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: `magen-template template layer ios-base-2`
4. Test: `magen-template template test ios-base-2`

**Note**: Only `template.json`, `layer.patch`, and `README.md` are checked into version control.
The `work/` directory is for development only (add to .gitignore).
