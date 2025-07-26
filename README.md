# MTG Commander Pod Generator

A web tool for creating balanced Magic: The Gathering Commander pods based on player power levels and preferences.

## Features

- **Power Level Matching**: Group players by deck power levels (1-10 scale)
- **Flexible Grouping**: Allow friends to stay together
- **Keyboard Shortcuts**: Quick power level selection with keyboard input
- **Range Support**: Select power level ranges (e.g., "7-9")
- **Drag & Drop**: Reorganize pods after generation
- **Display Mode**: Clean presentation view for showing results
- **Real-time Validation**: Duplicate name detection and error highlighting

## Live Demo

Visit the live version at: `https://[your-username].github.io/Commander-Pairings`

## Development

### Prerequisites
- Node.js (for development and testing)
- npm

### Setup
```bash
npm install
```

### Building for Production
```bash
npm run deploy
```

This will bundle all TypeScript files into a single `script.js` file for GitHub Pages.

### Testing
```bash
npm test                # Run all tests
npm run test:headed     # Run tests with browser visible
npm run test:ui         # Run tests with Playwright UI
```

## Deployment to GitHub Pages

1. **Enable GitHub Pages** in your repository settings
2. **Set source** to "Deploy from a branch"
3. **Select branch** "main" and folder "/ (root)"
4. **Run the build command** before pushing:
   ```bash
   npm run deploy
   ```
5. **Commit and push** the generated `script.js` file

The site will be available at `https://[your-username].github.io/[repository-name]`

## Project Structure

```
├── index.html          # Main HTML file
├── style.css          # Styling
├── script.js          # Bundled JavaScript (generated)
├── src/               # TypeScript source files
│   ├── main.ts        # Entry point
│   ├── ui-manager.ts  # UI interactions
│   ├── pod-generator.ts # Pod generation logic
│   └── ...
└── tests/             # Playwright tests
```

## How to Use

1. **Add Players**: Enter player names and select their deck power levels
2. **Set Groups**: Use dropdowns to group players who want to stay together
3. **Choose Leniency**: Adjust power level matching tolerance
4. **Generate Pods**: Create balanced groups of 3-4 players
5. **Manage Results**: Drag and drop to adjust, or use Display Mode for presentation

## Contributing

1. Fork the repository
2. Make your changes in the TypeScript files under `src/`
3. Test your changes with `npm test`
4. Build for production with `npm run deploy`
5. Submit a pull request

## Support

If you find this tool useful and it helps improve your Commander pod pairings, consider supporting the development:

☕ **[Support me on Ko-fi](https://ko-fi.com/mrtyton)**

Your support helps keep this project maintained and allows for new features to be added!

## License

This project is open source and available under the MIT License.

