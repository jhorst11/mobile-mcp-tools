# Magen Templates: Presentation Content

_Slide deck content for team presentation_

---

## Slide 1: Title

**Magen Templates**  
Layered App Scaffolding for Mobile Development

_Docker layers for app templates_

---

## Slide 2: The Problem

**Current State:**
- Copy/paste entire templates for variations
- Maintenance nightmare when base changes
- No clear relationship between templates
- Difficult to upgrade downstream templates

**Example:**
```
ios-base/            (500 files)
ios-salesforce/      (500 files, 90% duplicated)
ios-salesforce-custom-login/  (500 files, 95% duplicated)
```

---

## Slide 3: The Solution - Template Layering

**Think: Docker Layers for Templates**

```
ios-mobilesdk-login@1.0.0
  └─ ios-mobilesdk@1.0.0 (+ layer.patch: 150 lines)
     └─ ios-base@1.0.0 (500 files)
```

**Benefits:**
- 📦 **Composable** - Build on existing templates
- 🔒 **Version Pinned** - Stable dependencies
- 🔄 **Maintainable** - Update base, propagate changes
- 💾 **Efficient** - Store only differences

---

## Slide 3.5: Why Layering? - The Hidden Superpower

**Patches Are Living Documentation**

A layer patch shows the **minimal diff** between two states:

```
Base App (A) + layer.patch → Feature App (A')
```

**This minimal diff is:**

1. **📚 Feature Documentation**
   - "Here's exactly what changes to add OAuth"
   - "These 50 lines add offline sync"
   - No noise, just signal

2. **🤖 AI Training Data**
   - LLMs learn: "To add feature X, make these changes"
   - Clear before/after examples
   - Context-aware transformations

3. **🗺️ Migration Guides**
   - "How to get from your app (B) to your app with feature (B')"
   - AI can apply similar patterns to different codebases
   - Generalizable knowledge

**Example:** "Add Salesforce SDK" patch teaches:
- What imports to add
- Where to initialize
- What config to change
- All in ~100 lines instead of 500 files

---

## Slide 4: Patches as LLM Context - Real Example

**Scenario:** Developer asks AI to add analytics to their app

**Without Layer Patches:**
```
User: "Add Firebase Analytics to my iOS app"

LLM: *Generates 500 lines of boilerplate*
      - Might be outdated
      - Might miss steps
      - Not specific to your architecture
```

**With Layer Patches:**
```
User: "Add analytics like ios-analytics@1.0.0 does"

LLM reads layer.patch (50 lines):
  ✓ Sees exact imports needed
  ✓ Sees initialization pattern
  ✓ Sees where config goes
  ✓ Applies similar changes to user's app

Result: Accurate, contextual, working code
```

**Key Insight:** Patches are **executable documentation** that both humans and AI can follow.

---

## Slide 5: Layer Patch Anatomy - What AI Sees

**Example: ios-mobilesdk/layer.patch (simplified)**

```diff
diff --git a/AppDelegate.swift b/AppDelegate.swift
@@ -1,4 +1,6 @@
 import UIKit
+import SalesforceSDKCore
+import SalesforceSDKCommon

 @main
 class AppDelegate: UIResponder, UIApplicationDelegate {
@@ -8,6 +10,18 @@ class AppDelegate: UIResponder, UIApplicationDelegate {
         didFinishLaunchingWithOptions launchOptions: [...]
     ) -> Bool {
+        // Initialize Salesforce SDK
+        SalesforceSDKManager.shared.connectedApp = {
+            let app = ConnectedApp(...)
+            app.oauthRedirectURI = "{{salesforceCallbackUrl}}"
+            app.oauthClientId = "{{salesforceConsumerKey}}"
+            return app
+        }()
+        
+        SalesforceSDKManager.shared.launch()
         return true
     }
```

**What This Teaches:**
1. ✅ Exactly which SDK modules to import
2. ✅ Where initialization goes (in `didFinishLaunchingWithOptions`)
3. ✅ Configuration pattern (ConnectedApp setup)
4. ✅ Variable templating (`{{salesforceCallbackUrl}}`)
5. ✅ Order of operations (`launch()` at end)

**LLM Can Generalize:** "For SDK X, import modules, initialize in lifecycle method, configure with variables"

