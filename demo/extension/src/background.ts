// Background service worker for the extension
console.log('Stacks Wallet Kit Demo Extension - Background script loaded')

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)
  // Handle messages if needed
  return true
})

