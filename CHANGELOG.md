# Changelog

## 0.2.0

- 自动识别 C/D/E/F… 所有固定盘，不再写死 C/D。
- 盘卡片支持点击过滤：只看单盘 / 显示全部。
- 每块数据盘增加通用目录卡片：Program Files、Users、Documents、Downloads、Games、SteamLibrary、BaiduNetdiskDownload、LeStoreDownload、Drivers、WindowsApps、WpSystem、还原点等。
- 下载目录核对改为多盘探测：系统下载、Edge/Chrome、微信/QQ（含浅层目录发现）、Steam、百度网盘、联想商店、其他下载/安装包。
- C/D 分工判断改为“系统盘 + 多块数据盘”通用模型。
- 迁移建议按实际系统盘/首块数据盘动态生成；只有系统盘时提示加数据盘。
- 自动列出数据盘顶层未识别的自定义目录（不递归统计体积）。
- 修复“在资源管理器中打开”窗口不显示：去掉 `windowsHide`，目录用 `/separate,` 新开窗口，文件用 `/select,` 定位；接口等待进程启动，失败不再假成功。

## 0.1.0

- 初始版本：C/D 盘绿/黄/红分类、下载目录核对、分工建议、只读面板。
