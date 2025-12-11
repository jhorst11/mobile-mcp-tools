import UIKit
import SwiftUI
import SalesforceSDKCore

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        self.window = UIWindow(windowScene: windowScene)
        self.window?.makeKeyAndVisible()
        
        // Register for user change notifications
        AuthHelper.registerBlock(forCurrentUserChangeNotifications: { [weak self] in
            self?.resetViewState {
                self?.setupRootViewController()
            }
        })
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called as the scene is being released by the system.
        // This occurs shortly after the scene enters the background,
        // or when its session is discarded.
        // Release any resources associated with this scene that can be re-created
        // the next time the scene connects.
        // The scene may re-connect later, as its session was not necessarily
        // discarded (see `application:didDiscardSceneSessions` instead).
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
        // Use this method to restart any tasks that were paused (or not yet started)
        // when the scene was inactive.
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
        // This may occur due to temporary interruptions (ex. an incoming phone call).
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
        // Use this method to undo the changes made on entering the background.
        
        // Initialize the view state with InitialViewController
        initializeAppViewState()
        
        // Check if login is required and handle authentication
        AuthHelper.loginIfRequired { [weak self] in
            self?.setupRootViewController()
        }
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
        // Use this method to save data, release shared resources, and store enough
        // scene-specific state information
        // to restore the scene back to its current state.
    }
    
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Handle OAuth callback URL
        guard let url = URLContexts.first?.url else { return }
        UserAccountManager.shared.handleIdentityProviderResponse(from: url, with: [:])
    }
    
    // MARK: - Private Methods
    
    private func initializeAppViewState() {
        if Thread.isMainThread {
            self.window?.rootViewController = InitialViewController()
        } else {
            DispatchQueue.main.async {
                self.initializeAppViewState()
            }
        }
    }
    
    private func setupRootViewController() {
        let contentView = ContentView()
        let hostingController = UIHostingController(rootView: contentView)
        self.window?.rootViewController = hostingController
    }
    
    private func resetViewState(_ postResetBlock: @escaping () -> Void) {
        if let rootViewController = self.window?.rootViewController {
            if let presentedViewController = rootViewController.presentedViewController {
                presentedViewController.dismiss(animated: false) {
                    postResetBlock()
                }
            } else {
                postResetBlock()
            }
        } else {
            postResetBlock()
        }
    }
}
