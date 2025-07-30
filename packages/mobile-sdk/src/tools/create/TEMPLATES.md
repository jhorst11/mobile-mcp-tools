# Salesforce Mobile SDK Templates Guide

This repository contains a comprehensive set of templates for creating Salesforce mobile applications using the Mobile SDK CLI tools: `forceios` and `forcedroid`. Each template is designed for specific use cases, platforms, and architectural patterns.

## CLI Tool Overview

- **`forceios`**: Creates iOS applications (Swift or Objective-C)
- **`forcedroid`**: Creates Android applications (Kotlin or Java)

## Template Categories

### Native iOS Templates (forceios)

#### iOSNativeSwiftTemplate

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: SwiftUI + Combine

**Description**: Modern Swift application template using MobileSync data framework with SwiftUI for declarative UI and Combine for reactive programming. Ideal for new iOS projects that want to leverage the latest iOS development patterns.

**Technical Implementation**:

- **Authentication**: Uses `bootconfig.plist` to configure OAuth settings including `remoteAccessConsumerKey`, `oauthRedirectURI`, and `oauthScopes`
- **API Access**: Utilizes `SFRestAPI.sharedInstance()` for making Salesforce REST API calls with SOQL queries
- **Data Pattern**: Direct API calls without SmartStore - queries Salesforce directly and displays results in UI
- **Example Query**: `SELECT Name FROM Contact LIMIT 10` executed via `requestForQuery` method
- **UI Framework**: SwiftUI for declarative UI components with reactive data binding
- **Architecture**: Uses Combine publishers for reactive programming patterns
- **Push Notifications**: Optional integration with `SFPushNotificationManager` for Salesforce push notifications

**Use Cases**:

- Standard iOS apps with Salesforce integration
- Apps requiring modern iOS UI patterns
- Direct API access without offline requirements
- Swift-first development approach

**Key Features**: SFRestAPI, SwiftUI, Combine framework, OAuth via bootconfig.plist

**Modification Guide**: To adapt for different SObjects (e.g., Account, Opportunity):

1. Change SOQL query in the main view controller: `SELECT Name FROM Account LIMIT 10`
2. Update JSON parsing to handle different field names
3. Modify UI components to display relevant fields
4. Update OAuth scopes in bootconfig.plist if needed for different object access

#### iOSNativeSwiftPackageManagerTemplate

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: SwiftUI + Combine + Swift Package Manager

**Description**: Identical to iOSNativeSwiftTemplate but uses Swift Package Manager instead of CocoaPods for dependency management. Modern dependency management approach for iOS.

**Technical Implementation**:

- **Dependency Management**: Uses Swift Package Manager with Salesforce Mobile SDK Swift Package from `https://github.com/forcedotcom/SalesforceMobileSDK-iOS-SPM`
- **Authentication**: Same `bootconfig.plist` OAuth configuration as standard Swift template
- **API Access**: Identical SFRestAPI patterns for SOQL queries and data retrieval
- **Architecture**: SwiftUI + Combine reactive programming patterns
- **Package Integration**: Xcode project configured to reference SPM packages instead of CocoaPods

**Use Cases**:

- Projects preferring Swift Package Manager over CocoaPods
- Modern iOS development workflows
- Teams wanting streamlined dependency management

**Key Features**: MobileSync, SwiftUI, Combine, Swift Package Manager

**Modification Guide**: Same as iOSNativeSwiftTemplate for SObject changes, with SPM dependency updates handled through Xcode Package Manager

#### iOSNativeSwiftEncryptedNotificationTemplate

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: Basic Swift + Notification Service Extension

**Description**: Swift application template that includes a notification service extension for handling encrypted push notifications. Essential for apps requiring secure push notification handling.

**Technical Implementation**:

- **Main App**: Standard Swift app with `MobileSyncSDKManager.initializeSDK()` and push notification registration
- **Notification Service Extension**: Separate target (`NotificationServiceExtension`) that processes incoming notifications
- **Encryption Handling**: Uses `SFSDKPushNotificationDecryption.decryptNotificationContent()` to decrypt notification payloads
- **Shared Keychain**: Both main app and extension use shared keychain access group for secure data sharing
- **Push Registration**: Automatic registration with `PushNotificationManager.sharedInstance().registerForRemoteNotifications()`
- **Entitlements**: Configured for `aps-environment` and shared keychain access groups

