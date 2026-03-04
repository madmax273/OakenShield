Good. You’re thinking correctly now.

If it works on all websites, this becomes a serious product — not a toy.

I’ll give you:

🧠 Complete end-to-end flow

🏗 Scalable architecture

🔄 Runtime lifecycle

📦 Future-ready design decisions

⚠️ Edge cases

🚀 Phase upgrade path

You can directly use this to build.

🎯 High-Level Goal

Intercept any navigation or typed search across ALL websites
Match against banned keywords
Inject friction
Track behavior

🧠 SYSTEM DESIGN OVERVIEW

You are building a Client-Side Behavioral Firewall

Architecture layers:

[ User Action ]
↓
[ Content Script Detection Engine ]
↓
[ Background Service Worker ]
↓
[ Storage Layer ]
↓
[ UI Injection Layer ]
📁 Scalable Folder Structure
focus-guard/
│
├── manifest.json
├── background/
│ └── service-worker.js
│
├── content/
│ ├── detector.js
│ ├── domObserver.js
│ └── modalInjector.js
│
├── popup/
│ ├── popup.html
│ ├── popup.js
│ └── popup.css
│
├── options/
│ ├── options.html
│ ├── options.js
│ └── options.css
│
├── core/
│ ├── keywordMatcher.js
│ ├── statsManager.js
│ └── stateManager.js
│
├── utils/
│ └── storage.js
│
└── assets/

This is scalable. You won’t rewrite later.

📜 manifest.json (Core Settings)

Use Manifest V3.

Important permissions:

"storage"

"tabs"

"activeTab"

"scripting"

Host permissions:

"<all_urls>"

This enables detection on ALL websites.

🔄 Complete Runtime Flow

Let’s walk through a real-world example.

🔹 Step 1: Extension Loads

When browser starts:

background service worker initializes:

Load keywords from storage

Cache them in memory

Initialize stats

🔹 Step 2: User Opens Any Website

Chrome automatically injects:

content/detector.js

Into all pages.

🔹 Step 3: Detection Engine Starts Watching

Your detector does 3 things:

A) URL Monitoring

Detect if URL changes (SPA support)

Watch:

window.location.href

Override:

history.pushState

history.replaceState

popstate event

B) Form Submission Monitoring

Listen to:

document.addEventListener("submit")

Extract:

input values

search query

form data

C) Input Field Monitoring

Listen to:

keydown

Specifically:

When Enter is pressed

Inside input or textarea

Extract value.

🔎 Keyword Matching Logic

Use a central matcher:

normalize text
↓
lowercase
↓
remove punctuation
↓
check partial match

Example:

Keyword: cricket
Typed: best cricket highlights

Match = TRUE

🚨 If Match Found

Content script does NOT directly block.

It sends message:

chrome.runtime.sendMessage({
type: "KEYWORD_DETECTED",
payload: { keyword, url, context }
})
🧠 Background Service Worker

Receives message.

Flow:

Check if focusEnabled

Increment blocked++

Send command back:

INJECT_MODAL
🎨 Modal Injection Layer

modalInjector.js:

Creates full-screen overlay

Blocks pointer events

Disables scrolling

Focus trap (keyboard disabled)

UI:

Title:
“You promised yourself not to search this.”

Show:
Detected keyword

Buttons:

[Go Back]
[Continue Anyway]

🧠 User Decision Flow
If Go Back:

history.back()

stats.resisted++

modal removed

If Continue:

show confirmation step

stats.continued++

allow navigation

modal removed

📊 Stats Engine

statsManager.js handles:

{
blocked: number,
resisted: number,
continued: number,
lastResetDate: ISO
}

Daily reset logic:

On each event:

Compare today with lastResetDate

If different → reset counters

🧠 State Management

stateManager.js holds:

{
keywords: [],
focusEnabled: true
}

Cache in memory inside background worker for speed.

💾 Storage Layer

Use:

chrome.storage.sync

Why sync?
Because later you can:

Add login

Sync across devices

Upgrade to cloud

Without rewriting logic.

🌍 Edge Cases (You MUST Handle)
1️⃣ Single Page Applications (React, Next.js)

Navigation doesn’t reload page.

You must override:

history.pushState
history.replaceState

And listen to:

popstate
2️⃣ Dynamically Loaded Inputs

Use:

MutationObserver

To detect newly added input fields.

3️⃣ Performance Protection

DO NOT:

Scan entire DOM repeatedly

Run heavy loops

Only check:

When user presses Enter

When URL changes

🔐 Security & Anti-Bypass

Users can:

Disable extension

Remove keyword

You don’t fight that.

This is voluntary discipline.

But you can later add:

Lock removal with passcode

Delay removal (5 min timer)

Not in V1.

🏗 How This Scales Later

Because architecture is layered, you can plug:

Phase 2 Additions

Streak system

Focus score

Weekly report

Charts in popup

Just extend statsManager.

Phase 3

Add:

Firebase Auth

Cloud Firestore

Subscription (Stripe / Razorpay)

Trial logic

Replace storage layer only.
Everything else remains same.

Phase 4

Advanced Features:

AI detect distraction intent

Smart suggestions

Context-aware blocking

Time-based rules

Still plug into same detection engine.

⚡ Performance Considerations

Keep detection lightweight:

✔ Event-driven
✔ No interval polling
✔ Cache keywords in memory
✔ Minimal DOM manipulation

🧪 Testing Strategy

Test on:

Google

YouTube

Twitter

Reddit

Amazon

Any React site

Test:

Typing in search bar

Direct URL typing

Clicking links

Form submissions

🧠 Mental Model

You are building:

A browser-level middleware layer.

Like:

User → Website
You insert → Behavioral Interceptor

🚀 Final Launch Checklist

Before uploading:

Clean UI

No console errors

Lightweight

Clear branding

Privacy policy page (required)

No shady permissions

🧨 Important Advice For You (Founder Mode)

Do NOT:

Add login now

Add subscription now

Add backend now

First validate:

Does this stop at least 1 distraction per day?

If yes → scale.
