# AI State Transitions

This document describes how the AI copilot state changes based on user interactions and system events.

## State Transition Map

| Event | Current State → New State | Trigger |
|-------|--------------------------|---------|
| Page loads | - → `idle` | Initial state |
| User types in input | `idle` → `listening` | After 500ms debounce |
| User clears input | `listening` → `idle` | Input becomes empty |
| User clicks "Analyze" | `listening` → `thinking` | Form submission |
| API call starts | `listening` → `thinking` | Fetch request initiated |
| API call succeeds | `thinking` → `speaking` | Response received |
| API call fails | `thinking` → `warning` | Error response |
| Low confidence result | `thinking` → `unsure` | Confidence < threshold |
| Audio playback starts | `thinking` → `speaking` | Audio element plays |
| Audio playback ends | `speaking` → `idle` | Audio onended event |
| Auto-reset timer | `speaking` → `idle` | 4 seconds after speaking |
| User starts voice input | `idle` → `listening` | Speech recognition starts |
| User stops voice input | `listening` → `idle` | Speech recognition stops |
| Validation error | Any → `warning` | Form validation fails |

## Implementation Details

### Auto-Reset (Feels Human)

After the copilot finishes speaking, it automatically returns to `idle` after 4 seconds:

```typescript
useEffect(() => {
  if (aiState === "speaking") {
    const timer = setTimeout(() => {
      setAiState("idle");
    }, 4000);
    return () => clearTimeout(timer);
  }
}, [aiState]);
```

### Typing Detection

When the user types, the state transitions to `listening` after a 500ms debounce:

```typescript
useEffect(() => {
  if (ingredients.trim() && !analyzing && !listening) {
    const timer = setTimeout(() => {
      if (ingredients.trim() && !analyzing) {
        setAiState("listening");
      }
    }, 500);
    return () => clearTimeout(timer);
  }
}, [ingredients, analyzing, listening]);
```

## Best Practices

1. **Always use the AIState type** - Never use string literals
2. **Update state in one place** - Centralize state transitions
3. **Handle edge cases** - Always reset to `idle` on errors
4. **Provide visual feedback** - Show status text for each state
5. **Keep transitions smooth** - Use debouncing for rapid state changes

