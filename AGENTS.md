# AGENTS.md — AI Agent 项目指南

> 本文档面向 AI 编程助手，提供项目上下文、编码规范和操作约束。
> 任何 Agent 在本项目中工作前，必须先阅读本文档。

---

## 1. 项目概览

- **项目名**: fingertip-cultivation（指尖修仙）
- **类型**: 微信小游戏 — 休闲 Roguelike 幸存者
- **一句话**: 单指拖拽走位，灵力自动攻击，升级选功法，两分钟一局越打越爽
- **平台**: 微信小游戏（Canvas 2D）
- **语言**: TypeScript（strict 模式）
- **包体目标**: < 4MB 首包
- **性能目标**: 60fps，同屏 200 敌人不卡

### 核心文档（按优先级阅读）

| 文档 | 内容 | 何时读 |
|---|---|---|
| `AGENTS.md`（本文件）| Agent 行为规范、编码约束、操作指令 | **每次会话开始必读** |
| `GDD.md` | 游戏设计全貌：玩法/系统/数值/美术/音频 | 需要理解设计意图时 |
| `DEV-PLAN.md` | 开发流程/里程碑/质量门禁/测试策略 | 需要知道当前阶段和任务上下文时 |

---

## 2. 行为原则

> 源自 Andrej Karpathy 对 LLM 编码陷阱的观察，适配本项目语境。这四条原则与后文的技术规范同样重要——违反原则的代码，即使类型正确、lint 通过，也是不合格的。

**权衡说明：** 这些原则偏向谨慎而非速度。对于琐碎任务（修一个拼写错误、一行明显改动），自行判断即可——不是每个改动都需要完整严谨流程。目标是减少非琐碎工作中的代价高昂错误，而非拖慢简单任务。

### 2.1 编码前思考

**不要假设。不要隐藏困惑。呈现权衡。**

LLM 经常默默选择一种解释然后执行。本原则强制明确推理：

- **明确说明假设** — 如果不确定，询问而不是猜测
- **呈现多种解释** — 当存在歧义时，不要默默选择
- **适时提出异议** — 如果存在更简单的方法，说出来
- **困惑时停下来** — 指出不清楚的地方并要求澄清

#### 本项目示例

**用户请求：** "给掌心雷加一个穿透效果"

❌ **默默假设，直接执行：**
```
// 假设穿透 = 子弹穿过敌人不消失
// 假设穿透数量 = 1
// 假设穿透只影响掌心雷
// 直接改 ThunderPalms.ts，加了穿透计数器
```

✅ **呈现权衡：**
```
"穿透效果"有两种理解：

1. **弹幕穿透**：雷光穿过敌人不消失，可连续命中
   - 影响：所有弹幕类功法可能都需要，建议做成通用修饰符(穿透符)
   - 与现有设计一致：GDD 中「穿透符」就是独立功法

2. **穿透伤害**：雷光命中后伤害穿透到后方敌人（AOE 效果）
   - 影响：更像 AOE 而非穿透，和火球术爆炸重叠

建议走方案 1，作为独立功法「穿透符」实现，而非硬编码进掌心雷。
这样御剑术、雷链等弹幕也能受益。
```

---

### 2.2 简洁优先

**用最少的代码解决问题。不要过度推测。**

对抗过度工程的倾向：

- 不要添加要求之外的功能
- 不要为一次性代码创建抽象
- 不要添加未要求的「灵活性」或「可配置性」
- 不要为不可能发生的场景做错误处理
- 如果 200 行代码可以写成 50 行，重写它

**检验标准：** 资深工程师会觉得这过于复杂吗？如果是，简化。

#### 本项目示例

**用户请求：** "实现御剑术，飞剑环绕玩家旋转"

