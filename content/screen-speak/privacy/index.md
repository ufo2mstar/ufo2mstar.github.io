+++
title = 'Screen Speak privacy policy'
url = '/screen-speak/privacy/'
draft = false
showDate = false
showDateUpdated = false
showReadingTime = false
showPagination = false
showWordCount = false
showAuthor = false
showBreadcrumbs = false
showTableOfContents = false
showTaxonomies = false
showHeadingAnchors = true

[build]
  render = 'always'
  list = 'never'
+++

Effective: November 14, 2026 (app version 0.10.1)

Screen Speak (package `com.kyubits.screenspeak`) is an Android app that reads the text on your screen out loud and lets you dictate text into the field you're typing in. This policy explains what the app accesses, what stays on your phone, and the few things that can leave it.

**Short version:** There are no accounts, no ads, no analytics and no tracking. The developer has no server that receives your data. Screen text, history and logs stay on your phone. Data leaves the phone in only two ways: speech-model downloads you start, and reports you choose to email.

Contact: **nssbusstob@gmail.com**

## Accessibility service

Screen Speak uses Android's Accessibility service, and only to:

- read the visible text of the app you're using **when you tap the floating ▶ button**, so the app can speak it with your phone's text-to-speech engine;
- scroll that page while reading continues ("Pages"), when you turn that on;
- type the words you dictate into the text field you picked.

Before Android's Accessibility settings open, the app shows a disclosure. Nothing is turned on unless you tap **Agree** and then switch the service on yourself. You can turn it off at any time in Android Settings › Accessibility.

The app does not collect, store on any server, sell or share screen content. It doesn't use screen content for advertising or profiling.

## Microphone (dictation)

The microphone is used only while you dictate after tapping the mic button. You choose one of three engines:

- **Whisper** or **Parakeet**: speech recognition runs entirely on your phone. Audio never leaves the device.
- **System**: uses your phone's built-in speech recognizer, often Google's. That recognizer may process audio on its provider's servers under that provider's privacy policy (for Google, https://policies.google.com/privacy). Screen Speak only receives the text result.

By default, audio is not kept. If you turn on "Keep audio" in Settings, clips are saved in the app's private storage on your phone.

## Display over other apps (overlay)

The floating ▶ and mic buttons are drawn over other apps using Android's "Display over other apps" permission. This permission is only used to show those controls. It doesn't read anything by itself.

## Notifications and foreground service

While the floating controls are on, Android requires an ongoing notification. During reading, that notification shows playback controls and the media session. The notification and lock screen show only "Screen Speak" and a sentence count such as "3/12", never the text being read.

## Storage on your device

These stay in the app's private storage and are deleted when you uninstall the app:

- settings;
- History (up to 100 reads and 100 dictations);
- a personal dictionary of words and replacements you add;
- any audio you chose to keep;
- debug logs;
- read traces, which are captured only if you turn that on in a debug build.

The app disables Android cloud backup and device-to-device transfer, so none of this is copied to Google Drive or a new phone.

If the app crashes, a short record of the error is saved to the on-device log. Text in error messages is replaced with a length-and-hash token. **It's never sent automatically.**

## Reports and feedback (email)

"Report bugs" and "Something's wrong here" prepare an email in **your** email app. Nothing is sent unless you press send there.

A report can include:

- your note;
- your device model and Android version;
- the app version;
- recent app logs;
- for reading problems, the structure of the page.

"Hide on-screen text" is on by default. While it's on, screen text in the report is replaced with length-and-hash tokens. You can read the whole email before you send it.

Reports go to nssbusstob@gmail.com and are used only to fix problems. They aren't shared with anyone else, and they're deleted on request.

## Model downloads (internet)

The app uses the internet only to download the speech-recognition files you choose for Whisper or Parakeet, and an optional punctuation model if you turn that on. They come from the public sherpa-onnx releases on GitHub (github.com/k2-fsa/sherpa-onnx). The recognition engine itself is bundled in the app; only these model files are downloaded. These downloads don't include any personal data, though GitHub sees a normal web request (your IP address, for example).

## What we don't do

- No analytics, crash-reporting SDKs, advertising or advertising IDs.
- No accounts and no sign-in.
- No sale or sharing of personal data.
- No location, contacts, camera or photo access.

## Children

Screen Speak isn't directed at children under 13 and doesn't knowingly collect anyone's personal data.

## Your choices

- Turn off the Accessibility service, overlay or microphone at any time in Android Settings.
- Clear History in the app, or uninstall the app to remove everything it stored.
- To delete a report you emailed, write to nssbusstob@gmail.com.

## Changes

If this policy changes, the new version will be posted at this address with a new effective date.
