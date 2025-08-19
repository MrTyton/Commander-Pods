name: Bug Report
description: Create a report to help us improve the Commander Pairings application
title: "[BUG] "
labels: ["bug"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thank you for taking the time to report a bug! Please fill out the form below with as much detail as possible.

  - type: textarea
    id: bug-description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
      placeholder: Describe the bug you encountered...
    validations:
      required: true

  - type: textarea
    id: reproduction-steps
    attributes:
      label: Steps to Reproduce
      description: Please provide detailed steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. Scroll down to '...'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen
      placeholder: What should have happened instead?
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: Actual Behavior
      description: A clear and concise description of what actually happened
      placeholder: What actually happened?
    validations:
      required: true

  - type: dropdown
    id: browser
    attributes:
      label: Browser
      description: Which browser are you using?
      options:
        - Chrome
        - Firefox
        - Safari
        - Edge
        - Opera
        - Other
    validations:
      required: true

  - type: input
    id: browser-version
    attributes:
      label: Browser Version
      description: What version of the browser are you using?
      placeholder: "e.g. 118.0.5993.88"
    validations:
      required: true

  - type: dropdown
    id: operating-system
    attributes:
      label: Operating System
      description: Which operating system are you using?
      options:
        - Windows 11
        - Windows 10
        - macOS (latest)
        - macOS (older version)
        - Ubuntu/Linux
        - iOS
        - Android
        - Other
    validations:
      required: true

  - type: dropdown
    id: device-type
    attributes:
      label: Device Type
      description: What type of device are you using?
      options:
        - Desktop
        - Laptop
        - Tablet
        - Mobile Phone
    validations:
      required: true

  - type: input
    id: player-count
    attributes:
      label: Number of Players
      description: How many players were you trying to organize?
      placeholder: "e.g. 8, 16, 32"

  - type: dropdown
    id: ranking-system
    attributes:
      label: Ranking System
      description: Which ranking system were you using?
      options:
        - Power Level (1-10)
        - Bracket (1,2,3,4,cEDH)

  - type: dropdown
    id: tolerance-setting
    attributes:
      label: Tolerance Setting (Power Level mode only)
      description: If using Power Level mode, what tolerance setting?
      options:
        - No Tolerance (Exact matches only)
        - Regular Tolerance (±0.5)
        - Super Tolerance (±1.0)
        - N/A (using Bracket mode)

  - type: checkboxes
    id: features-used
    attributes:
      label: Features Being Used
      description: Which features were you using when the bug occurred?
      options:
        - label: Drag & Drop for player reordering
        - label: Keyboard shortcuts
        - label: Display mode
        - label: Group assignments
        - label: Tour/Help mode
        - label: Reset functionality
        - label: Pod generation

  - type: textarea
    id: console-errors
    attributes:
      label: Console Errors
      description: If you see any errors in the browser console (F12 → Console tab), please paste them here
      placeholder: Paste any console errors here...
      render: text

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, drag and drop screenshots to help explain the problem

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severely does this bug affect your use of the application?
      options:
        - Critical - Application is unusable
        - High - Major functionality is broken
        - Medium - Some functionality is impaired
        - Low - Minor inconvenience
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: |
        Add any other context about the problem here:
        - Does this happen consistently or intermittently?
        - Did this work before? If so, when did it stop working?
        - Any workarounds you've found?
        - Impact on your workflow
      placeholder: Any additional information that might be helpful...