❌ **过度工程：**
```typescript
// 为一种功法创建了完整的弹幕策略模式
interface OrbitalPattern {
  calculatePosition(angle: number, radius: number): Vec2;
  updateRadius(currentRadius: number, dt: number): number;
}

class CircularOrbit implements OrbitalPattern { /* ... */ }
class EllipticalOrbit implements OrbitalPattern { /* ... */ }
class SpiralOrbit implements OrbitalPattern { /* ... */ }

class OrbitalSkillSystem {
  constructor(
    private patternFactory: PatternFactory,
    private radiusAnimator: RadiusAnimator,
    private collisionResolver: CollisionResolver
  ) {}
  // ... 200 行，为 "4 把剑转圈" 写了一个框架
}
```

✅ **简洁实现：**
```typescript
// SwordOrbit.ts — 4 把剑转圈，就这么简单
class SwordOrbit implements Skill {
  private angle = 0;
  private swordCount = 2;  // Lv1: 2把, Lv2: 4把, Lv3: 6把
  private radius = 60;

  update(dt: number, ctx: CombatContext): void {
    this.angle += this.rotSpeed * dt;
    for (let i = 0; i < this.swordCount; i++) {
      const a = this.angle + (Math.PI * 2 / this.swordCount) * i;
      const sx = ctx.player.x + Math.cos(a) * this.radius;
      const sy = ctx.player.y + Math.sin(a) * this.radius;
      // 检测 sx,sy 处碰撞，造成伤害
    }
  }
}
```

**何时加复杂度：** 只有当真正需要椭圆轨道、螺旋轨道时再重构。需求来之前，YAGNI。

---

### 2.3 精准修改

**只碰必须碰的。只清理自己造成的混乱。**

编辑现有代码时：

- 不要「改进」相邻的代码、注释或格式
- 不要重构没坏的东西
- 匹配现有风格，即使你更倾向于不同的写法
- 如果注意到无关的死代码，提一下——不要删除它

当你的改动产生孤儿代码时：

- 删除因你的改动而变得无用的 import/变量/函数
- 不要删除预先存在的死代码，除非被要求

**检验标准：** 每一行修改都应该能直接追溯到用户的请求。

#### 本项目示例

**用户请求：** "修一下飞妖偶尔从屏幕中间闪现的 bug"

❌ **顺手重构：**
```diff
  class FlyingEnemy extends Enemy {
-   update(dt: number) {
-     this.x += this.vx * dt;
-     this.y += this.vy * dt;
+   update(dt: number): void {
+     // 边界检查：飞妖应在屏幕外生成
+     if (!this.hasEnteredScreen && this.isOffscreen()) {
+       this.alive = false;
+       return;
+     }
+     this.x += this.vx * dt;
+     this.y += this.vy * dt;
-     if (this.x < -100 || this.x > canvasWidth + 100) {
-       this.alive = false;
-     }
+     this.checkBounds();
    }
+
+   private checkBounds(): void {
+     const margin = 100;
+     if (this.x < -margin || this.x > canvasWidth + margin ||
+         this.y < -margin || this.y > canvasHeight + margin) {
+       this.alive = false;
+     }
+   }
  }
```
问题：加了返回类型注解、重构了边界检查、改了注释风格——都不是用户要求的。

✅ **精准修复：**
```diff
  class FlyingEnemy extends Enemy {
    update(dt: number) {
+     // 修复：飞妖未进入屏幕前不应被判定为出界
+     if (!this.hasEnteredScreen) {
+       if (this.isInsideViewport()) this.hasEnteredScreen = true;
+       return;  // 还没进屏幕，跳过出界检查
+     }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -100 || this.x > canvasWidth + 100) {
        this.alive = false;
      }
    }
```
只加了修复闪现 bug 所需的最小改动。

---

### 2.4 目标驱动执行

**定义成功标准。循环验证直到达成。**

将指令式任务转化为可验证的目标：

| 不要这样做 | 转化为 |
|---|---|
| "添加暴击" | "写暴击测试：20%概率→跑 1000 次验证分布，然后让测试通过" |
| "修碰撞穿模 bug" | "写测试重现穿模场景，修到测试通过" |
| "重构弹幕系统" | "确保重构前后所有弹幕测试都通过" |

多步骤任务，写简短计划：

```
1. [步骤] → 验证: [检查]
2. [步骤] → 验证: [检查]
3. [步骤] → 验证: [检查]
```