**Use Cases**:

- Apps requiring secure/encrypted push notifications
- Enterprise applications with sensitive data
- Apps needing custom notification processing

**Key Features**: Notification Service Extension, encrypted notifications, shared keychain

**Modification Guide**:

1. Customize notification processing logic in `NotificationService.swift`
2. Add custom notification categories and actions in main app
3. Modify shared keychain group identifiers for your app bundle
4. Update push notification handling for different payload structures

#### iOSNativeTemplate

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Objective-C
- **Architecture**: UIKit + Objective-C

**Description**: Basic Objective-C application template for iOS. Legacy template for teams still using Objective-C or migrating existing Objective-C codebases.

**Technical Implementation**:

- **Authentication**: Uses `bootconfig.plist` with same OAuth configuration pattern
- **API Access**: Objective-C implementation using `[[SFRestAPI sharedInstance] requestForQuery:]`
- **Data Handling**: Manual JSON parsing with `NSArray` and `NSDictionary` for records
- **UI Framework**: UIKit with `UITableView` for displaying data
- **Delegate Pattern**: Implements `SFRestRequestDelegate` for handling async API responses
- **Memory Management**: Manual reference counting considerations for Objective-C

**Use Cases**:

- Legacy Objective-C projects
- Teams with existing Objective-C expertise
- Gradual migration from Objective-C to Swift

**Key Features**: UIKit, Objective-C, basic Salesforce SDK integration

**Modification Guide**: To adapt for different SObjects:

1. Update SOQL query string: `@"SELECT Name FROM Account LIMIT 10"`
2. Modify JSON parsing in `request:didSucceed:` delegate method
3. Update table view cell configuration for different field display
4. Add error handling for object-specific API restrictions

#### iOSIDPTemplate (Authenticator)

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: Identity Provider pattern

**Description**: Sample Swift application demonstrating Identity Provider (IDP) functionality. Acts as an authentication provider for other applications in a Single Sign-On (SSO) scenario.

**Technical Implementation**:

- **IDP Configuration**: Sets `SalesforceManager.shared.isIdentityProvider = true` in AppDelegate
- **URL Scheme Handling**: Implements `handleIdentityProviderResponse(from:with:)` for processing authentication responses
- **App Launch**: Uses custom URL schemes to launch Service Provider apps: `sampleapp://oauth2/v1.0/idpinit?user_hint=userId:orgId&login_host=domain`
- **User Management**: Supports multiple users with `UserAccountManager.shared.switchToUser()`
- **Identity Data**: Accesses user identity through `UserAccountManager.shared.currentUserAccount?.idData`
- **Service Provider Integration**: Constructs IDP-initiated login URLs with user hints and login hosts

**Use Cases**:

- Building custom authentication providers
- SSO implementations
- Enterprise identity management solutions
- Multi-app authentication scenarios

**Key Features**: Identity Provider functionality, SSO, authentication delegation

**Modification Guide**: To customize for different Service Provider apps:

1. Update app URL schemes in `launchSPApp(appUrl:)` method
2. Modify user hint format if needed for specific SP requirements
3. Add additional user identity fields to the launch parameters
4. Configure custom login host domains in URL construction

#### iOSNativeLoginTemplate

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: SwiftUI + Custom Login

**Description**: Sample Swift application featuring a native login screen built with SwiftUI. Demonstrates custom authentication UI instead of using Salesforce's default web-based login.

**Technical Implementation**:

- **Native Login Manager**: Uses `SalesforceManager.shared.nativeLoginManager()` for custom authentication
- **SwiftUI Implementation**: Custom login form with `TextField` and `SecureField` for credentials
- **Authentication Flow**: Implements multiple identity flows: Login, Registration, Password Reset, Passwordless Login
- **Async/Await**: Modern Swift concurrency with `await` for login operations
- **Result Handling**: Pattern matching on authentication results with success/failure handling
- **Fallback Support**: Web-based authentication fallback when native login fails
- **UI States**: Loading states, error handling, and navigation between different authentication flows

**Use Cases**:

- Apps requiring custom branded login experience
- Native login UI instead of web-based authentication
- Custom authentication flows

