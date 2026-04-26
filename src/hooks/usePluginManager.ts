/**
 * usePluginManager — manages the lifecycle of installed plugins.
 * Plugins are persisted in localStorage and registered with the tool registry.
 */

import { useState, useCallback } from 'react'
import {
  loadPlugin,
  uninstallPlugin,
  getInstalledPlugins,
} from '../lib/pluginLoader'
import type { InstalledPlugin } from '../types'

export interface PluginManagerState {
  /** List of installed plugins */
  plugins: InstalledPlugin[]
  /** Whether any plugin is currently being loaded */
  isLoading: boolean
  /** Error message from the last failed operation */
  error: string | null
}

export function usePluginManager() {
  const [state, setState] = useState<PluginManagerState>({
    plugins: getInstalledPlugins(),
    isLoading: false,
    error: null,
  })

  /**
   * Install a plugin from a manifest URL.
   */
  const install = useCallback(async (manifestUrl: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const installed = await loadPlugin(manifestUrl)
      setState({
        plugins: getInstalledPlugins(),
        isLoading: false,
        error: null,
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({
        plugins: getInstalledPlugins(),
        isLoading: false,
        error: message,
      })
      return false
    }
  }, [])

  /**
   * Uninstall a plugin by ID.
   */
  const remove = useCallback((id: string) => {
    uninstallPlugin(id)
    setState({
      plugins: getInstalledPlugins(),
      isLoading: false,
      error: null,
    })
  }, [])

  /**
   * Refresh the plugin list from localStorage.
   */
  const refresh = useCallback(() => {
    setState({
      plugins: getInstalledPlugins(),
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    state,
    install,
    remove,
    refresh,
  }
}
