
export function getData(key, defaultValue) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch {
        return defaultValue;
    }
}

export function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function removeData(key) {
    localStorage.removeItem(key);
}
