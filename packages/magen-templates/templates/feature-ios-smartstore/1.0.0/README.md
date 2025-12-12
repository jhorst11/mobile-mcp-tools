# feature-ios-smartstore

iOS template demonstrating SmartStore integration with Salesforce Mobile SDK. This template showcases how to create SmartStore soups, persist Contact data offline, and populate UI from local storage.

## Features

- **SmartStore Configuration**: Includes `userstore.json` with Contact soup definition
- **Contact Data Persistence**: Fetches Contacts via REST API and stores them in SmartStore
- **Offline Data Display**: Populates table view from SmartStore instead of live REST responses
- **Smart SQL Queries**: Demonstrates querying SmartStore soups with Smart SQL
- **Data Synchronization**: Clears and upserts Contact records to keep soup up-to-date

## What's Included

### Files Added:
- `userstore.json` - SmartStore soup configuration for Contacts
- `ContactsViewController.swift` - Table view controller displaying Contacts from SmartStore
- Updated `AppDelegate.swift` - Loads SmartStore configuration at startup
- Updated `InitialViewController.swift` - Navigates to Contacts view after authentication

### SmartStore Soup Schema:
- **Soup Name**: `Contact`
- **Indexed Fields**: `Id`, `Name`
- **Features**: Full-text search on Name field

## Usage

```bash
magen-template generate feature-ios-smartstore \
  --out ~/MyContactsApp \
  --var projectName="ContactsApp" \
  --var bundleIdentifier="com.example.contactsapp" \
  --var organization="Example Inc." \
  --var salesforceConsumerKey="YOUR_CONSUMER_KEY" \
  --var salesforceCallbackUrl="YOUR_CALLBACK_URL"
```

## How It Works

1. **Startup**: App loads `userstore.json` configuration in `AppDelegate`
2. **Authentication**: User logs in via Salesforce OAuth
3. **Data Fetch**: App queries first 10 Contacts via REST API (Id and Name fields)
4. **SmartStore Upsert**: Contact records are stored in SmartStore soup
5. **Display**: Table view populates from SmartStore using Smart SQL query
6. **Offline Ready**: Data persists locally for offline access

## Code Highlights

### SmartStore Query Example:
```swift
let querySpec = QuerySpec.buildSmartQuerySpec(
    smartSql: "SELECT {Contact:Name} FROM {Contact} ORDER BY {Contact:Name} LIMIT 10",
    pageSize: 10
)
```

### Upsert to SmartStore:
```swift
let entries = records.map { ["Id": $0["Id"], "Name": $0["Name"]] }
try store.upsert(entries: entries, forSoupNamed: "Contact")
```

## Testing with Dev Tools

After running the app:
1. Type `control + command + z` (iOS simulator) or shake device
2. Click **Inspect SmartStore**
3. Click **Soups** to view Contact soup and record count

## Variables

All variables from `ios-mobilesdk` template plus:

- **projectName** (`string`) (required): The display name of the iOS application - default: `MyApp`
- **bundleIdentifier** (`string`) (required): The bundle identifier - default: `com.example.myapp`
- **organization** (`string`) (required): The organization name - default: `Example Inc.`
- **salesforceMobileSDKVersion** (`string`) (required): Mobile SDK version - default: `13.1`
- **salesforceLoginHost** (`string`) (required): Salesforce login host - default: `login.salesforce.com`
- **salesforceConsumerKey** (`string`) (required): Connected App Consumer Key
- **salesforceCallbackUrl** (`string`) (required): OAuth callback URL

## Next Steps

In a production app, you would:
- Add editing interface for Contact records
- Implement Mobile Sync for bidirectional synchronization
- Handle conflict resolution when merging offline changes
- Add support for more Contact fields (Phone, Email, etc.)
- Implement search and filtering capabilities

## Development

This template is based on `ios-mobilesdk`. To modify:

1. Edit files in `work/` directory (concrete files copied from parent)
2. Make your changes (add/modify/delete files)
3. Generate layer patch: `magen-template template layer feature-ios-smartstore`
4. Test: `magen-template template test feature-ios-smartstore`

**Note**: Only `template.json`, `layer.patch`, and `README.md` are checked into version control.
The `work/` directory is for development only (add to .gitignore).

## References

Based on Salesforce documentation: [Using SmartStore in Swift Apps](https://developer.salesforce.com/docs/platform/mobile-sdk/guide/offline-smartstore-swift-template.html)
