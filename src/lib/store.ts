// =============================================================================
// Global State Store - LLM Security CTF Platform
// =============================================================================
// Zustand is a lightweight state management library. Think of it like a global
// variable that all components can read from and write to, but with React
// integration so components re-render when state changes.
//
// We store:
// - LLM configuration (provider, API key, model)
// - F5 Guardrails configuration
// - Game progress (current level, score, attempts)
// - UI state (dark mode, sidebar open, etc.)
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  LLMConfig, 
  GuardrailsConfig, 
  UserProgress, 
  Attempt,
  CTF_LEVELS 
} from '@/types';

// -----------------------------------------------------------------------------
// Store Interface
// -----------------------------------------------------------------------------
// This defines all the state and actions available in our store

interface CTFStore {
  // ----- LLM Configuration -----
  llmConfig: LLMConfig;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  
  // ----- F5 Guardrails Configuration -----
  guardrailsConfig: GuardrailsConfig;
  setGuardrailsConfig: (config: Partial<GuardrailsConfig>) => void;
  
  // ----- Game State -----
  userProgress: UserProgress;
  setCurrentLevel: (level: number) => void;
  addAttempt: (attempt: Attempt) => void;
  completeLevel: (levelId: number, points: number) => void;
  resetProgress: () => void;
  
  // ----- UI State -----
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  
  // ----- Connection Status -----
  llmConnectionStatus: 'untested' | 'testing' | 'connected' | 'error';
  guardrailsConnectionStatus: 'untested' | 'testing' | 'connected' | 'error';
  setLLMConnectionStatus: (status: 'untested' | 'testing' | 'connected' | 'error') => void;
  setGuardrailsConnectionStatus: (status: 'untested' | 'testing' | 'connected' | 'error') => void;

  // ----- System Config (Admin-provided API keys) -----
  systemConfig: {
    enabled: boolean;
    defaultProvider: 'anthropic' | 'openai' | 'xai';
    anthropicKey?: string;
    openaiKey?: string;
    xaiKey?: string;
    guardrailsKey?: string;
    // These flags are returned for non-admin users (actual keys are hidden)
    hasAnthropicKey?: boolean;
    hasOpenaiKey?: boolean;
    hasXaiKey?: boolean;
    hasGuardrailsKey?: boolean;
  } | null;
  systemConfigLoaded: boolean;
  setSystemConfig: (config: CTFStore['systemConfig']) => void;
  fetchSystemConfig: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Default Values
// -----------------------------------------------------------------------------

const defaultLLMConfig: LLMConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 1024,
};

const defaultGuardrailsConfig: GuardrailsConfig = {
  enabled: false,
  apiKey: '',
  endpoint: '',
};

const defaultUserProgress: UserProgress = {
  visibleId: '',
  completedLevels: [],
  currentLevel: 1,
  totalScore: 0,
  attempts: [],
  startedAt: new Date(),
};

// -----------------------------------------------------------------------------
// Store Creation
// -----------------------------------------------------------------------------
// The persist middleware saves state to localStorage so it survives page refresh

