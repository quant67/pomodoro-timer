# Pomodoro Timer

Pomodoro Timer 是一个 Obsidian 原生番茄钟插件，用于专注计时、任务管理和 Daily Note 记录。

## 功能

- Pomodoro、Short Break、Long Break 三种模式
- 默认时长：25 分钟、5 分钟、15 分钟
- 圆环倒计时、开始、暂停、继续、重置
- 每 4 个番茄进入长休息
- 今日番茄数和专注分钟统计
- Focus Tasks 添加、编辑、完成、移除、active 选择和过滤
- 声音提醒开关
- Obsidian 原生工作区视图
- Daily Note 自动创建、session 写入、`#pomodoro` Markdown task 同步

## 技术栈

- TypeScript
- esbuild
- Obsidian Plugin API
- Obsidian Vault API

## 开发

安装依赖：

```bash
npm install
```

开发监听构建：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

构建产物：

```text
main.js
styles.css
manifest.json
```

## 安装到 Obsidian

将插件安装到任意 Obsidian vault 的插件目录：

```text
<your-vault>/.obsidian/plugins/pomodoro-timer
```

使用软链接安装本仓库产物：

```bash
PLUGIN_DIR="<your-vault>/.obsidian/plugins/pomodoro-timer"
REPO_DIR="<path-to-this-repo>"

mkdir -p "$PLUGIN_DIR"
ln -sf "$REPO_DIR/manifest.json" "$PLUGIN_DIR/manifest.json"
ln -sf "$REPO_DIR/main.js" "$PLUGIN_DIR/main.js"
ln -sf "$REPO_DIR/styles.css" "$PLUGIN_DIR/styles.css"
```

Obsidian 中启用：

1. 打开目标 vault
2. Settings → Community plugins
3. Reload plugins
4. 启用 `Pomodoro Timer`
5. 点击左侧 clock 图标，或命令面板运行 `Open Pomodoro Timer`

## Daily Note 同步

插件读取 Obsidian Daily Notes 核心插件配置：

- Daily Note folder
- Date format
- Template

插件设置页提供备用配置：

- Daily note folder
- Date format
- Managed section heading
- Task sync tag，默认 `#pomodoro`

番茄完成后，当天 Daily Note 会写入受控区块：

```md
<!-- pomodoro-timer:start -->

## 🍅 Pomodoro Timer

**1** focus sessions · **25** minutes

### Sessions
- 🍅 **focus** 25m

<!-- pomodoro-timer:end -->
```

## Markdown Task 同步

在当天 Daily Note 或 vault 任意 Markdown 文件中添加：

```md
- [ ] 写一个番茄测试任务 #pomodoro
```

打开 `Pomodoro Timer` 后，任务会出现在 Focus Tasks 面板中。插件会给同步任务补充 block id：

```md
- [ ] 写一个番茄测试任务 #pomodoro ^pt-task-xxxxxx
```

在插件里勾选任务后，原始 Markdown 行会更新为：

```md
- [x] 写一个番茄测试任务 #pomodoro ^pt-task-xxxxxx
```

在插件里编辑任务文本，会更新原始 Markdown checkbox 行。移除来自笔记正文的任务时，插件会移除同步标签和 block id，并保留原始 checkbox 任务。

## 项目结构

```text
src/
  types.ts           插件共享类型
  utils.ts           时间格式、ID、声音提醒等工具
  obsidian/
    main.ts          插件入口
    view.ts          原生 Pomodoro Timer 工作区视图
    settings.ts      插件设置页
    storage.ts       plugin data 结构和迁移
    task-sync.ts     UI 任务和 Markdown task 同步
    daily-note-config.ts
                     Daily Notes 配置读取
    daily-note-writer.ts
                     番茄完成后写入 Daily Note
    sync/            Daily Note 区块、session 渲染、Markdown task 解析
```

## 数据保存

Obsidian plugin data：

- `settings`
- `appState`
- `syncDailyStats`

## 验证

```bash
npm run build
```
