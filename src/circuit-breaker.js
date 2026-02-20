const config = require('./config');

class CircuitBreaker {
    constructor() {
        this.states = {}; // key: city_sourceId
    }

    getCircuit(key) {
        if (!this.states[key]) {
            this.states[key] = {
                state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                failures: 0,
                lastFailureTime: null,
            };
        }
        return this.states[key];
    }

    canRequest(key) {
        const circuit = this.getCircuit(key);
        if (circuit.state === 'CLOSED') return true;

        if (circuit.state === 'OPEN') {
            const now = Date.now();
            if (now - circuit.lastFailureTime > config.RELIABILITY.cbResetMs) {
                circuit.state = 'HALF_OPEN';
                return true; // Allow one probe request
            }
            return false;
        }

        if (circuit.state === 'HALF_OPEN') {
            return false; // Probe already out, wait for it
        }

        return true;
    }

    recordSuccess(key) {
        const circuit = this.getCircuit(key);
        circuit.state = 'CLOSED';
        circuit.failures = 0;
    }

    recordFailure(key) {
        const circuit = this.getCircuit(key);
        circuit.failures += 1;
        circuit.lastFailureTime = Date.now();
        if (circuit.failures >= config.RELIABILITY.cbThreshold) {
            circuit.state = 'OPEN';
        }
    }

    getStatus() {
        return this.states;
    }
}

module.exports = new CircuitBreaker();