---

## Slide 6: Real Example

**Template Hierarchy:**

```
ios-base@1.0.0
├── Basic SwiftUI app
├── 3 variables (projectName, bundleId, org)
└── ~50 files

    ↓ + layer.patch (Mobile SDK integration)

ios-mobilesdk@1.0.0
├── Adds OAuth flow
├── Adds SDK initialization
├── +4 variables (SDK version, consumer key, etc.)
└── Patch: ~100 lines

    ↓ + layer.patch (Custom login UI)

ios-mobilesdk-login@1.0.0
├── Custom branding
├── Hidden gear icon
└── Patch: ~50 lines
```

**Total Storage:** ~500 files + 2 small patches

---

## Slide 5: How Patches Work

**Under the Hood:**

```bash
# 1. Start with parent template
ios-base/
  AppDelegate.swift
  ContentView.swift

# 2. Make changes in work/ directory
# 3. Generate git diff

git diff --cached > layer.patch
```

**layer.patch:**
```diff
diff --git a/AppDelegate.swift b/AppDelegate.swift
+import SalesforceSDKCore
+
+func application(...) {
+    SalesforceSDK.initialize()
+}
```

**Result:** Store only what changed!

---

## Slide 6: Demo - CLI Basics

**Discover Templates:**
```bash
$ magen-template list

Available Templates:

  ios-base (ios) [ios, swift, base]
    Base iOS application template

  ios-mobilesdk (ios) [ios, swift, salesforce, mobile-sdk]
    Salesforce Mobile SDK integration
    Based on:
      └─ ios-base@1.0.0

  ios-mobilesdk-login (ios) [ios, swift, salesforce, login-customization]
    Custom login UI and branding
    Based on:
      └─ ios-mobilesdk@1.0.0
        └─ ios-base@1.0.0
```

---

## Slide 7: Demo - Template Info

```bash
$ magen-template info ios-mobilesdk

📱 ios-mobilesdk@1.0.0
Platform: ios
Tags: ios, swift, salesforce, mobile-sdk

Inheritance Chain:
  ios-mobilesdk@1.0.0
    └─ ios-base@1.0.0

Required Variables:
  • projectName (string) - default: MyApp
  • salesforceConsumerKey (string) - no default ⚠️
  • salesforceCallbackUrl (string) - no default ⚠️

Example Usage:
  magen-template generate ios-mobilesdk --out ~/MyApp \
    --var salesforceConsumerKey="<key>" \
    --var salesforceCallbackUrl="<url>"
```

---

## Slide 8: Demo - Interactive Generation

```bash
$ magen-template generate --interactive

🚀 Interactive Template Generation

? Select a template to generate:
  > ios-mobilesdk - Salesforce Mobile SDK integration
    ios-mobilesdk-login - Custom login UI

? Output directory: ./MyNewApp

📝 Configure template variables:

? projectName (string): MyMobileApp
? salesforceConsumerKey (string): 3MVG9...
? salesforceCallbackUrl (string): myapp://oauth/callback

✓ App generated successfully!

📦 Generation Summary:
  Template: ios-mobilesdk@1.0.0
  Output: ./MyNewApp
```

---

## Slide 9: Demo - Creating Templates

**Creating a Base Template:**
```bash
$ magen-template template create my-ios-base --platform ios

✓ Created templates/my-ios-base/1.0.0/
  - template.json
  - variables.json
  - template/ (your files go here)

# Edit your files, then test:
$ magen-template template test my-ios-base

✓ Test instance created: my-ios-base/test/
```

---

## Slide 10: Demo - Creating Layered Templates

**Extending a Template:**
```bash
$ magen-template template create my-custom \
    --based-on my-ios-base

✓ Created templates/my-custom/1.0.0/
  - template.json (references my-ios-base@1.0.0)
  - work/ (contains materialized parent)

# Make your changes in work/, then:
$ magen-template template layer my-custom

✓ Generated layer.patch from your changes
  Files changed: 3
  Lines added: 45
  Lines removed: 2
```

---

## Slide 11: Key Features - Smart Errors

**Before:**
```bash
$ magen-template info ios-bas
Error: Template not found: ios-bas
```

