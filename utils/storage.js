var StorageManager = {
  get: async function (keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  },
  set: async function (items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  },
  getTodayDate: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};
