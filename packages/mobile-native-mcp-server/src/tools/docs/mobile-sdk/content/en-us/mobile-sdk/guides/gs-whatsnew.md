# What's New in Mobile SDK 13.0

Mobile SDK 13.0 is a major release that features user experience improvements on Android and iOS, asynchronous REST API requests, REST wrappers for SFAP APIs, and SmartStore support for several SQLCipher editions.

In major releases, we typically remove items that have been deprecated. To learn about new features and breaking changes that can affect your app, read the rest of this article. In every release, be sure to check your compiler logs for deprecation warnings so that you can address these changes before they go into effect.

## Changes in Mobile SDK 13.0.1

Mobile SDK 13.0.1 is a minor patch release that features these changes.

### Android

- We now fetch `userIdentity`, whereas in Mobile SDK 13.0 we didn’t.
- We improved the readability of status bar icons when the device theme and dynamic login color differ.

### iOS

- To resolve a naming conflict in `NewLoginHostView`, we renamed `label` to `hostName`.
- We fixed a bug that caused the Add Connection host URL to display incorrectly when it includes a scheme.

## General Updates in Mobile SDK 13.0

These changes apply to more than one platform.

### Receive Logs with LogReceiver

You can now receive logs with LogReceiver. See [Receiving Logs with LogReceiver](analytics-logging-logreceiver.md).

### SmartStore Support for SQLCipher Editions

Smartstore now supports SQLCipher Commercial, Enterprise, and Enterprise FIPS. See [Using SQLCipher with SmartStore](offline-smartstore-sqlcipher.md).

### External Component Version Updates

- React Native: 0.74.7

## What’s New in Mobile SDK 13.0 for iOS

See also: [General Updates in Mobile SDK 13.0](#general-updates-in-mobile-sdk-130).

### Add Connection Screen Redesign

We redesigned the Add Connection screen for better accessibility.

**Note:** The updated screen comes with new localizable strings. If your app supports localization, see our updated list of [`Localizable.strings`](https://github.com/forcedotcom/SalesforceMobileSDK-iOS/blob/dev/shared/resources/SalesforceSDKResources.bundle/en.lproj/Localizable.strings) on GitHub and localize the latest additions.

### Asynchronous REST API Requests

We updated the way REST API requests are handled in the `RestClient` class.

- To streamline error handling, we replaced the callback-based patterns used in previous versions with Swift’s asynchronous concurrency model.
- We refactored our network requests to use `async` and `await` methods instead of completion handlers.
- We’re deprecating completion-based methods in favor of `async` and `await` methods. See [iOS Current Deprecations](reference-current-deprecations-ios.md).

### REST Wrappers for SFAP APIs

We introduced REST wrappers for SFAP APIs in the `SfapApiClient` class. SFAP requires JWT-based access tokens, which we now support. See [REST Wrappers for SFAP APIs](sfap-rest-wrappers.md).

### Hybrid Remote Application Session Management

In hybrid remote applications, we now use session IDs, sourced from the login and refresh token endpoints, to load the app’s start page. This replaces the behavior in previous versions, which relied on a frontdoor URL to establish a UI session.

**Note:** This feature requires hybrid authentication, which is enabled by default. To verify the hybrid authentication setting, ensure that the `useHybridAuthentication` property in `SalesforceSDKManager` is set to `true`.

### Version Updates

- Deployment target: 17
- Base SDK version: 18
- Xcode: 16

### Removed APIs

See [iOS APIs Removed in Mobile SDK 13.0](reference-current-removed-ios.md).

### Deprecated APIs

Check your compiler warnings, or see [iOS Current Deprecations](reference-current-deprecations-ios.md).

## What’s New in Mobile SDK 13.0 for Android

See also: [General Updates in Mobile SDK 13.0](#general-updates-in-mobile-sdk-130).

### Login Redesign

We redesigned the login experience on Android. The redesign features a modernized architecture that uses Jetpack Compose and Model-View-ViewModel (MVVM), and these general changes.

- On the login screen, the top and bottom native elements now match the login `WebView` background by default.
- You can now customize the login screen in `LoginViewModel` without subclassing `LoginActivity`.
- You can now use the login server picker without leaving the login screen.
- For apps that exclusively use advanced authentication, we added a single-server Custom Tab login option that bypasses the standard `WebView`.
- The user account switcher is now a bottom sheet that displays over the host app.

See also:

- [Customizing the Android Login Screen Programmatically](auth-customize-login-android.md)
- [Migrating to Modern Android Login](auth-login-android-migrate.md)

**Note:** The login redesign introduces new localizable strings. If your app supports localization, see our updated list of [`sf__strings.xml`](https://github.com/forcedotcom/SalesforceMobileSDK-Android/blob/dev/libs/SalesforceSDK/res/values/sf__strings.xml) on GitHub and localize the latest additions.

### Version Updates

- Android SDK (min API): 28
- Android SDK (target API): 35
- Default SDK version for hybrid apps: 35

### Removed APIs

See [Android APIs Removed in Mobile SDK 13.0](reference-current-removed-android.md).

### Deprecated APIs

Check your compiler warnings, or see [Android Current Deprecations](reference-current-deprecations-android.md).