**Now:**
```bash
$ magen-template info ios-bas

❌ Error: Template not found: 'ios-bas'

💡 Did you mean one of these?
   • ios-base
   • ios-mobilesdk

Run 'magen-template list' to see all available templates.
```

---

## Slide 12: Key Features - Version Pinning

**Why Version Pinning Matters:**

```json
// ❌ Bad: Unpinned
{
  "extends": {
    "template": "ios-base"
  }
}
// Gets latest version (might break your template!)

// ✅ Good: Pinned
{
  "extends": {
    "template": "ios-base",
    "version": "1.0.0"
  }
}
// Stable, predictable, safe
```

---

## Slide 13: Key Features - Versioning

**Creating New Versions:**

```bash
# Create v2.0.0 of your template
$ magen-template template version my-template 2.0.0

✓ Created my-template/2.0.0/
  Copied from: 1.0.0
  Updated version in template.json

# For layered templates, work/ is auto-generated
# Edit work/, then regenerate patch:
$ magen-template template layer my-template \
    --out templates/my-template/2.0.0

✓ Regenerated layer.patch
```

---

## Slide 14: Programmatic API

**High-Level API for Integration:**

```typescript
import {
  searchTemplates,
  getTemplateInfo,
  generate,
} from '@salesforce/magen-templates';

// Search templates
const results = searchTemplates({
  platform: 'ios',
  tags: ['salesforce'],
});

// Get template details
const info = getTemplateInfo('ios-mobilesdk');
console.log(info.inheritanceChain);
// ['ios-mobilesdk@1.0.0', 'ios-base@1.0.0']

// Generate app
generate({
  templateName: 'ios-mobilesdk',
  outputDirectory: './my-app',
  variables: { projectName: 'MyApp' },
});
```

---

## Slide 15: Architecture Overview

**System Components:**

```
┌─────────────────────────────────────┐
│         CLI / Interactive UI         │
├─────────────────────────────────────┤
│        High-Level API Layer          │
│  (search, validate, generate, info)  │
├─────────────────────────────────────┤
│           Core Engine                │
│  (discovery, layering, generation)   │
├─────────────────────────────────────┤
│        Template Storage              │
│    (filesystem, versioned dirs)      │
└─────────────────────────────────────┘
```

---

## Slide 16: How Materialization Works

**Generation Process:**

1. **Resolve Chain:** `login → mobilesdk → base`
2. **Materialize Bottom-Up:**
   ```
   Start: ios-base files
     ↓ apply ios-mobilesdk patch
   Result: base + mobilesdk files
     ↓ apply ios-mobilesdk-login patch
   Result: base + mobilesdk + login files
   ```
3. **Render Variables:** `{{projectName}}` → `MyApp`
4. **Write Output:** To target directory

**Time:** ~2 seconds for 3-layer template

---

## Slide 17: Variable System

**Type-Safe Variables:**

```json
{
  "variables": [
    {
      "name": "projectName",
      "type": "string",
      "required": true,
      "default": "MyApp",
      "description": "The app display name"
    },
    {
      "name": "enableAnalytics",
      "type": "boolean",
      "required": false,
      "default": false
    },
    {
      "name": "deploymentTarget",
      "type": "number",
      "required": true,
      "default": 15
    }
  ]
}
```

**Supported:** string, number, boolean, enum, regex validation

---

## Slide 18: Testing & Quality

**Comprehensive Test Suite:**

- ✅ **200 tests** across 13 suites
- ✅ **100% critical path coverage**
- ✅ **Production template validation**
- ✅ **Integration tests** with real templates

**Test Categories:**
- Core functionality (70 tests)
- CLI commands (36 tests)  
- API layer (20 tests)
- Versioning (12 tests)
- Production templates (18 tests)
- UX/formatting (9 tests)

---

## Slide 19: Production Templates

**Currently Shipping:**

| Template | Type | Extends | Variables | Status |
|----------|------|---------|-----------|--------|
| ios-base@1.0.0 | Base | - | 3 | ✅ Production |
| ios-mobilesdk@1.0.0 | Layered | ios-base@1.0.0 | 7 | ✅ Production |
| ios-mobilesdk-login@1.0.0 | Layered | ios-mobilesdk@1.0.0 | 7 | ✅ Production |

