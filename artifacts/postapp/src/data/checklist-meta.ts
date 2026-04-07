export type ChecklistStatus = "complete" | "warning" | "missing";
export type ActionType = "internal" | "external" | "modal";

export interface ChecklistAction {
  type: ActionType;
  label: string;
  target: string;
}

export interface ChecklistItemMeta {
  blocker: boolean;
  helpText: string;
  actions: ChecklistAction[];
  modalContent?: { title: string; body: string };
}

export interface ModalContent {
  title: string;
  body: string;
}

export const MODAL_LIBRARY: Record<string, ModalContent> = {
  iconRequirements: {
    title: "App Icon Requirements",
    body: "Apple requires a 1024×1024 PNG icon with no alpha (transparency) channel and no rounded corners — App Store Connect applies the rounding itself. Export from Xcode or your design tool making sure the alpha channel is removed. Common mistake: exporting with transparency from Figma or Sketch will cause an immediate rejection.",
  },
  screenshotGuide: {
    title: "Screenshot Size Guide",
    body: "You need screenshots for at least one iPhone size. The most commonly required set is the 6.9\" (iPhone 16 Pro Max) at 1320×2868 or 1290×2796 pixels. Check App Store Connect for the exact sizes required for your target devices. iPad screenshots are required separately if you support iPad.",
  },
  versionExamples: {
    title: "Version & Build Number Examples",
    body: "Marketing version (CFBundleShortVersionString): Use semantic versioning like 1.0.0, 2.1.3. This is user-facing.\n\nBuild number (CFBundleVersion): Must be a unique integer or string per upload to App Store Connect. Simply incrementing by 1 (e.g. 42 → 43) is the most reliable approach. You cannot reuse a build number within the same app, even across versions.",
  },
  privacyPolicyHelp: {
    title: "What Your Privacy Policy Must Include",
    body: "Your privacy policy must be hosted at a live, publicly accessible URL. It should cover: what data you collect, how it's used, who it's shared with, how users can request deletion, and your contact information. Apps that collect any user data or use analytics/advertising SDKs almost always require a policy. Free generators like Termly or PrivacyPolicies.com can give you a starting template.",
  },
  usageStringsHelp: {
    title: "Required Privacy Usage Strings",
    body: "If your app accesses any of these on-device features, you must add the corresponding NSUsageDescription key to your Info.plist:\n\n• Camera → NSCameraUsageDescription\n• Microphone → NSMicrophoneUsageDescription\n• Photo Library → NSPhotoLibraryUsageDescription\n• Location → NSLocationWhenInUseUsageDescription\n• Contacts → NSContactsUsageDescription\n• Bluetooth → NSBluetoothAlwaysUsageDescription\n\nMissing these is one of the most common rejection causes.",
  },
  ageRatingHelp: {
    title: "Setting the Right Age Rating",
    body: "App Store Connect walks you through an age rating questionnaire when you create your listing. Answer honestly — Apple cross-checks ratings against app functionality during review. Setting an age rating that's too low for your content is a fast path to rejection or removal.",
  },
  iapHelp: {
    title: "In-App Purchase Configuration",
    body: "All IAPs must be created and approved in App Store Connect before submission. In sandbox testing, use Sandbox Apple IDs created in App Store Connect. Common issues:\n\n• Products must be 'Ready to Submit' or 'Approved'\n• StoreKit must handle all edge cases (cancellation, restore)\n• If your app uses subscriptions, you must implement a restore purchases button",
  },
  subscriptionTerms: {
    title: "Subscription Disclosure Requirements",
    body: "Apple requires that subscription terms, pricing, and renewal intervals be clearly disclosed in the app UI — not just in the App Store listing. This means:\n\n• Show the price and billing period before the user subscribes\n• Include a link to your Terms of Service and Privacy Policy\n• Mention that the subscription auto-renews\n\nMissing disclosure is a common 3.1.1 rejection.",
  },
  reviewNotesExample: {
    title: "Example Review Notes",
    body: "Good review notes reduce rejection risk by explaining anything a reviewer might find confusing:\n\n'This app requires a staff login. Test credentials: reviewer@example.com / TestPass123. The app connects to a backend API — ensure you are testing on a real device with network access. The main workflow is: Login → Browse → Checkout.'\n\nKeep it factual and short. Explain non-obvious flows but don't over-explain basics.",
  },
  reviewerAccess: {
    title: "Reviewer Access Tips",
    body: "If your app requires login:\n• Provide a working test account in the review notes\n• Ensure the account has full access to all reviewable features\n• Consider adding a guest or demo mode so reviewers don't need credentials at all\n• Do not use accounts that require two-factor authentication on an unfamiliar device, as reviewers cannot complete that flow",
  },
  crashCheck: {
    title: "Pre-submission Crash Check",
    body: "Run through these before submitting:\n\n1. Cold launch on a real device (not simulator)\n2. Kill and relaunch several times\n3. Test on the minimum iOS version you declare\n4. Rotate the device if your app supports landscape\n5. Check Xcode organizer crash reports after TestFlight builds\n\nCrashes on launch are an automatic rejection.",
  },
  competingPlatforms: {
    title: "No References to Competing Platforms",
    body: "Apple guideline 2.3.7 prohibits apps that name or promote competing mobile platforms (Android, Google Play, etc.) in the UI, screenshots, or metadata. This includes:\n\n• Screenshots showing 'Available on Google Play'\n• App copy that says 'Download on Android'\n• Links to your Google Play listing\n\nRemove all cross-platform promotional copy before submission.",
  },
  demoVideo: {
    title: "When to Provide a Demo Video",
    body: "A demo video (app preview) is optional but highly recommended when:\n\n• Your app requires a setup process before core functionality is available\n• The app has complex or non-obvious workflows\n• The app integrates with hardware (smart home, fitness trackers, etc.)\n\nFormat: up to 30 seconds, recorded at device resolution, no external content. Upload in App Store Connect under your app's media assets.",
  },
};