**Key Features**: SwiftUI, custom native login screen, branded authentication

**Modification Guide**: To customize the login experience:

1. Modify identity flows in `IdentityFlowLayoutType` enum
2. Update UI components in individual Composable functions
3. Add custom branding elements (logos, colors, styling)
4. Implement additional authentication methods (biometric, SSO)
5. Customize error messages and validation logic

#### MobileSyncExplorerSwift

- **CLI**: `forceios`
- **Platform**: iOS
- **Language**: Swift
- **Architecture**: MobileSync + SwiftUI

**Description**: Comprehensive sample Swift application demonstrating MobileSync data framework capabilities. Shows best practices for offline data synchronization, CRUD operations, and conflict resolution.

**Technical Implementation**:

- **SmartStore Configuration**: Uses `userstore.json` to define "contacts" soup with indexed fields:
  - Primary: `Id`, `FirstName`, `LastName`
  - MobileSync fields: `__local__`, `__locally_created__`, `__locally_updated__`, `__locally_deleted__`
- **Sync Configuration**: Uses `usersyncs.json` to define sync operations:
  - **Sync Down**: `SELECT FirstName, LastName, Title, MobilePhone, Email, Department, HomePhone FROM Contact LIMIT 10000`
  - **Sync Up**: Configured with field lists for create/update operations and `LEAVE_IF_CHANGED` merge mode
- **Data Manager**: `SObjectDataManager` handles sync operations with `SyncManager.sharedInstance()`
- **Reactive Updates**: Combine publishers for real-time UI updates: `syncMgr.publisher(for: kSyncDownName)`
- **CRUD Operations**: Local create, update, delete operations with SmartStore `upsert()` and sync flag management
- **Conflict Resolution**: Handles sync conflicts with configurable merge modes
- **Smart Queries**: Uses `QuerySpec.buildAllQuerySpec()` for efficient SmartStore queries

**Use Cases**:

- Learning MobileSync framework
- Reference implementation for data synchronization
- Apps requiring robust offline capabilities
- Contact management applications

**Key Features**: MobileSync, offline sync, CRUD operations, conflict resolution

**Modification Guide**: To adapt for different SObjects (e.g., Account, Opportunity):

1. **Update userstore.json**: Change soup name and indexed fields for target SObject
2. **Update usersyncs.json**: Modify SOQL query to select relevant fields from target SObject
3. **Create SObject Data Class**: Implement new data class similar to `ContactSObjectData`
4. **Update Data Manager**: Modify `SObjectDataManager` to work with new SObject type
5. **Update UI Components**: Modify SwiftUI views to display relevant fields for new SObject

### Native Android Templates (forcedroid)

#### AndroidNativeKotlinTemplate

- **CLI**: `forcedroid`
- **Platform**: Android
- **Language**: Kotlin
- **Architecture**: Basic Kotlin

**Description**: Basic Kotlin application template for Android. Modern starting point for Android development using Kotlin as the primary language.

**Technical Implementation**:

- **Authentication**: Uses `bootconfig.xml` resource file for OAuth configuration with `remoteAccessConsumerKey`, `oauthRedirectURI`, and `oauthScopes`
- **API Access**: Utilizes `RestClient` with `RestRequest.getRequestForQuery()` for SOQL queries
- **Async Handling**: Implements `AsyncRequestCallback` for handling REST API responses
- **Data Processing**: JSON parsing with `JSONArray` and `JSONObject` for processing query results
- **UI Framework**: Traditional Android Views with `ListView` and `ArrayAdapter`
- **Activity Lifecycle**: Extends `SalesforceActivity` for automatic authentication handling
- **Error Handling**: Toast notifications for API errors and exception handling

**Use Cases**:

- Standard Android apps with Salesforce integration
- Modern Android development with Kotlin
- Basic mobile app requirements

**Key Features**: Kotlin, basic Salesforce SDK integration

**Modification Guide**: To adapt for different SObjects:

1. Update SOQL queries in `sendRequest()` method: `"SELECT Name FROM Account"`
2. Modify JSON parsing to extract different field names
3. Update `ArrayAdapter` to display relevant field data
4. Add OAuth scope permissions in `bootconfig.xml` for different objects

#### AndroidNativeLoginTemplate