**All templates:**
- Build successfully in Xcode
- Pass validation tests
- Generate working apps
- Include comprehensive READMEs

---

## Slide 20: vs. Other Systems

| Feature | Magen | Yeoman | Cookiecutter |
|---------|-------|--------|--------------|
| Inheritance | ✅ Git patches | ❌ | ❌ |
| Version pinning | ✅ Semver | ❌ | ❌ |
| Buildable authoring | ✅ | ❌ | ❌ |
| Interactive mode | ✅ | ✅ | ✅ |
| TypeScript API | ✅ Full | ⚠️ Partial | ❌ |
| Multi-layer (3+) | ✅ | ❌ | ❌ |
| Smart errors | ✅ Suggestions | ❌ | ❌ |

**Magen's Unique Value:** Template inheritance with version control

---

## Slide 21: Use Cases

**1. Team Template Libraries**
- Corporate iOS template
- → Add feature flags layer
- → → Add analytics layer
- → → → Add custom branding

**2. SDK Integration**
- Base app template
- → Add Salesforce SDK
- → → Add custom login
- → → → Add offline sync

**3. Variant Management**
- Production app
- → Demo variant (different keys)
- → → Internal tools variant
- → → → → QA test harness

---

## Slide 22: Developer Workflow

**Day-to-Day Usage:**

```bash
# Morning: Check available templates
$ magen-template list --tag salesforce

# Create new project
$ magen-template generate ios-mobilesdk --interactive

# Authoring: Create custom template
$ magen-template template create my-feature --based-on ios-base
$ cd templates/my-feature/1.0.0/work
$ # Make changes...
$ magen-template template layer my-feature --watch

# Release: Create new version
$ magen-template template version my-feature 1.1.0
```

---

## Slide 23: Best Practices

**DO:**
- ✅ Always pin versions in `extends`
- ✅ Use semantic versioning (major.minor.patch)
- ✅ Test templates before releasing
- ✅ Document your templates (README.md)
- ✅ Use interactive mode when learning

**DON'T:**
- ❌ Create deeply nested hierarchies (>4 levels)
- ❌ Make breaking changes in minor versions
- ❌ Duplicate code across templates
- ❌ Skip testing after changes
- ❌ Forget to regenerate patches

---

## Slide 24: Template Upgrades - The Challenge

**Scenario:** Parent template gets a major update

```
ios-base@1.0.0 → ios-base@2.0.0
  - New SDK version
  - Updated file structure
  - Breaking API changes

Problem: ios-mobilesdk@1.0.0 still references ios-base@1.0.0
```

**Questions:**
- How do we upgrade downstream templates?
- What if there are conflicts?
- How do we test compatibility?

---

## Slide 25: Manual Upgrade Process (Today)

**Step-by-Step:**

```bash
# 1. Create new version of child template
$ magen-template template version ios-mobilesdk 2.0.0

# 2. Edit template.json - update parent version
{
  "extends": {
    "template": "ios-base",
    "version": "2.0.0",  // ← Changed from 1.0.0
    "patchFile": "layer.patch"
  }
}

# 3. Delete old work/ directory
$ rm -rf templates/ios-mobilesdk/2.0.0/work

# 4. Manually materialize new parent + try to apply old patch
$ cd templates/ios-mobilesdk/2.0.0/work
$ git init && git add -A && git commit -m "Base"
$ git apply ../layer.patch  # ⚠️ May fail with conflicts!

# 5. Resolve conflicts manually
# 6. Regenerate patch
$ magen-template template layer ios-mobilesdk \
    --out templates/ios-mobilesdk/2.0.0
```

**Time:** 30-60 minutes per template  
**Risk:** High (manual conflict resolution)

---

## Slide 26: Upgrade Example - Conflict Scenario

**Parent Changed:**
```swift
// ios-base@1.0.0
func application(...) {
    setupUI()
}

// ios-base@2.0.0
func application(...) {
    initializeSDK()  // ← Different method name!
    setupUI()
}
```

**Your Patch Adds:**
```diff
 func application(...) {
+    configureAnalytics()
     setupUI()
 }
```

