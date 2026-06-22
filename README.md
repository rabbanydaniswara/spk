# SPK Multi-Metode (SAW, WP, SMART) - Static Web App

A lightweight, static Decision Support System (Sistem Pendukung Keputusan - SPK) application that implements three popular SPK methods: **Simple Additive Weighting (SAW)**, **Weighted Product (WP)**, and **Simple Multi-Attribute Rating Technique (SMART)**. 

This project runs completely on the client-side (no server or database required) and saves all criteria and alternative data directly in the browser's `LocalStorage`.

## 🚀 Features

- **Multi-Method SPK**: Supports SAW, WP, and SMART methods.
- **Interactive Step-by-Step Calculation**: Displays detailed mathematical steps for each method (normalization, weight calculation, and final ranking).
- **Dynamic Criteria Management**: Add, edit, or delete criteria and customize weights and cost/benefit types.
- **Dynamic Alternative Management**: Add, edit, or delete alternatives and fill in custom scores for each criterion.
- **Neo-Brutalism UI**: Modern, high-contrast, premium aesthetic styling.
- **No Installation Required**: Works directly in the browser, making it fully compatible with static hosting like GitHub Pages.
- **Persistence**: Data is kept automatically using browser LocalStorage.

## 🛠️ Tech Stack

- **Structure**: HTML5
- **Styling**: Vanilla CSS (incorporating Outfit and Space Grotesk fonts from Google Fonts)
- **Logic**: Vanilla JavaScript
- **Persistence**: Browser LocalStorage

## 💻 How to Run Locally

Since this is a fully static web application, you do not need to install any servers or dependencies. 

Simply open the `index.html` file in any modern web browser:
1. Clone or download this repository.
2. Double-click `index.html` to open it in Chrome, Firefox, Edge, Safari, or any other browser.

Alternatively, you can run a local server (like Live Server in VS Code) or deploy it directly to GitHub Pages.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
