---
title: tmux 实用指南：会话、窗口与窗格
description: 从 server / session / window / pane 四层模型入手，把常用命令串成一条线——顺带纠正几个流传很广的错误快捷键，以及「窗口被压小」的根因和三种解法。
pubDate: 2026-08-14
category: 教程
tags: ['tmux', 'Linux', '教程']
---

在服务器上跑一个要两小时的任务，SSH 一断，任务跟着没了——这是 tmux 最经典的使用场景。

但把它只当成「防断线工具」有点浪费。tmux 真正的价值是**把终端从窗口里解耦出来**：进程活在服务端，你可以从任何地方接进去，也可以随时走开。理解了这一点，剩下的命令都是自然推论。

## 一、先建立心智模型

tmux 的所有概念是四层嵌套的，命令名基本都能对上其中一层：

```
tmux server（后台守护进程，全局一个）
└── session 会话        —— 一个工作上下文，比如「项目 A」
    └── window 窗口     —— 会话里的一个标签页
        └── pane 窗格   —— 窗口里切分出的一块区域
```

关键在于 **server 独立于你的终端存在**。你关掉终端模拟器、断开 SSH，server 和里面所有 session 照常运行。所谓「分离」（detach）不是关闭，只是**把客户端从 server 上拔下来**；「接入」（attach）则是重新插回去。

搞清楚这层关系，`detach` / `attach` / `kill-session` 的区别就不用记了：拔线、插线、真删。

## 二、前缀键：Ctrl+b

tmux 的所有快捷键都要先按**前缀键** `Ctrl+b`。

这里有个流传很广的写法错误：网上常写成 `Ctrl + b + d`，看着像三个键一起按。实际上是**两步**——先按住 Ctrl 再按 b，**松开**，然后单独按 d。写成 `Ctrl+b`，`d` 更准确。

（`Ctrl+b` 和 Emacs、readline 的「光标左移」冲突，很多人会改成 `Ctrl+a`。这属于个人配置，本文一律按默认写。）

## 三、会话管理

### 新建

默认新建的会话按 0、1、2 编号。数字不直观，**养成起名的习惯**：

```bash
tmux new -s myproject
```

想创建后不立刻进去（比如在启动脚本里预置几个会话），加 `-d`：

```bash
tmux new -s myproject -d
```

### 分离

在 tmux 里执行：

```bash
tmux detach
```

或者用快捷键 `Ctrl+b`，`d`。

执行后你会退回到普通终端，但**会话和里面的进程仍在后台运行**。这就是 tmux 最核心的那个能力。

### 查看

```bash
tmux ls
# 等价的完整写法
tmux list-sessions
```

输出形如 `myproject: 3 windows (created ...) (attached)`，末尾的 `attached` 表示当前有客户端连着它。

### 接入

```bash
tmux attach -t myproject    # 按名称
tmux attach -t 0            # 按编号
```

`attach` 可以简写成 `a`。一个常用的组合是「有就进、没有就建」：

```bash
tmux attach -t main || tmux new -s main
```

### 切换：`switch` 和 `attach` 的区别

```bash
tmux switch -t other-session
```

这两个命令的分工经常被搞混，其实规则很简单：

- **`attach`** —— 你**在 tmux 外面**，要连进去
- **`switch`**（完整名 `switch-client`）—— 你**已经在 tmux 里面**，要把当前客户端切到另一个会话

在 tmux 内部执行 `attach` 会报「sessions should be nested with care」，就是这个原因。

日常更顺手的是快捷键 `Ctrl+b`，`s`：弹出一个交互式的会话列表，方向键选、回车进，不用记名字。

### 重命名

```bash
tmux rename-session -t 0 myproject
```

快捷键 `Ctrl+b`，`$`。

### 杀死

```bash
tmux kill-session -t myproject   # 杀一个
tmux kill-server                 # 全部干掉，server 一起退
```

## 四、窗口（window）

窗口相当于会话里的标签页，各自独占整个屏幕。全部通过前缀键操作：

| 按键 | 作用 |
|---|---|
| `Ctrl+b`，`c` | 新建窗口（create） |
| `Ctrl+b`，`n` | 下一个窗口（next） |
| `Ctrl+b`，`p` | 上一个窗口（previous） |
| `Ctrl+b`，`0`~`9` | 跳到指定编号的窗口 |
| `Ctrl+b`，`w` | 列出所有窗口，交互式选择 |
| `Ctrl+b`，`,` | 重命名当前窗口 |
| `Ctrl+b`，`&` | 关闭当前窗口（会要求确认） |

窗口多了以后，`w` 比数字更实用——尤其是配合 `,` 给窗口起了名之后。

## 五、窗格（pane）