**强有力的成功标准**让 Agent 能够独立循环执行。**弱标准**（"让它工作"）需要不断澄清。

#### 本项目示例

**用户请求：** "加一个新的 Boss 蛇妖"

❌ **模糊执行：**
```
我来实现蛇妖 Boss：
1. 创建 Boss 代码
2. 添加到关卡
3. 测试一下
```

✅ **目标驱动：**
```
蛇妖 Boss 实现计划：

1. 在 data/enemies.ts 添加蛇妖配置
   → 验证: 配置类型正确，数值在 Boss 合理区间

2. 在 game/Boss.ts 创建 SnakeBoss 类（两阶段）
   → 验证: 单元测试通过（阶段切换逻辑 + 攻击模式）

3. 在 Spawner.ts 注册蛇妖在 60s 生成
   → 验证: 测试关卡到 60s 触发 Boss 生成

4. 微信开发者工具实机验证
   → 验证: Boss 出现 + 两阶段切换 + 击杀后关卡继续

每步完成后验证，不通过不进入下一步。
```

---

### 行为原则生效的标志

以下情况说明原则在起作用：

- **diff 中不必要的改动更少** — 只有请求的改动出现
- **因过度复杂而导致的重写更少** — 代码第一次就写得简洁
- **澄清问题在实现之前提出** — 而不是在犯错之后
- **干净、精简的 PR** — 没有顺手重构或「改进」

---

## 3. 技术栈 & 环境

### 运行时

| 组件 | 选型 | 注意事项 |
|---|---|---|
| 运行时 | 微信小游戏 Canvas 2D API | 无 DOM，不能用 `document.*`，用 `wx.createCanvas()` |
| 语言 | TypeScript 5.x → 编译为 ES2017 JS | strict: true, noUncheckedIndexedAccess |
| 模块 | ES Modules | 输出为 webpack bundle，不支持动态 import |
| 物理 | 无引擎，纯数学碰撞 | 圆-圆检测 + 空间哈希网格 |
| 构建 | webpack 5 | Tree-shaking 必须，控制包体 |
| 包管理 | npm | 锁定 `package-lock.json` |

### 本地开发命令

```bash
# 安装依赖
npm install

# 开发模式（编译 + watch，需配合微信开发者工具）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run typecheck

# Lint
npm run lint

# 运行单元测试
npm run test
```

> ⚠️ 微信小游戏无法在浏览器直接运行。开发时用 `npm run dev` 编译，然后在微信开发者工具中打开 `minigame/` 目录预览。

### 微信开发者工具注意事项

- 项目路径指向 `minigame/` 目录
- `minigame/game.js` 是入口，由 webpack 从 `src/main.ts` 编译输出
- `minigame/game.json` 是小游戏配置
- 调试：开发者工具的 Console + Network 面板，等同于 Chrome DevTools
- Canvas 用 `wx.createCanvas()` 创建，不要用 `document.createElement`

---

## 4. 项目结构

