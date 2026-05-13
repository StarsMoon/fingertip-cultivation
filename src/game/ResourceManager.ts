export interface ResourceGroup {
  readonly name: string;
  readonly images: ReadonlyArray<{ key: string; src: string }>;
  readonly audio: ReadonlyArray<{ key: string; src: string }>;
}

export class ResourceManager {
  private groups = new Map<string, ResourceGroup>();
  private loadedGroups = new Set<string>();
  private inFlightLoads = new Map<string, Promise<void>>();
  private images = new Map<string, WXImage>();
  private audio = new Map<string, InnerAudioContext>();
  private progressMap = new Map<string, number>();

  registerGroup(group: ResourceGroup): void {
    this.groups.set(group.name, group);
  }

  loadGroup(name: string): Promise<void> {
    const existing = this.inFlightLoads.get(name);
    if (existing) return existing;
    if (this.loadedGroups.has(name)) return Promise.resolve();

    const group = this.groups.get(name);
    if (!group) return Promise.reject(new Error(`Resource group "${name}" not registered`));

    const promise = this.doLoadGroup(group);
    this.inFlightLoads.set(name, promise);
    return promise;
  }

  getImage(key: string): WXImage | null {
    return this.images.get(key) ?? null;
  }

  getAudio(key: string): InnerAudioContext | null {
    return this.audio.get(key) ?? null;
  }

  isGroupLoaded(name: string): boolean {
    return this.loadedGroups.has(name);
  }

  releaseGroup(name: string): void {
    const group = this.groups.get(name);
    if (!group) return;

    for (const { key } of group.audio) {
      const ctx = this.audio.get(key);
      if (ctx) {
        ctx.destroy();
        this.audio.delete(key);
      }
    }
    for (const { key } of group.images) {
      this.images.delete(key);
    }

    this.loadedGroups.delete(name);
    this.inFlightLoads.delete(name);
    this.progressMap.delete(name);
  }

  getGroupProgress(name: string): number {
    return this.progressMap.get(name) ?? 0;
  }

  private async doLoadGroup(group: ResourceGroup): Promise<void> {
    const total = group.images.length + group.audio.length;
    if (total === 0) {
      this.loadedGroups.add(group.name);
      this.progressMap.set(group.name, 1);
      this.inFlightLoads.delete(group.name);
      return;
    }

    let completed = 0;
    const advance = (): void => {
      completed++;
      this.progressMap.set(group.name, completed / total);
    };

    const imagePromises = group.images.map(({ key, src }) =>
      this.loadImage(key, src).then(advance)
    );
    const audioPromises = group.audio.map(({ key, src }) =>
      this.loadAudioFile(key, src).then(advance)
    );

    await Promise.all([...imagePromises, ...audioPromises]);

    this.loadedGroups.add(group.name);
    this.inFlightLoads.delete(group.name);
  }

  private loadImage(key: string, src: string): Promise<void> {
    return new Promise((resolve) => {
      const img = wx.createImage();
      img.onload = () => {
        this.images.set(key, img);
        resolve();
      };
      img.onerror = () => {
        // Fallback: skip failed image, game can render without it
        resolve();
      };
      img.src = src;
    });
  }

  private loadAudioFile(key: string, src: string): Promise<void> {
    return new Promise((resolve) => {
      const ctx = wx.createInnerAudioContext();
      ctx.src = src;
      ctx.onCanplay(() => {
        this.audio.set(key, ctx);
        resolve();
      });
      ctx.onError(() => {
        // Silent gameplay is valid per GDD
        ctx.destroy();
        resolve();
      });
    });
  }
}
