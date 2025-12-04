/*
 * Copyright (c) {{organization}}, All rights reserved.
 *
 * {{projectName}} - Accounts List View
 */

import SwiftUI
import SalesforceSDKCore

struct AccountsListView: View {
    @StateObject private var model = AccountsListModel()
    
    var body: some View {
        NavigationView {
            List {
                ForEach(model.accounts, id: \.id) { account in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(account.name)
                            .font(.headline)
                        if let industry = account.industry {
                            Text(industry)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Accounts")
            .overlay {
                if model.isLoading {
                    ProgressView("Loading accounts...")
                }
            }
            .alert("Error", isPresented: .constant(model.error != nil)) {
                Button("OK") { model.error = nil }
            } message: {
                if let error = model.error {
                    Text(error)
                }
            }
        }
        .onAppear {
            model.loadAccounts()
        }
    }
}

