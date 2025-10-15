# 🛡️ Web Content Protector

A Next.js application that protects web content from copying, right-click, and download by rendering it in a protected iframe.

## Features

- **🛡️ Iframe Protection**: Renders content in a protected iframe
- **🚫 Right-click Blocking**: Disables right-click context menu
- **🚫 Text Selection Disabled**: Prevents text selection
- **🔒 DevTools Protection**: Blocks developer tools access
- **⌨️ Keyboard Shortcuts Blocked**: Disables common keyboard shortcuts

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **html2canvas** - Screenshot functionality
- **Vercel** - Deployment platform

## Getting Started

### Prerequisites

- Node.js >= 18.15.0
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd proyecto6
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a valid URL in the input field
2. Click "Protect (Iframe)" to protect the content
3. The content will be displayed in a protected iframe with security measures

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

## Security Features

- Content is rendered in a sandboxed iframe
- Right-click is disabled
- Text selection is blocked
- Developer tools access is restricted
- Keyboard shortcuts are disabled

## License

This project is private and proprietary.