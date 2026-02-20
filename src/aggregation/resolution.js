function computeResolutionSummary(forecasts, recordedMaxEntry, conflictThresholdC) {
    const fcstValues = forecasts.map(f => f.value_c);
    const sortedFcsts = [...fcstValues].sort((a, b) => a - b);
    const medC = sortedFcsts.length > 0 ?
        (sortedFcsts.length % 2 !== 0 ?
            sortedFcsts[Math.floor(sortedFcsts.length / 2)] :
            (sortedFcsts[Math.floor(sortedFcsts.length / 2) - 1] + sortedFcsts[Math.floor(sortedFcsts.length / 2)]) / 2)
        : null;

    let resolveReady = false;
    let conflictStr = null;

    if (recordedMaxEntry && recordedMaxEntry.value_c !== undefined) {
        if (medC !== null && Math.abs(recordedMaxEntry.value_c - medC) > conflictThresholdC) {
            resolveReady = false;
            conflictStr = `anchor value (${recordedMaxEntry.value_c.toFixed(1)}°C) conflicts with forecast consensus (${medC.toFixed(1)}°C) by >${conflictThresholdC}°C`;
        } else {
            resolveReady = true;
        }
    }

    return {
        anchor_source: recordedMaxEntry ? recordedMaxEntry.source_id : null,
        anchor_value_c: recordedMaxEntry ? recordedMaxEntry.value_c : null,
        anchor_value_f: recordedMaxEntry ? recordedMaxEntry.value_f : null,
        anchor_timestamp: recordedMaxEntry ? recordedMaxEntry.fetched_at : null,
        resolution_ready: resolveReady,
        conflict_reason: conflictStr
    };
}

module.exports = { computeResolutionSummary };
