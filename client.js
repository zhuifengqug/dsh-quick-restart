window.__ModuleLoader__.load({
  id: 'dsh-quick-restart',
  factory: () => {
    var module = { exports: {} }
    var mounted = false

    function mount() {
      if (mounted || document.getElementById('dsh-quick-restart-button')) return
      mounted = true
      var button = document.createElement('button')
      button.id = 'dsh-quick-restart-button'
      button.type = 'button'
      button.title = 'Restart DSH'
      button.setAttribute('aria-label', 'Restart DSH')
      button.textContent = '↻'
      Object.assign(button.style, {
        position: 'fixed', top: '44px', right: '12px', zIndex: '70', width: '30px', height: '30px',
        border: '0', borderRadius: '50%', background: 'var(--dsw-alias-bg-layer-3)',
        color: 'var(--dsw-alias-label-secondary)', fontSize: '20px', lineHeight: '30px', cursor: 'pointer',
      })
      button.addEventListener('mouseenter', function () { button.style.background = 'var(--dsw-alias-interactive-bg-hover)' })
      button.addEventListener('mouseleave', function () { button.style.background = 'var(--dsw-alias-bg-layer-3)' })
      button.addEventListener('click', function () {
        if (!window.confirm('Restart DSH? Active work may be interrupted.')) return
        button.disabled = true
        button.textContent = '…'
        fetch('/dsh-quick-restart', { method: 'POST', headers: { 'content-type': 'application/json' } })
          .catch(function () {})
      })
      document.body.appendChild(button)
    }

    function apply() {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true })
      else mount()
    }

    module.exports.apply = apply
    return module.exports
  },
})