**Conflict:** Where does `configureAnalytics()` go now?
- Before `initializeSDK()`?
- After `initializeSDK()`?
- Between `initializeSDK()` and `setupUI()`?

---

## Slide 27: Upgrade Strategy - Best Practices

**Before Upgrading:**

1. **Review parent changelog**
   ```bash
   # Compare parent versions
   magen-template template diff ios-base@1.0.0 ios-base@2.0.0
   # (Future feature)
   ```

2. **Check impact**
   - What files changed?
   - Are any breaking changes?
   - Does your patch touch affected files?

**During Upgrade:**

3. **Test in isolation**
   ```bash
   # Generate from new parent first
   magen-template generate ios-base@2.0.0 --out /tmp/test-base
   
   # Then try your upgraded template
   magen-template generate ios-mobilesdk@2.0.0 --out /tmp/test-upgraded
   ```

4. **Validate thoroughly**
   - Build the generated app
   - Run tests
   - Check for runtime issues

---

## Slide 28: Upgrade Decision Tree

```
New parent version released?
    │
    ├─ Breaking changes? ─── YES ─→ Create new major version
    │                               (e.g., 1.0.0 → 2.0.0)
    │                               Plan for conflicts
    │
    └─ No breaking changes ─ YES ─→ Create new minor version
                                    (e.g., 1.0.0 → 1.1.0)
                                    Lower risk

Do you NEED the new features?
    │
    ├─ YES ─→ Upgrade immediately
    │         Test thoroughly
    │
    └─ NO ──→ Stay on current version
              Wait for stability
```

**Key Decision:** Version pinning lets you upgrade **when ready**, not when forced.

---

## Slide 29: Real-World Example - SDK Upgrade Cascade

**Scenario:** Salesforce Mobile SDK 12 → 13 (Breaking Changes)

**Starting State:**
```
ios-mobilesdk@1.0.0 (uses SDK 12)
  ├─ feature-offline-sync@1.0.0
  ├─ feature-custom-login@1.0.0
  ├─ feature-push-notifications@1.0.0
  ├─ feature-analytics@1.0.0
  └─ feature-biometric-auth@1.0.0
```

**All features branch from ios-mobilesdk@1.0.0**

---

## Slide 30: SDK Upgrade - Step 1: Upgrade Core

**Mobile SDK releases v13 with breaking changes**

```bash
# 1. Create new ios-mobilesdk version
$ magen-template template version ios-mobilesdk 2.0.0

# 2. Update SDK version in template
# Edit: templates/ios-mobilesdk/2.0.0/work/Podfile
pod 'SalesforceSDKCore', '~> 13.0'  # Was 12.0

# 3. Handle breaking changes (e.g., API renamed)
- SalesforceSDKManager.shared.launch()
+ SalesforceSDKManager.shared.initialize()

# 4. Add migration tag
# Edit: templates/ios-mobilesdk/2.0.0/template.json
{
  "tags": ["ios", "mobile-sdk", "sdk-v13", "breaking-change"]
}

# 5. Regenerate patch
$ magen-template template layer ios-mobilesdk \
    --out templates/ios-mobilesdk/2.0.0
```

**Result:** ios-mobilesdk@2.0.0 (uses SDK 13) ✅

---

## Slide 31: SDK Upgrade - Step 2: Feature Assessment

**Now upgrade 5 feature templates:**

| Feature | Touches SDK APIs? | Breaking Changes? | Action |
|---------|------------------|-------------------|---------|
| offline-sync | ❌ No | None | 🟢 Bump version only |
| custom-login | ❌ No | None | 🟢 Bump version only |
| push-notifications | ✅ Yes | ⚠️ API renamed | 🟡 Code changes needed |
| analytics | ❌ No | None | 🟢 Bump version only |
| biometric-auth | ✅ Yes | ⚠️ Auth flow changed | 🟡 Code changes needed |

**Pattern:**
- 🟢 **60% of features**: Just update parent version (no code changes)
- 🟡 **40% of features**: Require code updates (breaking changes)

---

## Slide 32: SDK Upgrade - Easy Path (No Code Changes)

**Features that don't touch SDK APIs:**

