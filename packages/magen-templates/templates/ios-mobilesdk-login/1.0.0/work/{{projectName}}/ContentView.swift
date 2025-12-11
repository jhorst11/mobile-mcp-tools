
//
//  ContentView.swift
//  {{projectName}}
//
//  Created by {{organization}}
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "cloud.fill")
                .imageScale(.large)
                .foregroundStyle(.blue)
                .font(.system(size: 60))
            Text("Welcome to {{projectName}}")
                .font(.title)
            Text("Built by {{organization}}")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
                .frame(height: 20)
            
            Text("You're now connected to Salesforce!")
                .font(.body)
                .multilineTextAlignment(.center)
                .padding()
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
