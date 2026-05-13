# AGENTS.md

## 1. 项目

- **名称**: fingertip-cultivation（指尖修仙）
- **类型**: 微信小游戏 Canvas 2D — 休闲 Roguelike 幸存者
- **语言**: TypeScript strict（`noUncheckedIndexedAccess`）
- **硬指标**: 60fps / 同屏 200 敌人 / 包体 < 4MB / 一局 60~120s

### 文档

| 文档 | 读的时机 |
|---|---|
| `GDD.md` | 需要理解设计意图 |
| `DEV-PLAN.md` | 需要知道当前阶段 |

---

## 2. 行为原则

### 编码前思考

不确定就问，不要猜。有歧义就列选项，不要默默选。有更简单方案就说出来。

### 简洁优先

不加要求外的功能。不为一次性代码建抽象。不加未要求的灵活性。200 行能写 50 行就重写。

### 精准修改

只碰必须碰的。不改进相邻代码/注释/格式。匹配现有风格。清理自己的孤儿代码，不动预先存在的死代码。每行修改必须能追溯到用户请求。

### 目标驱动

每个任务定义可验证的成功标准。多步骤任务写 `1. [步骤] → 验证: [检查]`。弱标准（"让它工作"）不够，要具体。

---

## 3. 技术约束

### 平台：微信小游戏，无 DOM

| 禁止 | 用这个 |
|---|---|
| `document.*` / `window.*` | `wx.*` API |
| `document.createElement('canvas')` | `wx.createCanvas()` |
| `canvas.addEventListener('touch*')` | `wx.onTouchStart/Move/End()` |
| `localStorage` | `wx.setStorageSync()` / `wx.getStorageSync()` |
| `new Audio()` | `wx.createInnerAudioContext()` |
| `fetch()` | `wx.request()` |
| 动态 import | 全量打包单 bundle |
| Web Worker | 主线程优化 |

### 性能

| 硬上限 | 手段 |
|---|---|
| 同屏弹幕 500 | 超出跳过渲染只算伤害 |
| 同屏敌人 200 | Spawner 拒绝生成 |
| 粒子 300 | 自动回收最早的 |
| 禁止每帧 new 高频对象 | `ObjectPool` 池化 |
| 碰撞 O(n) | `SpatialHash` 空间哈希，不用双重循环 |
| 离屏不渲染 | `Camera.isInView()` 过滤 |

### 设计红线

单指操作 / 自动攻击 / 一局 60~120s / 静音可玩 / 无惩罚退出

### 暂停 & 生命周期

- 暂停触发：双击屏幕 或 抬手 1.5s
- 暂停时 update 停止，render 继续（显示暂停 UI 遮罩）
- `wx.onHide()` 触发自动存档，`wx.onShow()` 恢复
- 退出时自动存档：当前等级/属性/灵石/永久升级进度

---

## 4. 编码规范

### TypeScript

- `strict: true`，禁止 `as any` / `@ts-ignore` / `@ts-expect-error`
- 禁止空 catch（必须注释为什么忽略）
- 优先 `interface`，枚举用 `const enum`
- 数值全部来自 `data/*.ts`，禁止魔法数字

### 命名

类 PascalCase · 函数 camelCase · 常量 UPPER_SNAKE · 文件 PascalCase · 目录 kebab-case

### 依赖方向（import 方向，禁止反向）

```
main ──imports──→ game/ (base layer)
combat/ ──imports──→ game/, data/
render/ ──imports──→ game/
audio/ ──imports──→ game/
ui/ ──imports──→ game/, combat/
progression/ ──imports──→ game/, data/
data/ (纯数据，零依赖)
utils/ (纯工具，零依赖)
```

`game/` 不 import `combat/`，`combat/` 不 import `ui/`。

---

## 5. 核心模式

### 游戏循环：固定时间步长

物理用固定 dt=1/60，渲染可插值。禁止可变 dt 做物理计算。

### 实体：简单继承+组合，不用 ECS

Entity 基类：position, velocity, radius, alive, update(dt), render(ctx, alpha)。子类通过组合 Skill 对象扩展。

### 对象池：弹幕/敌人/粒子/拾取物全部池化

acquire/release，禁止直接 new+GC。Entity 死亡必须 `pool.release()`。

### 功法接口

```typescript
interface CombatContext {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  spawner: Spawner;
}

interface Skill {
  readonly id: string;
  readonly name: string;
  readonly category: 'projectile' | 'enhance' | 'utility';
  level: number;       // 1~4 (v1.0 只实现 1~3)
  maxLevel: number;
  activate(player: Player): void;
  update(dt: number, ctx: CombatContext): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
  evolve(): void;
  getDescription(level: number): string;
}
```

新增功法：`data/skills.ts` 加配置 → `combat/Skills/` 实现 Skill → `SkillManager` 注册 → `UpgradePool` 加选项。

### 配置驱动

数值只在 `data/*.ts`，逻辑代码不写具体数字。改数值只改 data，不改逻辑。

```typescript
// data/skills.ts — 每个功法的配置结构
interface SkillConfig {
  id: string;
  name: string;
  category: 'projectile' | 'enhance' | 'utility';
  levels: SkillLevelConfig[];
}
interface SkillLevelConfig {
  damage: number;
  cooldown: number;    // 秒
  range: number;       // 像素
  [key: string]: number | string;  // 功法特有字段
}
```

---

## 6. 标准流程

### 新增功法

1. `data/skills.ts` 加配置（含各级数值）
2. `combat/Skills/` 创建实现，实现 Skill 接口
3. `SkillManager.ts` 注册
4. `UpgradePool.ts` 加到选项池
5. 单元测试（进化逻辑 + 伤害计算）

### 新增敌人

1. `data/enemies.ts` 加配置
2. `Enemy.ts` 加子类型或新文件
3. `Spawner.ts` 注册生成规则
4. 单元测试（AI 行为 + 碰撞体）

### 完成后验证

`npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`

---

## 7. 测试

- 框架：Jest，位置 `tests/`，镜像 `src/`
- 必测：数值公式 / 对象池 / 碰撞检测 / 功法进化 / 选项池权重去重
- Mock：`global.wx = { createCanvas, setStorageSync, ... }`
- 不测：渲染输出 / 微信 API / 纯配置表

---

## 8. Git

### Commit

`<type>(<scope>): <subject>`

type: feat | fix | perf | refactor | docs | test | chore | data
scope: combat | skill | ui | audio | render | data | platform | core

### 分支

main(生产) · develop(集成) · feature/ · fix/ · release/v · hotfix/

---

## 9. 常见陷阱

| 陷阱 | 做法 |
|---|---|
| 用 `document.createElement` | `wx.createCanvas()` |
| 每帧 new 弹幕 | `ObjectPool` |
| O(n²) 碰撞 | `SpatialHash` |
| 魔法数字 | 集中到 `data/*.ts` |
| 功法间直接引用 | 通过事件/CombatContext |
| 忘记池回收 | 死亡时必须 `pool.release()` |
| 微信回调地狱 | Promise 包装 |

### 帧率 < 55fps 排查顺序

对象池泄漏 → GC 抖动(每帧 new) → 视口外渲染 → 碰撞 O(n²) → 粒子过多 → Canvas 状态切换过多 → 静态 UI 未缓存

---

## 10. 开发命令

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（需配合微信开发者工具打开 minigame/）
npm run build      # 生产构建
npm run typecheck  # 类型检查
npm run lint       # Lint
npm run test       # 单元测试
```

微信开发者工具打开 `minigame/` 目录预览。入口：`minigame/game.js`（由 webpack 从 `src/main.ts` 编译）。
