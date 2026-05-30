export function setProgress(percent, status) {
  const bar    = document.getElementById('loading-bar')
  const label  = document.getElementById('loading-status')
  if (bar)   bar.style.width = `${percent}%`
  if (label) label.textContent = status ?? ''
}
