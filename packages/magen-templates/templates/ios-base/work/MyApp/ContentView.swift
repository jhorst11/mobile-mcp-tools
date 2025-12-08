//
//  ContentView.swift
//  MyApp
//
//  Created by Magen Template System.
//  Copyright © My Company. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            
            Text("Welcome to MyApp")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Bundle ID: com.example.myapp")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}