- **CLI**: `forcedroid`
- **Platform**: Android
- **Language**: Kotlin
- **Architecture**: Jetpack Compose + Custom Login

**Description**: Sample Android application featuring a native login screen created with Jetpack Compose. Demonstrates modern Android UI toolkit for custom authentication experiences.

**Technical Implementation**:

- **Native Login Manager**: Uses `SalesforceSDKManager.getInstance().nativeLoginManager` for custom authentication
- **Jetpack Compose UI**: Modern declarative UI with `@Composable` functions for login forms
- **Coroutines Integration**: Kotlin Coroutines with `suspend` functions for async authentication
- **Multiple Identity Flows**: Support for Login, Registration, Password Reset, Passwordless Login
- **State Management**: `mutableStateOf()` and `remember` for UI state management
- **Material Design**: Material 3 components (`OutlinedTextField`, `Button`, `Card`)
- **Fallback Handling**: Web-based authentication fallback with `getFallbackWebAuthenticationIntent()`
- **Testing Support**: UI components tagged for automated testing

**Use Cases**:

- Apps requiring custom branded login experience
- Modern Android UI with Jetpack Compose
- Native login instead of web-based authentication

**Key Features**: Jetpack Compose, custom native login, modern Android UI

**Modification Guide**: To customize the login experience:

1. Modify `@Composable` functions for different UI layouts
2. Update identity flow logic in `IdentityFlowLayoutType`
3. Add custom branding (colors, typography, logos) in Compose theme
4. Implement additional authentication methods
5. Customize form validation and error handling

#### AndroidNativeTemplate

- **CLI**: `forcedroid`
- **Platform**: Android
- **Language**: Java
- **Architecture**: Basic Java

**Description**: Basic Java application template for Android. Legacy template for teams using Java or migrating existing Java codebases.

**Technical Implementation**:

- **Authentication**: Java implementation using `bootconfig.xml` for OAuth settings
- **API Access**: Uses `RestClient` with Java syntax for REST API calls
- **Callback Pattern**: Implements `AsyncRequestCallback` interface for handling responses
- **Data Handling**: JSON processing with `org.json` library (`JSONArray`, `JSONObject`)
- **UI Framework**: Traditional Android Views with XML layouts and Java activity code
- **Threading**: Manual thread management with `runOnUiThread()` for UI updates
- **Exception Handling**: Try-catch blocks for API and JSON parsing errors

**Use Cases**:

- Legacy Java Android projects
- Teams with existing Java expertise
- Gradual migration from Java to Kotlin

**Key Features**: Java, basic Salesforce SDK integration

**Modification Guide**: To adapt for different SObjects:

1. Update SOQL query strings in `sendRequest()` method
2. Modify JSON parsing logic in `onSuccess()` callback
3. Update ListView adapter to display different field data
4. Add necessary permissions and scopes in bootconfig.xml

#### AndroidIDPTemplate

- **CLI**: `forcedroid`
- **Platform**: Android
- **Language**: Kotlin
- **Architecture**: Identity Provider pattern

**Description**: Sample Kotlin application demonstrating Identity Provider (IDP) functionality for Android. Enables SSO scenarios where this app authenticates users for other applications.

**Technical Implementation**:

- **IDP Manager**: Uses `SalesforceSDKManager.getInstance().idpManager` for identity provider operations
- **Service Provider Launch**: Implements `kickOffIDPInitiatedLoginFlow()` to launch SP apps with authentication
- **Package Management**: Manages Service Provider app packages and launch intents
- **Status Callbacks**: `IDPManager.StatusUpdateCallback` for monitoring authentication flow status
- **User Switching**: Support for multi-user scenarios with user account management
- **Intent Handling**: Custom intent filters and URL scheme handling for IDP responses
- **Toast Notifications**: User feedback for authentication status updates

**Use Cases**:

- Android SSO implementations
- Enterprise identity management
- Multi-app authentication scenarios
- Custom authentication providers

**Key Features**: Identity Provider functionality, SSO, Kotlin

**Modification Guide**: To customize for different Service Provider apps:

1. Update Service Provider package names in the app mapping
2. Modify IDP status handling in `StatusUpdateCallback`
3. Add custom user selection and switching logic
4. Configure intent filters for specific SP app URL schemes

