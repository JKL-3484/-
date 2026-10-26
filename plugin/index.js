import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const API = "/api/drive-manager";
const HOME = os.homedir();
const LOCAL = path.join(HOME, "AppData", "Local");
const SYSTEM_LETTER = (process.env.SystemDrive || "C:").replace(/:$/, "").toUpperCase().charAt(0) || "C";
const SYS = process.env.SystemRoot || SYSTEM_LETTER + ":\\Windows";
const SYSTEM_DRIVE = SYSTEM_LETTER + ":\\";
const CACHE_TTL = 30_000;

const state = { data: null, at: 0, promise: null };

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(text)
  });
  res.end(text);
}

function fail(res, status, message) {
  sendJson(res, status, { ok: false, error: message });
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isWindows() {
  return process.platform === "win32";
}

function driveOf(value) {
  const match = /^([A-Za-z]):[\\/]/.exec(String(value || ""));
  return match ? match[1].toUpperCase() : "";
}

function expandEnv(value) {
  return String(value || "").replace(/%([^%]+)%/g, (_match, name) => process.env[name] || "");
}

async function lstatSafe(target) {
  try {
    return await fs.lstat(target);
  } catch {
    return null;
  }
}

async function dirSize(root, budgetMs = 2200) {
  const started = Date.now();
  let bytes = 0;
  let files = 0;
  let dirs = 0;
  let truncated = false;
  const stack = [root];

  while (stack.length > 0) {
    if (Date.now() - started > budgetMs) {
      truncated = true;
      break;
    }
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        dirs += 1;
        stack.push(child);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const stat = await fs.stat(child);
        bytes += stat.size;
        files += 1;
      } catch {
        // 权限不足或文件刚好被删除：跳过，不打断整次扫描。
      }
    }
  }

  return { bytes, files, dirs, truncated };
}

async function pathSize(target, budgetMs = 1800) {
  const stat = await lstatSafe(target);
  if (stat === null) return null;
  if (stat.isSymbolicLink()) return null;
  if (stat.isFile()) {
    return { bytes: stat.size, files: 1, dirs: 0, truncated: false };
  }
  if (!stat.isDirectory()) return null;
  return await dirSize(target, budgetMs);
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  const workers = [];
  const count = Math.min(limit, items.length);
  for (let index = 0; index < count; index += 1) workers.push(run());
  await Promise.all(workers);
  return output;
}

async function readJson(target) {
  try {
    return JSON.parse(await fs.readFile(target, "utf8"));
  } catch {
    return null;
  }
}

