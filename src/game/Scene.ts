/**
 * Scene — base interface for all game scenes.
 * Scenes: MainMenu, Battle, UpgradeSelect (overlay), ResultScreen.
 */

export interface SceneParams {
  [key: string]: string | number | boolean;
}

export interface Scene {
  /** Called once when scene becomes active. */
  enter(params?: SceneParams): void;

  /** Called once when scene is deactivated. */
  exit(): void;

  /** Called every frame while active and NOT paused. dt = 1/60 fixed. */
  update(dt: number): void;

  /** Called every frame while active (even when paused). alpha ∈ [0,1]. */
  render(ctx: CanvasRenderingContext2D, alpha: number): void;

  /** Called when overlay pushed on top. Stop update, keep render. */
  pause(): void;

  /** Called when overlay popped. Resume update. */
  resume(): void;
}
