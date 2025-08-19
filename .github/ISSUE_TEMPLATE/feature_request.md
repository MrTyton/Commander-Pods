name: Feature Request
description: Suggest an idea for the Commander Pairings application
title: "[FEATURE] "
labels: ["enhancement"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thank you for suggesting a new feature! Please fill out the form below to help us understand your idea.

  - type: textarea
    id: problem-description
    attributes:
      label: Problem Description
      description: Is your feature request related to a problem? Please describe.
      placeholder: "I'm always frustrated when..."
    validations:
      required: true

  - type: textarea
    id: proposed-solution
    attributes:
      label: Proposed Solution
      description: A clear and concise description of what you want to happen
      placeholder: Describe your ideal solution...
    validations:
      required: true

  - type: textarea
    id: alternatives-considered
    attributes:
      label: Alternatives Considered
      description: A clear and concise description of any alternative solutions or features you've considered
      placeholder: What other approaches have you thought about?

  - type: textarea
    id: use-case
    attributes:
      label: Use Case
      description: Describe how this feature would be used in the Commander Pairings application
      placeholder: |
        - Who would use this feature?
        - When would they use it?
        - How often would it be used?
    validations:
      required: true

  - type: checkboxes
    id: user-types
    attributes:
      label: Who would benefit from this feature?
      description: Select all that apply
      options:
        - label: Casual Commander players
        - label: Tournament organizers
        - label: LGS (Local Game Store) staff
        - label: cEDH players
        - label: Large group organizers (16+ players)
        - label: Small group organizers (8-12 players)
        - label: Players with accessibility needs

  - type: dropdown
    id: feature-area
    attributes:
      label: Feature Area
      description: Which part of the application would this feature affect?
      options:
        - Player Management
        - Pod Generation Algorithm
        - Power Level/Bracket System
        - Display & Visualization
        - User Interface/Experience
        - Data Import/Export
        - Group Management
        - Keyboard Shortcuts
        - Mobile Experience
        - Settings & Configuration
        - Other
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Critical - Blocking my use of the application
        - High - Would significantly improve my experience
        - Medium - Nice to have
        - Low - Minor improvement
    validations:
      required: true

  - type: textarea
    id: mockups-screenshots
    attributes:
      label: Mockups/Screenshots
      description: If you have any mockups, wireframes, or screenshots that help explain your feature request, please add them here

  - type: textarea
    id: acceptance-criteria
    attributes:
      label: Acceptance Criteria
      description: Please define what "done" looks like for this feature
      placeholder: |
        - [ ] Criteria 1
        - [ ] Criteria 2 
        - [ ] Criteria 3
    validations:
      required: true

  - type: checkboxes
    id: implementation-considerations
    attributes:
      label: Implementation Considerations
      description: Are there any technical constraints or considerations?
      options:
        - label: Should work on mobile devices
        - label: Should work without internet connection
        - label: Should integrate with existing keyboard shortcuts
        - label: Should maintain current performance
        - label: Should work with large player counts (50+)
        - label: Should be accessible for users with disabilities

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any other context, screenshots, or examples about the feature request here
