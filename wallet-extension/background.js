/**
 * VibeCoin Wallet Extension - Background Service Worker
 * Handles persistent state and cross-tab communication
 */

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('VibeCoin Wallet installed');

  // Set default settings
  chrome.storage.local.get(['vibecoin_settings'], (result) => {
    if (!result.vibecoin_settings) {
      chrome.storage.local.set({
        vibecoin_settings: {
          nodeUrl: 'http://localhost:3000',
          network: 'testnet'
        }
      });
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_BALANCE') {
    // Could implement balance checking here
    sendResponse({ success: true });
  }

  if (request.type === 'TRANSACTION_SENT') {
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Transaction Sent',
      message: `Sent ${request.amount} VIBE successfully!`
    });
    sendResponse({ success: true });
  }

  if (request.type === 'FAUCET_CLAIMED') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Faucet Claimed',
      message: `Received ${request.amount} VIBE from testnet faucet!`
    });
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// Periodic balance check (every 30 seconds)
chrome.alarms.create('checkBalance', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkBalance') {
    // Could implement balance polling here
    console.log('Balance check triggered');
  }
});
