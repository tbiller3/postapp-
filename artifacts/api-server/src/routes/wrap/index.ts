import { Router } from "express";
import { db } from "@workspace/db";
import { wrapConfigsTable, checklistTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/apps/:id/wrap — get wrap config for an app
router.get("/apps/:id/wrap", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const [config] = await db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId));
    if (!config) {
      res.status(404).json({ error: "No wrap config found" });
      return;
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wrap config" });
  }
});

// POST /api/apps/:id/wrap — create or update wrap config
router.post("/apps/:id/wrap", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions } = req.body;

    const [existing] = await db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId));

    if (existing) {
      const [updated] = await db
        .update(wrapConfigsTable)
        .set({ webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions })
        .where(eq(wrapConfigsTable.appId, appId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(wrapConfigsTable)
        .values({ appId, webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save wrap config" });
  }
});

// POST /api/apps/:id/wrap/generate — generate Capacitor project files
router.post("/apps/:id/wrap/generate", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const [config] = await db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId));
    if (!config) {
      res.status(404).json({ error: "No wrap config found. Save configuration first." });
      return;
    }

    const { webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions } = config;

    const allowNav = (allowNavigation as string[] || []);
    const perms = (permissions as string[] || []);

    // Build capacitor.config.js (plain JS avoids TypeScript dependency)
    const capacitorConfig = `/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: '${bundleId}',
  appName: '${appName}',
  webDir: 'www',
  server: {
    url: '${webUrl}',
    cleartext: false,
    allowNavigation: [${allowNav.map((d: string) => `'${d}'`).join(", ")}],
  },
  ios: {
    backgroundColor: '${backgroundColor}',
    statusBarStyle: '${statusBarStyle}',
    minimumOsVersion: '${minIosVersion}',
    contentInset: 'automatic',
  },
};

module.exports = config;
`;

    // Build package.json
    const packageJson = JSON.stringify({
      name: appName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      private: true,
      scripts: {
        "build": "echo 'Web app is served remotely — no build needed'",
        "cap:ios": "npx cap add ios && npx cap sync",
        "cap:open": "npx cap open ios",
        "cap:sync": "npx cap sync",
      },
      dependencies: {
        "@capacitor/core": "^6.0.0",
        "@capacitor/ios": "^6.0.0",
        ...(perms.includes("camera") ? { "@capacitor/camera": "^6.0.0" } : {}),
        ...(perms.includes("microphone") ? { "@capacitor/microphone": "^6.0.0" } : {}),
        ...(perms.includes("location") ? { "@capacitor/geolocation": "^6.0.0" } : {}),
        ...(perms.includes("push-notifications") ? { "@capacitor/push-notifications": "^6.0.0" } : {}),
        ...(perms.includes("haptics") ? { "@capacitor/haptics": "^6.0.0" } : {}),
      },
      devDependencies: {
        "@capacitor/cli": "^6.0.0",
      },
    }, null, 2);

    // Build Info.plist additions (permissions)
    const plistEntries: string[] = [];
    if (perms.includes("camera")) {
      plistEntries.push(`  <key>NSCameraUsageDescription</key>\n  <string>This app uses the camera.</string>`);
    }
    if (perms.includes("microphone")) {
      plistEntries.push(`  <key>NSMicrophoneUsageDescription</key>\n  <string>This app uses the microphone.</string>`);
    }
    if (perms.includes("location")) {
      plistEntries.push(`  <key>NSLocationWhenInUseUsageDescription</key>\n  <string>This app uses your location.</string>`);
    }
    if (perms.includes("photos")) {
      plistEntries.push(`  <key>NSPhotoLibraryUsageDescription</key>\n  <string>This app accesses your photo library.</string>`);
    }

    const infoPlistAdditions = plistEntries.length > 0
      ? `<!-- Add these keys to your ios/App/App/Info.plist inside the <dict> block -->\n${plistEntries.join("\n")}`
      : `<!-- No special permissions required -->`;

    // Build codemagic.yaml
    const codemagicYaml = `workflows:
  ios-workflow:
    name: ${appName} iOS Build
    max_build_duration: 60
    environment:
      xcode: latest
      cocoapods: default
      groups:
        - app_store_credentials
      vars:
        BUNDLE_ID: "${bundleId}"
        XCODE_SCHEME: App
        XCODE_WORKSPACE: ios/App/App.xcworkspace
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Add iOS platform
        script: npx cap add ios || true
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up automatic code signing
        script: |
          xcode-project use-profiles \\
            --type app-store
      - name: Build iOS IPA
        script: |
          xcode-project build-ipa \\
            --workspace "$XCODE_WORKSPACE" \\
            --scheme "$XCODE_SCHEME" \\
            --config Release \\
            --export-options-plist export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
`;

    const exportOptionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
`;

    // Build README
    const readme = `# ${appName} — Native iOS Wrapper

This is a Capacitor wrapper for ${webUrl}.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Add iOS platform and sync:
   \`\`\`bash
   npm run cap:ios
   \`\`\`

3. Open in Xcode:
   \`\`\`bash
   npm run cap:open
   \`\`\`

4. In Xcode:
   - Select your Team in Signing & Capabilities
   - Set Bundle Identifier to \`${bundleId}\`
   - Set Minimum Deployments to iOS ${minIosVersion}
   - Build → Product → Archive → Distribute App → App Store Connect

## Cloud Build (No Mac Required)

Use the included \`codemagic.yaml\` with [Codemagic](https://codemagic.io):
1. Push this project to a GitHub/GitLab repo
2. Connect to Codemagic (free at codemagic.io)
3. Import the repo — Codemagic auto-detects the yaml
4. Configure code signing in Codemagic dashboard
5. Trigger a build — IPA goes straight to TestFlight

## App Details
- Bundle ID: \`${bundleId}\`
- Web URL: ${webUrl}
- Min iOS: ${minIosVersion}
- Background: ${backgroundColor}
`;

    res.json({
      files: [
        { name: "capacitor.config.js", content: capacitorConfig, language: "javascript" },
        { name: "package.json", content: packageJson, language: "json" },
        { name: "codemagic.yaml", content: codemagicYaml, language: "yaml" },
        { name: "export_options.plist", content: exportOptionsPlist, language: "xml" },
        { name: "Info.plist (additions)", content: infoPlistAdditions, language: "xml" },
        { name: "README.md", content: readme, language: "markdown" },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate project files" });
  }
});

// POST /api/apps/:id/wrap/sync-github — update files in an existing GitHub repo
router.post("/apps/:id/wrap/sync-github", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { token, repoFullName } = req.body;

    if (!token || !repoFullName) {
      res.status(400).json({ error: "token and repoFullName are required" });
      return;
    }

    // Verify token
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "POSTAPP/1.0" },
    });
    if (!userRes.ok) {
      res.status(401).json({ error: "Invalid GitHub token." });
      return;
    }

    // Load wrap config
    const configs = await db.select().from(wrapConfigs).where(eq(wrapConfigs.appId, appId));
    if (!configs.length) {
      res.status(404).json({ error: "No wrap config found. Configure in Step 1 first." });
      return;
    }
    const cfg = configs[0];
    const { webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions } = cfg;
    const allowNav = (allowNavigation as string[] || []);

    // Generate files (same logic as generate endpoint)
    const capacitorConfig = `/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: '${bundleId}',
  appName: '${appName}',
  webDir: 'www',
  server: {
    url: '${webUrl}',
    cleartext: false,
    allowNavigation: [${allowNav.map((d: string) => `'${d}'`).join(", ")}],
  },
  ios: {
    backgroundColor: '${backgroundColor}',
    statusBarStyle: '${statusBarStyle}',
    minimumOsVersion: '${minIosVersion}',
    contentInset: 'automatic',
  },
};

module.exports = config;
`;

    const packageJson = JSON.stringify({
      name: (appName as string).toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: `Native iOS wrapper for ${appName}`,
      scripts: {
        "cap:ios": "npx cap add ios && npx cap sync ios",
        "cap:sync": "npx cap sync ios",
        "cap:open": "npx cap open ios",
      },
      dependencies: {
        "@capacitor/core": "^6.0.0",
        "@capacitor/ios": "^6.0.0",
      },
      devDependencies: {
        "@capacitor/cli": "^6.0.0",
      },
    }, null, 2);

    const codemagicYaml = `workflows:
  ios-workflow:
    name: ${appName} iOS Build
    max_build_duration: 60
    environment:
      xcode: latest
      cocoapods: default
      groups:
        - app_store_credentials
      vars:
        BUNDLE_ID: "${bundleId}"
        XCODE_SCHEME: App
        XCODE_WORKSPACE: ios/App/App.xcworkspace
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Add iOS platform
        script: npx cap add ios || true
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up automatic code signing
        script: |
          xcode-project use-profiles \\
            --type app-store
      - name: Build iOS IPA
        script: |
          xcode-project build-ipa \\
            --workspace "$XCODE_WORKSPACE" \\
            --scheme "$XCODE_SCHEME" \\
            --config Release \\
            --export-options-plist export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
`;

    const exportOptionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
