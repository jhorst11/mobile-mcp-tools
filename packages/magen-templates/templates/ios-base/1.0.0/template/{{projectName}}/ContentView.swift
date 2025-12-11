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
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Welcome to {{projectName}}")
                .font(.title)
            Text("Built by {{organization}}")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