const CHECKLIST_META: Record<string, ChecklistItemMeta> = {
  "App name follows App Store guidelines": {
    blocker: false,
    helpText: "Names must not contain pricing info, generic terms used as the full title, or terms that could mislead users about the app's functionality.",
    actions: [
      { type: "external", label: "Apple naming guidelines", target: "https://developer.apple.com/app-store/review/guidelines/#metadata" },
    ],
  },
  "App description is accurate and complete": {
    blocker: false,
    helpText: "The description must accurately reflect the app's current functionality. Future feature promises can cause rejection.",
    actions: [
      { type: "external", label: "Metadata guidelines", target: "https://developer.apple.com/app-store/review/guidelines/#metadata" },
    ],
  },
  "Screenshots provided for all required device sizes": {
    blocker: true,
    helpText: "Missing screenshots for required device families will block your submission from being uploaded to App Store Connect.",
    actions: [
      { type: "modal", label: "View size guide", target: "screenshotGuide" },
      { type: "external", label: "App Store Connect", target: "https://appstoreconnect.apple.com" },
    ],
  },
  "App icon meets requirements (1024x1024 PNG, no alpha)": {
    blocker: true,
    helpText: "A missing or incorrect icon will cause App Store Connect to reject your build upload before review even begins.",
    actions: [
      { type: "modal", label: "Why this matters", target: "iconRequirements" },
      { type: "external", label: "Apple icon guidance", target: "https://developer.apple.com/design/human-interface-guidelines/app-icons" },
    ],
  },
  "Keywords are optimized and within 100 characters": {
    blocker: false,
    helpText: "Keywords directly affect App Store discoverability. Avoid repeating your app name. Use the full 100 characters if possible.",
    actions: [
      { type: "external", label: "ASO tips", target: "https://developer.apple.com/app-store/search/" },
    ],
  },
  "Privacy policy URL is valid and accessible": {
    blocker: true,
    helpText: "Apple reviewers will open this URL. A 404 or redirect to a login page will result in rejection.",
    actions: [
      { type: "modal", label: "What to include", target: "privacyPolicyHelp" },
      { type: "external", label: "Apple privacy requirements", target: "https://developer.apple.com/app-store/review/guidelines/#privacy" },
    ],
  },
  "App does not collect data beyond what is declared": {
    blocker: true,
    helpText: "Your App Privacy nutrition label in App Store Connect must match what your app actually collects. Mismatches cause rejection.",
    actions: [
      { type: "modal", label: "Privacy usage strings", target: "usageStringsHelp" },
      { type: "external", label: "Apple privacy docs", target: "https://developer.apple.com/app-store/user-privacy-and-data-use/" },
    ],
  },
  "Age rating is accurate": {
    blocker: false,
    helpText: "Setting an age rating lower than your content warrants is a policy violation and can lead to app removal.",
    actions: [
      { type: "modal", label: "Rating guidance", target: "ageRatingHelp" },
      { type: "external", label: "App Store Connect", target: "https://appstoreconnect.apple.com" },
    ],
  },
  "In-app purchases are correctly configured": {
    blocker: true,
    helpText: "IAPs that are not in 'Ready to Submit' or 'Approved' state in App Store Connect will block your release.",
    actions: [
      { type: "modal", label: "IAP checklist", target: "iapHelp" },
      { type: "external", label: "IAP guidelines", target: "https://developer.apple.com/app-store/review/guidelines/#in-app-purchase" },
    ],
  },
  "Subscription terms and pricing are disclosed": {
    blocker: true,
    helpText: "Section 3.1.1 of the review guidelines requires clear in-app disclosure of subscription pricing and renewal terms.",
    actions: [
      { type: "modal", label: "Disclosure requirements", target: "subscriptionTerms" },
      { type: "external", label: "Subscription guidelines", target: "https://developer.apple.com/app-store/review/guidelines/#subscriptions" },
    ],
  },
  "App does not crash on launch": {
    blocker: true,
    helpText: "A crash on launch is an automatic rejection. Test on a real device, not just the simulator.",
    actions: [
      { type: "modal", label: "Pre-launch crash check", target: "crashCheck" },
      { type: "external", label: "TestFlight guide", target: "https://developer.apple.com/testflight/" },
    ],
  },
  "App works on the minimum supported iOS/Android version": {
    blocker: true,
    helpText: "Test on a device or simulator running your declared minimum OS version. APIs unavailable on older OS versions are a common crash source.",
    actions: [
      { type: "external", label: "iOS version stats", target: "https://developer.apple.com/support/app-store/" },
    ],
  },
  "No references to competing platforms": {
    blocker: false,
    helpText: "Search your app's text and screenshots for mentions of Android, Google Play, or other competing platforms and remove them.",
    actions: [
      { type: "modal", label: "What's not allowed", target: "competingPlatforms" },
      { type: "external", label: "Guideline 2.3.7", target: "https://developer.apple.com/app-store/review/guidelines/#design" },
    ],
  },
  "All links and buttons are functional": {
    blocker: false,
    helpText: "Reviewers interact with your app. Dead links, empty states with no explanation, or disabled buttons without context lead to rejection.",
    actions: [
      { type: "internal", label: "Add review note", target: "revisions" },
    ],
  },
  "Test account credentials provided (if required)": {
    blocker: false,
    helpText: "If your app requires login and you haven't provided credentials, the reviewer cannot test your app and will reject it.",
    actions: [
      { type: "modal", label: "Reviewer access tips", target: "reviewerAccess" },
      { type: "internal", label: "Add review note", target: "revisions" },
    ],
  },
  "Review notes explain any special features or flows": {
    blocker: false,
    helpText: "Clear notes reduce the chance of a reviewer misunderstanding an intentional design decision and rejecting on those grounds.",
    actions: [
      { type: "modal", label: "See example notes", target: "reviewNotesExample" },
      { type: "internal", label: "Open review log", target: "revisions" },
    ],
  },
  "Demo video provided (if app requires special setup)": {
    blocker: false,
    helpText: "A short screen recording of core flows helps reviewers understand complex apps and significantly reduces rejection risk.",
    actions: [
      { type: "modal", label: "When to use a demo", target: "demoVideo" },
      { type: "external", label: "App previews guide", target: "https://developer.apple.com/app-store/app-previews/" },
    ],
  },
};

export function getItemMeta(label: string): ChecklistItemMeta {
  return CHECKLIST_META[label] ?? {
    blocker: false,
    helpText: "",
    actions: [],
  };
}

export const SECTION_ACCENTS: Record<string, string> = {
  Metadata: "bg-violet-500",
  Legal: "bg-amber-500",
  Monetization: "bg-green-500",
  Technical: "bg-blue-500",
  Review: "bg-pink-500",
};

export const SECTION_TEXT_ACCENTS: Record<string, string> = {
  Metadata: "text-violet-400",
  Legal: "text-amber-400",
  Monetization: "text-green-400",
  Technical: "text-blue-400",
  Review: "text-pink-400",
};
