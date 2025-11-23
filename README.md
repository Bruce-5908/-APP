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

## How to produce a one-click Windows installer (EXE)

If you prefer to ship a single EXE that starts the app locally after extracting a zip:

1. Install dependencies (needs internet): `npm install`
2. Build the web app: `npm run build`
3. Package the EXE server: `npm run build:installer`
4. Zip the entire `dist` folder (including the `installer` subfolder). The generated EXE will be in `dist/installer/`.
5. On Windows, unzip the archive and double-click the EXE. It will start a local server on port **4173** and open the app in the default browser.
