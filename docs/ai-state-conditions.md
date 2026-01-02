# AI State Conditions

This document explains when each AI state is triggered.

## State: `warning` ⚠️

The **warning** state is shown when there's an error or problem:

### Triggers:
1. **Empty Input**: User tries to analyze without entering ingredients
   - Message: "Please enter ingredients to analyze"
   - Auto-resets to `idle` after 3 seconds

2. **API Error**: The analyze API returns an error response
   - Message: "Something went wrong. Please try again."
   - Auto-resets to `idle` after 5 seconds

3. **Network Error**: Failed to connect to the API
   - Message: "Something went wrong. Please try again."
   - Auto-resets to `idle` after 5 seconds

4. **Microphone Permission Denied**: User denies microphone access
   - Shown in microphone error message area

### Visual:
- Red warning icon
- Red text color
- Pulsing animation
- Auto-resets after a few seconds

---

## State: `unsure` 🤔

The **unsure** state is shown when the AI is uncertain about its analysis.

### Triggers:
1. **Low Confidence**: Analysis confidence score < 0.7 (70%)
2. **High Uncertainty**: Response contains 3+ uncertainty keywords:
   - "uncertain", "unclear", "not sure", "might", "possibly", 
   - "perhaps", "maybe", "could be", "unknown", "hard to tell",
   - "difficult to determine", "not certain", "ambiguous"

### Detection Logic:
```typescript
// Count uncertainty keywords in response
const uncertaintyCount = uncertaintyKeywords.filter(
  keyword => text.includes(keyword)
).length;

// Calculate confidence (more keywords = lower confidence)
const confidence = Math.max(0, 1 - uncertaintyCount * 0.15);

// Show unsure if confidence < 0.7 OR 3+ uncertainty keywords
const isUncertain = confidence < 0.7 || uncertaintyCount >= 3;
```

### When It Happens:
- Ingredient list is incomplete or unclear
- Ingredients are ambiguous or hard to identify
- Product type is uncertain
- AI cannot confidently analyze the ingredients

### Visual:
- Yellow/orange text color
- Thinking/questioning emoji
- Pulsing animation
- Still speaks the response (but indicates uncertainty)

---

## State Flow Examples

### Example 1: Normal Analysis
```
User clicks Analyze → thinking → speaking → idle
```

### Example 2: Uncertain Analysis
```
User clicks Analyze → thinking → unsure → speaking → idle
```

### Example 3: Error
```
User clicks Analyze → thinking → warning → idle (after 5s)
```

### Example 4: Empty Input
```
User clicks Analyze → warning → idle (after 3s)
```

---

## Confidence Thresholds

- **High Confidence** (≥ 0.7): Normal `speaking` state
- **Low Confidence** (< 0.7): `unsure` state
- **Error**: `warning` state

---

## Auto-Reset Behavior

- **warning**: Auto-resets to `idle` after 3-5 seconds
- **unsure**: Returns to `idle` after audio finishes (same as `speaking`)
- **speaking**: Returns to `idle` when audio ends or after 10s fallback

