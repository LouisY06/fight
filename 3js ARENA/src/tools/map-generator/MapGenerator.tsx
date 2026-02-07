// =============================================================================
// MapGenerator.tsx — Dev-only Map Generator UI page
// =============================================================================

import { useState, useCallback } from 'react';
import { ArenaPreview } from './ArenaPreview';
import {
  generateArenaFromPrompt,
  generateArenaFromImage,
} from './geminiClient';
import { PRESET_TEMPLATES, getPresetNames } from './promptTemplates';
import { extractThemeFromImage } from './themeExtractor';
import { slugify } from '../../utils/random';
import type { ArenaTheme } from '../../arena/arenaThemes';

type GeneratorMode = 'text' | 'image';

export function MapGenerator() {
  // State
  const [mode, setMode] = useState<GeneratorMode>('text');
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceMimeType, setReferenceMimeType] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [extractedTheme, setExtractedTheme] =
    useState<Partial<ArenaTheme> | null>(null);
  const [arenaName, setArenaName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMaps, setSavedMaps] = useState<string[]>([]);
  const [batchPrompts, setBatchPrompts] = useState('');
  const [batchProgress, setBatchProgress] = useState('');

  // Load saved maps on mount
  useState(() => {
    if (window.electronAPI) {
      window.electronAPI.listArenaImages().then(setSavedMaps);
    }
  });

  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset && PRESET_TEMPLATES[preset]) {
      setPrompt(PRESET_TEMPLATES[preset]);
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 without the data URL prefix
      const base64 = result.split(',')[1];
      setReferenceImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Generate arena image
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Enter a prompt or select a preset.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setExtractedTheme(null);

    try {
      let imageUrl: string;

      if (mode === 'image' && referenceImage) {
        imageUrl = await generateArenaFromImage(
          referenceImage,
          referenceMimeType,
          prompt
        );
      } else {
        imageUrl = await generateArenaFromPrompt(prompt);
      }

      setGeneratedImage(imageUrl);

      // Auto-extract theme
      const theme = await extractThemeFromImage(imageUrl);
      setExtractedTheme(theme);

      // Auto-suggest name from prompt
      if (!arenaName) {
        const words = prompt.split(' ').slice(0, 3).join(' ');
        setArenaName(slugify(words));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, mode, referenceImage, referenceMimeType, arenaName]);

  // Save generated image to project
  const handleSave = useCallback(async () => {
    if (!generatedImage || !arenaName.trim()) {
      setError('Generate an image and set a name first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const filename = `${slugify(arenaName)}.jpg`;
      // Extract base64 data from data URL
      const base64Data = generatedImage.split(',')[1];

      if (window.electronAPI) {
        // Electron: save via IPC
        const result = await window.electronAPI.saveArenaImage(
          filename,
          base64Data
        );
        if (!result.success) throw new Error(result.error);
      } else {
        // Browser fallback: download the file
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = filename;
        link.click();
      }

      setSavedMaps((prev) => [...prev, filename]);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }, [generatedImage, arenaName]);

  // Batch generate
  const handleBatchGenerate = useCallback(async () => {
    const prompts = batchPrompts
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (prompts.length === 0) return;

    setIsGenerating(true);
    setError(null);

    for (let i = 0; i < prompts.length; i++) {
      setBatchProgress(`Generating ${i + 1}/${prompts.length}...`);
      try {
        const imageUrl = await generateArenaFromPrompt(prompts[i]);
        const name = slugify(prompts[i].split(' ').slice(0, 3).join(' '));
        const filename = `${name}.jpg`;
        const base64Data = imageUrl.split(',')[1];

        if (window.electronAPI) {
          await window.electronAPI.saveArenaImage(filename, base64Data);
        }

        setSavedMaps((prev) => [...prev, filename]);

        // Rate limit: 3 second delay between calls
        if (i < prompts.length - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        setError(`Failed on prompt ${i + 1}: ${err}`);
      }
    }

    setBatchProgress('');
    setIsGenerating(false);
  }, [batchPrompts]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        color: '#ffffff',
        display: 'flex',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Left panel: Controls */}
      <div
        style={{
          width: '400px',
          minWidth: '400px',
          padding: '24px',
          borderRight: '1px solid #222',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ff4488',
            margin: 0,
            letterSpacing: '2px',
          }}
        >
          MAP GENERATOR
        </h1>
        <span style={{ color: '#666', fontSize: '12px', marginTop: '-12px' }}>
          Dev tool — not shipped to users
        </span>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <ModeButton
            active={mode === 'text'}
            onClick={() => setMode('text')}
          >
            Text Prompt
          </ModeButton>
          <ModeButton
            active={mode === 'image'}
            onClick={() => setMode('image')}
          >
            Image + Prompt
          </ModeButton>
        </div>

        {/* Prompt input */}
        <label style={{ fontSize: '12px', color: '#888' }}>
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Describe your arena environment..."
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </label>

        {/* Preset templates */}
        <label style={{ fontSize: '12px', color: '#888' }}>
          Or pick a preset
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '8px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
            }}
          >
            <option value="">-- Select preset --</option>
            {getPresetNames().map((name) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {/* Image upload (for image mode) */}
        {mode === 'image' && (
          <label style={{ fontSize: '12px', color: '#888' }}>
            Reference image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </label>
        )}

        {/* Generate buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <ActionButton
            onClick={handleGenerate}
            disabled={isGenerating}
            primary
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </ActionButton>
          {generatedImage && (
            <ActionButton
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              Regenerate
            </ActionButton>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: '#331111',
              border: '1px solid #662222',
              borderRadius: '6px',
              color: '#ff6666',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Save controls */}
        {generatedImage && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #222' }} />

            <label style={{ fontSize: '12px', color: '#888' }}>
              Arena name
              <input
                type="text"
                value={arenaName}
                onChange={(e) => setArenaName(e.target.value)}
                placeholder="e.g. volcanic-arena"
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '8px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </label>

            <ActionButton
              onClick={handleSave}
              disabled={isSaving}
              primary
            >
              {isSaving ? 'Saving...' : 'Save to Project'}
            </ActionButton>
          </>
        )}

        {/* Extracted theme preview */}
        {extractedTheme && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #222' }} />
            <h3
              style={{
                fontSize: '13px',
                color: '#888',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Auto-generated Theme
            </h3>
            <pre
              style={{
                background: '#111',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#aaa',
                overflow: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(extractedTheme, null, 2)}
            </pre>
          </>
        )}

        {/* Batch generation */}
        <hr style={{ border: 'none', borderTop: '1px solid #222' }} />
        <label style={{ fontSize: '12px', color: '#888' }}>
          Batch generate (one prompt per line)
          <textarea
            value={batchPrompts}
            onChange={(e) => setBatchPrompts(e.target.value)}
            rows={4}
            placeholder="Prompt 1&#10;Prompt 2&#10;Prompt 3"
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '10px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </label>
        <ActionButton
          onClick={handleBatchGenerate}
          disabled={isGenerating}
        >
          {batchProgress || 'Batch Generate'}
        </ActionButton>

        {/* Saved maps list */}
        {savedMaps.length > 0 && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #222' }} />
            <h3
              style={{
                fontSize: '13px',
                color: '#888',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Saved Maps
            </h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {savedMaps.map((name) => (
                <span
                  key={name}
                  style={{
                    padding: '4px 10px',
                    background: '#1a2a1a',
                    border: '1px solid #2a4a2a',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#66cc66',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right panel: 3D Preview */}
      <div style={{ flex: 1, padding: '24px' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #222',
          }}
        >
          {generatedImage ? (
            <ArenaPreview imageDataUrl={generatedImage} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#111',
                color: '#444',
                fontSize: '16px',
              }}
            >
              Generate an arena to preview it here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable styled buttons
// ---------------------------------------------------------------------------

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 'bold',
        color: active ? '#ffffff' : '#888',
        background: active ? '#333' : '#1a1a1a',
        border: `1px solid ${active ? '#555' : '#333'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#ffffff',
        background: primary
          ? 'linear-gradient(180deg, #ff2266, #cc0044)'
          : '#333',
        border: primary ? '1px solid #ff4488' : '1px solid #444',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}
