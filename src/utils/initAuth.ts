// Define a list of auth-related storage keys
const AUTH_KEYS = ['token', 'refreshToken', 'username', 'roles', 'userId', 'remember', 'accessToken'];

// Save reference to original Storage prototype methods
const originalGet = Storage.prototype.getItem;
const originalSet = Storage.prototype.setItem;
const originalRemove = Storage.prototype.removeItem;
const originalClear = Storage.prototype.clear;

// Override getItem
Storage.prototype.getItem = function (this: Storage, key: string): string | null {
  if (this === window.localStorage && AUTH_KEYS.includes(key)) {
    // If 'remember' is true in localStorage, we can use the persisted value
    const isRemember = originalGet.call(window.localStorage, 'remember') === 'true';
    if (isRemember) {
      return originalGet.call(window.localStorage, key);
    }
    // Otherwise, check sessionStorage for a tab-scoped session
    return originalGet.call(window.sessionStorage, key);
  }
  return originalGet.call(this, key);
};

// Override setItem
Storage.prototype.setItem = function (this: Storage, key: string, value: string): void {
  if (this === window.localStorage && AUTH_KEYS.includes(key)) {
    // Determine remember me preference
    const isRemember =
      key === 'remember'
        ? value === 'true'
        : originalGet.call(window.sessionStorage, 'remember') === 'true' ||
          originalGet.call(window.localStorage, 'remember') === 'true';

    if (isRemember) {
      originalSet.call(window.localStorage, key, value);
      originalSet.call(window.sessionStorage, key, value);
    } else {
      originalSet.call(window.sessionStorage, key, value);
      originalRemove.call(window.localStorage, key);
    }
    return;
  }
  originalSet.call(this, key, value);
};

// Override removeItem
Storage.prototype.removeItem = function (this: Storage, key: string): void {
  if (this === window.localStorage && AUTH_KEYS.includes(key)) {
    originalRemove.call(window.sessionStorage, key);
    originalRemove.call(window.localStorage, key);
    return;
  }
  originalRemove.call(this, key);
};

// Override clear
Storage.prototype.clear = function (this: Storage): void {
  if (this === window.localStorage) {
    originalClear.call(window.sessionStorage);
    originalClear.call(window.localStorage);
    return;
  }
  originalClear.call(this);
};

export {};