async function regQuery(key, value) {
  try {
    const { stdout } = await execFileAsync("reg.exe", ["query", key, "/v", value], {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8"
    });
    const line = String(stdout).split(/\r?\n/).find((row) => row.includes(value));
    if (!line) return "";
    const match = /REG_(?:EXPAND_)?SZ\s+(.*)$/.exec(line);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function downloadItem(input) {
  return {
    id: input.id,
    app: input.app,
    current: input.current || "",
    paths: Array.isArray(input.paths) ? input.paths : [],
    drive: driveOf(input.current || ""),
    exists: Boolean(input.exists),
    bytes: typeof input.bytes === "number" ? input.bytes : null,
    status: input.status || "unknown",
    statusText: input.statusText || "未检测到",
    advice: input.advice || "",
    howTo: input.howTo || ""
  };
}

function statusForDrive(target) {
  const drive = driveOf(target);
  if (!drive) return { status: "unknown", statusText: "路径未知" };
  if (drive === SYSTEM_LETTER) {
    return { status: "yellow", statusText: "在 " + drive + " 盘（系统盘）" };
  }
  return { status: "green", statusText: "在 " + drive + " 盘（数据盘）" };
}

function buildBucketSpecs(drives) {
  const list = [];
  const dataDrives = (drives || []).filter((drive) => !drive.isSystem);
  const homeLetter = driveOf(HOME) || SYSTEM_LETTER;
  const add = (spec) => list.push(spec);

  // 系统盘 / 用户目录：可清理
  add({
    id: "user-temp",
    name: "用户临时文件",
    path: path.join(LOCAL, "Temp"),
    color: "green",
    purpose: "程序运行时产生的临时文件，重启后大部分可以清理。",
    howTo: "设置 → 系统 → 存储 → 临时文件 → 勾选“临时文件” → 删除。正在使用的文件会自动跳过。",
    budget: 2200
  });
  add({
    id: "windows-temp",
    name: "Windows 临时文件",
    path: path.join(SYS, "Temp"),
    color: "green",
    purpose: "系统安装、更新和部分程序解压时产生的临时文件。",
    howTo: "磁盘清理 → 勾选“临时文件” → 确定；需要管理员权限。不要直接删整个 Temp 目录。",
    budget: 1400
  });
  add({
    id: "windows-update-cache",
    name: "Windows 更新下载缓存",
    path: path.join(SYS, "SoftwareDistribution", "Download"),
    color: "green",
    purpose: "已经下载过的 Windows 更新安装包，更新完成后一般不再需要。",
    howTo: "磁盘清理 → 勾选“Windows 更新清理” → 确定；清理后旧更新可能要重新下载。",
    budget: 1400
  });

  // 每块盘都可能有传递优化 / Windows 更新缓存
  for (const drive of drives || []) {
    add({
      id: "delivery-optimization-" + drive.letter,
      name: drive.letter + " 盘传递优化缓存",
      path: path.join(drive.root, "DeliveryOptimization"),
      color: "green",
      purpose: "Windows 更新“传递优化”的共享缓存，用来给局域网其他电脑分发更新。",
      howTo: "磁盘清理 → 勾选“传递优化文件” → 确定。不要手动删目录。",
      budget: 900
    });
    add({
      id: "wu-download-cache-" + drive.letter,
      name: drive.letter + " 盘 Windows 更新缓存",
      path: path.join(drive.root, "WUDownloadCache"),
      color: "green",
      purpose: "Windows Update 在 " + drive.letter + " 盘留下的下载缓存。",
      howTo: "磁盘清理 → 勾选“Windows 更新清理” → 确定。不要手动删目录。",
      budget: 900
    });
  }

  add({
    id: "recycle-bin",
    name: SYSTEM_LETTER + " 盘回收站",
    path: path.join(SYSTEM_DRIVE, "$Recycle.Bin"),
    color: "green",
    purpose: "已经删除但还占着空间的文件；清空回收站会清所有盘。",
    howTo: "右键桌面“回收站” → 清空回收站；先打开确认没有要恢复的文件。",
    skipSize: true,
    sizeNote: "清空后释放"
  });
  add({
    id: "windows-old",
    name: "旧 Windows 安装",
    path: path.join(SYS, "..", "Windows.old"),
    color: "green",
    purpose: "系统升级/重装后留下的旧系统文件，用来回退上一版本。",
    howTo: "磁盘清理 → 勾选“以前的 Windows 安装” → 确定。删除后不能回退旧版本。",
    budget: 1800,
    optional: true
  });
  add({
    id: "edge-cache",
    name: "Edge 网页缓存",
    path: path.join(LOCAL, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    color: "green",
    purpose: "网页图片、脚本的本地缓存，删掉只会让网页第一次打开稍慢。",
    howTo: "Edge 设置 → 隐私、搜索和服务 → 清除浏览数据 → 只勾“缓存的图像和文件” → 立即清除。不要勾密码和历史记录。",
    budget: 1800
  });
  add({
    id: "chrome-cache",
    name: "Chrome 网页缓存",
    path: path.join(LOCAL, "Google", "Chrome", "User Data", "Default", "Cache"),
    color: "green",
    purpose: "Chrome 的网页缓存，删掉不会影响书签和密码。",
    howTo: "Chrome 设置 → 隐私和安全 → 清除浏览数据 → 只勾“缓存的图像和文件” → 清除数据。",
    budget: 1800
  });
  add({
    id: "crash-dumps",
    name: "崩溃转储文件",
    path: path.join(LOCAL, "CrashDumps"),
    color: "green",
    purpose: "程序崩溃时生成的 .dmp 文件，通常只在排查蓝屏/崩溃时需要。",
    howTo: "确认不需要把崩溃文件发给技术支持后，直接删除目录里的 .dmp 文件。",
    budget: 900
  });
  add({
    id: "pip-cache",
    name: "pip 缓存",
    path: path.join(LOCAL, "pip", "cache"),
    color: "green",
    purpose: "Python 安装包下载缓存，删掉不影响已安装的包。",
    howTo: "命令提示符执行 `pip cache purge`；或删除本目录。下次装包会重新下载。",
    budget: 1400
  });
  add({
    id: "npm-cache",
    name: "npm 缓存",
    path: path.join(LOCAL, "npm-cache"),
    color: "green",
    purpose: "Node.js 包管理器缓存，删掉不影响已安装的项目依赖。",
    howTo: "命令提示符执行 `npm cache clean --force`；或删除本目录。",
    budget: 1400
  });

  // 用户主目录：黄色
  add({
    id: "documents-c",
    name: homeLetter + " 盘个人文档",
    path: path.join(HOME, "Documents"),
    color: "yellow",
    purpose: "你的文档、项目和部分软件数据；不是缓存，删了可能丢资料。",
    howTo: "先备份；确实要迁到数据盘时，用文件夹属性 → 位置 → 移动，不要剪切粘贴。",
    budget: 3200
  });
  add({
    id: "desktop-c",
    name: homeLetter + " 盘桌面",
    path: path.join(HOME, "Desktop"),
    color: "yellow",
    purpose: "桌面上的文件和快捷方式，默认属于用户数据。",
    howTo: "大文件先移到数据盘；不要直接删整个桌面目录。",
    budget: 1600
  });
  add({
    id: "pictures-c",
    name: homeLetter + " 盘图片",
    path: path.join(HOME, "Pictures"),
    color: "yellow",
    purpose: "个人图片和截图，属于用户数据。",
    howTo: "先备份；可用属性 → 位置迁移到数据盘，或把大图库移到数据盘。",
    budget: 1600
  });
  add({
    id: "videos-c",
    name: homeLetter + " 盘视频",
    path: path.join(HOME, "Videos"),
    color: "yellow",
    purpose: "个人视频文件，通常体积较大。",
    howTo: "先备份；把大视频移到数据盘，不要直接删目录。",
    budget: 1600
  });
  add({
    id: "onedrive-c",
    name: "OneDrive 同步盘",
    path: path.join(HOME, "OneDrive"),
    color: "yellow",
    purpose: "OneDrive 在本地的同步副本；删除本地文件会同步到云端。",
    howTo: "先在 OneDrive 设置里取消链接/选择“释放空间”，不要直接删目录。",
    budget: 3200,
    optional: true
  });
  add({
    id: "appdata-c",
    name: "AppData 用户数据",
    path: path.join(HOME, "AppData"),
    color: "yellow",
    purpose: "所有软件的配置、缓存和用户数据；整体删会让软件丢失设置。",
    howTo: "不要整体删。要看里面谁占空间，用 AppData Scanner 插件逐项判断。",
    budget: 6000
  });

  // 系统盘：红色
  add({
    id: "windows",
    name: "Windows 系统目录",
    path: SYS,
    color: "red",
    purpose: "操作系统本体、系统组件和 WinSxS 组件库。",
    howTo: "不要手动删任何东西。清理用磁盘清理；系统组件用 DISM；卸载功能用“启用或关闭 Windows 功能”。",
    skipSize: true,
    sizeNote: "系统目录，不统计"
  });
  add({
    id: "program-files",
    name: SYSTEM_LETTER + ":\\Program Files",
    path: path.join(SYSTEM_DRIVE, "Program Files"),
    color: "red",
    purpose: "系统级 64 位软件，安装时已经注册了绝对路径。",
    howTo: "不要删文件夹；卸载软件用“设置 → 应用 → 已安装的应用”。",
    budget: 2600
  });
  add({
    id: "program-files-x86",
    name: SYSTEM_LETTER + ":\\Program Files (x86)",
    path: path.join(SYSTEM_DRIVE, "Program Files (x86)"),
    color: "red",
    purpose: "系统级 32 位软件。",
    howTo: "不要删文件夹；卸载软件用“设置 → 应用”。",
    budget: 2600
  });
  add({
    id: "programdata",
    name: SYSTEM_LETTER + ":\\ProgramData",
    path: path.join(SYSTEM_DRIVE, "ProgramData"),
    color: "red",
    purpose: "程序共享的配置、缓存和授权数据。",
    howTo: "不要整体删；某个软件要清理，用该软件自己的设置或卸载器。",
    budget: 2600
  });
  add({
    id: "system-volume-c",
    name: SYSTEM_LETTER + " 盘系统还原点",
    path: path.join(SYSTEM_DRIVE, "System Volume Information"),
    color: "red",
    purpose: "系统还原点，用来把系统恢复到之前的状态。",
    howTo: "不要手动删；要调整去“系统属性 → 系统保护”，删除旧还原点或改配额。",
    skipSize: true,
    sizeNote: "受系统保护，不统计"
  });
  add({
    id: "pagefile",
    name: "虚拟内存 pagefile.sys",
    path: path.join(SYSTEM_DRIVE, "pagefile.sys"),
    color: "red",
    purpose: "Windows 的虚拟内存文件，系统和程序运行需要。",
    howTo: "不要删；可在“系统属性 → 高级 → 性能 → 虚拟内存”里调整大小或移到其他盘。",
    file: true
  });
  add({
    id: "hiberfil",
    name: "休眠文件 hiberfil.sys",
    path: path.join(SYSTEM_DRIVE, "hiberfil.sys"),
    color: "red",
    purpose: "休眠和快速启动使用的内存镜像文件，大小约等于内存容量。",
    howTo: "不要直接删；管理员命令 `powercfg /h off` 可关闭休眠并释放，但会失去休眠/快速启动。",
    file: true
  });
  add({
    id: "swapfile",
    name: "交换文件 swapfile.sys",
    path: path.join(SYSTEM_DRIVE, "swapfile.sys"),
    color: "red",
    purpose: "Windows 应用交换文件，系统管理。",
    howTo: "不要删，保持系统默认。",
    file: true
  });

  // 每块数据盘：通用目录
  for (const drive of dataDrives) {
    const L = drive.letter;
    add({
      id: "program-files-" + L,
      name: L + ":\\Program Files 已安装软件",
      path: path.join(drive.root, "Program Files"),
      color: "yellow",
      purpose: L + " 盘上的已安装软件；安装时已经注册了绝对路径。",
      howTo: "不要剪切文件夹，也不要改目录名；要换位置只能卸载后重装。",
      budget: 2200
    });
    add({
      id: "program-files-x86-" + L,
      name: L + ":\\Program Files (x86) 已安装软件",
      path: path.join(drive.root, "Program Files (x86)"),
      color: "yellow",
      purpose: L + " 盘上的 32 位已安装软件。",
      howTo: "不要剪切；要换位置只能卸载重装。",
      budget: 1800
    });
    add({
      id: "windowsapps-" + L,
      name: L + " 盘商店应用",
      path: path.join(drive.root, "WindowsApps"),
      color: "red",
      purpose: "微软商店应用安装到 " + L + " 盘后的本体目录。",
      howTo: "不要手动删；卸载应用用“设置 → 应用 → 已安装的应用”。",
      skipSize: true,
      sizeNote: "受系统保护，不统计"
    });
    add({
      id: "wpsystem-" + L,
      name: L + " 盘商店应用数据",
      path: path.join(drive.root, "WpSystem"),
      color: "red",
      purpose: "商店应用在 " + L + " 盘的系统数据，和 WindowsApps 配套。",
      howTo: "不要删；删了商店应用会异常。",
      skipSize: true,
      sizeNote: "受系统保护，不统计"
    });
    add({
      id: "system-volume-" + L,
      name: L + " 盘系统还原点",
      path: path.join(drive.root, "System Volume Information"),
      color: "red",
      purpose: L + " 盘的系统还原点/卷影副本数据。",
      howTo: "不要手动删；在“系统保护”里调整。",
      skipSize: true,
      sizeNote: "受系统保护，不统计"
    });
    add({
      id: "users-" + L,
      name: L + ":\\Users",
      path: path.join(drive.root, "Users"),
      color: "yellow",
      purpose: L + " 盘上的用户目录/用户数据。",
      howTo: "不要整体删；按用户和子目录确认用途，先备份。",
      budget: 2200
    });
    add({
      id: "documents-" + L,
      name: L + ":\\Documents",
      path: path.join(drive.root, "Documents"),
      color: "yellow",
      purpose: L + " 盘上的文档/项目目录。",
      howTo: "先确认用途，不要当缓存删；迁移前先备份。",
      budget: 1600
    });
    add({
      id: "downloads-" + L,
      name: L + ":\\Downloads",
      path: path.join(drive.root, "Downloads"),
      color: "yellow",
      purpose: L + " 盘上的下载目录。",
      howTo: "安装包可以整理/删除；资料先分类，不要整目录删。",
      budget: 1200
    });
    add({
      id: "games-" + L,
      name: L + ":\\Games",
      path: path.join(drive.root, "Games"),
      color: "yellow",
      purpose: L + " 盘上的游戏目录。",
      howTo: "用游戏平台（Steam/Epic/米哈游）自己的移动功能，不要剪切。",
      budget: 1400
    });
    add({
      id: "steam-library-" + L,
      name: L + ":\\SteamLibrary",
      path: path.join(drive.root, "SteamLibrary"),
      color: "yellow",
      purpose: L + " 盘上的 Steam 游戏库。",
      howTo: "用 Steam 设置 → 存储 → 移动游戏；不要手动剪切。",
      budget: 1400
    });
    add({
      id: "baidu-" + L,
      name: L + ":\\BaiduNetdiskDownload",
      path: path.join(drive.root, "BaiduNetdiskDownload"),
      color: "yellow",
      purpose: L + " 盘上的百度网盘下载目录。",
      howTo: "安装包可以删；资料先分类。要换位置去百度网盘设置里改。",
      budget: 1200
    });
    add({
      id: "lestore-" + L,
      name: L + ":\\LeStoreDownload",
      path: path.join(drive.root, "LeStoreDownload"),
      color: "yellow",
      purpose: L + " 盘上的联想应用商店下载目录。",
      howTo: "安装包可以删；要换位置去联想应用商店设置里改。",
      budget: 1000
    });
    add({
      id: "drivers-" + L,
      name: L + ":\\Drivers 驱动备份",
      path: path.join(drive.root, "Drivers"),
      color: "yellow",
      purpose: L + " 盘上的驱动备份文件，用来回滚或重装驱动。",
      howTo: "确认当前驱动稳定、不需要回滚后，可以整个移到备份盘；不要删正在用的驱动包。",
      budget: 1400
    });
  }

  return list;
}


async function buildBuckets(drives) {
  const specs = buildBucketSpecs(drives);
  const items = await mapLimit(specs, 4, async (spec) => {
    const stat = await lstatSafe(spec.path);
    if (stat === null) return null;
    if (spec.skipSize) {
      return {
        ...spec,
        exists: true,
        bytes: null,
        partial: false,
        files: null,
        sizeText: spec.sizeNote || "未统计"
      };
    }
    if (spec.file) {
      return {
        ...spec,
        exists: true,
        bytes: stat.isFile() ? stat.size : null,
        partial: false,
        files: 1,
        sizeText: ""
      };
    }
    const budget = spec.id === "appdata-c"
      ? 6000
      : spec.id === "documents-c" || spec.id === "onedrive-c"
        ? 3200
        : spec.id === "program-files" || spec.id === "program-files-x86" || spec.id === "programdata"
          ? 2600
          : spec.budget || 1800;
    const info = await pathSize(spec.path, budget);
    if (info === null) return null;
    return {
      ...spec,
      exists: true,
      bytes: info.bytes,
      partial: info.truncated,
      files: info.files,
      sizeText: ""
    };
  });
  return items.filter(Boolean);
}

const CUSTOM_KNOWN = new Set([
  "program files",
  "program files (x86)",
  "windowsapps",
  "wpsystem",
  "system volume information",
  "$recycle.bin",
  "deliveryoptimization",
  "wudownloadcache",
  "users",
  "documents",
  "downloads",
  "games",
  "steamlibrary",
  "baidunetdiskdownload",
  "lestoredownload",
  "drivers",
  "programdata",
  "recovery",
  "perflogs",
  "windows",
  "temp",
  "mapdata",
  "software"
]);

async function buildCustomBuckets(drives, existing) {
  const existingPaths = new Set((existing || []).map((item) => item.path.toLowerCase()));
  const out = [];
  for (const drive of (drives || []).filter((item) => !item.isSystem)) {
    let entries;
    try {
      entries = await fs.readdir(drive.root, { withFileTypes: true });
    } catch {
      continue;
    }
    const dirs = entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("$") && !entry.name.startsWith("."))
      .filter((entry) => !CUSTOM_KNOWN.has(entry.name.toLowerCase()))
      .slice(0, 6);
    for (const dir of dirs) {
      const full = path.join(drive.root, dir.name);
      if (existingPaths.has(full.toLowerCase())) continue;
      out.push({
        id: "custom-" + drive.letter + "-" + out.length,
        name: drive.letter + ":\\" + dir.name,
        path: full,
        color: "yellow",
        purpose: "数据盘上的自定义目录；插件没有内置它的用途，需要你自己确认。",
        howTo: "先打开看一眼是什么；不要当缓存删。需要迁移就复制到目标盘，确认新位置能用后再删原目录。",
        exists: true,
        bytes: null,
        partial: false,
        files: null,
        skipSize: true,
        sizeText: "未统计（自定义目录）"
      });
    }
  }
  return out;
}

function driveRecord(letter, volumeName, total, free) {
  const clean = String(letter || "").replace(":", "").toUpperCase();
  if (!/^[A-Z]$/.test(clean) || !Number.isFinite(total) || total <= 0) return null;
  const isSystem = clean === SYSTEM_LETTER;
  return {
    letter: clean,
    root: clean + ":\\",
    label: isSystem ? "系统盘" : "数据盘",
    volume: String(volumeName || ""),
    role: isSystem ? "system" : "data",
    isSystem,
    total,
    free,
    used: Math.max(0, total - free),
    freePct: (free / total) * 100,
    usedPct: ((total - free) / total) * 100
  };
}

async function getDrivesFromCim() {
  if (!isWindows()) return [];
  const command = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress";
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 1024 * 1024,
      encoding: "utf8"
    });
    const text = String(stdout || "").trim();
    if (text === "") return [];
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .map((item) => driveRecord(item.DeviceID, item.VolumeName, Number(item.Size), Number(item.FreeSpace)))
      .filter(Boolean)
      .sort((a, b) => a.letter.localeCompare(b.letter));
  } catch {
    return [];
  }
}

