var StorageManager = {
  get: async function (keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    });
  },
  set: async function (items) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, resolve);
    });
  },
};
