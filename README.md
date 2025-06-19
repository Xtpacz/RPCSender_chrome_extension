# RPC Sender Chrome Extension

## Feature Overview

RPC Sender is a simple and elegant Chrome extension that supports custom HTTP requests, including GET/POST/PUT/DELETE/PATCH methods. You can fill in the request body, view the response, and copy the response content with one click.

## Installation & Usage

### 1. Download the Extension Source Code
Save the entire project folder (`RPCSender_chrome_extension`) to your local machine.

### 2. Open Chrome Extensions Management Page
In the Chrome browser address bar, enter:
```
chrome://extensions/
```
and press Enter.

### 3. Enable Developer Mode
Turn on the "Developer mode" switch at the top right of the extensions management page.

### 4. Load Unpacked Extension
Click the "Load unpacked" button at the top left, and select your local `RPCSender_chrome_extension` folder.

### 5. Pin and Use the Extension
After successful loading, click the RPC Sender icon in the extensions bar to open the popup, fill in the request information, and send the request.

## FAQ
- **Can't connect to the network?** Please ensure the requested API allows cross-origin (CORS), or the API itself supports direct browser access.
- **Request body format error?** For POST/PUT/PATCH methods, please ensure the request body is in valid JSON format.

## Uninstall Extension
In the extensions management page, find "RPC Sender" and click "Remove".

---
For more needs or suggestions, feel free to provide feedback! 