```
fingertip-cultivation/
├── src/
│   ├── main.ts              # 入口：初始化 Canvas + 启动 Game
│   ├── game/
│   │   ├── Game.ts           # 主循环 (requestAnimationFrame + 固定时间步长)
│   │   ├── Scene.ts          # 场景管理（主菜单/战斗/结算）
│   │   ├── Entity.ts         # 实体基类：position, velocity, radius, update(), render()
│   │   ├── Player.ts         # 玩家：移动 + 属性 + 受伤 + 死亡
│   │   ├── Enemy.ts          # 敌人基类 + 各子类型
│   │   ├── Projectile.ts     # 弹幕：轨迹 + 碰撞体 + 生命周期
│   │   ├── Pickup.ts         # 拾取物：经验珠
│   │   ├── Boss.ts           # Boss 基类
│   │   └── Spawner.ts        # 敌人生成器
│   ├── combat/
│   │   ├── SkillManager.ts   # 功法注册/查询/激活/进化
│   │   ├── Skills/           # 各功法实现（一个文件一个功法）
│   │   │   ├── ThunderPalms.ts   # 掌心雷（初始功法）
│   │   │   ├── SwordOrbit.ts     # 御剑术
│   │   │   ├── Fireball.ts       # 火球术
│   │   │   ├── IceSpike.ts       # 冰锥阵
│   │   │   └── ChainLightning.ts # 雷链
│   │   ├── DamageSystem.ts   # 伤害计算
│   │   └── UpgradePool.ts    # 升级选项池（三选一）
│   ├── data/
│   │   ├── skills.ts         # 功法配置表
│   │   ├── enemies.ts        # 敌人配置表
│   │   ├── levels.ts         # 关卡配置表
│   │   └── characters.ts     # 角色配置表
│   ├── progression/
│   │   ├── SaveData.ts       # 本地存储（wx.setStorageSync）
│   │   ├── UpgradeShop.ts    # 永久升级
│   │   └── Collection.ts     # 功法图鉴
│   ├── ui/
│   │   ├── HUD.ts            # 战斗 HUD
│   │   ├── UpgradeSelect.ts  # 功法三选一
│   │   ├── ResultScreen.ts   # 结算页
│   │   ├── MainMenu.ts       # 主菜单
│   │   └── Leaderboard.ts    # 排行榜
│   ├── render/
│   │   ├── Renderer.ts       # Canvas 渲染器
│   │   ├── ParticleSystem.ts # 粒子系统
│   │   └── Camera.ts         # 摄像机/视口
│   ├── audio/
│   │   └── AudioManager.ts   # 音效管理（wx.createInnerAudioContext）
│   └── utils/
│       ├── MathUtils.ts      # 向量运算、插值、随机
│       ├── ObjectPool.ts     # 通用对象池
│       └── Random.ts         # 可控种子随机数
├── assets/                   # 静态资源（构建时拷贝到 minigame/）
│   ├── sprites/
│   ├── audio/
│   └── data/
├── minigame/                 # 微信小游戏产物（gitignored，由构建生成）
│   ├── game.js
│   └── game.json
├── tests/                    # 单元测试
├── GDD.md                    # 游戏设计文档
├── DEV-PLAN.md               # 开发流程规划
├── AGENTS.md                 # 本文件
├── tsconfig.json
├── webpack.config.js
└── package.json
```

---

## 5. 编码规范

### TypeScript 规则

| 规则 | 说明 |
|---|---|
| `strict: true` | 零妥协，不允许隐式 any |
| `noUncheckedIndexedAccess` | 数组/对象索引访问必须处理 undefined |
| 禁止 `as any` | 需要类型断言时用 `as Unknown as T` 并注释原因 |
| 禁止 `@ts-ignore` / `@ts-expect-error` | 修复类型错误，不要压制 |
| 禁止空 catch | `catch (e) { /* 必须说明为什么忽略 */ }` |
| 优先 interface | 能用 interface 不用 type（性能 + 声明合并）|
| 枚举用 const | `const enum` 避免运行时开销 |
| 数字字面量不魔法 | 所有数值来自 `data/*.ts` 配置表 |

### 命名约定

| 类型 | 风格 | 示例 |
|---|---|---|
| 类 | PascalCase | `Player`, `SwordOrbit`, `DamageSystem` |
| 接口 | PascalCase + I 前缀（可选） | `IEntity`, `ISkillConfig` |
| 函数/方法 | camelCase | `takeDamage()`, `spawnEnemy()` |
| 常量 | UPPER_SNAKE | `MAX_PROJECTILES`, `DEFAULT_HP` |
| 配置数据字段 | camelCase | `baseDamage`, `attackSpeed`, `critRate` |
| 文件名 | PascalCase（类文件） | `Player.ts`, `SwordOrbit.ts` |
| 目录名 | kebab-case | `combat/`, `progression/` |

### 文件组织原则

1. **一个文件一个主类** — `Player.ts` 导出 `class Player`，辅助类型可同文件
2. **功法一个文件** — `Skills/SwordOrbit.ts` 包含该功法全部逻辑和进化
3. **数据与逻辑分离** — 数值写在 `data/*.ts`，逻辑在 `game/` / `combat/`
4. **跨模块通过事件** — 观察者模式，不直接 import 上层模块

