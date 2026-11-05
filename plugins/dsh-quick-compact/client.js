window.__ModuleLoader__.load({
  id: 'dsh-quick-compact',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'quick-compact';

    // ── 文案（zh/en 同时注册，跟随界面语言） ────────────────────────────
    const ZH = {
      compact: '压缩',
      tip: '上下文已用 {percent}% · 点击压缩',
      tipUnknown: '压缩上下文（等价于输入 /compact）',
      aria: '上下文已用 {percent}%，打开压缩面板',
      title: '压缩上下文',
      used: '上下文已用',
      idle: '等你发下一条消息后开始统计',
      breakdownSystem: '系统提示',
      breakdownTools: '工具定义',
      breakdownMessages: '对话内容',
      action: '压缩上下文',
      busy: '压缩中…',
      done: '已提交压缩',
      failed: '压缩失败',
      noApi: '命令通道没就绪，稍后再试',
      close: '关闭',
      thLabel: '自动压缩阈值',
      thHint: '占用到 {percent}% 时自动压缩',
      thOff: '阈值控制未就绪（压缩引擎未挂载，重启后生效）',
    };
    const EN = {
      compact: 'Compact',
      tip: '{percent}% of context used · click to compact',
      tipUnknown: 'Compact context (same as typing /compact)',
      aria: '{percent}% of context used, open the compact panel',
      title: 'Compact context',
      used: 'Context used',
      idle: 'Stats appear after the next message',
      breakdownSystem: 'System prompt',
      breakdownTools: 'Tool definitions',
      breakdownMessages: 'Conversation',
      action: 'Compact context',
      busy: 'Compacting…',
      done: 'Compaction submitted',
      failed: 'Compaction failed',
      noApi: 'Command channel is not ready yet',
      close: 'Close',
      thLabel: 'Auto-compact at',
      thHint: 'Compacts automatically at {percent}% of context',
      thOff: 'Threshold control unavailable (no compaction engine mounted)',
    };

    // 宿主命令通道（remote.commands.execute(sessionId, '/compact', [])），与手打 /compact 等价
    let commandApi = null;

    // dsh-compaction-threshold 的宿主接口（GET 读 / POST 写自动压缩阈值）
    const THRESHOLD_URL = '/compaction-threshold/api/state';

    // ── 视觉规格（跟官方 ContextMeter 对齐：14px 环 + 13px 等宽数字） ─────
    const RING_SIZE = 18;
    const RING_STROKE = 2;
    const PANEL_RING = 34;
    const PANEL_STROKE = 2.5;
    const PANEL_WIDTH = 264;

    // 环的三档状态色：超过 30% 就转琥珀提示（2026-10-29 所有者要求，原 70%），80% 转红
    const TINT = {
      normal: '#AEF000',
      warn: 'var(--dsw-alias-state-warn-primary)',
      hot: 'var(--dsw-alias-state-error-primary)',
    };
    const SEG = [
      { key: 'systemTokens', label: 'breakdownSystem', color: 'var(--dsw-static-neutral-bluish-400, #adb2b8)' },
      { key: 'toolsTokens', label: 'breakdownTools', color: '#a78bfa' },
      { key: 'messageTokens', label: 'breakdownMessages', color: 'var(--dsw-static-blue-450, #4d93f8)' },
    ];

    const STYLE_ID = 'dsh-quick-compact-style';
    const CSS = [
      // 触发控件：官方用量表同款「小环 + 百分比」，做成可点的幽灵按钮
      '.qc-trigger{display:inline-flex;align-items:center;gap:7px;flex:none;height:26px;margin:0;padding:0 8px;',
      'border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap;',
      '-webkit-appearance:none;appearance:none;transition:background .15s ease,color .15s ease}',
      '.qc-trigger:hover,.qc-trigger[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));',
      'color:var(--dsw-alias-label-primary)}',
      '.qc-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:6px}',
      '.qc-trigger:disabled{opacity:.55;cursor:default}',
      '.qc-trigger__pct{display:inline-flex;align-items:baseline;font-variant-numeric:tabular-nums;',
      'transition:color .15s ease}',
      '.qc-trigger__num{font-size:14px;font-weight:600;letter-spacing:-.2px;line-height:1}',
      '.qc-trigger__unit{font-size:9.5px;font-weight:600;line-height:1;margin-left:1px;',
      'color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))} ',
      '.qc-ring{display:block;overflow:visible;flex:none;transition:transform .18s cubic-bezier(.22,.61,.36,1)}',
      '.qc-trigger:hover .qc-ring,.qc-trigger[aria-expanded="true"] .qc-ring{transform:scale(1.08)}',
      '.qc-track{fill:none;stroke:var(--dsw-alias-border-l3,var(--dsw-alias-border-l2))}',
      '.qc-fill{fill:none;stroke-linecap:round;transition:stroke-dasharray .45s cubic-bezier(.22,.61,.36,1),stroke .2s ease}',
      '.qc-glyph{display:inline-flex;flex:none}',
      // 面板：沿用宿主菜单面板的表面/模糊/阴影令牌，跟原生弹层一致
      '.qc-panel{position:fixed;z-index:2147483000;width:' + PANEL_WIDTH + 'px;box-sizing:border-box;padding:12px;',
      'border:0;border-radius:var(--dsw-radius-lg,16px);background:var(--dsw-specific-menu,var(--dsw-alias-bg-overlay));',
      '-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));',
      'backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));',
      'box-shadow:var(--dsw-elevation-prominent,0 12px 32px rgba(0,0,0,.34));',
      'color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:20px}',
      '.qc-head{display:flex;align-items:center;gap:10px}',
      '.qc-head__body{display:flex;flex-direction:column;min-width:0;flex:1}',
      '.qc-head__line{display:flex;align-items:baseline;gap:4px;white-space:nowrap}',
      '.qc-head__label{font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.qc-head__pct{color:var(--dsw-alias-label-primary);font-weight:500;font-variant-numeric:tabular-nums}',
      '.qc-head__figs{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.qc-bar{display:flex;gap:1px;height:4px;border-radius:999px;overflow:hidden;',
      'background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));margin:12px 0 0}',
      '.qc-bar__seg{height:100%;border-radius:1px;flex:none;min-width:2px}',
      '.qc-rows{display:flex;flex-direction:column;margin:6px 0 0;padding:0;list-style:none}',
      '.qc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0;font-size:12px;margin:0}',
      '.qc-row__label{display:flex;align-items:center;color:var(--dsw-alias-label-secondary);margin:0}',
      '.qc-row__value{margin:0;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.qc-swatch{width:8px;height:8px;border-radius:2px;display:inline-block;margin-right:6px;flex:none}',
      '.qc-sep{height:1px;background:var(--dsw-alias-border-l1);margin:10px -2px}',
      '.qc-cmd{display:flex;align-items:center;gap:8px;box-sizing:border-box;padding:7px 8px;',
      'width:calc(100% + 4px);margin:0 -2px;border:0;border-radius:var(--dsw-radius-sm,8px);background:transparent;',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;cursor:pointer;',
      'text-align:left;transition:background .15s ease}',
      '.qc-cmd:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2))}',
      '.qc-cmd:disabled{opacity:.6;cursor:default}',
      '.qc-cmd__name{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace)}',
      '.qc-cmd__desc{color:var(--dsw-alias-label-secondary);font-size:11px}',
      '.qc-cmd__arrow{margin-left:auto;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:13px}',
      '.qc-msg{margin-top:8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.qc-msg--error{color:var(--dsw-alias-state-error-primary)}',
      // 自动压缩阈值：一行标题 + 一条细轨滑块，跟面板其余部分同字号
      '.qc-th{display:flex;flex-direction:column;gap:6px;margin:0 -2px}',
      '.qc-th__head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}',
      '.qc-th__label{font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.qc-th__value{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-weight:500;font-size:12px}',
      '.qc-th__range{--qc-fill:0%;width:100%;height:16px;margin:0;padding:0;background:transparent;',
      '-webkit-appearance:none;appearance:none;cursor:pointer}',
      '.qc-th__range:disabled{opacity:.5;cursor:default}',
      '.qc-th__range::-webkit-slider-runnable-track{height:4px;border-radius:999px;',
      'background:linear-gradient(to right,var(--dsw-alias-brand-primary) 0 var(--qc-fill),',
      'var(--dsw-alias-border-l2) var(--qc-fill) 100%)}',
      '.qc-th__range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;',
      'margin-top:-4px;border-radius:50%;background:var(--dsw-alias-bg-overlay,#fff);',
      'border:2px solid var(--dsw-alias-brand-primary);box-shadow:0 1px 3px rgba(0,0,0,.28)}',
      '.qc-th__range:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:6px}',
      '.qc-th__hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      // 压缩烟花：全屏 canvas 覆盖层，只在压缩发生那一刻出现 1.4 秒，不吃鼠标事件
      '.qc-fw{position:fixed;left:0;top:0;z-index:2147483001;pointer-events:none;display:block}',
    ].join('');

    function mountStyle() {
      if (typeof document === 'undefined') return function () {};
      if (document.getElementById(STYLE_ID)) return function () {};
      const el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = CSS;
      document.head.appendChild(el);
      return function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    }

    // ── 小工具 ───────────────────────────────────────────────────────
    function num(v) {
      return typeof v === 'number' && isFinite(v) && v >= 0 ? v : null;
    }

    function fmtTokens(n) {
      if (typeof n !== 'number' || !isFinite(n) || n < 0) return '—';
      if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
      return String(Math.round(n));
    }

    function readUsage(pressure) {
      if (!pressure || typeof pressure !== 'object') return { used: null, window: null, percent: null };
      const used = num(pressure.projectedTokens) !== null ? num(pressure.projectedTokens) : num(pressure.pressureTokens);
      const window = num(pressure.contextWindow);
      const percent = used !== null && window !== null && window > 0
        ? Math.min(100, Math.round((used / window) * 100))
        : null;
      return { used, window, percent };
    }

    function ringTint(percent) {
      if (percent === null) return TINT.normal;
      if (percent >= 80) return TINT.hot;
      if (percent >= 30) return TINT.warn;
      return TINT.normal;
    }

    function describe(res) {
      try {
        if (res && res.error) {
          const e = res.error;
          if (typeof e === 'string') return e;
          return e.message || e.code || JSON.stringify(e);
        }
        if (res && res.message) return String(res.message);
        return JSON.stringify(res);
      } catch (_) { return String(res); }
    }

    // ── 环形进度（与官方 ContextMeter 同几何：14 viewBox、r 5.5、2px 描边） ──
    function Ring(props) {
      const size = props.size;
      const stroke = props.stroke;
      const r = (size - stroke) / 2 - 0.5;
      const circumference = 2 * Math.PI * r;
      const percent = props.percent;
      const color = props.color || TINT.normal;
      const dash = percent === null ? 0 : (Math.max(0, Math.min(100, percent)) / 100) * circumference;
      const center = size / 2;
      return h('svg', {
        className: 'qc-ring', viewBox: '0 0 ' + size + ' ' + size,
        width: size, height: size, 'aria-hidden': 'true', focusable: 'false',
      },
        // 很细的一圈墨边：深色主题下几乎看不见，浅色主题下勾出硬轮廓
        h('circle', {
          className: 'qc-rim', cx: center, cy: center, r: r + stroke / 2,
          fill: 'none', stroke: '#101619', style: { strokeWidth: 0.85 },
        }),
        h('circle', { className: 'qc-track', cx: center, cy: center, r: r, style: { strokeWidth: stroke } }),
        percent === null ? null : h('circle', {
          className: 'qc-fill', cx: center, cy: center, r: r,
          strokeDasharray: dash + ' ' + circumference,
          transform: 'rotate(-90 ' + center + ' ' + center + ')',
          style: { stroke: color, strokeWidth: stroke },
        })
      );
    }

    // ── 压缩烟花：从环心炸一簇粒子 + 一圈冲击波，1.4 秒散尽 ──────────────
    // 刻意做成小方点而不是圆形光斑：方点更硬、更像工程图里的图元，
    // 与他定下的界面审美一致（冷白 + 硬边 + 克制），不要彩虹烟花那种甜腻感。
    const FW_DURATION = 2200;
    const FW_NODES = 54;

    /** 环当前处于哪一档，烟花就以那一档颜色为主，另外两档只做零星点缀。 */
    function fireworkPalette(percent) {
      const root = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
      function pick(name, fallback) {
        if (!root) return fallback;
        const v = (root.getPropertyValue(name) || '').trim();
        return v || fallback;
      }
      const brand = pick('--dsw-alias-brand-primary', '#4d93f8');
      const warn = pick('--dsw-alias-state-warn-primary', '#f0b429');
      const hot = pick('--dsw-alias-state-error-primary', '#e5484d');
      const queue = percent === null ? 0 : percent;
      if (queue >= 80) return [hot, warn, brand];
      if (queue >= 30) return [warn, hot, brand];
      return [brand, warn, hot];
    }

    function fireFireworks(anchor, palette) {
      if (typeof document === 'undefined' || !anchor) return;
      try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      } catch (_) {}

      // 同一时刻只留一簇：连点就用新的换掉旧的，不让粒子堆满屏
      const stale = document.getElementById('qc-fw');
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

      const rect = anchor.getBoundingClientRect();
      const ox = rect.left + rect.width / 2;
      const oy = rect.top + rect.height / 2;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const canvas = document.createElement('canvas');
      canvas.id = 'qc-fw';
      canvas.className = 'qc-fw';
      canvas.setAttribute('aria-hidden', 'true');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      document.body.appendChild(canvas);

      const g = canvas.getContext('2d');
      if (!g) { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); return; }
      g.scale(dpr, dpr);

      const colors = (palette && palette.length ? palette : ['#4d93f8']).slice(0, 3);
      const primary = colors[0];
      const accent = colors[1] || colors[0];
      const parts = [];
      for (let i = 0; i < FW_NODES; i++) {
        // 角度均分再加抖动 → 各方向都有，但不像机械放射线
        const angle = (Math.PI * 2 * i) / FW_NODES + (Math.random() - 0.5) * 0.42;
        const speed = 1.05 + Math.random() * 2.1;
        parts.push({
          x: ox, y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.38,
          size: 1.3 + Math.random() * 2.2,
          ttl: 0.55 + Math.random() * 0.4,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.34,
          // 五分之一用点缀色，其余同色 —— 单色系更干净，不是彩虹
          color: i % 5 === 0 ? accent : primary,
        });
      }
      // 主色再补一小撮更慢更亮的，让中心显得"通电"而不是均匀散开
      for (let j = 0; j < 10; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.36 + Math.random() * 0.78;
        parts.push({
          x: ox, y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.6 + Math.random() * 1.6,
          ttl: 0.4 + Math.random() * 0.3,
          rot: Math.random() * Math.PI,
          spin: 0,
          color: primary,
        });
      }

      const start = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      let raf = 0;

      function stop() {
        if (raf) { try { cancelAnimationFrame(raf); } catch (_) {} raf = 0; }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }

      function frame(now) {
        const t = (now - start) / FW_DURATION;
        if (t >= 1) { stop(); return; }
        g.clearRect(0, 0, width, height);

        // 冲击波：一圈迅速撑开又变细的描边环，前 42% 时长走完
        const wave = Math.min(1, t / 0.46);
        if (wave < 1) {
          g.save();
          g.globalAlpha = (1 - wave) * 0.8;
          g.strokeStyle = colors[0];
          g.lineWidth = 2.2 * (1 - wave) + 0.35;
          g.beginPath();
          g.arc(ox, oy, 7 + wave * 56, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }

        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          const k = t / p.ttl;
          if (k >= 1) continue;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.978;
          p.vy = p.vy * 0.978 + 0.058;
          p.rot += p.spin;
          const alpha = 1 - k * k;
          g.save();
          g.globalAlpha = alpha * 0.95;
          g.translate(p.x, p.y);
          g.rotate(p.rot);
          g.fillStyle = p.color;
          g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          g.restore();
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    // 没有用量数据时的兜底图标：上下两个向内收的折角（压缩）
    function CompressGlyph() {
      return h('span', { className: 'qc-glyph' },
        h('svg', { width: 13, height: 13, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' },
          h('path', {
            d: 'M3.5 2.5 L7 6 L10.5 2.5', fill: 'none', stroke: 'currentColor',
            strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
          }),
          h('path', {
            d: 'M3.5 11.5 L7 8 L10.5 11.5', fill: 'none', stroke: 'currentColor',
            strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
          })
        )
      );
    }

    // ── 主控件 ───────────────────────────────────────────────────────
    function CompactControl(props) {
      const t = props.t || function (k) { return k; };
      const sessionId = props.sessionId;
      const useProjection = props.useProjection;

      const pressure = typeof useProjection === 'function' ? useProjection('contextPressure') : null;
      const breakdown = typeof useProjection === 'function' ? useProjection('contextBreakdown') : null;
      const usage = readUsage(pressure);

      const [open, setOpen] = React.useState(false);
      const [pos, setPos] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [msg, setMsg] = React.useState(null);
      const [err, setErr] = React.useState(false);
      const [th, setTh] = React.useState(null);
      const thTimer = React.useRef(null);
      const btnRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const lastFire = React.useRef(0);
      const prevPct = React.useRef(null);

      const percent = usage.percent;

      /** 放一次烟花。1.2 秒内的重复触发合并掉，避免手动点击和自动检测双响。 */
      const fire = React.useCallback(function () {
        const now = Date.now();
        if (now - lastFire.current < 1200) return;
        lastFire.current = now;
        fireFireworks(btnRef.current, fireworkPalette(percent));
      }, [percent]);

      // 自动压缩没有按钮点击可挂，就用「上下文占用骤降」当信号：
      // 压完一次至少省掉十几个点，掉 15 点以上认为是压缩发生（阈值 20%–95%，正常都够）。
      React.useEffect(function () {
        const prev = prevPct.current;
        prevPct.current = percent;
        if (prev === null || percent === null) return;
        if (prev - percent >= 15) fire();
      }, [percent, fire]);

      React.useEffect(function () {
        if (!open) return undefined;
        function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }
        function onDown(e) {
          if (btnRef.current && btnRef.current.contains(e.target)) return;
          if (panelRef.current && panelRef.current.contains(e.target)) return;
          setOpen(false);
        }
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('mousedown', onDown, true);
        return function () {
          document.removeEventListener('keydown', onKey, true);
          document.removeEventListener('mousedown', onDown, true);
        };
      }, [open]);

      // 打开面板时读一次自动压缩阈值（插件未装/未重启时静默隐藏）
      React.useEffect(function () {
        if (!open) return undefined;
        let alive = true;
        fetch(THRESHOLD_URL, { method: 'GET' })
          .then(function (r) { return r.json(); })
          .then(function (p) {
            if (!alive) return;
            if (!p || p.ok !== true || !p.value || typeof p.value.thresholdRatio !== 'number') { setTh(null); return; }
            setTh({
              ratio: p.value.thresholdRatio,
              min: typeof p.value.minRatio === 'number' ? p.value.minRatio : 0.2,
              max: typeof p.value.maxRatio === 'number' ? p.value.maxRatio : 0.95,
              engines: typeof p.value.engines === 'number' ? p.value.engines : 0,
            });
          })
          .catch(function () { if (alive) setTh(null); });
        return function () { alive = false; };
      }, [open]);

      React.useEffect(function () {
        return function () { if (thTimer.current) window.clearTimeout(thTimer.current); };
      }, []);

      if (!sessionId) return null;

      function openPanel() {
        const rect = btnRef.current ? btnRef.current.getBoundingClientRect() : null;
        if (rect) {
          const left = Math.max(8, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 12));
          setPos({ left: Math.round(left) + 'px', bottom: Math.round(window.innerHeight - rect.top + 8) + 'px' });
        } else {
          setPos({ right: '16px', bottom: '96px' });
        }
        setMsg(null);
        setErr(false);
        setOpen(true);
      }

      async function run() {
        if (busy) return;
        const api = commandApi;
        if (!api || typeof api.execute !== 'function') {
          setErr(true);
          setMsg(t('noApi'));
          return;
        }
        setBusy(true);
        setErr(false);
        setMsg(null);
        try {
          const res = await api.execute(sessionId, '/compact', []);
          if (!res || res.ok !== false) {
            fire();
            setMsg(t('done'));
            window.setTimeout(function () { setOpen(false); setBusy(false); }, 900);
            return;
          }
          setErr(true);
          setMsg(t('failed') + '：' + describe(res));
        } catch (e) {
          setErr(true);
          setMsg(t('failed') + '：' + String((e && e.message) || e));
        }
        setBusy(false);
      }

      /** 把阈值写回宿主（dsh-compaction-threshold 会立刻应用到已挂载的引擎）。 */
      function commitThreshold(value) {
        fetch(THRESHOLD_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ thresholdRatio: value }),
        })
          .then(function (r) { return r.json(); })
          .then(function (p) {
            if (!p || p.ok !== true || !p.value) return;
            setTh({
              ratio: p.value.thresholdRatio,
              min: typeof p.value.minRatio === 'number' ? p.value.minRatio : 0.2,
              max: typeof p.value.maxRatio === 'number' ? p.value.maxRatio : 0.95,
              engines: typeof p.value.engines === 'number' ? p.value.engines : 0,
            });
          })
          .catch(function () {});
      }

      /** 拖动时即时改本地显示，停手 300ms 再落盘，避免每像素发一次请求。 */
      function onThresholdInput(e) {
        const value = Number(e.target.value);
        if (!isFinite(value)) return;
        setTh(function (prev) { return prev ? Object.assign({}, prev, { ratio: value }) : prev; });
        if (thTimer.current) window.clearTimeout(thTimer.current);
        thTimer.current = window.setTimeout(function () { commitThreshold(value); }, 300);
      }

      const tooltip = percent === null ? t('tipUnknown') : t('tip', { percent: percent });

      const button = h('button', {
        ref: btnRef,
        type: 'button',
        className: 'qc-trigger',
        title: tooltip,
        'aria-label': percent === null ? tooltip : t('aria', { percent: percent }),
        'aria-haspopup': 'dialog',
        'aria-expanded': open ? 'true' : 'false',
        disabled: busy,
        onClick: function () {
          if (busy) return;
          if (open) { setOpen(false); return; }
          openPanel();
        },
      },
        h(Ring, { size: RING_SIZE, stroke: RING_STROKE, percent: percent, color: ringTint(percent) }),
        percent === null
          ? h(CompressGlyph)
          : h('span', { className: 'qc-trigger__pct' },
              h('span', { className: 'qc-trigger__num' }, String(percent)),
              h('span', { className: 'qc-trigger__unit' }, '%'))
      );

      if (!open) return button;

      // 面板：大环 + 用量构成 + /compact 命令行（第二下点击才执行）
      const total = breakdown && typeof breakdown === 'object'
        ? (num(breakdown.systemTokens) || 0) + (num(breakdown.toolsTokens) || 0) + (num(breakdown.messageTokens) || 0)
        : 0;

      const segments = [];
      if (percent !== null) {
        if (breakdown && total > 0) {
          SEG.forEach(function (row) {
            const value = num(breakdown[row.key]) || 0;
            if (value <= 0) return;
            segments.push({ key: row.key, color: row.color, width: (percent * value) / total });
          });
        } else {
          segments.push({ key: 'total', color: ringTint(percent), width: percent });
        }
      }

      const head = h('div', { className: 'qc-head' },
        h(Ring, { size: PANEL_RING, stroke: PANEL_STROKE, percent: percent, color: ringTint(percent) }),
        h('div', { className: 'qc-head__body' },
          h('span', { className: 'qc-head__line' },
            h('span', { className: 'qc-head__label' }, t('used')),
            percent === null ? null : h('span', { className: 'qc-head__pct' }, percent + '%')
          ),
          h('span', { className: 'qc-head__figs' },
            usage.used !== null && usage.window !== null
              ? '≈ ' + fmtTokens(usage.used) + ' / ' + fmtTokens(usage.window)
              : t('idle'))
        )
      );

      const bar = segments.length === 0 ? null : h('div', { className: 'qc-bar' },
        segments.map(function (seg) {
          return h('div', {
            key: seg.key, className: 'qc-bar__seg',
            style: { width: Math.max(1, seg.width) + '%', background: seg.color },
          });
        })
      );

      const rows = breakdown && total > 0 ? h('ul', { className: 'qc-rows' },
        SEG.map(function (row) {
          return h('li', { key: row.key, className: 'qc-row' },
            h('span', { className: 'qc-row__label' },
              h('span', { className: 'qc-swatch', style: { background: row.color } }),
              t(row.label)),
            h('span', { className: 'qc-row__value' }, '≈ ' + fmtTokens(num(breakdown[row.key]) || 0))
          );
        })
      ) : null;

      const threshold = th === null ? null : h('div', { className: 'qc-th' },
        h('div', { className: 'qc-th__head' },
          h('span', { className: 'qc-th__label' }, t('thLabel')),
          h('span', { className: 'qc-th__value' }, Math.round(th.ratio * 100) + '%')
        ),
        h('input', {
          type: 'range',
          className: 'qc-th__range',
          min: th.min,
          max: th.max,
          step: 0.01,
          value: th.ratio,
          'aria-label': t('thLabel'),
          style: { '--qc-fill': (Math.max(0, Math.min(1, (th.ratio - th.min) / ((th.max - th.min) || 1))) * 100).toFixed(1) + '%' },
          onChange: onThresholdInput,
        }),
        h('span', { className: 'qc-th__hint' }, th.engines > 0
          ? t('thHint', { percent: Math.round(th.ratio * 100) })
          : t('thOff'))
      );

      const action = h('button', {
        type: 'button',
        className: 'qc-cmd',
        disabled: busy,
        onClick: run,
      },
        h('span', { className: 'qc-cmd__name' }, '/compact'),
        h('span', { className: 'qc-cmd__desc' }, busy ? t('busy') : t('action')),
        h('span', { className: 'qc-cmd__arrow', 'aria-hidden': 'true' }, '›')
      );

      const panel = h('div', {
        ref: panelRef,
        role: 'dialog',
        'aria-label': t('title'),
        className: 'qc-panel',
        style: pos || { right: '16px', bottom: '96px' },
      },
        head,
        bar,
        rows,
        threshold === null ? null : h('div', { className: 'qc-sep' }),
        threshold,
        h('div', { className: 'qc-sep' }),
        action,
        msg ? h('div', { className: 'qc-msg' + (err ? ' qc-msg--error' : ''), role: 'status' }, msg) : null
      );

      return h(React.Fragment, null, button, panel);
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(function () { return ctx.locale.register(NS, { zh: ZH, en: EN }); }, 'dsh-quick-compact: dictionaries');
        ctx.effect(mountStyle, 'dsh-quick-compact: styles');
        const t = ctx.locale.bind(NS);

        // 宿主命令通道：remote.commands.execute(...)
        ctx.effect(function () {
          return ctx.inject(['remote', 'remote.commands'], function (c) {
            try {
              commandApi = (c.remote && c.remote.commands) ? c.remote.commands : (c.get ? c.get('remote.commands') : null);
            } catch (_) { commandApi = null; }
            return function () { commandApi = null; };
          });
        }, 'dsh-quick-compact: command channel');

        ctx.slots.inject('conversation.input.right', function () {
          return ctx.slots.register({
            name: 'conversation.input.right',
            id: 'quick-compact',
            order: 900,
            locale: NS,
            label: function () { return t('compact'); },
          }, function (props) { return h(CompactControl, Object.assign({ t: t }, props)); });
        });
      },
    };
  },
});