async function getDrivesFromStatfs() {
  const drives = [];
  for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
    const root = letter + ":\\";
    try {
      const stat = await fs.statfs(root);
      const total = stat.bsize * stat.blocks;
      const free = stat.bsize * (stat.bavail || stat.bfree);
      const record = driveRecord(letter, "", total, free);
      if (record) drives.push(record);
    } catch {
      // 盘符不存在或没有权限：跳过。
    }
  }
  return drives;
}

async function getDrives() {
  const fromCim = await getDrivesFromCim();
  if (fromCim.length > 0) return fromCim;
  return await getDrivesFromStatfs();
}

async function existingUnique(paths) {
  const out = [];
  const seen = new Set();
  for (const candidate of paths) {
    if (!candidate) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (await lstatSafe(candidate) !== null) out.push(candidate);
  }
  return out;
}

async function discoverDirs(drives, names, maxDepth = 3, budgetMs = 1500) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const skip = new Set([
    "windows",
    "program files",
    "program files (x86)",
    "windowsapps",
    "wpsystem",
    "system volume information",
    "$recycle.bin",
    "appdata",
    "local",
    "roaming",
    "packages",
    "node_modules",
    ".git"
  ]);
  const found = [];
  const seen = new Set();
  for (const drive of (drives || []).filter((item) => !item.isSystem)) {
    const started = Date.now();
    const queue = [{ dir: drive.root, depth: 0 }];
    let visited = 0;
    while (queue.length > 0 && Date.now() - started < budgetMs && visited < 220) {
      const current = queue.shift();
      let entries;
      try {
        entries = await fs.readdir(current.dir, { withFileTypes: true });
      } catch {
        continue;
      }
      visited += 1;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const full = path.join(current.dir, entry.name);
        const key = full.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        if (wanted.has(entry.name.toLowerCase())) {
          found.push(full);
          continue;
        }
        if (current.depth < maxDepth && !skip.has(entry.name.toLowerCase())) {
          queue.push({ dir: full, depth: current.depth + 1 });
        }
      }
    }
  }
  return found;
}

