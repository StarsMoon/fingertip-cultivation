/**
 * SaveData — all persistent data schemas and factory.
 * Stored via wx.setStorageSync / wx.getStorageSync.
 */

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'fingertip_cultivation_save';

export interface PermanentUpgrades {
  attackPower:  number; // 0~20
  maxHp:        number; // 0~20
  moveSpeed:    number; // 0~10
  spiritRange:  number; // 0~10
  expBonus:     number; // 0~10
  luck:         number; // 0~10
}

export interface SkillCollection {
  skillBestLevel: Record<string, number>;
  skillTimesAcquired: Record<string, number>;
  highestRealm: string;
}

export interface PlayerStatistics {
  totalGames: number;
  totalKills: number;
  totalPlayTime: number;    // seconds
  highestScore: number;
  highestLevel: number;
  bossKills: number;
  longestSurvival: number;  // seconds
}

export interface GameSettings {
  sfxVolume: number;         // 0~1, step 0.1
  bgmVolume: number;         // 0~1, step 0.1
  vibrationEnabled: boolean;
}

export interface BattleSnapshot {
  version: number;
  levelId: string;
  characterId: string;
  playerLevel: number;
  playerHp: number;
  playerMaxHp: number;
  playerX: number;
  playerY: number;
  elapsed: number;
  realm: string;
  kills: number;
  spiritStonesEarned: number;
  skills: ReadonlyArray<{ id: string; level: number }>;
  pendingUpgradeOptions: ReadonlyArray<string> | null;
  spawnerSeed: number;
  timestamp: number;
}

export interface SaveData {
  version: number;
  spiritStones: number;
  upgrades: PermanentUpgrades;
  unlockedCharacters: string[];
  selectedCharacter: string;
  collection: SkillCollection;
  stats: PlayerStatistics;
  settings: GameSettings;
  battleSnapshot: BattleSnapshot | null;
}

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    spiritStones: 0,
    upgrades: {
      attackPower: 0,
      maxHp: 0,
      moveSpeed: 0,
      spiritRange: 0,
      expBonus: 0,
      luck: 0,
    },
    unlockedCharacters: ['qingyun'],
    selectedCharacter: 'qingyun',
    collection: {
      skillBestLevel: {},
      skillTimesAcquired: {},
      highestRealm: '练气期',
    },
    stats: {
      totalGames: 0,
      totalKills: 0,
      totalPlayTime: 0,
      highestScore: 0,
      highestLevel: 0,
      bossKills: 0,
      longestSurvival: 0,
    },
    settings: {
      sfxVolume: 0.7,
      bgmVolume: 0.5,
      vibrationEnabled: true,
    },
    battleSnapshot: null,
  };
}