```bash
# feature-offline-sync (just UI changes, no SDK calls)
$ magen-template template version feature-offline-sync 2.0.0

# Edit template.json - update parent reference
{
  "extends": {
    "template": "ios-mobilesdk",
    "version": "2.0.0",  // ← Changed from 1.0.0
    "patchFile": "layer.patch"
  }
}

# Regenerate with new parent (no work/ changes needed!)
$ magen-template template layer feature-offline-sync \
    --out templates/feature-offline-sync/2.0.0

✓ Done! Patch applied cleanly.
```

**Time per feature:** ~5 minutes  
**Testing:** Generate and verify builds

---

## Slide 33: SDK Upgrade - Breaking Changes Path

**Features with SDK API calls need updates:**

```bash
# feature-push-notifications (calls SDK API that changed)
$ magen-template template version feature-push-notifications 2.0.0

# 1. Update parent reference in template.json
"extends": { "template": "ios-mobilesdk", "version": "2.0.0" }

# 2. Update work/ directory for breaking changes
# Old SDK 12 code:
- SalesforceSDKManager.shared.registerForPushNotifications()

# New SDK 13 code:
+ PushNotificationManager.shared.register(
+     deviceToken: deviceToken,
+     completion: { ... }
+ )

# 3. Add migration tags
{
  "tags": ["push", "mobile-sdk", "sdk-v13-migration"]
}

# 4. Regenerate patch
$ magen-template template layer feature-push-notifications \
    --out templates/feature-push-notifications/2.0.0

✓ New patch includes SDK 13 migration pattern
```

---

## Slide 34: The Power - Migration Examples as Tags

**Problem:** How do developers know how to migrate their code?

**Solution:** Breaking change templates become **searchable migration guides**

```bash
# Find all templates showing SDK v13 migrations
$ magen-template list --tag sdk-v13-migration

Available Templates:

  feature-push-notifications@2.0.0 [push, sdk-v13-migration]
    Shows: How to migrate push notification registration API
    
  feature-biometric-auth@2.0.0 [auth, sdk-v13-migration]
    Shows: How to migrate authentication flow to new SDK
```

**Each patch shows the minimal diff:**
- What changed from SDK 12 → 13
- Exactly which APIs to update
- Working example of the migration

---

## Slide 35: LLM-Powered Migration

**Developers (or AI) can use templates as migration guides:**

```
User: "Migrate my app's push notifications to SDK 13"

LLM searches: --tag sdk-v13-migration --tag push

LLM finds: feature-push-notifications@2.0.0 layer.patch

LLM reads patch:
  - Old API: registerForPushNotifications()
  - New API: PushNotificationManager.shared.register(...)
  - Context: Where to call it, what params to pass

LLM applies similar changes to user's code ✅
```

**Key Benefits:**
1. **Curated examples** of real migrations
2. **Context-aware** (shows before/after)
3. **Tested** (templates generate working apps)
4. **Discoverable** (searchable by tags)

---

## Slide 36: Migration Tags Strategy

**Tagging Convention for Migrations:**

```json
{
  "tags": [
    "ios",                    // Platform
    "push-notifications",     // Feature
    "mobile-sdk",            // SDK family
    "sdk-v13-migration",     // Migration marker
    "breaking-change"        // Indicates non-trivial upgrade
  ]
}
```

**Benefits:**
- ✅ **Searchable** by migration version
- ✅ **Filterable** by feature area
- ✅ **Discoverable** for AI agents
- ✅ **Documentable** (auto-generate migration guides)

**Example Queries:**
```bash
# All SDK v13 migrations
magen-template list --tag sdk-v13-migration

# Auth-specific migrations
magen-template list --tag auth --tag sdk-v13-migration

# All breaking changes in SDK
magen-template list --tag mobile-sdk --tag breaking-change
```

---

## Slide 37: Complete Upgrade Timeline

**Day 1:** SDK 13 releases
```
✓ Create ios-mobilesdk@2.0.0 with SDK 13
✓ Tag with "sdk-v13" "breaking-change"
✓ Document breaking changes in README
```

**Week 1:** Assess features (30 minutes each)
```
✓ Test each feature against new parent
✓ Identify which need code changes
```