async function getDownloads(drives) {
  const items = [];
  const dataDrives = (drives || []).filter((item) => !item.isSystem);
  const dataLetters = dataDrives.map((item) => item.letter);
  const primaryData = dataLetters[0] || SYSTEM_LETTER;
  const sysRaw = await regQuery(
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders",
    "{374DE290-123F-4565-9164-39C4925E467B}"
  );
  const sysPath = expandEnv(sysRaw) || path.join(HOME, "Downloads");
  const sysStat = await lstatSafe(sysPath);
  const sysStatus = statusForDrive(sysPath);
  items.push(downloadItem({
    id: "system-downloads",
    app: "系统下载文件夹",
    current: sysPath,
    paths: [sysPath],
    exists: sysStat !== null,
    status: sysStatus.status,
    statusText: sysStatus.statusText,
    advice: sysStatus.status === "green"
      ? "系统层已经正确；浏览器和微信/QQ 还要各自设置。"
      : "建议用“下载”文件夹属性 → 位置 → 移动到 " + primaryData + ":\\Downloads。",
    howTo: "资源管理器右键“下载” → 属性 → 位置 → 移动 → 选 " + primaryData + ":\\Downloads → 确定并移动文件。不要剪切粘贴。"
  }));

  const edgePref = path.join(LOCAL, "Microsoft", "Edge", "User Data", "Default", "Preferences");
  const edge = await readJson(edgePref);
  if (edge !== null) {
    const dir = String(edge?.download?.default_directory || "");
    const prompt = edge?.download?.prompt_for_download === true;
    const current = dir || sysPath;
    const base = statusForDrive(current);
    items.push(downloadItem({
      id: "edge",
      app: "Edge 浏览器",
      current,
      paths: [current],
      exists: await lstatSafe(current) !== null,
      status: prompt ? "yellow" : base.status,
      statusText: prompt ? base.statusText + "，但每次询问" : base.statusText,
      advice: prompt
        ? "目录是对的，但“每次询问保存位置”开着，手滑就会存到系统盘/桌面；建议关掉。"
        : "下载目录设置正确。",
      howTo: "Edge 设置 → 下载 → 位置改为 " + primaryData + ":\\Downloads → 关闭“每次询问保存位置”。"
    }));
  }

  const chromePref = path.join(LOCAL, "Google", "Chrome", "User Data", "Default", "Preferences");
  const chrome = await readJson(chromePref);
  if (chrome !== null) {
    const dir = String(chrome?.download?.default_directory || "");
    const prompt = chrome?.download?.prompt_for_download === true;
    const current = dir || sysPath;
    const base = statusForDrive(current);
    items.push(downloadItem({
      id: "chrome",
      app: "Chrome 浏览器",
      current,
      paths: [current],
      exists: await lstatSafe(current) !== null,
      status: prompt ? "yellow" : base.status,
      statusText: (dir ? base.statusText : base.statusText + "（跟随系统）") + (prompt ? "，但每次询问" : ""),
      advice: dir
        ? (prompt ? "建议关掉“每次询问保存位置”。" : "下载目录设置正确。")
        : "没有单独设置，跟随系统下载文件夹；系统下载在数据盘就没问题。",
      howTo: "Chrome 设置 → 下载 → 位置改成 " + primaryData + ":\\Downloads → 关闭“下载前询问每个文件的保存位置”。"
    }));
  }

  const wechatCandidates = [
    path.join(HOME, "Documents", "WeChat Files"),
    path.join(HOME, "Documents", "xwechat_files")
  ];
  for (const drive of dataDrives) {
    wechatCandidates.push(path.join(drive.root, "WeChat Files"));
    wechatCandidates.push(path.join(drive.root, "Documents", "WeChat Files"));
    wechatCandidates.push(path.join(drive.root, "Users", path.basename(HOME), "Documents", "WeChat Files"));
  }
  const wechatFound = await existingUnique([
    ...wechatCandidates,
    ...(await discoverDirs(drives, ["weixindata", "wechat files", "xwechat_files"]))
  ]);
  if (wechatFound.length > 0) {
    const current = wechatFound[0];
    const onSystem = wechatFound.some((item) => driveOf(item) === SYSTEM_LETTER);
    items.push(downloadItem({
      id: "wechat",
      app: "微信",
      current,
      paths: wechatFound,
      exists: true,
      status: onSystem ? "yellow" : "green",
      statusText: onSystem ? "有目录在系统盘" : "在数据盘 " + driveOf(current) + " 盘",
      advice: onSystem
        ? "聊天文件还在系统盘；建议在微信设置里改到数据盘。"
        : "聊天文件在数据盘；换目录要用微信自己的迁移，不要剪切。",
      howTo: "微信 → 设置 → 文件管理 → 更改；先备份重要记录，等微信自己迁移完成再清旧目录。"
    }));
  } else {
    items.push(downloadItem({
      id: "wechat",
      app: "微信",
      current: "",
      status: "unknown",
      statusText: "未检测到文件目录",
      advice: "可能没装微信，或还没登录过。",
      howTo: "登录微信后到“设置 → 文件管理”查看和修改。"
    }));
  }

  const qqCandidates = [path.join(HOME, "Documents", "Tencent Files")];
  for (const drive of dataDrives) {
    qqCandidates.push(path.join(drive.root, "Tencent Files"));
    qqCandidates.push(path.join(drive.root, "Documents", "Tencent Files"));
    qqCandidates.push(path.join(drive.root, "Users", path.basename(HOME), "Documents", "Tencent Files"));
  }
  const qqFound = await existingUnique([
    ...qqCandidates,
    ...(await discoverDirs(drives, ["tencent files", "qq"]))
  ]);
  if (qqFound.length > 0) {
    const current = qqFound[0];
    const onSystem = qqFound.some((item) => driveOf(item) === SYSTEM_LETTER);
    items.push(downloadItem({
      id: "qq",
      app: "QQ",
      current,
      paths: qqFound,
      exists: true,
      status: onSystem ? "yellow" : "green",
      statusText: onSystem ? "有目录在系统盘" : "在数据盘 " + driveOf(current) + " 盘",
      advice: onSystem
        ? "QQ 文件还在系统盘，建议改到数据盘。"
        : "QQ 文件在数据盘；换目录用 QQ 自己的文件管理。",
      howTo: "QQ → 设置 → 基本设置 → 文件管理 → 更改目录；不要直接剪切 Tencent Files。"
    }));
  } else {
    items.push(downloadItem({
      id: "qq",
      app: "QQ",
      current: "",
      status: "unknown",
      statusText: "未检测到文件目录",
      advice: "可能没装 QQ，或还没登录过。",
      howTo: "登录 QQ 后到“设置 → 基本设置 → 文件管理”查看。"
    }));
  }

  const steamPath = expandEnv(await regQuery("HKCU\\Software\\Valve\\Steam", "SteamPath"));
  if (steamPath) {
    const libraries = [steamPath];
    const vdf = path.join(steamPath, "steamapps", "libraryfolders.vdf");
    try {
      const text = await fs.readFile(vdf, "utf8");
      const regex = /"path"\s+"([^"]+)"/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[1].replace(/\\\\/g, "\\");
        if (!libraries.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
          libraries.push(value);
        }
      }
    } catch {
      // 没有 libraryfolders.vdf 时只显示 Steam 安装目录。
    }
    const onSystem = libraries.some((entry) => driveOf(entry) === SYSTEM_LETTER);
    items.push(downloadItem({
      id: "steam",
      app: "Steam",
      current: libraries.join("；"),
      paths: libraries,
      exists: true,
      status: onSystem ? "yellow" : "green",
      statusText: onSystem ? "有库在系统盘" : "库在数据盘",
      advice: onSystem
        ? "系统盘还有 Steam 库；建议在 Steam 里把游戏移到数据盘库。"
        : "Steam 库已经在数据盘。",
      howTo: "Steam → 设置 → 存储 → 添加 " + primaryData + ":\\SteamLibrary → 选中游戏 → 移动。不要在资源管理器里剪切。"
    }));
  } else {
    items.push(downloadItem({
      id: "steam",
      app: "Steam",
      current: "",
      status: "unknown",
      statusText: "未检测到",
      advice: "没装 Steam 可以忽略；以后装的时候库文件夹直接选数据盘。",
      howTo: "Steam → 设置 → 存储 → 添加 " + primaryData + ":\\SteamLibrary。"
    }));
  }

  const baiduCandidates = [path.join(HOME, "Documents", "BaiduNetdiskDownload")];
  for (const drive of drives || []) {
    baiduCandidates.push(path.join(drive.root, "BaiduNetdiskDownload"));
  }
  const baiduFound = await existingUnique(baiduCandidates);
  if (baiduFound.length > 0) {
    const current = baiduFound[0];
    const onSystem = baiduFound.some((item) => driveOf(item) === SYSTEM_LETTER);
    items.push(downloadItem({
      id: "baidu",
      app: "百度网盘",
      current,
      paths: baiduFound,
      exists: true,
      status: onSystem ? "yellow" : "green",
      statusText: onSystem ? "在系统盘" : "在数据盘 " + driveOf(current) + " 盘",
      advice: onSystem ? "建议改到数据盘。" : "下载目录在数据盘。",
      howTo: "百度网盘 → 设置 → 传输 → 下载目录 → 改成 " + primaryData + ":\\BaiduNetdiskDownload。"
    }));
  }

  const leStoreFound = [];
  for (const drive of drives || []) {
    const candidate = path.join(drive.root, "LeStoreDownload");
    if (await lstatSafe(candidate) !== null) leStoreFound.push(candidate);
  }
  if (leStoreFound.length > 0) {
    const current = leStoreFound[0];
    const onSystem = leStoreFound.some((item) => driveOf(item) === SYSTEM_LETTER);
    items.push(downloadItem({
      id: "lestore",
      app: "联想应用商店",
      current,
      paths: leStoreFound,
      exists: true,
      status: onSystem ? "yellow" : "green",
      statusText: onSystem ? "在系统盘" : "在数据盘 " + driveOf(current) + " 盘",
      advice: onSystem ? "建议改到数据盘。" : "下载目录在数据盘。",
      howTo: "联想应用商店 → 设置 → 下载目录，可保持或改到 " + primaryData + ":\\Downloads。"
    }));
  }

  const otherCandidates = [path.join(HOME, "Downloads")];
  for (const drive of drives || []) {
    otherCandidates.push(path.join(drive.root, "Downloads"));
  }
  const otherFound = await existingUnique([
    ...otherCandidates,
    ...(await discoverDirs(drives, ["下载", "软件安装包备份", "installers"], 2, 1000))
  ]);
  const used = new Set(items.flatMap((item) => item.paths || []).map((item) => item.toLowerCase()));
  const otherFiltered = otherFound.filter((item) => !used.has(item.toLowerCase()));
  if (otherFiltered.length > 0) {
    items.push(downloadItem({
      id: "other-downloads",
      app: "其他下载/安装包",
      current: otherFiltered[0],
      paths: otherFiltered,
      exists: true,
      status: "yellow",
      statusText: "可整理",
      advice: "安装包装完可以删；PDF/资料先分类，别和安装包混在一起。",
      howTo: "打开目录，把 .exe/.msi/.zip 安装包移到 " + primaryData + ":\\Downloads\\Installers，资料单独归档。"
    }));
  }

  await mapLimit(items, 3, async (item) => {
    if (!item.exists || !item.current) return;
    const targets = item.paths.length > 0 ? item.paths : [item.current];
    let bytes = 0;
    let measured = false;
    for (const target of targets.slice(0, 3)) {
      const info = await pathSize(target, 1100);
      if (info !== null) {
        bytes += info.bytes;
        measured = true;
      }
    }
    if (measured) item.bytes = bytes;
  });

  return items;
}


