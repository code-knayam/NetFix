# Netfix

![Version](https://img.shields.io/badge/version-1.1.3-blue)

NetFix helps you take control of your Netflix viewing habits by providing tools to customize your browsing experience.

## Features

- **Hide Recommendations**: Remove auto-playing trailers and recommendation rows from the Netflix homepage
- **Search Without Distractions**: Recommendations remain visible on the search page for better usability
- **Customizable Settings**: Enable or disable features through an easy-to-use popup interface

## Documentation

Here's how NetFix transforms your Netflix experience:

### Before and After Comparison

#### NetFix watch stats
![NetFix watch stats](docs/netfix-1.png)

#### Settings page
![Netflix Homepage With NetFix](docs/netfix-2.png)

#### Recommendations blocker
![Netflix Search Without NetFix](docs/netfix-3.png)

#### Viewing Limit Over
![Viewing Limit Over](docs/netfix-4.png)

## Installation

### From Chrome Web Store
[Install from Chrome Web Store](https://chromewebstore.google.com/detail/netfix/dglgdabgjjphcogfplhpciofecbjbnjm)

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `dist/netfix` directory

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Install dependencies
`npm install`
2. Run the extension
`npm run dev`
`npm run build:extension`

### Build Commands

- `npm run build` - Creates a development build in `dist/netflix` directory
- `npm run bundle` - Creates a production build, increments version, and creates a versioned zip file in `uploads` directory

### Development Process

1. Make your changes in the source files
2. Use `npm run build` during development to test your changes
3. Load the extension from `dist/netflix` in Chrome's developer mode
4. When ready for release:
   - Use `npm run bundle` to create a production build
   - The script will automatically:
     - Increment the minor version in manifest.json
     - Create a production build
     - Generate a versioned zip file in the `uploads` directory
   - The zip file will be named `netflix-extension-v{version}.zip`


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

