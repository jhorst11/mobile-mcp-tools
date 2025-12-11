//
//  CustomLoginViewController.swift
//  {{projectName}}
//
//  Custom login view controller for advanced customization
//

import UIKit
import SalesforceSDKCore

class CustomLoginViewController: SalesforceLoginViewController {
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Perform additional customization here
        setupCustomAppearance()
    }
    
    // MARK: - Custom Appearance
    
    private func setupCustomAppearance() { 
        // Additional view customization can be done here
        // For example, adding a custom logo, background, etc.
        view.backgroundColor = .systemBackground
    }
    
    // MARK: - Navigation Bar Customization
    
    /// Enable and customize the back button
    /// Return true to show the back button in the navigation bar
    override func shouldShowBackButton() -> Bool {
        // Enable back button (default is false/hidden)
        return true
    }
    
    /// Provide a custom action for the back button
    /// This is called when the user taps the back button
    override func handleBackButtonAction() {
        // Custom back button action
        print("Custom back button tapped")
        
        // You could:
        // 1. Show an alert to confirm exit
        // 2. Navigate to a different screen
        // 3. Clear login fields
        // 4. Return to a custom landing page
        
        showExitConfirmation()
    }
    
    /// Factory Method to create a custom back button
    /// Override to provide your own back button
    override func createBackButton() -> UIBarButtonItem {
        let customButton = UIBarButtonItem(
            title: "Cancel",
            style: .plain,
            target: self,
            action: #selector(handleBackButtonAction)
        )
        return customButton
    }
    
    /// Factory Method to create a custom settings button
    /// Override to provide your own settings/help button
    override func createSettingsButton() -> UIBarButtonItem {
        // Option 1: Replace with Help button
        let helpButton = UIBarButtonItem(
            title: "Help",
            style: .plain,
            target: self,
            action: #selector(customHelpButtonTapped)
        )
        return helpButton
        
        // Option 2: Use a custom icon
        // let customImage = UIImage(systemName: "questionmark.circle")
        // let customButton = UIBarButtonItem(
        //     image: customImage,
        //     style: .plain,
        //     target: self,
        //     action: #selector(customHelpButtonTapped)
        // )
        // return customButton
    }
    
    /// Factory Method to create a custom navigation title
    /// Override to provide your own title view
    override func createTitleItem() -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = "{{projectName}} Login"
        titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        titleLabel.textColor = self.navigationBarTitleColor ?? .white
        titleLabel.sizeToFit()
        return titleLabel
    }
    
    // MARK: - Custom Actions
    
    @objc private func customHelpButtonTapped() {
        print("Custom help button tapped")
        showHelpScreen()
    }
    
    // MARK: - Helper Methods
    
    private func showExitConfirmation() {
        let alert = UIAlertController(
            title: "Exit Login",
            message: "Are you sure you want to exit the login screen?",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        alert.addAction(UIAlertAction(title: "Exit", style: .destructive) { _ in
            // Handle exit - you could dismiss or navigate elsewhere
            print("User confirmed exit")
            // self.dismiss(animated: true)
        })
        
        present(alert, animated: true)
    }
    
    private func showHelpScreen() {
        let alert = UIAlertController(
            title: "Login Help",
            message: "Please contact your administrator for login assistance.\n\nEmail: support@example.com\nPhone: 1-800-123-4567",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