### 依赖方向（严格单向）

```
main.ts
  └→ game/           (最底层，不依赖其他业务模块)
       └→ combat/    (依赖 game/)
       └→ render/    (依赖 game/)
       └→ audio/     (依赖 game/)
       └→ ui/        (依赖 game/ + combat/)
       └→ progression/ (依赖 game/ + data/)
  └→ data/           (纯数据，零依赖)
  └→ utils/          (纯工具，零依赖)
```

**禁止反向依赖**：`game/` 不能 import `combat/`，`combat/` 不能 import `ui/`。

---

## 6. 核心设计模式

### 5.1 游戏主循环 (Game Loop)

```typescript
// Game.ts — 固定时间步长，渲染与逻辑分离
class Game {
  private readonly FIXED_DT = 1 / 60;  // 60Hz 逻辑帧
  private accumulator = 0;

  loop(timestamp: number): void {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.accumulator += Math.min(dt, 0.1); // 防止螺旋死亡

    while (this.accumulator >= this.FIXED_DT) {
      this.update(this.FIXED_DT);    // 逻辑更新，固定步长
      this.accumulator -= this.FIXED_DT;
    }

    const alpha = this.accumulator / this.FIXED_DT;
    this.render(alpha);  // 渲染，可插值
  }
}
```

> Agent 实现时必须遵循固定时间步长模式，不要用可变 dt 做物理计算。

### 5.2 实体组件 (Entity Pattern)

```typescript
// Entity.ts — 所有游戏对象的基类
class Entity {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  radius: number;
  alive: boolean = true;

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    // 子类实现
  }
}
```

> 不用 ECS 框架（过度设计），用简单的继承 + 组合。子类通过组合 Skill/Behavior 对象扩展功能。

### 5.3 对象池 (Object Pool)

```typescript
// ObjectPool.ts — 弹幕/敌人/粒子全部池化
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }
}
```

> **所有频繁创建销毁的对象（弹幕、敌人、粒子、拾取物）必须使用对象池。** 直接 `new` + GC 会导致帧率抖动。

### 5.4 功法接口 (Skill Interface)

```typescript
// combat/SkillManager.ts 中定义
interface Skill {
  readonly id: string;
  readonly name: string;
  readonly category: 'projectile' | 'enhance' | 'utility';
  level: number;        // 1~4
  maxLevel: number;     // 通常为 4

  activate(player: Player): void;   // 获取功法时调用
  update(dt: number, ctx: CombatContext): void;  // 每帧逻辑
  render(ctx: CanvasRenderingContext2D, alpha: number): void;  // 每帧渲染
  evolve(): void;      // 进化到下一级
  getDescription(level: number): string;
}
```

> 新增功法时，创建 `combat/Skills/NewSkill.ts`，实现 `Skill` 接口，在 `data/skills.ts` 注册配置。

### 5.5 配置驱动 (Data-Driven)

所有数值在 `data/*.ts` 中定义，代码中不出现魔法数字：

```typescript
// data/skills.ts
export const SKILL_CONFIG = {
  thunderPalms: {
    id: 'thunder_palms',
    name: '掌心雷',
    baseDamage: 10,
    attackInterval: 0.8,    // 秒
    projectileSpeed: 400,   // 像素/秒
    levels: [
      { damage: 10, interval: 0.8 },
      { damage: 15, interval: 0.7, projectiles: 2 },
      { damage: 22, interval: 0.6, projectiles: 3 },
      { damage: 30, interval: 0.5, projectiles: 3, chain: 1 },
    ],
  },
  // ...
} as const;
```

> 修改数值只改 `data/*.ts`，不改逻辑代码。数值平衡是独立于逻辑的调优维度。

---

## 7. 关键约束（不可违反）

### 性能约束