#### MobileSyncExplorerKotlinTemplate

- **CLI**: `forcedroid`
- **Platform**: Android
- **Language**: Kotlin
- **Architecture**: Modern Android Architecture + MobileSync + Jetpack Compose

**Description**: Advanced Android template demonstrating modern architecture patterns with MobileSync. Features Kotlin Coroutines, Jetpack Compose for flexible UI, extensible SObject-to-Kotlin data class bridging, and comprehensive MobileSync implementation.

**Technical Implementation**:

- **SmartStore Configuration**: Uses `userstore.json` to define "contacts" soup with indexed fields:
  - Primary: `Id`, `FirstName`, `LastName`, `Title`, `Department`
  - MobileSync fields: `__local__`, `__locally_created__`, `__locally_updated__`, `__locally_deleted__`, `__sync_id__`
- **Sync Configuration**: Uses `usersyncs.json` for sync operations:
  - **Sync Down**: `SELECT FirstName, LastName, Title, Department FROM Contact LIMIT 10000`
  - **Sync Up**: Configured with `createFieldlist` and merge mode `LEAVE_IF_CHANGED`
- **Repository Pattern**: `SObjectSyncableRepo<T>` interface with `SObjectSyncableRepoBase<T>` implementation
- **Coroutines Integration**: Suspending functions for all sync operations with proper error handling
- **Reactive Data**: Kotlin Flow with `Flow<Map<String, SObjectRecord<T>>>` for reactive UI updates
- **SObject Framework**:
  - `SObject` interface for serialization: `JSONObject.applyObjProperties()`
  - `SObjectDeserializer<T>` interface for deserialization from JSON to data classes
  - `SObjectRecord<T>` wrapper with sync state and metadata
- **Jetpack Compose UI**: Modern declarative UI with reactive state management
- **Error Handling**: Comprehensive exception hierarchy for sync and repository operations
- **Transaction Management**: SmartStore transactions with proper cleanup and rollback

**Use Cases**:

- Enterprise Android applications
- Apps requiring sophisticated offline data sync
- Modern Android architecture reference
- Contact management with flexible UI
- Learning modern Android development patterns

**Key Features**:

- Kotlin Coroutines for async operations
- Jetpack Compose for modern UI
- SObject-to-Kotlin data class framework
- Advanced MobileSync patterns
- Repository pattern implementation
- Flexible/responsive UI design

**Modification Guide**: To adapt for different SObjects (e.g., Account, Opportunity):

1. **Update Configuration Files**:
   - `userstore.json`: Change soup name and add indexes for relevant fields
   - `usersyncs.json`: Update SOQL query to select target SObject fields
2. **Create SObject Data Class**:
   ```kotlin
   data class AccountObject(
       val name: String,
       val type: String?,
       val industry: String?
   ) : SObject {
       override val objectType: String = "Account"
       override fun JSONObject.applyObjProperties() = this.apply {
           putOpt("Name", name)
           putOpt("Type", type)
           putOpt("Industry", industry)
       }
   }
   ```
3. **Implement Deserializer**:
   ```kotlin
   object AccountObjectDeserializer : SObjectDeserializer<AccountObject> {
       override fun coerceFromJsonOrThrow(json: JSONObject): SObjectRecord<AccountObject> {
           // Validation and deserialization logic
       }
   }
   ```
4. **Create Repository Implementation**: Extend `SObjectSyncableRepoBase<AccountObject>`
5. **Update UI Components**: Modify Compose screens to display Account-specific fields

## Template Selection Guide

### For New Projects

1. **Pure iOS App**: Use `iOSNativeSwiftTemplate` or `iOSNativeSwiftPackageManagerTemplate`
2. **Pure Android App**: Use `AndroidNativeKotlinTemplate` or `MobileSyncExplorerKotlinTemplate` for advanced features
3. **Data-Heavy Apps**: Use MobileSync explorer templates (`MobileSyncExplorerSwift`, `MobileSyncExplorerKotlinTemplate`)
4. **Custom Authentication**: Use native login templates or IDP templates
5. **Enterprise/Advanced Android**: Use `MobileSyncExplorerKotlinTemplate` for modern architecture patterns

### For Specific Features

