# Tomato Clock

一个本地 Web 版番茄时钟，用于专注计时、任务管理和当日专注统计。应用运行在浏览器里，任务、统计和声音开关会保存到本地 `localStorage`。

## 功能

- Pomodoro、Short Break、Long Break 三种模式
- 默认时长：25 分钟、5 分钟、15 分钟
- Focus、Short Break、Long Break 时长可在界面里调整并保存
- 圆环倒计时进度、开始、暂停、继续、重置
- 番茄完成后自动进入休息阶段，每 4 个番茄进入长休息
- 专注任务添加、编辑、完成、移除、active 选择和过滤
- 今日番茄数、专注分钟、专注率、连续状态展示
- 声音提醒开关
- 桌面三栏布局和移动端堆叠布局

## 技术栈

- React 18
- TypeScript
- Vite
- CSS

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173/
```

构建生产版本：

```bash
npm run build
```

只构建 Web 版本：

```bash
npm run build:web
```

只构建 Obsidian 插件入口：

```bash
npm run build:plugin
```

预览生产构建：

```bash
npm run preview
```

## 项目结构

```text
src/
  App.tsx            应用主布局
  useTimer.ts        计时器状态和模式切换逻辑
  useTasks.ts        任务状态和本地保存
  useStats.ts        当日统计
  useSound.ts        声音开关
  TimerDisplay.tsx   倒计时展示
  ProgressRing.tsx   圆环进度
  TaskPanel.tsx      任务面板
  StatsPanel.tsx     统计面板
  Sidebar.tsx        左侧导航和声音控制
  obsidian/
    main.ts          Obsidian 插件入口
    view.ts          Tomato Clock 工作区视图
    settings.ts      插件设置页
    sync/            Daily Note 和 Markdown task 同步模块
```

## 数据保存

应用使用以下 `localStorage` key：

- `tomato-tasks`
- `tomato-active-task`
- `tomato-timer-config`
- `tomato-stats`
- `tomato-sound`

## Obsidian 集成计划

当前代码已经加入插件版基础设施：

- `manifest.json` 描述 Obsidian 插件元数据
- `main.js` 由 `npm run build:plugin` 生成
- `styles.css` 由 `src/index.css` + `src/App.css` + `src/obsidian/plugin.css` 拼接生成
- 插件注册 Ribbon 图标、命令、工作区视图和设置页
- Obsidian 工作区视图已挂载 React Timer UI（`<App />`）
- UI hooks 在插件内使用 Obsidian plugin data 保存任务、统计和声音开关
- 完成 focus Pomodoro 后会把当日累计 session 写入 Daily Note 的 Tomato Clock 管理区块
- 任务同步使用 `#pomodoro` 标签，读取 vault 中的 Markdown checkbox task
- 插件会给匹配任务补充 `^tc-task-*` block id，用于 UI 和 Markdown 行同步
- UI 新建的任务写入 Tomato Clock 管理区块
- UI 勾选、编辑来自笔记正文的任务时，会更新原始 Markdown checkbox 行
- UI 移除来自笔记正文的任务时，会移除同步标签和 block id，保留原始 checkbox 任务
- `src/obsidian/sync` 提供 Daily Note 区块更新、session 渲染、Markdown task 解析和 block id 更新

## Obsidian task 同步验证

在当天 Daily Note 中添加：

```md
- [ ] 写一个番茄测试任务 #pomodoro
```

执行命令面板里的 `Reload app without saving`，打开 `Tomato Clock`。任务会出现在 Focus Tasks 面板中，原始 Daily Note 行会自动补上 block id：

```md
- [ ] 写一个番茄测试任务 #pomodoro ^tc-task-xxxxxx
```

在 Tomato Clock 里勾选该任务后，Daily Note 原始行会更新为：

```md
- [x] 写一个番茄测试任务 #pomodoro ^tc-task-xxxxxx
```

## MVP 版本

`0.1.0` 是第一个 MVP 版本，范围包括：

- 本地 Web 番茄钟
- Obsidian 插件视图
- Daily Notes 配置读取和当天日记自动创建
- 番茄完成记录写入 Daily Note
- vault 内 `#pomodoro` Markdown task 同步
- 可配置番茄钟时长

## 验证

当前已通过：

```bash
npm run build
```
