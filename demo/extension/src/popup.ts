// Popup script for the extension
document.getElementById('openPlayground')?.addEventListener('click', () => {
  // Open playground in a new full Chrome window (like Leather extension)
  chrome.windows.create({
    url: chrome.runtime.getURL('src/playground.html'),
    type: 'normal',
    width: 1200,
    height: 800,
    focused: true,
  })
})