function buildRoles(drives, downloads) {
  const system = drives.find((drive) => drive.isSystem) || drives[0] || null;
  const dataDrives = drives.filter((drive) => !drive.isSystem);
  const sys = downloads.find((item) => item.id === "system-downloads");
  const edge = downloads.find((item) => item.id === "edge");
  const wechat = downloads.find((item) => item.id === "wechat");
  const qq = downloads.find((item) => item.id === "qq");
  const systemFreePct = system ? system.freePct : 0;
  const systemLetter = system ? system.letter : SYSTEM_LETTER;

  const checks = [
    {
      ok: Boolean(system && systemFreePct >= 15),
      label: system ? systemLetter + " 盘剩余 " + systemFreePct.toFixed(1) + "%" : "没有检测到系统盘",
      detail: system && systemFreePct < 15
        ? "低于 15%，先清绿色项，再考虑迁移。"
        : "空间不紧张，不需要为了“分盘”冒险搬系统目录。"
    },
    {
      ok: Boolean(sys && sys.status === "green"),
      label: "系统下载文件夹在数据盘",
      detail: sys ? sys.advice : "没有读到系统下载路径。"
    },
    {
      ok: Boolean(edge && edge.status === "green"),
      label: "Edge 下载目录设置正确",
      detail: edge ? edge.advice : "没有读到 Edge 配置。"
    },
    {
      ok: Boolean(wechat && wechat.status === "green"),
      label: "微信文件在数据盘",
      detail: wechat ? wechat.advice : "没有检测到微信。"
    },
    {
      ok: Boolean(qq && qq.status === "green"),
      label: "QQ 文件在数据盘",
      detail: qq ? qq.advice : "没有检测到 QQ。"
    },
    {
      ok: dataDrives.length > 0,
      label: dataDrives.length > 0 ? "检测到 " + dataDrives.length + " 块数据盘" : "没有检测到数据盘",
      detail: dataDrives.length > 0
        ? dataDrives.map((drive) => drive.letter + " 盘剩余 " + drive.freePct.toFixed(1) + "%").join("；")
        : "只有系统盘时，建议加一块数据盘再做分工。"
    }
  ];

  let verdict = !system
    ? "没有检测到可用的本地磁盘。"
    : dataDrives.length > 0
      ? "分工基本正确：系统盘 " + systemLetter + "，数据盘 " + dataDrives.map((drive) => drive.letter).join("/") + "。"
      : "只检测到系统盘 " + systemLetter + "；建议加一块数据盘，再把下载/大软件/项目文件放过去。";
  if (system && systemFreePct < 15) {
    verdict = systemLetter + " 盘剩余空间偏低，先清绿色项；不要急着搬系统目录。";
  } else if (sys && sys.status !== "green") {
    verdict = "下载文件夹还在系统盘，把它改到数据盘是最省力的分工。";
  } else if (wechat?.status === "yellow" || qq?.status === "yellow") {
    verdict = "聊天文件还在系统盘，建议用微信/QQ 自己的文件管理迁到数据盘。";
  }

  return {
    system: system ? {
      letter: systemLetter,
      label: system.label,
      volume: system.volume,
      total: system.total,
      free: system.free,
      used: system.used,
      freePct: system.freePct,
      should: "Windows、驱动、运行库、必须装系统盘的小工具",
      shouldNot: "个人文档、聊天记录、游戏、大软件安装包"
    } : null,
    data: dataDrives.map((drive) => ({
      letter: drive.letter,
      label: drive.label,
      volume: drive.volume,
      total: drive.total,
      free: drive.free,
      used: drive.used,
      freePct: drive.freePct,
      should: "个人数据、下载、大软件、游戏、项目文件",
      shouldNot: "WindowsApps、WpSystem、System Volume Information 等系统目录"
    })),
    checks,
    verdict
  };
}


