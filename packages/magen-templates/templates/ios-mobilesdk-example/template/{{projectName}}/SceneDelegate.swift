/*
 * Copyright (c) {{organization}}, All rights reserved.
 *
 * {{projectName}} - Scene Delegate
 */

import UIKit
import SwiftUI
import SalesforceSDKCore

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        self.window = UIWindow(frame: windowScene.coordinateSpace.bounds)
        self.window?.windowScene = windowScene
        
        // Register for authentication state changes
        AuthHelper.registerBlock(forCurrentUserChangeNotifications: {
            self.resetViewState {
                self.setupRootViewController()
            }
        })
    }
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let urlContext = URLContexts.first else { return }
        UserAccountManager.shared.handleIdentityProviderResponse(from: urlContext.url, with: [:])
    }
    
    func sceneWillEnterForeground(_ scene: UIScene) {
        self.initializeAppViewState()
        AuthHelper.loginIfRequired {
            self.setupRootViewController()
        }
    }
    
    // MARK: - Private Methods
    
    func initializeAppViewState() {
        if (!Thread.isMainThread) {
            DispatchQueue.main.async {
                self.initializeAppViewState()
            }
            return
        }
        
        self.window?.rootViewController = InitialViewController(nibName: nil, bundle: nil)
        self.window?.makeKeyAndVisible()
    }
    
    func setupRootViewController() {
        self.window?.rootViewController = UIHostingController(
            rootView: AccountsListView()
        )
    }
    
    func resetViewState(_ postResetBlock: @escaping () -> ()) {
        if let rootViewController = self.window?.rootViewController {
            if let _ = rootViewController.presentedViewController {
                rootViewController.dismiss(animated: false, completion: postResetBlock)
                return
            }
        }
        postResetBlock()
    }
}