窗格是把一个窗口切成几块，同屏可见。这里要纠正一个常见错误：

| 按键 | 作用 |
|---|---|
| `Ctrl+b`，`"` | **上下**分屏 |
| `Ctrl+b`，`%` | **左右**分屏 |
| `Ctrl+b`，方向键 | 在窗格间移动 |
| `Ctrl+b`，`o` | 循环切换到下一个窗格 |
| `Ctrl+b`，`q` | 显示窗格编号，此时按数字直接跳过去 |
| `Ctrl+b`，`z` | **最大化/还原**当前窗格 |
| `Ctrl+b`，`x` | 关闭当前窗格（会要求确认） |
| `Ctrl+b`，`空格` | **切换预设布局**，不是分屏 |

有两点值得单独说：

**`Ctrl+b`，`空格` 不分屏。** 很多资料把它和 `%` 并列成「左右分屏」，实际上它执行的是 `next-layout`——在 even-horizontal、even-vertical、main-horizontal 等几套预设布局之间轮换。窗格切乱了之后按几下空格，往往能一键排整齐，但它不会新建窗格。

**`Ctrl+b`，`z` 值得专门记住。** 调试时把某个窗格临时全屏，看完再按一次还原，布局分毫不变。这是日常使用频率最高的窗格快捷键，却很少出现在入门教程里。

至于回滚查看历史输出：`Ctrl+b`，`[` 进入复制模式，用方向键 / PgUp 翻，`q` 退出。不进复制模式是滚不动的——这也是新手最容易卡住的地方。

## 六、窗口被压小怎么办

用久了一定会遇到：明明终端是全屏的，tmux 里的内容却只占左上角一小块，右侧和下方是大片空白。

**根因**：一个会话可以被多个客户端同时接入，而 tmux 默认要保证所有客户端看到的画面一致，于是**把窗口尺寸压到最小的那个客户端**。通常是你在别处（另一台机器、一个已经缩小的终端窗口）留了个没断开的连接。

三种解法，从治标到治本：

**1. 找出并踢掉那个小客户端**

```bash
tmux list-clients
# 输出里能看到每个 client 的名字和尺寸，找到明显偏小的那个
tmux detach-client -t /dev/pts/3
```

**2. 接入时直接把其他客户端踢掉**

```bash
tmux attach -d -t myproject
```

`-d` 的含义就是 detach others。日常单人使用，这是最省事的写法。

**3. 改配置，从根上不再受制于小客户端**

在 `~/.tmux.conf` 里加：

```bash
set -g window-size largest
```

改成按**最大**的客户端定尺寸（tmux 2.9+）。老版本可以用窗口选项 `aggressive-resize`：

```bash
setw -g aggressive-resize on
```

改完执行 `tmux source-file ~/.tmux.conf` 生效，不用重启 server。

代价是：如果真有两人同时看同一个会话，小屏那边会看不全。单人用没有任何副作用。

## 七、速查表

```bash
# 会话
tmux new -s <name>                 # 新建并进入
tmux new -s <name> -d              # 新建但不进入
tmux ls                            # 列出所有会话
tmux attach -t <name>              # 接入（tmux 外部）
tmux attach -d -t <name>           # 接入并踢掉其他客户端
tmux switch -t <name>              # 切换（tmux 内部）
tmux rename-session -t <old> <new> # 重命名
tmux kill-session -t <name>        # 杀死会话
tmux kill-server                   # 杀死全部

# 客户端
tmux list-clients                  # 查看接入的客户端及其尺寸
tmux detach-client -t <client>     # 踢掉指定客户端
```

快捷键一律以 `Ctrl+b` 开头：

| 层级 | 按键 |
|---|---|
| 会话 | `d` 分离 · `s` 列表选择 · `$` 重命名 |
| 窗口 | `c` 新建 · `n`/`p` 前后切换 · `0`~`9` 跳转 · `w` 列表 · `,` 重命名 · `&` 关闭 |
| 窗格 | `"` 上下分 · `%` 左右分 · 方向键移动 · `q` 编号跳转 · `z` 最大化 · `x` 关闭 · `空格` 换布局 |
| 其他 | `[` 进入复制模式翻历史 · `?` 查看全部快捷键 |

最后一个 `Ctrl+b`，`?` 其实是最该记住的：它列出当前所有生效的绑定，比任何速查表都准，`q` 退出。

## 小结

tmux 的命令看着零散，但都挂在同一棵树上：**server 托着 session，session 装着 window，window 切成 pane**。`attach` / `detach` 操作的是客户端到 server 的连接，`kill-session` 才是真删；窗口被压小是「多客户端共享一个会话」的必然结果，不是 bug。

把这三句话想明白，就不用背命令了。