- **Push Notifications**: `iOSNativeSwiftEncryptedNotificationTemplate`
- **Custom Login UI**: `iOSNativeLoginTemplate`, `AndroidNativeLoginTemplate`
- **SSO/Identity Provider**: `iOSIDPTemplate`, `AndroidIDPTemplate`
- **Modern UI Frameworks**: Templates with SwiftUI (iOS) or Jetpack Compose (Android)
- **Offline-First**: Choose MobileSync explorer templates

### Architecture Considerations

- **Offline-First**: Choose MobileSync explorer templates
- **Modern UI**: Templates with SwiftUI, Jetpack Compose
- **Enterprise**: `MobileSyncExplorerKotlinTemplate` showcases advanced patterns
- **Legacy Support**: Objective-C and Java templates available
- **Dependency Management**: Swift Package Manager template available for iOS

## Usage Examples

### Creating an iOS App

```bash
forceios create --apptype=native_swift --appname=MyApp --companyid=com.mycompany --organization="My Company"
```

### Creating an Android App

```bash
forcedroid create --apptype=native_kotlin --appname=MyApp --packagename=com.mycompany.myapp --organization="My Company"
```

### Creating with Template

```bash
forceios createWithTemplate --templaterepouri=MobileSyncExplorerSwift --appname=MyContactApp --companyid=com.mycompany --organization="My Company"
```

This guide provides comprehensive information for LLMs to understand the purpose, features, technical implementation, and appropriate use cases for each Salesforce Mobile SDK template, enabling better decision-making when bootstrapping new mobile applications.

## Extension Guidance for LLMs

### Data-Heavy Template Extension Guide

#### Project Structure (MobileSync Template)

```
{appName}/
├── {appName}/                    # iOS main folder
│   ├── Models/                   # Data models
│   ├── Services/                 # Business logic & API calls
│   ├── ViewModels/              # SwiftUI ViewModels
│   ├── Views/                   # SwiftUI Views
│   └── Configuration/           # App configuration
├── userstore.json               # Offline storage schema
├── usersync.json                # Sync configuration
└── bootconfig.plist             # App bootstrap config
```

For Android:

```
{appName}/
├── app/src/main/
│   ├── java/.../model/          # Data models
│   ├── java/.../service/        # Business logic
│   ├── java/.../viewmodel/      # ViewModels
│   ├── java/.../view/           # Activities/Fragments
│   └── res/                     # Resources
├── app/src/main/assets/userstore.json
├── app/src/main/assets/usersync.json
└── app/src/main/res/raw/bootconfig.json
```

#### Adding New Features/Tabs (All Templates)

When adding new features or tabs to any iOS template:

**1. Update App Entry Point (iOS)**
If adding new tabs or changing main view structure:

```swift
// SceneDelegate.swift - Update windowScene setup
func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }

    self.window = UIWindow(windowScene: windowScene)

    // If you have a TabView, make sure SceneDelegate points to it
    let contentView = MainTabView() // <-- Update to your main view

    self.window!.rootViewController = UIHostingController(rootView: contentView)
    self.window!.makeKeyAndVisible()
}
```

**2. iOS Tab Structure**
When adding new tabs, follow this pattern:

```swift
// MainTabView.swift
struct MainTabView: View {
    var body: some View {
        TabView {
            ContactsListView()
                .tabItem {
                    Image(systemName: "person.2")
                    Text("Contacts")
                }

            OpportunitiesListView() // <-- New tab
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Opportunities")
                }
        }
    }
}
```

#### Adding New Object Types (Data-Heavy Template)

When adding a new Salesforce object (e.g., Product, Order):

**1. Define the Object Model**

_iOS Swift:_

```swift
import Foundation
import MobileSync

struct Product: Codable, Equatable {
    let id: String?
    let name: String
    let price: Decimal
    let description: String?

    enum CodingKeys: String, CodingKey {
        case id = "Id"
        case name = "Name"
        case price = "Price__c"
        case description = "Description"
    }
}
```

_Android Kotlin:_

```kotlin
data class Product(
    @SerializedName("Id") val id: String? = null,
    @SerializedName("Name") val name: String,
    @SerializedName("Price__c") val price: Double,
    @SerializedName("Description") val description: String? = null
)
```

**2. Update Storage Configuration**
Add to `userstore.json`:

