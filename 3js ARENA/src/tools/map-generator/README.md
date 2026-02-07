# Map Generator — Dev Tool

Developer-only tool for generating arena environment images using the Gemini API.

## How to Use

1. Add your Gemini API key to `.env`:
   ```
   VITE_GEMINI_API_KEY=your_key_here
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Navigate to the Map Generator via the dev tools route in the app.

4. Choose a mode:
   - **Text Prompt**: Describe the arena environment you want
   - **Image + Prompt**: Upload a reference image and describe how to transform it
   - **Preset Template**: Pick from pre-built arena styles

5. Click **Generate** and wait for Gemini to create the image.

6. Preview the result in the 3D viewer — click and drag to look around.

7. If satisfied, enter a name and click **Save to Project**.

8. The image is saved to `public/assets/environments/` and a theme config is auto-generated.

## Batch Generation

Paste multiple prompts (one per line) in the batch textarea and click **Batch Generate**.
The tool will generate and save all images with a 3-second delay between API calls.

## API Limits

Gemini free tier allows ~500 image generations per day, which is more than enough for offline map production.

## Output

- Arena images: `public/assets/environments/{name}.jpg`
- Theme configs: Auto-extracted and displayed — copy into `src/arena/arenaThemes.ts`
