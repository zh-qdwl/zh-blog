---
title: 用 GVM 管理多版本 Go：安装、切换与那些坑
description: 从依赖环境到日常命令，把 GVM 讲清楚——包括 Go 1.5 之后的 bootstrap 链条为什么存在、-B 参数在什么时候能救命，以及哪些场景其实不该用它。
pubDate: 2026-08-14
category: 教程
tags: ['Go', 'GVM', '教程']
---

同时维护几个 Go 项目，迟早会撞上版本问题：老服务钉死在 1.12，新项目要用泛型，CI 上还跑着另一个版本。手动改 `GOROOT`、`PATH` 能用，但改错一次排查半天。

**GVM**（Go Version Manager）就是解决这件事的：一台机器上装多个 Go，一条命令切换。

先说清适用范围，免得白折腾：**GVM 只支持 Linux 和 macOS**。它本质是一组 Shell 脚本，靠改写当前 Shell 的环境变量工作，Windows 下需要在 WSL 里用。

## 一、准备依赖

GVM 需要从源码编译 Go（或者至少要拉 Git 仓库、解压归档），所以编译工具链得先备齐：

```bash
# Debian / Ubuntu
sudo apt-get install curl git mercurial make binutils bison gcc build-essential

# RedHat / CentOS
sudo yum install curl git make bison gcc glibc-devel

# macOS
xcode-select --install
brew update
brew install mercurial
```

`mercurial`（hg）是历史遗留：早年 Go 的代码托管在 Google Code 上用的是 Mercurial。现在基本用不到了，但 GVM 的脚本里仍有分支会调用它，装上省事。

## 二、安装 GVM

官方安装脚本：

```bash
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
```

如果你用的是 zsh，把开头的 `bash` 换成 `zsh` 即可——这决定了脚本往哪个配置文件里写初始化代码。

这条命令做三件事：检查依赖、把 GVM 拉到 `~/.gvm`、在 `~/.bashrc` 或 `~/.zshrc` 末尾追加一行：

```bash
[[ -s "$HOME/.gvm/scripts/gvm" ]] && source "$HOME/.gvm/scripts/gvm"
```

**这一行是 GVM 能工作的全部前提。** `gvm` 不是一个可执行文件，而是一个 Shell 函数——它必须能修改**当前 Shell 进程**的 `GOROOT`、`GOPATH` 和 `PATH`。如果它是个独立的二进制，改的就只是子进程的环境，退出即失效。

理解了这一点，后面两个常见问题就不用查了：

- **装完 `gvm` 命令不存在** —— 配置文件还没被重新读取。执行 `source ~/.bashrc` 或者重开一个终端。
- **CI / 脚本里 `gvm: command not found`** —— `.bashrc` 只在交互式 Shell 里加载，CI 的非交互 Shell 不会读它。在脚本开头显式 source：

  ```bash
  source "$HOME/.gvm/scripts/gvm"
  ```

  顺带一提，如果脚本开了 `set -u`，建议把 source 这行放在开启严格模式**之前**——GVM 的脚本会读到一些未定义变量，直接触发退出。

## 三、装第一个 Go 版本

这里有个绕不开的历史包袱，值得先讲明白。

Go 1.4 及以前，编译器是用 C 写的。**从 Go 1.5 开始，Go 的编译器改用 Go 自己实现**——于是产生了先有鸡还是先有蛋的问题：编译 Go 需要一个已经能用的 Go。这个「已经能用的 Go」就叫 **bootstrap 编译器**，通过环境变量 `GOROOT_BOOTSTRAP` 指定。

所以从源码装 1.5+ 的标准流程是：

```bash
# 先装 1.4，-B 表示只下载预编译的二进制包，不走源码编译
gvm install go1.4 -B
gvm use go1.4
export GOROOT_BOOTSTRAP=$GOROOT

# 再装目标版本
gvm install go1.12.8
```

注意 `go1.4` 那行必须带 `-B`。Go 1.4 依赖的是十来年前的 C 工具链，在今天的 GCC / Xcode 上源码编译大概率直接失败。

### 但更实用的做法是：全都用 `-B`

上面这套 bootstrap 流程只在你**需要从源码编译**时才有意义。日常开发不需要——直接装官方预编译包就行：

```bash
gvm install go1.21.5 -B
```

`-B` 跳过整个编译过程，几十秒装完，也不用管 bootstrap 链条。

而且这条链条本身在不断变化：Go 1.20 起把 bootstrap 要求从 Go 1.4 提高到了 Go 1.17.13，Go 1.22 又提到了 Go 1.20，之后每隔几个版本还会再抬一次。也就是说，**装新版本 Go 时用 go1.4 做 bootstrap 已经行不通了**，得先装一个足够新的中间版本。真要从源码编译，先去目标版本的 Release Notes 确认它要求的 bootstrap 版本。