function buildPlan(drives, downloads, buckets) {
  const system = drives.find((drive) => drive.isSystem) || drives[0] || null;
  const dataDrives = drives.filter((drive) => !drive.isSystem);
  const primaryData = dataDrives[0]?.letter || system?.letter || SYSTEM_LETTER;
  const dataRoot = primaryData + ":\\";
  const systemLetter = system ? system.letter : SYSTEM_LETTER;
  const steps = [];
  const sys = downloads.find((item) => item.id === "system-downloads");
  const edge = downloads.find((item) => item.id === "edge");
  const wechat = downloads.find((item) => item.id === "wechat");
  const qq = downloads.find((item) => item.id === "qq");
  const steam = downloads.find((item) => item.id === "steam");

  if (dataDrives.length === 0) {
    steps.push({
      id: "add-data-drive",
      title: "建议加一块数据盘（D/E/F…）",
      why: "现在只检测到系统盘。把下载、大软件、项目文件放到独立数据盘，系统盘会稳很多。",
      steps: [
        "给电脑加装一块硬盘，或在磁盘管理里从现有空间分出一个新分区。",
        "把下载、大软件、游戏、项目文件放到新盘。",
        "本插件会自动识别新盘，不需要改配置。"
      ],
      risk: "info",
      riskText: "建议"
    });
  }

  if (sys && sys.status !== "green") {
    steps.push({
      id: "move-downloads",
      title: "把系统“下载”文件夹迁到 " + primaryData + " 盘",
      why: "这是所有浏览器和遵守系统规则的软件的共同落点，先改它收益最大。",
      steps: [
        "资源管理器右键“下载” → 属性 → 位置。",
        "点“移动”，选 " + dataRoot + "Downloads。",
        "确定后选“是”移动已有文件；不要用剪切粘贴。"
      ],
      risk: "safe",
      riskText: "低风险"
    });
  }

  if (edge && edge.status === "yellow" && /每次询问/.test(edge.statusText)) {
    steps.push({
      id: "edge-prompt",
      title: "关掉 Edge 的“每次询问保存位置”",
      why: "目录虽然对了，但每次弹窗都可能手滑存到 " + systemLetter + " 盘或桌面。",
      steps: [
        "打开 edge://settings/downloads。",
        "位置固定为 " + dataRoot + "Downloads。",
        "关闭“每次询问保存位置”。"
      ],
      risk: "safe",
      riskText: "低风险"
    });
  }

  if (wechat && wechat.status === "yellow") {
    steps.push({
      id: "wechat-move",
      title: "把微信文件目录改到 " + primaryData + " 盘",
      why: "聊天记录和图片视频很容易涨到几十 GB。",
      steps: [
        "微信 → 设置 → 文件管理。",
        "点“更改”，选 " + primaryData + " 盘目录。",
        "等微信自己迁移完成，确认新目录能打开旧记录后，再清旧目录。"
      ],
      risk: "careful",
      riskText: "先备份"
    });
  }

  if (qq && qq.status === "yellow") {
    steps.push({
      id: "qq-move",
      title: "把 QQ 文件目录改到 " + primaryData + " 盘",
      why: "QQ 的图片、文件和缓存默认也在用户目录。",
      steps: [
        "QQ → 设置 → 基本设置 → 文件管理。",
        "更改目录到 " + primaryData + " 盘。",
        "确认旧记录可读后再清理旧目录。"
      ],
      risk: "careful",
      riskText: "先备份"
    });
  }

  if (steam && steam.status === "yellow") {
    steps.push({
      id: "steam-move",
      title: "把 Steam 游戏库移到 " + primaryData + " 盘",
      why: "游戏是单机大文件，放系统盘最容易把 " + systemLetter + " 盘吃满。",
      steps: [
        "Steam → 设置 → 存储。",
        "添加 " + primaryData + " 盘库文件夹。",
        "选中 " + systemLetter + " 盘的游戏 → 移动 → 选 " + primaryData + " 盘库。"
      ],
      risk: "careful",
      riskText: "需等待"
    });
  }

  if (system && system.freePct < 15) {
    steps.push({
      id: "clean-green",
      title: "先清绿色项，再考虑搬家",
      why: systemLetter + " 盘剩余低于 15% 时，先清缓存/临时文件最安全，收益也最快。",
      steps: [
        "回到“可清理”标签，按每张卡片的“怎么彻底删”操作。",
        "优先：临时文件、Windows 更新缓存、浏览器缓存、回收站。",
        "不要为了省空间去删 Windows、Program Files 或 AppData 整体。"
      ],
      risk: "safe",
      riskText: "低风险"
    });
  }

  const systemUserBytes = (buckets || [])
    .filter((item) => ["documents-c", "desktop-c", "pictures-c", "videos-c"].includes(item.id))
    .reduce((sum, item) => sum + (item.bytes || 0), 0);
  if (systemUserBytes > 1024 * 1024 * 1024 && system && dataDrives.length > 0) {
    steps.push({
      id: "move-userdata",
      title: "可选：把 " + systemLetter + " 盘个人文档/桌面迁到 " + primaryData + " 盘",
      why: systemLetter + " 盘还有约 " + (systemUserBytes / 1024 / 1024 / 1024).toFixed(1) + " GB 个人文件；" + systemLetter + " 盘剩余 " + system.freePct.toFixed(1) + "%，不搬也够用，想彻底分工再搬。",
      steps: [
        "先备份重要文件。",
        "右键文档/桌面/图片/视频 → 属性 → 位置 → 移动 → 选 " + primaryData + " 盘对应目录。",
        "如果开了 OneDrive 备份，先在 OneDrive 设置里处理，避免两边同步冲突。"
      ],
      risk: "careful",
      riskText: "可选"
    });
  }

  if (dataDrives.length > 0) {
    steps.push({
      id: "future-install",
      title: "以后新软件统一装 " + dataRoot + "Program Files",
      why: "固定一个安装根目录，避免再出现多个自定义目录混放。",
      steps: [
        "安装向导里把完整路径改成 " + dataRoot + "Program Files\\软件名。",
        "绿色软件放 " + dataRoot + "Tools；安装包放 " + dataRoot + "Downloads\\Installers。",
        "已经装好的软件不要剪切；要换位置只能卸载重装。"
      ],
      risk: "info",
      riskText: "建议"
    });
  }

  return steps;
}