| 约束 | 原因 | 检测方式 |
|---|---|---|
| 同屏弹幕上限 500 | 超过则跳过渲染只算伤害 | `Projectile.activeCount` |
| 同屏敌人上限 200 | 生成器拒绝生成 | `Spawner` 内置检查 |
| 粒子上限 300 | 超过则回收最早的 | `ParticleSystem` 自动回收 |
| 禁止每帧 `new` 高频对象 | GC 导致帧率抖动 | 代码审查 + 性能面板 |
| 碰撞必须用空间哈希 | O(n²) 在 200 敌人时必崩 | `SpatialHash` 类 |
| 离屏实体不渲染 | 视口外的不调用 render | `Camera.isInView()` |

### 平台约束

| 约束 | 说明 |
|---|---|
| 无 DOM API | 不能用 `document.*`，`window.*`（除 `requestAnimationFrame`）|
| 无 `fetch` | 用 `wx.request()` |
| 无 `localStorage` | 用 `wx.setStorageSync()` / `wx.getStorageSync()` |
| 音频用 `wx.createInnerAudioContext()` | 不用 `Audio` / `HTMLAudioElement` |
| Canvas 用 `wx.createCanvas()` | 不用 `document.createElement('canvas')` |
| 包体 < 4MB | webpack 必须配置 tree-shaking + 代码分割 |
| 不支持动态 import | 所有代码打包为单 bundle |
| 不支持 Web Worker | 计算全在主线程，必须优化 |

### 设计约束

| 约束 | 原因 |
|---|---|
| 单指操作 | 核心设计，不可增加操作复杂度 |
| 自动攻击 | 玩家只控制走位，攻击全自动 |
| 一局 60~120s | 不能拉长单局时长 |
| 静音可玩 | 核心信息必须有视觉反馈 |
| 无惩罚退出 | 随时可关，进度不丢失 |

---

## 8. 微信小游戏 API 速查

Agent 需要用到的微信 API（不要用 Web API 替代）：

| 功能 | Web API ❌ | 微信 API ✅ |
|---|---|---|
| 创建画布 | `document.createElement('canvas')` | `wx.createCanvas()` |
| 触摸事件 | `canvas.addEventListener('touchstart')` | `wx.onTouchStart(callback)` |
| 本地存储 | `localStorage.setItem()` | `wx.setStorageSync(key, data)` |
| 读取存储 | `localStorage.getItem()` | `wx.getStorageSync(key)` |
| 播放音效 | `new Audio()` | `wx.createInnerAudioContext()` |
| 网络请求 | `fetch()` | `wx.request()` |
| 登录 | — | `wx.login()` |
| 分享 | — | `wx.shareAppMessage()` |
| 振动反馈 | — | `wx.vibrateShort()` |
| 系统信息 | `navigator.userAgent` | `wx.getSystemInfoSync()` |
| 帧调度 | `requestAnimationFrame` | `requestAnimationFrame`（小游戏环境可用）|

---

## 9. 测试规范

### 单元测试

- 框架：Jest
- 位置：`tests/` 目录，镜像 `src/` 结构
- 命名：`Player.test.ts` 对应 `Player.ts`
- 必须测试的：
  - 数值公式（伤害/经验/生成）
  - 对象池 acquire/release 行为
  - 碰撞检测正确性
  - 功法进化逻辑
  - 升级选项池权重和去重

### 测试中 Mock 微信 API

```typescript
// tests/setup.ts — 全局 mock
global.wx = {
  createCanvas: vi.fn(() => mockCanvas),
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(),
  createInnerAudioContext: vi.fn(() => mockAudio),
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
  // ...
};
```

### 不需要测试的

- 渲染输出（视觉测试由人做）
- 微信 API 本身
- 纯数据配置表

---

## 10. Git 规范

### Commit 格式

```
<type>(<scope>): <subject>

type: feat | fix | perf | refactor | docs | test | chore | data
scope: combat | skill | ui | audio | render | data | platform | core

示例:
feat(combat): implement enemy spawner with time-curve generation
fix(skill): chain lightning not jumping to offscreen enemies
perf(render): add spatial hash for O(n) collision detection
data(skill): rebalance fireball base damage 15 → 12
refactor(core): extract entity update logic from Game.ts
```