```json
{
  "soups": [
    {
      "soupName": "Product",
      "features": ["externalStorage"],
      "indexes": [
        { "path": "Id", "type": "string" },
        { "path": "Name", "type": "string" },
        { "path": "__local__", "type": "string" }
      ]
    }
  ]
}
```

**3. Configure Sync**
Add to `usersync.json`:

```json
{
  "syncs": [
    {
      "syncName": "syncProducts",
      "syncType": "soqlSync",
      "soupName": "Product",
      "options": {
        "query": "SELECT Id, Name, Price__c, Description FROM Product__c ORDER BY Name"
      }
    }
  ]
}
```

**4. Create Service Layer**

_iOS Swift:_

```swift
import SmartStore
import MobileSync

class ProductService: ObservableObject {
    private let smartStore = SmartStore.shared

    func syncProducts() async throws {
        let syncManager = SyncManager.shared
        try await syncManager.sync("syncProducts")
    }

    func getProducts() throws -> [Product] {
        let querySpec = QuerySpec.buildAllQuerySpec("Product", orderPath: "Name", order: .ascending, pageSize: 1000)
        let cursor = try smartStore.query(querySpec, pageIndex: 0)

        return cursor.compactMap { record in
            try? JSONDecoder().decode(Product.self, from: JSONSerialization.data(withJSONObject: record))
        }
    }
}
```

#### Data Flow Pattern

1. **Sync**: Background sync from Salesforce → SmartStore
2. **Query**: Read from SmartStore for UI display
3. **Modify**: Local changes to SmartStore
4. **Upload**: Push local changes back to Salesforce

#### Naming Conventions

- **Soup Names**: Use PascalCase object names (e.g., "Product", "ContactTask")
- **Sync Names**: Use "sync" + ObjectName (e.g., "syncProducts", "syncContactTasks")
- **Index Paths**: Match Salesforce field API names exactly

#### When to Update Configuration Files

**Decision Tree for Adding New Features:**

```
Are you adding a new Salesforce object (Account, Contact, Opportunity, etc.)?
├── YES: Is this a MobileSync/Data-Heavy template?
│   ├── YES: Update userstore.json + usersync.json + create models + services + views
│   └── NO: Create models + services + views only (no userstore/usersync)
└── NO: Are you adding UI tabs/navigation changes?
    └── YES: Update SceneDelegate.swift + create new views
```

#### Required Files (Data-Heavy Templates)

**ALWAYS UPDATE for New Objects:**

- ✅ userstore.json - Add soup schema for each new Salesforce object
- ✅ usersync.json - Add sync configuration for each new object
- ✅ SceneDelegate.swift - Update if adding tabs or changing main view
- ✅ Model classes - Swift/Kotlin data structures
- ✅ Service classes - Business logic and sync operations
- ✅ View classes - UI components for the new feature

**Example: Adding Opportunities tab to MobileSync template**

1. userstore.json: Add "Opportunity" soup with indexes
2. usersync.json: Add "syncOpportunities" configuration
3. SceneDelegate.swift: Update to show MainTabView (not single ContactsView)
4. Opportunity.swift: Data model with proper CodingKeys
5. OpportunityService.swift: Sync and query operations
6. OpportunitiesListView.swift: UI for displaying opportunities

#### Required Files (Basic Templates)

**NO userstore.json/usersync.json needed:**

- ✅ SceneDelegate.swift - Update if adding tabs or changing main view
- ✅ Model classes - Swift/Kotlin data structures
- ✅ Service classes - Direct REST API calls (no MobileSync)
- ✅ View classes - UI components for the new feature

**Example: Adding Opportunities tab to Basic template**

1. SceneDelegate.swift: Update to show MainTabView
2. Opportunity.swift: Data model for JSON parsing
3. OpportunityService.swift: Direct REST API calls using SFRestAPI
4. OpportunitiesListView.swift: UI for displaying opportunities

#### Common Pitfalls (Data-Heavy)

**Critical iOS Architecture Mistakes:**

- ❌ **SceneDelegate not updated** - App still shows single view instead of TabView
- ❌ **Missing userstore.json entry** - New objects cause SmartStore "soup not found" errors
- ❌ **Missing usersync.json entry** - Sync operations fail silently for new objects
- ❌ **Wrong template type assumption** - Adding userstore.json to basic templates (unnecessary)

