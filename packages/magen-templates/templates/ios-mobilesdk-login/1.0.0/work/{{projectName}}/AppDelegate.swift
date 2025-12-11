//
//  AppDelegate.swift
//  {{projectName}}
//
//  Created by {{organization}}
//  Salesforce Mobile SDK App
//

import Foundation
import UIKit
import SalesforceSDKCore

class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    override init() {
        super.init()
        SalesforceManager.initializeSDK()
    }

    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
    
    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }

    // MARK: - App delegate lifecycle
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure login screen customization
        configureLoginCustomization()
        return true
    }
    
    // MARK: - Login Customization
    private func configureLoginCustomization() {
        // Get the login view controller configuration
        let loginConfig = UserAccountManager.shared.loginViewControllerConfig
        
        // Option 1: Hide only the Settings (gear) icon
        // This prevents users from changing the login server
        loginConfig.showsSettingsIcon = false
        
        // Option 2: Hide the entire navigation bar (uncomment to use)
        // This also hides the Settings icon and title
        // loginConfig.showsNavigationBar = false
        
        // Customize navigation bar colors and fonts
        loginConfig.navigationBarColor = UIColor.red // Custom brand color
        loginConfig.navigationBarTintColor = UIColor.white
        loginConfig.navigationTitleColor = UIColor.white
        loginConfig.navigationBarFont = UIFont.systemFont(ofSize: 18, weight: .semibold)
        
        // Option 3: Use a custom login view controller (uncomment to use)
        // loginConfig.loginViewControllerCreationBlock = {
        //     return CustomLoginViewController(nibName: nil, bundle: nil)
        // }
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return UserAccountManager.shared.handleIdentityProviderResponse(from: url, with: options)
    }
}


