# EchoFlow Shadowing - Installation Guide

## How to run as a Desktop App (Recommended)

This application is a **Progressive Web App (PWA)**. You can install it directly to your computer to get a desktop icon and a standalone window experience.

1.  **Open the website** in a modern browser (Chrome, Edge, Brave).
2.  Look for the **"Install to Desktop"** button in the bottom-right corner of the app.
    *   *Alternatively*: Click the "Install App" icon in the right side of your browser's address bar.
3.  Click **Install**.
4.  A shortcut will be created on your **Desktop** and in your **Start Menu**.
5.  **Double-click** the icon to launch the app anytime!

## How to run from Source Code

If you have downloaded the source code files:

1.  You need a local web server because of browser security rules.
2.  If you have Python installed (most Macs/Linux have it):
    *   Open terminal in this folder.
    *   Run: `python3 -m http.server 8000`
    *   Open `http://localhost:8000` in your browser.
3.  If you have Node.js:
    *   Run `npx serve .`