### 分支规则

| 分支 | 用途 | 命名 |
|---|---|---|
| `main` | 生产分支，始终可发布 | — |
| `develop` | 开发集成分支 | — |
| 功能分支 | 新功能开发 | `feature/<scope>-<description>` |
| 修复分支 | Bug 修复 | `fix/<scope>-<description>` |
| 发版分支 | 版本发布准备 | `release/v<version>` |
| 热修复 | 生产紧急修复 | `hotfix/<description>` |

---

## 11. Agent 操作指南

### 开始工作前

1. 读 `AGENTS.md`（本文件）
2. 确认当前开发阶段（查 `DEV-PLAN.md`）
3. 确认任务涉及的设计意图（查 `GDD.md` 对应章节）
4. 检查现有代码，遵循已有模式

### 写代码时

1. **先看 `data/*.ts`** — 数值是否已定义？没定义先加配置
2. **先看已有实现** — 新功法参考 `ThunderPalms.ts`，新敌人参考 `Enemy.ts`
3. **检查依赖方向** — 确保没有反向依赖
4. **用对象池** — 高频创建对象必须 `ObjectPool`
5. **性能意识** — 每帧执行的代码避免分配，复用临时变量

### 新增功法的标准流程

1. 在 `data/skills.ts` 添加配置（含各级数值）
2. 在 `combat/Skills/` 创建实现文件，实现 `Skill` 接口
3. 在 `SkillManager.ts` 注册
4. 在 `UpgradePool.ts` 添加到选项池
5. 编写单元测试（进化逻辑 + 伤害计算）
6. 手动试玩验证（微信开发者工具）

### 新增敌人的标准流程

1. 在 `data/enemies.ts` 添加配置
2. 在 `Enemy.ts` 中添加子类型或创建新文件
3. 在 `Spawner.ts` 注册到生成规则
4. 编写单元测试（AI 行为 + 碰撞体）
5. 手动验证行为正确

### 完成工作后

1. `npm run typecheck` — 零类型错误
2. `npm run lint` — 零 lint 错误
3. `npm run test` — 测试通过
4. `npm run build` — 构建成功，包体未膨胀
5. 微信开发者工具中试玩验证（如涉及 gameplay）

---

## 12. 常见陷阱

| 陷阱 | 症状 | 正确做法 |
|---|---|---|
| 用 `document.createElement` | 构建通过，运行时崩溃 | 用 `wx.createCanvas()` |
| 每帧 new 弹幕 | 帧率逐渐下降 | 用 `ObjectPool.acquire/release` |
| O(n²) 碰撞检测 | 200 敌人时帧率暴跌 | 用 `SpatialHash` 空间哈希网格 |
| 魔法数字散落代码中 | 数值调优要翻遍代码 | 集中到 `data/*.ts` |
| 功法间状态耦合 | 拿功法A影响功法B的行为 | 功法间通过事件/CombatContext 通信，不直接引用 |
| 大精灵图未压缩 | 包体超 4MB | 使用 TexturePacker 打包，PNG 8-bit，按需加载 |
| 忘记池回收 | 对象池无限增长 | Entity 死亡时必须 `pool.release()` |
| 微信 API 回调地狱 | 代码可读性差 | 用 Promise 包装微信 API |

---

## 13. 性能调优 Checklist

当帧率低于 55fps 时，按以下顺序排查：

1. **对象池泄漏** — 检查 active 对象数是否持续增长
2. **GC 抖动** — 检查是否有每帧 new 的临时对象
3. **渲染过多** — 检查视口外实体是否仍在 render
4. **碰撞 O(n²)** — 确认用了 SpatialHash 而非双重循环
5. **粒子过多** — 粒子数是否超过上限
6. **Canvas 状态切换** — 减少 fillStyle/strokeStyle 切换次数
7. **离屏渲染缺失** — 静态 UI 是否每帧重绘

---

*文档版本: v2.0 | 日期: 2026-05-13*