**Data Configuration Mistakes:**

- ❌ Incorrect field API names in CodingKeys/SerializedName (causes nil values)
- ❌ Not including `__local__` index (prevents conflict detection)
- ❌ Hardcoding SOQL queries instead of using sync configurations
- ❌ Not handling offline scenarios in UI code
- ❌ Missing proper error handling for sync operations

**iOS-Specific Mistakes:**

- ❌ Creating new views but not adding them to navigation/tabs
- ❌ Not importing required frameworks (SwiftUI, MobileSync, etc.)
- ❌ Missing @StateObject or @ObservableObject property wrappers
- ❌ Not handling authentication state changes in new views

### Basic Template Extension Guide

#### Project Structure (Basic Template)

```
{appName}/
├── {appName}/                   # iOS main folder
│   ├── Models/                  # Data models
│   ├── Services/                # API services
│   ├── ViewModels/              # SwiftUI ViewModels
│   └── Views/                   # SwiftUI Views
└── bootconfig.plist             # App configuration
```

#### Adding New Features (Basic Template)

When adding new Salesforce integration to Basic templates:

**1. Update App Entry Point (if adding tabs)**

```swift
// SceneDelegate.swift - Update if adding TabView
func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }

    self.window = UIWindow(windowScene: windowScene)

    // Update to TabView if adding multiple tabs
    let contentView = MainTabView() // Instead of single ContactsView

    self.window!.rootViewController = UIHostingController(rootView: contentView)
    self.window!.makeKeyAndVisible()
}
```

**2. Create Data Model**
Follow Swift Codable patterns with proper field mapping:

```swift
struct Opportunity: Codable, Identifiable {
    let id: String?
    let name: String
    let amount: Double?
    let closeDate: String?

    enum CodingKeys: String, CodingKey {
        case id = "Id"
        case name = "Name"
        case amount = "Amount"
        case closeDate = "CloseDate"
    }
}
```

**3. Implement Service Layer**

- Use SalesforceSDK REST API directly (NO userstore.json needed)
- Implement proper error handling
- Handle authentication states

```swift
import SalesforceSDKCore

class OpportunityService: ObservableObject {
    @Published var opportunities: [Opportunity] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadOpportunities() {
        isLoading = true

        let request = RestClient.shared.requestForQuery("SELECT Id, Name, Amount, CloseDate FROM Opportunity LIMIT 100")

        RestClient.shared.send(request: request) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    if let records = response.asJsonDictionary()["records"] as? [[String: Any]] {
                        self?.opportunities = records.compactMap { dict in
                            try? JSONDecoder().decode(Opportunity.self, from: JSONSerialization.data(withJSONObject: dict))
                        }
                    }
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
}
```

**4. Update UI Layer**

- Create SwiftUI views and ViewModels
- Handle loading states
- Display errors appropriately
- Add to TabView if creating multiple tabs

#### API Integration Patterns

- Use SalesforceSDK RestClient for API calls
- Implement proper authentication handling
- Cache data appropriately for performance

#### Required Files (Basic)

- bootconfig.plist/json - Connected App configuration
- Service classes - API integration logic
- Model classes - Data structures
- Views and ViewModels - UI components

#### Common Pitfalls (Basic)

**Critical iOS Architecture Mistakes:**

- ❌ **SceneDelegate not updated** - App still shows single view instead of TabView when adding tabs
- ❌ **Adding userstore.json unnecessarily** - Basic templates use direct API calls, not SmartStore
- ❌ **Missing TabView structure** - Creating new views but not organizing them in tabs

**API Integration Mistakes:**

- ❌ Not handling authentication properly (SFUserAccountManager.shared.currentUserAccount)
- ❌ Missing error handling for network failures
- ❌ Not implementing proper loading states (@Published properties)
- ❌ Hardcoding API versions or endpoints (use RestClient.shared)
- ❌ Not following platform-specific UI patterns (SwiftUI best practices)

**Data Handling Mistakes:**

- ❌ Incorrect field API names in CodingKeys (causes nil values)
- ❌ Not making models Identifiable for SwiftUI Lists
- ❌ Missing @StateObject/@ObservableObject property wrappers
- ❌ Not handling JSON parsing errors gracefully
