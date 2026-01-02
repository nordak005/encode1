# Copilot Animation GIFs

Place your AI copilot animation GIFs in this directory.

## Required GIF Files

- `idle.gif` - Default state when copilot is waiting
- `listening.gif` - When copilot is listening to user input
- `thinking.gif` - When copilot is processing/analyzing
- `speaking.gif` - When copilot is speaking/responding
- `unsure.gif` - When copilot is uncertain or has low confidence
- `warning.gif` - When there's an error or warning

## GIF Specifications

- **Recommended size**: 176x176 pixels (or maintain aspect ratio)
- **Format**: GIF (animated)
- **Optimization**: Keep file sizes reasonable for web performance
- **Loop**: GIFs should loop seamlessly

## Fallback

If a GIF file is missing, the component will automatically fallback to:
`/character/assistant.png` (static image)

## Usage

The animations are automatically mapped via `config/copilotAnimations.ts`.
No need to manually reference these files in components.