async function scan() {
  const started = Date.now();
  const drives = await getDrives();
  const [buckets, downloads] = await Promise.all([buildBuckets(drives), getDownloads(drives)]);
  buckets.push(...(await buildCustomBuckets(drives, buckets)));
  const roles = buildRoles(drives, downloads);
  const plan = buildPlan(drives, downloads, buckets);
  const greenBytes = buckets.filter((item) => item.color === "green").reduce((sum, item) => sum + (item.bytes || 0), 0);
  const yellowBytes = buckets.filter((item) => item.color === "yellow").reduce((sum, item) => sum + (item.bytes || 0), 0);
  const redCount = buckets.filter((item) => item.color === "red").length;
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    drives,
    buckets,
    downloads,
    roles,
    plan,
    stats: {
      scanMs: Date.now() - started,
      greenBytes,
      yellowBytes,
      greenCount: buckets.filter((item) => item.color === "green").length,
      yellowCount: buckets.filter((item) => item.color === "yellow").length,
      redCount
    },
    meta: {
      home: HOME,
      user: path.basename(HOME),
      platform: process.platform
    }
  };
}

async function getOverview(force) {
  if (!force && state.data !== null && Date.now() - state.at < CACHE_TTL) {
    return state.data;
  }
  if (state.promise !== null) return await state.promise;
  state.promise = scan()
    .then((data) => {
      state.data = data;
      state.at = Date.now();
      return data;
    })
    .finally(() => {
      state.promise = null;
    });
  return await state.promise;
}

