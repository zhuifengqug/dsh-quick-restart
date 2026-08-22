/**
 * dsh-quick-restart — client half.
 *
 * Hand-written bundle in the exact wire format the DSH web shell expects:
 * a CJS factory handed to window.__ModuleLoader__.load({ id, factory }),
 * with platform modules (react) resolved through the injected require.
 *
 * Registers the "重启 DSH" button in sidebar.footer.action; a single click
 * POSTs /dsh-quick-restart (no confirmation step). A status dot next to the
 * button polls GET /dsh-health every 5s (green = online, red = offline).
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-restart',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');
    var inject = ['slots'];

    function apply(ctx) {
      // ── stylesheet (package-owned, cleaned up on teardown) ──
      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {};
        var existing = document.querySelector('style[data-dsh-quick-restart-css]');
        if (existing !== null) return () => {};
        var tag = document.createElement('style');
        tag.dataset.dshQuickRestartCss = '1';
        tag.textContent = [
          '.dqr-restart{box-sizing:border-box;flex:none;align-items:center;width:100%;min-width:0;height:49px;margin:0;color:var(--dsw-alias-label-primary);cursor:pointer;background:transparent;border:none;border-radius:12px;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden;position:relative}',
          '.dqr-restart:hover{background:var(--dsw-alias-bg-layer-2)}',
          '.dqr-restart--armed{color:var(--dsw-alias-state-error-primary)}',
          '.dqr-restart--armed:hover{background:var(--dsw-alias-state-error-primary);color:#fff}',
          '.dqr-restart--rail{box-sizing:border-box;width:36px;min-width:36px;height:36px;border-radius:50%;justify-content:center;gap:0;padding:0}',
          '.dqr-restart__label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}',
          '.dqr-dot{flex:none;width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--dsw-alias-label-tertiary)}',
          '.dqr-dot--ok{background:#22c55e;box-shadow:0 0 4px rgba(34,197,94,.6)}',
          '.dqr-dot--down{background:#ef4444;box-shadow:0 0 4px rgba(239,68,68,.6)}',
          '.dqr-dot--unknown{background:var(--dsw-alias-label-tertiary)}',
          '.dqr-restart--rail .dqr-dot{position:absolute;top:2px;right:2px;width:7px;height:7px}',
          '.dqr-restart__status{flex:none;max-width:7em;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
        ].join('\n');
        document.head.appendChild(tag);
        return () => { tag.remove(); };
      }, 'dsh-quick-restart: stylesheet');

      // ── footer action button + online status dot ──
      ctx.effect(() => {
        var disposeSlot = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-quick-restart',
          order: 100,
          label: () => '重启 DSH'
        }, (props) => {
          var wide = props.wide;
          var phaseState = React.useState('idle');
          var phase = phaseState[0];
          var setPhase = phaseState[1];
          var messageState = React.useState('');
          var message = messageState[0];
          var setMessage = messageState[1];
          // 在线状态：'checking' | 'ok' | 'down'
          var healthState = React.useState('checking');
          var health = healthState[0];
          var setHealth = healthState[1];

          // 每 5 秒探测 /dsh-health；fetch 失败或非 200 视为离线
          React.useEffect(function () {
            var check = function () {
              fetch('/dsh-health', { method: 'GET' })
                .then(function (res) { return res.ok ? setHealth('ok') : setHealth('down'); })
                .catch(function () { setHealth('down'); });
            };
            check();
            var timer = setInterval(check, 5000);
            return function () { clearInterval(timer); };
          }, []);

          // 单击直接重启（无二次确认）
          var click = () => {
            if (phase === 'sending' || phase === 'done') return;
            setPhase('sending');
            fetch('/dsh-quick-restart', { method: 'POST' })
              .then((res) => res.json().catch(() => null))
              .then((data) => {
                setPhase('done');
                setMessage((data && data.message) || '重启已触发');
              })
              .catch((err) => {
                setPhase('error');
                setMessage(String((err && err.message) || err));
              });
          };

          var label = phase === 'sending' ? '重启中…'
            : phase === 'done' ? '已触发'
            : phase === 'error' ? '失败'
            : '重启 DSH';
          var title = phase === 'done' ? message
            : phase === 'error' ? message
            : '点击后 DSH 将重启（断开约 15-20 秒）';
          var cls = 'dqr-restart'
            + (wide ? '' : ' dqr-restart--rail')
            + (phase === 'sending' || phase === 'done' ? ' dqr-restart--armed' : '');
          var statusText = health === 'ok' ? 'DSH 在线'
            : health === 'down' ? 'DSH 离线'
            : '检测中…';
          var dotCls = 'dqr-dot'
            + (health === 'ok' ? ' dqr-dot--ok'
              : health === 'down' ? ' dqr-dot--down'
              : ' dqr-dot--unknown');

          return React.createElement('button', {
            type: 'button',
            className: cls,
            onClick: click,
            title: title,
            'aria-label': '重启 DSH',
            disabled: phase === 'sending'
          }, [
            React.createElement('svg', {
              key: 'icon',
              width: 14,
              height: 14,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }, [
              React.createElement('path', { key: 'p1', d: 'M23 4v6h-6' }),
              React.createElement('path', { key: 'p2', d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' })
            ]),
            wide && React.createElement('span', { key: 'label', className: 'dqr-restart__label' }, label),
            wide && React.createElement('span', { key: 'status', className: 'dqr-restart__status' }, statusText),
            React.createElement('span', {
              key: 'dot',
              className: dotCls,
              title: statusText,
              'aria-label': statusText
            })
          ]);
        }));
        return () => disposeSlot();
      }, 'dsh-quick-restart: footer action');
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  }
});
