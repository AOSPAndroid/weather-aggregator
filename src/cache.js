class Cache {
    constructor() {
        this.store = {}; // key: city -> data
    }

    set(city, data) {
        this.store[city] = {
            data,
            timestamp: Date.now()
        };
    }

    get(city) {
        const entry = this.store[city];
        if (!entry) return null;

        const ageMinutes = Math.floor((Date.now() - entry.timestamp) / 60000);
        return {
            data: entry.data,
            ageMinutes,
            stale: ageMinutes > 30 // Mark overall stale if older than 30 mins
        };
    }
}

module.exports = new Cache();
