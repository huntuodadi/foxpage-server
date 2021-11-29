import { createPluginLoader } from '@foxpage/foxpage-plugin';
import { join } from 'path';

import { config } from '../../app.config';

export class PluginService {
  private static _instance: PluginService;

  public plugins: any = null;

  constructor() {
    this.loadPlugins();
  }

  /**
   * Single instance
   * @returns PluginServices
   */
  public static getInstance(): PluginService {
    this._instance || (this._instance = new PluginService());
    return this._instance;
  }

  private loadPlugins(): void {
    const plugins = createPluginLoader({
      baseDir: join(process.cwd(), '../../'),
      plugins: config.plugins || [],
      api: {},
    });

    plugins.load();
    this.plugins = plugins.getHooks() || {};
  }
}