`-B` 的唯一限制是官方得有对应平台的预编译包。比较容易踩的是 Apple Silicon：`darwin/arm64` 的官方二进制从 Go 1.16 才开始提供，更老的版本在 M 系列芯片上只能装 `darwin/amd64` 包靠 Rosetta 跑。

## 四、日常命令

| 命令 | 作用 |
|---|---|
| `gvm listall` | 列出所有可安装的版本 |
| `gvm install go1.21.5 -B` | 安装指定版本（`-B` = 用预编译二进制） |
| `gvm list` | 列出已安装的版本，当前版本前有 `=>` |
| `gvm use go1.21.5` | 切换版本，**仅对当前 Shell 生效** |
| `gvm use go1.21.5 --default` | 切换并设为默认，新开的终端也用它 |
| `gvm uninstall go1.21.5` | 卸载某个版本 |
| `gvm implode` | 删除 GVM 自身和所有已装的 Go |

两个容易混的点：

**`gvm use` 的作用域只有当前 Shell。** 开三个终端窗口，就是三份互相独立的环境——这其实是特性不是缺陷，你可以在 A 窗口用 1.12 跑老服务，B 窗口用 1.21 写新代码。要持久化就加 `--default`。

**`gvm listall` 的结果可能不全。** 它去拉 Go 官方仓库的 tag 列表，网络不通或本地缓存过期时会缺最新版本。可以先 `gvm install` 试试，很多时候 listall 里没有的版本照样装得上。

## 五、pkgset：GVM 的另一半

GVM 除了管 Go 版本，还能管 `GOPATH`，这部分叫 **pkgset**：

```bash
gvm pkgset create myproject
gvm pkgset use myproject
gvm pkgset list
```

每个 pkgset 是一个独立的 `GOPATH`，用来把不同项目的依赖隔开。这在 GOPATH 时代是刚需——那时候所有项目的依赖都堆在同一个 `$GOPATH/src` 下，版本冲突是家常便饭。

**Go Modules 出现之后，pkgset 基本没用了。** 依赖版本由 `go.mod` 精确锁定，模块缓存在 `GOMODCACHE` 里按版本号共存，本来就不会互相污染。

但 pkgset 有个副作用你得知道：**GVM 会接管 `GOPATH`**，把它指向 `~/.gvm/pkgsets/<版本>/global`。如果你原来习惯 `GOPATH=$HOME/go`，装完 GVM 会发现 `go install` 出来的命令行工具跑到别处去了。`echo $GOPATH` 确认一下，需要的话在 `.bashrc` 里 source GVM **之后**再显式覆盖回来。

## 六、什么时候不该用 GVM

GVM 是个 2013 年前后的项目，解决的是那个年代的问题。今天有几个场景，用别的方案更合适：

**如果你只是要给不同项目锁不同版本 ——Go 1.21 起官方内置了这个能力。** 在 `go.mod` 里写：

```
go 1.21
toolchain go1.22.5
```

`go` 命令会自动下载并使用对应的工具链，不需要任何第三方工具，团队成员和 CI 也自动对齐。这是现在的首选做法。

**如果你只是想临时试一个版本 ——官方的 `golang.org/dl` 更轻：**

```bash
go install golang.org/dl/go1.20.14@latest
go1.20.14 download
go1.20.14 version
```

装完得到一个 `go1.20.14` 命令，和主版本并存，互不干扰。

**如果你本来就在用 asdf / mise 管理多语言运行时**，直接加 Go 插件，没必要为 Go 单独引入一套工具。

**如果是 CI 或容器**，用官方镜像 `golang:1.21` 或者 `actions/setup-go`，比在构建环境里装 GVM 干净得多。

那 GVM 还剩什么场景？**需要在同一台开发机上快速切换很多个 Go 版本、并且要跑到 Go 1.21 之前的老版本**——比如维护一批历史项目，或者做跨版本的兼容性验证。这时 GVM 的 `gvm use` 依然是最顺手的。

## 小结

GVM 的核心就三件事：**靠 source 进 Shell 的函数改环境变量**、**`-B` 决定装二进制还是编译源码**、**`gvm use` 只影响当前 Shell**。这三点想明白了，剩下的命令查表就行。

至于用不用它——先问自己是不是真需要在一台机器上频繁横跳多个 Go 版本。如果只是想让每个项目用对版本，`go.mod` 里的 `toolchain` 一行就够了。