`;

    const filesToSync = [
      { path: "capacitor.config.js", content: capacitorConfig },
      { path: "package.json", content: packageJson },
      { path: "codemagic.yaml", content: codemagicYaml },
      { path: "export_options.plist", content: exportOptionsPlist },
    ];

    const results: string[] = [];

    for (const file of filesToSync) {
      // Get current SHA if file exists
      let sha: string | undefined;
      const getRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        { headers: { Authorization: `Bearer ${token}`, "User-Agent": "POSTAPP/1.0" } }
      );
      if (getRes.ok) {
        const existing = await getRes.json() as { sha: string };
        sha = existing.sha;
      }

      const encoded = Buffer.from(file.content).toString("base64");
      const putRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "POSTAPP/1.0",
          },
          body: JSON.stringify({
            message: sha ? `Update ${file.path}` : `Add ${file.path}`,
            content: encoded,
            ...(sha ? { sha } : {}),
          }),
        }
      );
      if (!putRes.ok) {
        const err = await putRes.json() as { message?: string };
        res.status(500).json({ error: `Failed to sync ${file.path}: ${err.message}` });
        return;
      }
      results.push(file.path);
    }

    res.json({ synced: results, repoUrl: `https://github.com/${repoFullName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sync failed" });
  }
});

// POST /api/apps/:id/wrap/push-github — create GitHub repo and push generated files
router.post("/apps/:id/wrap/push-github", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    const { token, repoName, isPrivate = true } = req.body;

    if (!token || !repoName) {
      res.status(400).json({ error: "token and repoName are required" });
      return;
    }

    const [config] = await db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId));
    if (!config) {
      res.status(404).json({ error: "No wrap config found. Save configuration first." });
      return;
    }

    const { webUrl, bundleId, appName, minIosVersion, backgroundColor, statusBarStyle, allowNavigation, permissions } = config;
    const allowNav = (allowNavigation as string[] || []);
    const perms = (permissions as string[] || []);

    // Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "POSTAPP/1.0" },
    });
    if (!userRes.ok) {
      res.status(401).json({ error: "Invalid GitHub token. Check it and try again." });
      return;
    }
    const ghUser = await userRes.json() as { login: string };

    // Create the repo
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "POSTAPP/1.0",
      },
      body: JSON.stringify({
        name: repoName,
        private: isPrivate,
        description: `Native iOS wrapper for ${appName} (${bundleId})`,
        auto_init: false,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json() as { message?: string };
      if (err.message?.includes("already exists")) {
        res.status(409).json({ error: `Repo "${repoName}" already exists on your account. Choose a different name.` });
      } else {
        res.status(400).json({ error: err.message || "Failed to create repo" });
      }
      return;
    }

    const repo = await createRes.json() as { html_url: string; full_name: string };

    // Build the files
    const capacitorConfig = `/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: '${bundleId}',
  appName: '${appName}',
  webDir: 'www',
  server: {
    url: '${webUrl}',
    cleartext: false,
    allowNavigation: [${allowNav.map((d: string) => `'${d}'`).join(", ")}],
  },
  ios: {
    backgroundColor: '${backgroundColor}',
    statusBarStyle: '${statusBarStyle}',
    minimumOsVersion: '${minIosVersion}',
    contentInset: 'automatic',
  },
};

module.exports = config;
`;

    const packageJson = JSON.stringify({
      name: (appName as string).toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      private: true,
      scripts: {
        "cap:ios": "npx cap add ios && npx cap sync",
        "cap:open": "npx cap open ios",
        "cap:sync": "npx cap sync",
      },
      dependencies: {
        "@capacitor/core": "^6.0.0",
        "@capacitor/ios": "^6.0.0",
        ...(perms.includes("camera") ? { "@capacitor/camera": "^6.0.0" } : {}),
        ...(perms.includes("microphone") ? { "@capacitor/microphone": "^6.0.0" } : {}),
        ...(perms.includes("location") ? { "@capacitor/geolocation": "^6.0.0" } : {}),
        ...(perms.includes("push-notifications") ? { "@capacitor/push-notifications": "^6.0.0" } : {}),
        ...(perms.includes("haptics") ? { "@capacitor/haptics": "^6.0.0" } : {}),
      },
      devDependencies: { "@capacitor/cli": "^6.0.0" },
    }, null, 2);

    const codemagicYaml = `workflows:
  ios-workflow:
    name: ${appName} iOS Build
    max_build_duration: 60
    environment:
      xcode: latest
      cocoapods: default
      groups:
        - app_store_credentials
      vars:
        BUNDLE_ID: "${bundleId}"
        XCODE_SCHEME: App
        XCODE_WORKSPACE: ios/App/App.xcworkspace
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Add iOS platform
        script: npx cap add ios || true
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up automatic code signing
        script: |
          xcode-project use-profiles \\
            --type app-store
      - name: Build iOS IPA
        script: |
          xcode-project build-ipa \\
            --workspace "$XCODE_WORKSPACE" \\
            --scheme "$XCODE_SCHEME" \\
            --config Release \\
            --export-options-plist export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
`;

    const exportOptionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
`;

    const readme = `# ${appName} — Native iOS Wrapper

Generated by POSTAPP. Wraps ${webUrl} as a native iOS app.

## Bundle ID
\`${bundleId}\`

## Setup (if building locally on Mac)
\`\`\`bash
npm install
npm run cap:ios
npm run cap:open
\`\`\`

## Cloud Build (No Mac Required)
1. Connect this repo to [Codemagic](https://codemagic.io)
2. Add App Store Connect API key in Codemagic dashboard
3. Trigger build — IPA goes straight to TestFlight
`;

    const filesToPush = [
      { path: "capacitor.config.js", content: capacitorConfig },
      { path: "package.json", content: packageJson },
      { path: "codemagic.yaml", content: codemagicYaml },
      { path: "export_options.plist", content: exportOptionsPlist },
      { path: "README.md", content: readme },
    ];

    // Push each file
    for (const file of filesToPush) {
      const encoded = Buffer.from(file.content).toString("base64");
      const pushRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/contents/${file.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "POSTAPP/1.0",
          },
          body: JSON.stringify({
            message: `Add ${file.path}`,
            content: encoded,
          }),
        }
      );
      if (!pushRes.ok) {
        const err = await pushRes.json() as { message?: string };
        res.status(500).json({ error: `Failed to push ${file.path}: ${err.message}` });
        return;
      }
    }

    res.json({ repoUrl: repo.html_url, repoFullName: repo.full_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "GitHub push failed" });
  }
});

// POST /api/apps/:id/wrap/complete — mark wrap checklist items done
router.post("/apps/:id/wrap/complete", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    // Mark native wrap checklist items as complete (items labeled with "native" or "binary" or "minimum")
    const items = await db.select().from(checklistTable).where(eq(checklistTable.appId, appId));

    const wrapKeywords = ["native", "binary", "minimum", "wrapper", "wrapped"];
    const toComplete = items.filter(item =>
      wrapKeywords.some(kw => item.label?.toLowerCase().includes(kw)) && !item.completed
    );

    for (const item of toComplete) {
      await db.update(checklistTable).set({ completed: true }).where(eq(checklistTable.id, item.id));
    }

    res.json({ completed: toComplete.map(i => i.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete checklist items" });
  }
});

export default router;
