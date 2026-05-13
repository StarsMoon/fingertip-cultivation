/**
 * Entry point for fingertip-cultivation WeChat Mini Game.
 * Called by wx.onLaunch (or equivalent lifecycle).
 *
 * This file is the webpack entry — compiled to minigame/game.js.
 */

import { Game } from './game/Game';

function main(): void {
  const game = new Game();
  game.init();
}

// WeChat Mini Game entry — no DOMContentLoaded needed
main();
