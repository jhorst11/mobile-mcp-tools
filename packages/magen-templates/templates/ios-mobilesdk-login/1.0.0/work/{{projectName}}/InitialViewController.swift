//
//  InitialViewController.swift
//  {{projectName}}
//
//  Created by {{organization}}
//

import UIKit
import SalesforceSDKCore
import Combine

class InitialViewController: UIViewController {
    
    var cancellables = Set<AnyCancellable>()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = .systemBackground
        
        // Setup basic UI
        let label = UILabel()
        label.text = "{{projectName}}\nSalesforce Mobile SDK"
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 24, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(label)
        
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        // Observe authentication
        UserAccountManager.shared.publisher(for: \.currentUserAccount)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] account in
                if let account = account {
                    self?.handleAuthentication(account: account)
                }
            }
            .store(in: &cancellables)
    }
    
    func handleAuthentication(account: UserAccount) {
        // User is authenticated
        print("Authenticated as: \(account.accountIdentity.userId)")
    }
}

