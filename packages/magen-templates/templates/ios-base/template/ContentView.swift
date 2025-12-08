//
//  ContentView.swift
//  {{appName}}
//
//  Created by Magen Template System.
//  Copyright © {{organizationName}}. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            
            Text("Welcome to {{appName}}")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Bundle ID: {{bundleId}}")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}