async function revealPath(target) {
  if (!isWindows()) throw new Error("只有 Windows 支持在资源管理器中打开");
  const value = String(target || "").trim();
  if (!/^[A-Za-z]:\\/.test(value) || value.length > 500) {
    throw new Error("路径不合法");
  }
  const stat = await lstatSafe(value);
  if (stat === null) throw new Error("路径不存在");
  const explorerArg = stat.isDirectory() ? "/separate," + value : "/select," + value;
  await new Promise((resolve, reject) => {
    const child = spawn("explorer.exe", [explorerArg], {
      detached: true,
      stdio: "ignore"
    });
    const timer = setTimeout(() => {
      child.unref();
      resolve();
    }, 800);
    child.once("spawn", () => {
      clearTimeout(timer);
      child.unref();
      resolve();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export const inject = ["webServer"];

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = [
      ctx.webServer.register({
        kind: "exact",
        path: API + "/overview",
        handler: async (req, res) => {
          try {
            sendJson(res, 200, await getOverview(false));
          } catch (error) {
            fail(res, 500, error instanceof Error ? error.message : String(error));
          }
        }
      }),
      ctx.webServer.register({
        kind: "exact",
        path: API + "/scan",
        handler: async (req, res) => {
          try {
            sendJson(res, 200, await getOverview(true));
          } catch (error) {
            fail(res, 500, error instanceof Error ? error.message : String(error));
          }
        }
      }),
      ctx.webServer.register({
        kind: "exact",
        path: API + "/reveal",
        handler: async (req, res) => {
          try {
            if (req.method !== "POST") return fail(res, 405, "只支持 POST");
            const body = JSON.parse((await readBody(req)) || "{}");
            await revealPath(body.path);
            sendJson(res, 200, { ok: true });
          } catch (error) {
            fail(res, 400, error instanceof Error ? error.message : String(error));
          }
        }
      })
    ];
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "drive-manager: routes");
}


