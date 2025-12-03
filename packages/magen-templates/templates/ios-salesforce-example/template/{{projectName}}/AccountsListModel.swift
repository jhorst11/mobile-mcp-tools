/*
 * Copyright (c) {{organization}}, All rights reserved.
 *
 * {{projectName}} - Accounts List Model
 */

import Foundation
import Combine
import SalesforceSDKCore

struct Account: Hashable, Identifiable, Decodable {
    let id: String
    let name: String
    let industry: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "Id"
        case name = "Name"
        case industry = "Industry"
    }
}

struct AccountResponse: Decodable {
    var totalSize: Int
    var done: Bool
    var records: [Account]
}

class AccountsListModel: ObservableObject {
    @Published var accounts: [Account] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private var accountsCancellable: AnyCancellable?
    
    func loadAccounts() {
        isLoading = true
        error = nil
        
        let request = RestClient.shared.request(forQuery: "SELECT Id, Name, Industry FROM Account ORDER BY Name LIMIT 50", apiVersion: nil)
        
        accountsCancellable = RestClient.shared.publisher(for: request)
            .receive(on: RunLoop.main)
            .tryMap({ (response) -> Data in
                response.asData()
            })
            .decode(type: AccountResponse.self, decoder: JSONDecoder())
            .map({ (record) -> [Account] in
                record.records
            })
            .sink(receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            }, receiveValue: { [weak self] accounts in
                self?.accounts = accounts
            })
    }
}