**Week 2-3:** Upgrade features
```
🟢 Quick upgrades (3 features, 15 min each)
   - Just bump parent version
   
🟡 Breaking changes (2 features, 2-3 hours each)
   - Update code for new APIs
   - Tag with "sdk-v13-migration"
   - Document migration pattern
```

**Ongoing:** Features become migration guides
```
✓ Developers search by tags
✓ AI agents use patches as context
✓ Knowledge base grows organically
```

---

## Slide 38: Real-World Upgrade Example (Summary)

**Before Magen:**
- Copy entire template
- Manual diff to find changes
- Update all 5 features manually
- No clear migration docs
- Time: **2-3 weeks**

**With Magen:**
- Version pin protects old features
- Upgrade core template once
- 60% of features: trivial upgrade
- 40% of features: guided by tags
- Patches become migration docs
- Time: **3-5 days**

**Bonus:** Migration knowledge is now **searchable** and **reusable** for future upgrades!

---

## Slide 30: Future - Automated Upgrade Command

**Vision:**

```bash
$ magen-template template upgrade ios-mobilesdk \
    --to-parent-version 2.0.0 \
    --new-version 2.0.0

📊 Analyzing parent changes...
  Modified: AppDelegate.swift (23 lines)
  Added: Config/SDKConfig.swift
  
🔍 Checking patch compatibility...
  ⚠️  Potential conflict in AppDelegate.swift
  
❓ How to resolve conflicts?
  ❯ Interactive merge (recommended)
    Automatic (best effort)
    Manual (skip automation)

✓ Created ios-mobilesdk@2.0.0
✓ Regenerated layer.patch
✓ Ready for testing

Next: magen-template template test ios-mobilesdk@2.0.0
```

**Status:** Not implemented (but possible!)

---

## Slide 31: Future Roadmap

**Potential Enhancements:**

1. **Template Upgrade Command** ⭐
   - Automated parent version upgrades
   - Conflict detection & resolution
   - Interactive merge tools

2. **Template Registry**
   - Remote template discovery
   - Community templates

3. **Cross-Platform Support**
   - Shared logic templates
   - Platform-specific overrides

4. **IDE Integration**
   - VS Code extension
   - Xcode plugin
   - Live preview

---

## Slide 32: Getting Started

**Installation:**
```bash
npm install -g @salesforce/magen-templates
```

**First Steps:**
```bash
# 1. Explore templates
magen-template list

# 2. Learn about a template
magen-template info ios-mobilesdk

# 3. Generate your first app
magen-template generate --interactive
```

**Resources:**
- Documentation: `docs/11_templates/`
- Package README: `packages/magen-templates/README.md`
- Examples: All templates in `packages/magen-templates/templates/`

---

## Slide 26: Demo Time! 🎬

**Live Demos:**

1. **Interactive generation** - Create an app from scratch
2. **Template creation** - Build a custom layered template
3. **API usage** - Programmatic generation
4. **Error handling** - Smart suggestions in action

---

## Slide 27: Questions to Consider

**For Discussion:**

1. Should we publish to public npm or internal registry?
2. What templates should we create next?
3. How to integrate with existing CI/CD?
4. Who will maintain the template library?
5. Training plan for wider team adoption?

---

## Slide 28: Summary

**Key Takeaways:**

✨ **Template inheritance** reduces duplication  
🔒 **Version pinning** ensures stability  
⚡ **Rapid scaffolding** accelerates development  
🎯 **Type-safe** variables prevent errors  
🧪 **Well-tested** with 200+ tests  
📦 **Production-ready** today

**Status:** Ready for team adoption! 🚀

---

## Appendix: Technical Details

**For Technical Deep-Dives:**

- Git patch format and limitations
- Handlebars rendering engine
- Variable validation logic
- Cycle detection algorithm
- Test coverage breakdown
- Performance benchmarks
- Error handling patterns

---

## Appendix: Migration Guide

**Migrating Existing Templates:**

1. **Audit current templates** - Find duplicated code
2. **Identify base template** - Common foundation
3. **Extract differences** - What makes each unique?
4. **Create hierarchy** - Base → Variants
5. **Generate patches** - Use `template layer` command
6. **Test thoroughly** - Validate each template
7. **Document changes** - Update READMEs

**Timeline:** ~2-4 hours per template migration

