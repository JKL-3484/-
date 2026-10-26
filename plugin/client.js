window.__ModuleLoader__.load({
	id: "dsh-drive-manager",
	factory(require) {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const h = react.createElement;

		const PLUGIN_ID = "dsh-drive-manager";
		const PANEL_ID = "drive-manager";
		const NS = "driveManager";
		const API = "/api/drive-manager";
		const TITLE = "磁盘分工管家";

		const CSS = "" +
			".dm-root{width:100%;max-width:100%;box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px}" +
			".dm-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 12px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1)}" +
			".dm-title{font-size:15px;line-height:22px;font-weight:600}" +
			".dm-sub{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary);margin-top:1px}" +
			".dm-btn{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,.375rem);background:var(--dsw-alias-button-floating-fill,transparent);color:inherit;font:inherit;font-size:12px;line-height:18px;padding:4px 10px;cursor:pointer;flex:none;white-space:nowrap}" +
			".dm-btn:hover{background:var(--dsw-static-neutral-100,rgba(0,0,0,.05))}" +
			".dm-btn[disabled]{opacity:.55;cursor:default}" +
			".dm-btn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#3b82f6));outline-offset:2px}" +
			".dm-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:10px 12px 22px;display:flex;flex-direction:column;gap:12px}" +
			".dm-note{border:.5px solid color-mix(in srgb,#bf8700 35%,transparent);background:color-mix(in srgb,#bf8700 9%,transparent);color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm,.375rem);padding:7px 9px;font-size:11px;line-height:17px}" +
			".dm-noteError{border-color:color-mix(in srgb,#d1242f 38%,transparent);background:color-mix(in srgb,#d1242f 8%,transparent);color:#b42318}" +
			".dm-drives{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}" +
			".dm-drive{border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,.5rem);padding:8px 10px;display:flex;flex-direction:column;gap:5px;background:var(--dsw-static-neutral-50,transparent);cursor:pointer;transition:border-color .15s,box-shadow .15s,background .15s}" +
			".dm-drive:hover{border-color:var(--dsw-alias-border-l3);background:var(--dsw-static-neutral-100,rgba(0,0,0,.04))}" +
			".dm-drive:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#3b82f6));outline-offset:2px}" +
			".dm-driveOn,.dm-driveOn:hover{border-color:var(--dsw-alias-state-business-primary,#3b82f6);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b82f6) 6%,transparent)}" +
			".dm-driveStats{display:flex;gap:8px;font-size:9px;line-height:14px;font-variant-numeric:tabular-nums}" +
			".dm-driveStats span{white-space:nowrap}" +
			".dm-greenText{color:#1a7f37}" +
			".dm-yellowText{color:#9a6700}" +
			".dm-redText{color:#b42318}" +
			".dm-driveHint{font-size:9px;line-height:14px;color:var(--dsw-alias-label-tertiary)}" +
			".dm-driveOn .dm-driveHint{color:var(--dsw-alias-state-business-primary,#3b82f6)}" +
			".dm-driveTop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}" +
			".dm-driveLetter{font-size:14px;font-weight:600;letter-spacing:.02em}" +
			".dm-driveLabel{font-size:10px;color:var(--dsw-alias-label-tertiary)}" +
			".dm-driveNums{display:flex;justify-content:space-between;gap:8px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}" +
			".dm-bar{height:5px;border-radius:999px;background:var(--dsw-static-neutral-200,rgba(0,0,0,.08));overflow:hidden}" +
			".dm-barFill{height:100%;border-radius:999px;background:var(--dsw-alias-state-business-primary,#3b82f6)}" +
			".dm-barFill.danger{background:#d1242f}" +
			".dm-chips{display:flex;flex-wrap:wrap;gap:6px}" +
			".dm-filterBar{display:flex;align-items:center;gap:8px;border:.5px solid color-mix(in srgb,#3b82f6 35%,transparent);background:color-mix(in srgb,#3b82f6 7%,transparent);border-radius:var(--dsw-radius-sm,.375rem);padding:4px 8px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary)}" +
			".dm-filterLabel{font-weight:600;color:var(--dsw-alias-label-primary)}" +
			".dm-filterMeta{color:var(--dsw-alias-label-tertiary)}" +
			".dm-filterClear{margin-left:auto;box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-state-business-primary,#3b82f6);font:inherit;font-size:10px;line-height:15px;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}" +
			".dm-filterClear:hover{opacity:.8}" +
			".dm-chip{display:flex;align-items:baseline;gap:5px;border:.5px solid var(--dsw-alias-border-l1);border-radius:999px;padding:2px 8px;background:var(--dsw-static-neutral-50,transparent);font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary)}" +
			".dm-chip b{font-size:12px;color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}" +
			".dm-legend{display:flex;flex-wrap:wrap;gap:6px 14px;padding:1px 0}" +
			".dm-legendItem{display:flex;align-items:center;gap:5px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary)}" +
			".dm-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 0 1px color-mix(in srgb,currentColor 20%,transparent)}" +
			".dm-dot.green{background:#2ea043;color:#2ea043}" +
			".dm-dot.yellow{background:#bf8700;color:#bf8700}" +
			".dm-dot.red{background:#d1242f;color:#d1242f}" +
			".dm-dot.unknown{background:#8b949e;color:#8b949e}" +
			".dm-tabs{display:flex;flex-wrap:wrap;gap:4px;border-bottom:.5px solid var(--dsw-alias-border-l1);padding-bottom:6px}" +
			".dm-tab{box-sizing:border-box;border:.5px solid transparent;border-radius:var(--dsw-radius-sm,.375rem);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:17px;padding:3px 8px;cursor:pointer}" +
			".dm-tab:hover{background:var(--dsw-static-neutral-100,rgba(0,0,0,.05))}" +
			".dm-tabOn{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);background:var(--dsw-static-neutral-50,transparent);font-weight:500}" +
			".dm-section{display:flex;flex-direction:column;gap:6px}" +
			".dm-sectionHead{display:flex;align-items:center;gap:6px;min-width:0}" +
			".dm-sectionHead h3{margin:0;font-size:12px;line-height:18px;font-weight:600}" +
			".dm-count{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary);margin-left:auto;white-space:nowrap}" +
			".dm-sectionDesc{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary)}" +
			".dm-list{display:flex;flex-direction:column;gap:7px}" +
			".dm-card{border:.5px solid var(--dsw-alias-border-l1);border-left-width:3px;border-radius:var(--dsw-radius-md,.5rem);padding:7px 9px;display:flex;flex-direction:column;gap:4px;background:var(--dsw-static-neutral-50,transparent)}" +
			".dm-card.green{border-left-color:#2ea043;background:color-mix(in srgb,#2ea043 4%,transparent)}" +
			".dm-card.yellow{border-left-color:#bf8700;background:color-mix(in srgb,#bf8700 4%,transparent)}" +
			".dm-card.red{border-left-color:#d1242f;background:color-mix(in srgb,#d1242f 4%,transparent)}" +
			".dm-tag{font-size:9px;line-height:14px;padding:0 6px;border-radius:999px;border:.5px solid transparent;white-space:nowrap;flex:none;font-weight:500}" +
			".dm-tag.green{color:#1a7f37;background:color-mix(in srgb,#2ea043 14%,transparent);border-color:color-mix(in srgb,#2ea043 35%,transparent)}" +
			".dm-tag.yellow{color:#9a6700;background:color-mix(in srgb,#bf8700 16%,transparent);border-color:color-mix(in srgb,#bf8700 38%,transparent)}" +
			".dm-tag.red{color:#b42318;background:color-mix(in srgb,#d1242f 14%,transparent);border-color:color-mix(in srgb,#d1242f 35%,transparent)}" +
			".dm-cardHead{display:flex;align-items:baseline;gap:7px;min-width:0}" +
			".dm-name{font-weight:600;font-size:12px;line-height:18px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}" +
			".dm-size{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}" +
			".dm-path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary);word-break:break-all;user-select:text;-webkit-user-select:text}" +
			".dm-purpose{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}" +
			".dm-how{border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,.375rem);padding:5px 7px;display:flex;flex-direction:column;gap:2px;background:var(--dsw-static-neutral-100,rgba(0,0,0,.02))}" +
			".dm-howTitle{font-size:10px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-secondary)}" +
			".dm-howText{font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}" +
			".dm-caution{font-size:10px;line-height:15px;color:#9a6700}" +
			".dm-cardFoot{display:flex;align-items:center;gap:8px;margin-top:1px}" +
			".dm-open{box-sizing:border-box;border:none;background:transparent;color:var(--dsw-alias-state-business-primary,#3b82f6);font:inherit;font-size:10px;line-height:15px;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}" +
			".dm-open:hover{opacity:.8}" +
			".dm-open:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#3b82f6));outline-offset:2px}" +
			".dm-tableWrap{overflow-x:auto;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,.5rem)}" +
			".dm-table{width:100%;border-collapse:collapse;font-size:10px;line-height:15px;min-width:620px}" +
			".dm-table th{text-align:left;font-weight:600;color:var(--dsw-alias-label-tertiary);padding:5px 7px;border-bottom:.5px solid var(--dsw-alias-border-l1);white-space:nowrap;background:var(--dsw-static-neutral-50,transparent)}" +
			".dm-table td{padding:5px 7px;border-bottom:.5px solid var(--dsw-alias-border-l1);vertical-align:top}" +
			".dm-table tr:last-child td{border-bottom:none}" +
			".dm-app{font-weight:600;white-space:nowrap}" +
			".dm-pathCell{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;line-height:15px;word-break:break-all;color:var(--dsw-alias-label-secondary);min-width:180px;max-width:360px}" +
			".dm-status{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}" +
			".dm-statusText{font-size:10px;line-height:15px}" +
			".dm-status.green .dm-statusText{color:#1a7f37}" +
			".dm-status.yellow .dm-statusText{color:#9a6700}" +
			".dm-status.red .dm-statusText{color:#b42318}" +
			".dm-advice{color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}" +
			".dm-adviceHow{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;margin-top:2px}" +
			".dm-roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}" +
			".dm-role{border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,.5rem);padding:8px 10px;display:flex;flex-direction:column;gap:3px}" +
			".dm-role h4{margin:0;font-size:12px;line-height:18px}" +
			".dm-roleLine{font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary)}" +
			".dm-roleLine b{color:var(--dsw-alias-label-primary);font-weight:600}" +
			".dm-verdict{border-left:2px solid var(--dsw-alias-state-business-primary,#3b82f6);padding:3px 0 3px 8px;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}" +
			".dm-checks{display:flex;flex-direction:column;gap:3px;margin-top:2px}" +
			".dm-check{display:flex;align-items:flex-start;gap:6px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary)}" +
			".dm-checkMark{font-weight:700;width:12px;flex:none;text-align:center}" +
			".dm-check.ok .dm-checkMark{color:#1a7f37}" +
			".dm-check.bad .dm-checkMark{color:#9a6700}" +
			".dm-checkDetail{color:var(--dsw-alias-label-tertiary)}" +
			".dm-plan{display:flex;flex-direction:column;gap:8px}" +
			".dm-step{display:flex;gap:8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,.5rem);padding:8px 10px}" +
			".dm-stepNum{flex:none;width:20px;height:20px;border-radius:50%;background:var(--dsw-static-neutral-200,rgba(0,0,0,.08));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600}" +
			".dm-stepBody{min-width:0;display:flex;flex-direction:column;gap:3px;flex:1 1 auto}" +
			".dm-stepTitle{font-size:11px;line-height:17px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap}" +
			".dm-risk{font-size:9px;line-height:14px;padding:0 5px;border-radius:999px;border:.5px solid transparent;font-weight:500;white-space:nowrap}" +
			".dm-risk.safe{color:#1a7f37;background:color-mix(in srgb,#2ea043 14%,transparent);border-color:color-mix(in srgb,#2ea043 35%,transparent)}" +
			".dm-risk.careful{color:#9a6700;background:color-mix(in srgb,#bf8700 16%,transparent);border-color:color-mix(in srgb,#bf8700 38%,transparent)}" +
			".dm-risk.info{color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,currentColor 10%,transparent)}" +
			".dm-stepWhy{font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary)}" +
			".dm-stepList{margin:0;padding-left:16px;font-size:10px;line-height:16px;color:var(--dsw-alias-label-secondary)}" +
			".dm-loading,.dm-error{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:16px 12px;color:var(--dsw-alias-label-secondary)}" +
			".dm-errorText{color:#b42318;font-size:11px;line-height:17px;word-break:break-word}" +
			".dm-toast{position:sticky;bottom:0;margin:0 12px 8px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,.375rem);background:var(--dsw-alias-bg-elevated,#fff);padding:5px 8px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary);box-shadow:0 2px 8px rgba(0,0,0,.08)}" +
			".dm-empty{font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary);padding:2px 0}" +
			"body[data-ds-dark-theme] .dm-greenText{color:#5ddc7a}" +
			"body[data-ds-dark-theme] .dm-yellowText{color:#e3b341}" +
			"body[data-ds-dark-theme] .dm-redText{color:#ff8b7e}" +
			"body[data-ds-dark-theme] .dm-tag.green{color:#5ddc7a}" +
			"body[data-ds-dark-theme] .dm-tag.yellow{color:#e3b341}" +
			"body[data-ds-dark-theme] .dm-tag.red{color:#ff8b7e}" +
			"body[data-ds-dark-theme] .dm-status.green .dm-statusText,body[data-ds-dark-theme] .dm-check.ok .dm-checkMark{color:#5ddc7a}" +
			"body[data-ds-dark-theme] .dm-status.yellow .dm-statusText,body[data-ds-dark-theme] .dm-caution,body[data-ds-dark-theme] .dm-check.bad .dm-checkMark{color:#e3b341}" +
			"body[data-ds-dark-theme] .dm-status.red .dm-statusText,body[data-ds-dark-theme] .dm-errorText{color:#ff8b7e}" +
			"body[data-ds-dark-theme] .dm-risk.safe{color:#5ddc7a}" +
			"body[data-ds-dark-theme] .dm-risk.careful{color:#e3b341}";

		function ensureStyle() {
			if (typeof document === "undefined") return;
			const tagId = PLUGIN_ID + "/panel.css";
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = tagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		function formatBytes(bytes) {
			const value = typeof bytes === "number" && Number.isFinite(bytes) ? bytes : 0;
			if (value < 1024) return value + " B";
			const units = ["KB", "MB", "GB", "TB"];
			let size = value / 1024;
			let index = 0;
			while (size >= 1024 && index < units.length - 1) {
				size = size / 1024;
				index += 1;
			}
			return (size >= 100 ? size.toFixed(0) : size.toFixed(1)) + " " + units[index];
		}

		function formatPct(value) {
			const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
			return number.toFixed(1) + "%";
		}

		function driveOfPath(value) {
			const match = /^([A-Za-z]):[\\/]/.exec(String(value || ""));
			return match ? match[1].toUpperCase() : "";
		}

		async function requestJson(pathname, init) {
			const response = await fetch(API + pathname, {
				credentials: "same-origin",
				headers: { accept: "application/json" },
				cache: "no-store",
				...init
			});
			if (!response.ok) {
				let message = "HTTP " + response.status;
				try {
					const payload = await response.json();
					if (payload && payload.error) message = payload.error;
				} catch {
					// 保留状态码。
				}
				throw new Error(message);
			}
			return await response.json();
		}

		const TABS = [
			{ id: "all", label: "全部" },
			{ id: "green", label: "可清理" },
			{ id: "yellow", label: "需确认" },
			{ id: "red", label: "系统占用" },
			{ id: "downloads", label: "下载目录" },
			{ id: "plan", label: "分工建议" }
		];

		const COLOR_LABEL = { green: "可清理", yellow: "需确认", red: "系统占用" };
		const COLOR_DESC = {
			green: "可以直接清，但要按“怎么彻底删”做；不要直接删整个文件夹。",
			yellow: "先确认、备份或迁移，别当缓存一键删。",
			red: "系统或已安装软件占用，不要手动删。"
		};
		const HOW_LABEL = { green: "怎么彻底删", yellow: "怎么安全处理", red: "为什么不能删" };

		function Dot({ color }) {
			return h("span", { className: "dm-dot " + color, "aria-hidden": "true" });
		}

		function DriveCard({ drive, selected, onSelect, buckets }) {
			const danger = drive.freePct < 15;
			const items = (buckets || []).filter((item) => driveOfPath(item.path) === drive.letter);
			const green = items.filter((item) => item.color === "green").length;
			const yellow = items.filter((item) => item.color === "yellow").length;
			const red = items.filter((item) => item.color === "red").length;
			const activate = () => onSelect(drive.letter);
			const onKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					activate();
				}
			};
			return h("div", {
				className: "dm-drive" + (selected ? " dm-driveOn" : ""),
				role: "button",
				tabIndex: 0,
				"aria-pressed": selected,
				title: selected ? "再点一次显示全部" : "点击只看 " + drive.letter + " 盘",
				onClick: activate,
				onKeyDown
			},
				h("div", { className: "dm-driveTop" },
					h("span", { className: "dm-driveLetter" }, drive.letter + ":"),
					h("span", { className: "dm-driveLabel" }, drive.label)
				),
				h("div", { className: "dm-driveNums" },
					h("span", null, "已用 " + formatBytes(drive.used)),
					h("span", null, "剩余 " + formatBytes(drive.free) + " · " + formatPct(drive.freePct))
				),
				h("div", { className: "dm-bar", title: "已用 " + formatPct(drive.usedPct) },
					h("div", { className: "dm-barFill" + (danger ? " danger" : ""), style: { width: Math.min(100, Math.max(0, drive.usedPct)) + "%" } })
				),
				h("div", { className: "dm-driveStats" },
					h("span", { className: "dm-greenText" }, "绿 " + green),
					h("span", { className: "dm-yellowText" }, "黄 " + yellow),
					h("span", { className: "dm-redText" }, "红 " + red)
				),
				h("div", { className: "dm-driveHint" }, selected ? "正在查看 · 再点显示全部" : "点击查看这块盘")
			);
		}

		function Legend() {
			return h("div", { className: "dm-legend" },
				h("span", { className: "dm-legendItem" }, h(Dot, { color: "green" }), "绿色：可直接清理，按方法做才彻底"),
				h("span", { className: "dm-legendItem" }, h(Dot, { color: "yellow" }), "黄色：先确认/备份/迁移"),
				h("span", { className: "dm-legendItem" }, h(Dot, { color: "red" }), "红色：系统占用，别手动删")
			);
		}

		function BucketCard({ item, onReveal }) {
			let sizeText = item.sizeText || "";
			if (typeof item.bytes === "number") {
				sizeText = (item.partial ? "≥ " : "") + formatBytes(item.bytes);
			}
			if (sizeText === "") sizeText = "未统计";
			return h("div", { className: "dm-card " + item.color },
				h("div", { className: "dm-cardHead" },
					h(Dot, { color: item.color }),
					h("span", { className: "dm-name", title: item.name }, item.name),
					h("span", { className: "dm-tag " + item.color }, COLOR_LABEL[item.color] || "未分类"),
					h("span", { className: "dm-size" }, sizeText)
				),
				h("div", { className: "dm-path", title: item.path }, item.path),
				item.purpose ? h("div", { className: "dm-purpose" }, item.purpose) : null,
				h("div", { className: "dm-how" },
					h("div", { className: "dm-howTitle" }, HOW_LABEL[item.color] || "怎么处理"),
					h("div", { className: "dm-howText" }, item.howTo || "没有补充说明。")
				),
				item.partial ? h("div", { className: "dm-caution" }, "统计未完成：这个目录太大，只统计了一部分，实际可能更大。") : null,
				h("div", { className: "dm-cardFoot" },
					h("button", { type: "button", className: "dm-open", onClick: () => onReveal(item.path) }, "在资源管理器中打开")
				)
			);
		}

		function Section({ color, title, items, onReveal, emptyText }) {
			return h("section", { className: "dm-section" },
				h("div", { className: "dm-sectionHead" },
					h(Dot, { color }),
					h("h3", null, title),
					h("span", { className: "dm-count" }, items.length + " 项")
				),
				h("div", { className: "dm-sectionDesc" }, COLOR_DESC[color]),
				items.length === 0
					? h("div", { className: "dm-empty" }, emptyText || "这个分类下暂时没有发现。")
					: h("div", { className: "dm-list" }, items.map((item) => h(BucketCard, { key: item.id, item, onReveal })))
			);
		}

		function DownloadTable({ items, onReveal }) {
			return h("div", { className: "dm-tableWrap" },
				h("table", { className: "dm-table" },
					h("thead", null,
						h("tr", null,
							h("th", null, "应用"),
							h("th", null, "当前目录"),
							h("th", null, "状态"),
							h("th", null, "建议")
						)
					),
					h("tbody", null,
						items.map((item) => h("tr", { key: item.id },
							h("td", { className: "dm-app" }, item.app),
							h("td", { className: "dm-pathCell" },
								item.current
									? h("span", { title: item.current }, item.current)
									: h("span", { className: "dm-empty" }, "未检测到"),
								item.bytes != null ? h("div", { className: "dm-adviceHow" }, "约 " + formatBytes(item.bytes)) : null
							),
							h("td", null,
								h("span", { className: "dm-status " + item.status },
									h(Dot, { color: item.status }),
									h("span", { className: "dm-statusText" }, item.statusText)
								)
							),
							h("td", null,
								h("div", { className: "dm-advice" }, item.advice),
								item.howTo ? h("div", { className: "dm-adviceHow" }, item.howTo) : null,
								item.current && item.current.indexOf("；") < 0
									? h("button", { type: "button", className: "dm-open", onClick: () => onReveal(item.current) }, "打开")
									: null
							)
						))
					)
				)
			);
		}

		function RoleCard({ drive, role }) {
			return h("div", { className: "dm-role" },
				h("h4", null, drive.letter + ": · " + role),
				h("div", { className: "dm-roleLine" }, "该放：", h("b", null, drive.should)),
				h("div", { className: "dm-roleLine" }, "不该放：", h("b", null, drive.shouldNot)),
				h("div", { className: "dm-roleLine" }, "剩余：", h("b", null, formatBytes(drive.free) + "（" + formatPct(drive.freePct) + "）"))
			);
		}

		function Roles({ roles }) {
			if (!roles) return null;
			const data = Array.isArray(roles.data) ? roles.data : [];
			return h("div", { className: "dm-section" },
				h("div", { className: "dm-sectionHead" }, h("h3", null, "磁盘分工判断")),
				h("div", { className: "dm-verdict" }, roles.verdict),
				h("div", { className: "dm-roles" },
					roles.system ? h(RoleCard, { drive: roles.system, role: "系统盘" }) : null,
					data.map((drive) => h(RoleCard, { key: drive.letter, drive, role: "数据盘" }))
				),
				h("div", { className: "dm-checks" },
					roles.checks.map((check, index) => h("div", { key: index, className: "dm-check " + (check.ok ? "ok" : "bad") },
						h("span", { className: "dm-checkMark" }, check.ok ? "✓" : "!"),
						h("span", null,
							h("span", null, check.label),
							check.detail ? h("span", { className: "dm-checkDetail" }, " · " + check.detail) : null
						)
					))
				)
			);
		}

		function Plan({ steps }) {
			return h("div", { className: "dm-section" },
				h("div", { className: "dm-sectionHead" }, h("h3", null, "建议动作（从低风险开始）")),
				h("div", { className: "dm-plan" },
					steps.map((step, index) => h("div", { key: step.id, className: "dm-step" },
						h("div", { className: "dm-stepNum" }, String(index + 1)),
						h("div", { className: "dm-stepBody" },
							h("div", { className: "dm-stepTitle" },
								h("span", null, step.title),
								h("span", { className: "dm-risk " + step.risk }, step.riskText)
							),
							h("div", { className: "dm-stepWhy" }, step.why),
							h("ol", { className: "dm-stepList" }, step.steps.map((line, lineIndex) => h("li", { key: lineIndex }, line)))
						)
					))
				)
			);
		}

		function Panel() {
			const [data, setData] = react.useState(null);
			const [status, setStatus] = react.useState("loading");
			const [error, setError] = react.useState("");
			const [tab, setTab] = react.useState("all");
			const [drive, setDrive] = react.useState(null);
			const [toast, setToast] = react.useState("");
			const alive = react.useRef(true);

			const load = react.useCallback(async (force) => {
				setStatus("loading");
				setError("");
				try {
					const payload = await requestJson(force ? "/scan" : "/overview", force ? { method: "POST" } : undefined);
					if (!alive.current) return;
					setData(payload);
					setStatus("ready");
				} catch (loadError) {
					if (!alive.current) return;
					setError(loadError instanceof Error ? loadError.message : String(loadError));
					setStatus("error");
				}
			}, []);

			react.useEffect(() => {
				alive.current = true;
				void load(false);
				return () => {
					alive.current = false;
				};
			}, [load]);

			react.useEffect(() => {
				if (!toast) return undefined;
				const timer = setTimeout(() => setToast(""), 2600);
				return () => clearTimeout(timer);
			}, [toast]);

			const onReveal = react.useCallback(async (target) => {
				if (!target) return;
				try {
					await requestJson("/reveal", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ path: target })
					});
					setToast("已在资源管理器中打开。");
				} catch (revealError) {
					setToast("打开失败：" + (revealError instanceof Error ? revealError.message : String(revealError)));
				}
			}, []);

			const selectDrive = react.useCallback((letter) => {
				setDrive((current) => current === letter ? null : letter);
				setTab((current) => (current === "downloads" || current === "plan" ? "all" : current));
			}, []);

			const buckets = data && Array.isArray(data.buckets) ? data.buckets : [];
			const downloads = data && Array.isArray(data.downloads) ? data.downloads : [];
			const roles = data ? data.roles : null;
			const plan = data && Array.isArray(data.plan) ? data.plan : [];

			const viewBuckets = react.useMemo(() => {
				return drive ? buckets.filter((item) => driveOfPath(item.path) === drive) : buckets;
			}, [buckets, drive]);

			const viewStats = react.useMemo(() => {
				const green = viewBuckets.filter((item) => item.color === "green");
				const yellow = viewBuckets.filter((item) => item.color === "yellow");
				const red = viewBuckets.filter((item) => item.color === "red");
				const sum = (items) => items.reduce((total, item) => total + (item.bytes || 0), 0);
				return {
					greenBytes: sum(green),
					yellowBytes: sum(yellow),
					greenCount: green.length,
					yellowCount: yellow.length,
					redCount: red.length
				};
			}, [viewBuckets]);

			const filtered = react.useMemo(() => {
				const list = tab === "all" ? viewBuckets : viewBuckets.filter((item) => item.color === tab);
				return [...list].sort((a, b) => (b.bytes || 0) - (a.bytes || 0));
			}, [viewBuckets, tab]);

			const greenItems = filtered.filter((item) => item.color === "green");
			const yellowItems = filtered.filter((item) => item.color === "yellow");
			const redItems = filtered.filter((item) => item.color === "red");
			const loading = status === "loading";

			const header = h("div", { className: "dm-head" },
				h("div", null,
					h("div", { className: "dm-title" }, TITLE),
					h("div", { className: "dm-sub" }, "自动识别所有本地磁盘 · 只读体检 · 绿色也要按方法清")
				),
				h("button", { type: "button", className: "dm-btn", onClick: () => void load(true), disabled: loading }, loading ? "扫描中…" : "重新扫描")
			);

			if (status === "error" && data === null) {
				return h("div", { className: "dm-root" }, header,
					h("div", { className: "dm-error" },
						h("div", { className: "dm-errorText" }, "扫描失败：" + error),
						h("button", { type: "button", className: "dm-btn", onClick: () => void load(false) }, "重试")
					)
				);
			}

			if (data === null) {
				return h("div", { className: "dm-root" }, header,
					h("div", { className: "dm-loading" },
						h("div", null, "正在扫描所有本地磁盘和常见下载目录…"),
						h("div", { className: "dm-sub" }, "第一次大约 10–20 秒；统计大的系统目录时只会算一部分，并标“≥”。")
					)
				);
			}

			const content = tab === "downloads"
				? h("div", { className: "dm-section" },
					h("div", { className: "dm-sectionHead" }, h("h3", null, "下载目录核对"), h("span", { className: "dm-count" }, downloads.length + " 项")),
					h("div", { className: "dm-sectionDesc" }, "系统下载文件夹、Edge/Chrome、微信/QQ、Steam、百度网盘等实际落点；绿色=在数据盘，黄色=在系统盘或需调整，灰色=没检测到。"),
					drive ? h("div", { className: "dm-sectionDesc" }, "当前选的是 " + drive + " 盘，但下载目录是跨盘的，这里仍显示全部；点“显示全部”可退出筛选。") : null,
					h(DownloadTable, { items: downloads, onReveal })
				)
				: tab === "plan"
					? h("div", { className: "dm-section" },
						drive ? h("div", { className: "dm-sectionDesc" }, "分工建议是跨盘的，不受单盘筛选影响；点“显示全部”可退出筛选。") : null,
						h(Roles, { roles }),
						h(Plan, { steps: plan })
					)
					: h("div", { className: "dm-section" },
						tab === "all"
							? h("div", { className: "dm-section" },
								h(Section, { color: "green", title: "可清理", items: greenItems, onReveal, emptyText: drive ? drive + " 盘这个分类下没有发现。" : undefined }),
								h(Section, { color: "yellow", title: "需确认", items: yellowItems, onReveal, emptyText: drive ? drive + " 盘这个分类下没有发现。" : undefined }),
								h(Section, { color: "red", title: "系统占用", items: redItems, onReveal, emptyText: drive ? drive + " 盘这个分类下没有发现。" : undefined })
							)
							: h(Section, {
								color: tab,
								title: COLOR_LABEL[tab] || tab,
								items: filtered,
								onReveal,
								emptyText: drive ? drive + " 盘这个分类下没有发现。" : undefined
							})
					);

			return h("div", { className: "dm-root" },
				header,
				h("div", { className: "dm-scroll" },
					h("div", { className: "dm-note" },
						"绿色不是让你直接 Shift+Delete：绿色只代表“这块空间可以清”，具体要按每张卡片的“怎么彻底删”走；删文件夹本身可能删不干净，甚至影响正在运行的程序。清完点右上角“重新扫描”确认数字有没有降下来。"
					),
					error ? h("div", { className: "dm-note dm-noteError" }, "刷新失败：" + error + "（下面还是上一次的结果）") : null,
					h("div", { className: "dm-drives" }, data.drives.map((item) => h(DriveCard, {
						key: item.letter,
						drive: item,
						selected: drive === item.letter,
						onSelect: selectDrive,
						buckets
					}))),
					drive ? h("div", { className: "dm-filterBar" },
						h("span", { className: "dm-filterLabel" }, "当前只看 " + drive + " 盘"),
						h("span", { className: "dm-filterMeta" }, viewBuckets.length + " 项"),
						h("button", { type: "button", className: "dm-filterClear", onClick: () => setDrive(null) }, "显示全部")
					) : null,
					h("div", { className: "dm-chips" },
						h("span", { className: "dm-chip" }, h(Dot, { color: "green" }), "可清理 ", h("b", null, formatBytes(viewStats.greenBytes)), " · " + viewStats.greenCount + " 项"),
						h("span", { className: "dm-chip" }, h(Dot, { color: "yellow" }), "需确认 ", h("b", null, formatBytes(viewStats.yellowBytes)), " · " + viewStats.yellowCount + " 项"),
						h("span", { className: "dm-chip" }, h(Dot, { color: "red" }), "系统项 ", h("b", null, String(viewStats.redCount)), " 项")
					),
					h(Legend),
					h("div", { className: "dm-tabs" },
						TABS.map((item) => h("button", {
							key: item.id,
							type: "button",
							className: "dm-tab" + (tab === item.id ? " dm-tabOn" : ""),
							onClick: () => setTab(item.id)
						}, item.label))
					),
					content,
					h("div", { className: "dm-note" },
						"只读面板：没有删除按钮，也不会执行删除命令。所有清理动作都要你自己在 Windows 里确认；拿不准的黄色项先备份。清完回来点“重新扫描”，数字降下来才算清干净。"
					)
				),
				toast ? h("div", { className: "dm-toast" }, toast) : null
			);
		}

		function DriveManagerIcon({ size }) {
			const dimension = typeof size === "number" && Number.isFinite(size) && size > 0 ? size : 16;
			return h("svg", {
				viewBox: "0 0 16 16",
				width: dimension,
				height: dimension,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				focusable: "false"
			},
				h("rect", { x: "2", y: "3", width: "12", height: "10", rx: "2" }),
				h("path", { d: "M2 8h12" }),
				h("circle", { cx: "4.8", cy: "5.5", r: "0.55", fill: "currentColor", stroke: "none" })
			);
		}

		const inject = ["slots", "locale"];

		const zh = { "panel.title": TITLE };
		const en = { "panel.title": "Drive Role Manager" };

		function apply(ctx) {
			ensureStyle();
			ctx.effect(() => {
				try {
					return ctx.locale.register(NS, { zh, en });
				} catch {
					return () => {};
				}
			}, "drive-manager: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 31,
				locale: NS,
				label: () => t("panel.title")
			}, DriveManagerIcon));
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS
			}, Panel));
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.PANEL_ID = PANEL_ID;
		return module.exports;
	}
});
