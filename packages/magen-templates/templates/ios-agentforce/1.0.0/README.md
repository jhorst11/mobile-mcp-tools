# ios-agentforce

ios-agentforce template based on ios-base

## Variables

- **projectName** (`string`) (required): The display name of the iOS application - default: `MyApp`
- **bundleIdentifier** (`string`) (required): The bundle identifier of the iOS application - default: `com.example.myapp`
- **organization** (`string`) (required): The organization name of the iOS application - default: `Example Inc.`

## Usage

```bash
magen-template generate ios-agentforce --out ~/MyApp --var appName="MyApp"
```

## Development

This template is based on `ios-base`. To modify:

1. Edit files in `work/` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: `magen-template template layer ios-agentforce`
4. Test: `magen-template template test ios-agentforce`

**Note**: Only `template.json`, `layer.patch`, and `README.md` are checked into version control.
The `work/` directory is for development only (add to .gitignore).