export const useCTFStore = create<CTFStore>()(
  persist(
    (set, get) => ({
      // ----- LLM Configuration -----
      llmConfig: defaultLLMConfig,
      
      /**
       * Update LLM configuration
       * Uses Partial<LLMConfig> so you can update just one field
       * Example: setLLMConfig({ apiKey: 'sk-...' })
       */
      setLLMConfig: (config) => 
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...config },
          // Reset connection status when config changes
          llmConnectionStatus: 'untested',
        })),
      
      // ----- F5 Guardrails Configuration -----
      guardrailsConfig: defaultGuardrailsConfig,
      
      setGuardrailsConfig: (config) =>
        set((state) => ({
          guardrailsConfig: { ...state.guardrailsConfig, ...config },
          guardrailsConnectionStatus: 'untested',
        })),
      
      // ----- Game State -----
      userProgress: defaultUserProgress,
      
      /**
       * Change the current level the player is viewing/playing
       */
      setCurrentLevel: (level) =>
        set((state) => ({
          userProgress: { ...state.userProgress, currentLevel: level },
        })),
      
      /**
       * Record an attempt at the current level
       */
      addAttempt: (attempt) =>
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            attempts: [...state.userProgress.attempts, attempt],
          },
        })),
      
      /**
       * Mark a level as completed and add points
       */
      completeLevel: (levelId, points) =>
        set((state) => {
          // Don't add duplicate completions
          if (state.userProgress.completedLevels.includes(levelId)) {
            return state;
          }
          
          // Find the next level (if any)
          const nextLevel = Math.min(levelId + 1, CTF_LEVELS.length);
          
          return {
            userProgress: {
              ...state.userProgress,
              completedLevels: [...state.userProgress.completedLevels, levelId],
              totalScore: state.userProgress.totalScore + points,
              currentLevel: nextLevel,
            },
          };
        }),
      
      /**
       * Reset all game progress (start over)
       */
      resetProgress: () =>
        set({
          userProgress: {
            ...defaultUserProgress,
            startedAt: new Date(),
          },
        }),
      
      // ----- UI State -----
      isDarkMode: true,  // Default to dark mode (looks cooler for CTF!)
      
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      isSidebarOpen: true,
      
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      isSettingsOpen: false,
      
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      
      // ----- Connection Status -----
      llmConnectionStatus: 'untested',
      guardrailsConnectionStatus: 'untested',
      
      setLLMConnectionStatus: (status) => set({ llmConnectionStatus: status }),
      setGuardrailsConnectionStatus: (status) => set({ guardrailsConnectionStatus: status }),

      // ----- System Config -----
      systemConfig: null,
      systemConfigLoaded: false,
      setSystemConfig: (config) => set({ systemConfig: config }),
      fetchSystemConfig: async () => {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            set({
              systemConfig: {
                enabled: data.enabled || false,
                defaultProvider: data.defaultProvider || 'anthropic',
                // Actual keys (only returned to admins)
                anthropicKey: data.anthropicKey,
                openaiKey: data.openaiKey,
                xaiKey: data.xaiKey,
                guardrailsKey: data.guardrailsKey,
                // Boolean flags (returned to non-admin users)
                hasAnthropicKey: data.hasAnthropicKey,
                hasOpenaiKey: data.hasOpenaiKey,
                hasXaiKey: data.hasXaiKey,
                hasGuardrailsKey: data.hasGuardrailsKey,
              },
              systemConfigLoaded: true,
            });
          } else {
            set({ systemConfigLoaded: true });
          }
        } catch (error) {
          console.error('Failed to fetch system config:', error);
          set({ systemConfigLoaded: true });
        }
      },
    }),
    {
      // Configuration for the persist middleware
      name: 'llm-ctf-storage',  // Key in localStorage
      
      // Use sessionStorage instead of localStorage for API keys
      // This means keys are cleared when browser tab is closed (more secure)
      storage: createJSONStorage(() => sessionStorage),

      // Specify which fields to persist (not connection status, etc.)
      // Note: We intentionally persist API keys to sessionStorage
      // They're cleared when the tab closes
      partialize: (state) => ({
        llmConfig: state.llmConfig,
        guardrailsConfig: state.guardrailsConfig,
        userProgress: state.userProgress,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// Selector Hooks
// -----------------------------------------------------------------------------
// These helper hooks make it easier to grab specific pieces of state

/**
 * Get just the LLM config
 */
export const useLLMConfig = () => useCTFStore((state) => state.llmConfig);

/**
 * Get just the guardrails config
 */
export const useGuardrailsConfig = () => useCTFStore((state) => state.guardrailsConfig);

/**
 * Get the current level data
 */
export const useCurrentLevel = () => {
  const currentLevelId = useCTFStore((state) => state.userProgress.currentLevel);
  return CTF_LEVELS.find((level) => level.id === currentLevelId) || CTF_LEVELS[0];
};

/**
 * Check if a specific level is unlocked
 * A level is unlocked if:
 * - It's level 1 (always unlocked)
 * - The previous level has been completed
 * - For level 6: F5 Guardrails must be configured
 */
export const useIsLevelUnlocked = (levelId: number) => {
  const { completedLevels } = useCTFStore((state) => state.userProgress);
  const { enabled: guardrailsEnabled, apiKey: guardrailsKey } = useCTFStore(
    (state) => state.guardrailsConfig
  );
  
  // Level 1 is always unlocked
  if (levelId === 1) return true;
  
  // Level 6 requires guardrails to be configured
  if (levelId === 6 && (!guardrailsEnabled || !guardrailsKey)) return false;
  
  // Other levels require previous level to be completed
  return completedLevels.includes(levelId - 1);
};

/**
 * Check if the LLM is properly configured
 * Checks both user-provided keys and admin-provided system keys
 */
export const useIsLLMConfigured = () => {
  const { apiKey, provider } = useCTFStore((state) => state.llmConfig);
  const systemConfig = useCTFStore((state) => state.systemConfig);

  // Local LLM doesn't require an API key
  if (provider === 'local') return true;

  // Check if user has their own key
  if (apiKey.length > 0) return true;

  // Check for admin-provided system key from store
  if (systemConfig?.enabled) {
    // For admins, check actual keys
    let adminKey: string | undefined;
    if (systemConfig.defaultProvider === 'anthropic') {
      adminKey = systemConfig.anthropicKey;
    } else if (systemConfig.defaultProvider === 'openai') {
      adminKey = systemConfig.openaiKey;
    } else if (systemConfig.defaultProvider === 'xai') {
      adminKey = systemConfig.xaiKey;
    }
    if (adminKey && adminKey.length > 0) return true;

    // For non-admins, check the boolean flags (keys are hidden but we know they exist)
    let hasAdminKey: boolean | undefined;
    if (systemConfig.defaultProvider === 'anthropic') {
      hasAdminKey = systemConfig.hasAnthropicKey;
    } else if (systemConfig.defaultProvider === 'openai') {
      hasAdminKey = systemConfig.hasOpenaiKey;
    } else if (systemConfig.defaultProvider === 'xai') {
      hasAdminKey = systemConfig.hasXaiKey;
    }
    if (hasAdminKey) return true;
  }

  return false;
};

/**
 * Get the effective LLM config (user's config or admin system config)
 */
export const getEffectiveLLMConfig = () => {
  const store = useCTFStore.getState();
  const userConfig = store.llmConfig;
  const systemConfig = store.systemConfig;

  // If user has their own key, use it
  if (userConfig.apiKey.length > 0) {
    return userConfig;
  }

  // Check for admin-provided system key from store
  if (systemConfig?.enabled) {
    let adminKey: string | undefined;
    if (systemConfig.defaultProvider === 'anthropic') {
      adminKey = systemConfig.anthropicKey;
    } else if (systemConfig.defaultProvider === 'openai') {
      adminKey = systemConfig.openaiKey;
    } else if (systemConfig.defaultProvider === 'xai') {
      adminKey = systemConfig.xaiKey;
    }

    // For non-admin users, check the boolean flags (actual keys are hidden from them)
    const hasKey = adminKey && adminKey.length > 0 ||
      (systemConfig.defaultProvider === 'anthropic' && systemConfig.hasAnthropicKey) ||
      (systemConfig.defaultProvider === 'openai' && systemConfig.hasOpenaiKey) ||
      (systemConfig.defaultProvider === 'xai' && systemConfig.hasXaiKey);

    if (hasKey) {
      // Determine the default model for the provider
      let defaultModel: string;
      if (systemConfig.defaultProvider === 'anthropic') {
        defaultModel = 'claude-sonnet-4-20250514';
      } else if (systemConfig.defaultProvider === 'openai') {
        defaultModel = 'gpt-4o';
      } else if (systemConfig.defaultProvider === 'xai') {
        defaultModel = 'grok-3-fast';
      } else {
        defaultModel = userConfig.model;
      }

      return {
        ...userConfig,
        apiKey: adminKey || '', // Empty for non-admins, chat API will use server-side key
        provider: systemConfig.defaultProvider,
        model: defaultModel,
      };
    }
  }

  return userConfig;
};
