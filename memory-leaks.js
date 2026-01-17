// Memory Leak Demo - JavaScript Implementation
// This script intentionally creates various types of memory leaks for educational purposes

// Global variables to track leaks
let activeTimers = [];
let globalLeakObjects = [];
let eventListenerElements = [];
let closureLeaks = [];
let domReferenceLeaks = [];
let leakCount = 0;

// Memory monitoring
let memoryCheckInterval;

// Initialize memory monitoring when page loads
document.addEventListener('DOMContentLoaded', function() {
    startMemoryMonitoring();
    updateLeakCounters();
});

// ======================
// MEMORY MONITORING
// ======================

function startMemoryMonitoring() {
    memoryCheckInterval = setInterval(updateMemoryStats, 2000);
}

function updateMemoryStats() {
    const memoryInfo = document.getElementById('memoryInfo');
    
    // Check if performance.memory is available (Chrome/Edge)
    if (performance.memory) {
        const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
        const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
        const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
        
        memoryInfo.innerHTML = `
            <div>Used: ${used} MB</div>
            <div>Total: ${total} MB</div>
            <div>Limit: ${limit} MB</div>
            <div>Usage: ${((used/total) * 100).toFixed(1)}%</div>
        `;
    } else {
        memoryInfo.innerHTML = `
            <div>Memory API not available in this browser</div>
            <div>Use Chrome/Edge for detailed memory stats</div>
            <div>Or check DevTools Memory tab</div>
        `;
    }
}

function updateLeakCounters() {
    document.getElementById('leakCount').textContent = leakCount;
    document.getElementById('timerCount').textContent = activeTimers.length;
    document.getElementById('globalCount').textContent = globalLeakObjects.length;
    document.getElementById('closureCount').textContent = closureLeaks.length;
    document.getElementById('domRefCount').textContent = domReferenceLeaks.length;
}

// ======================
// 1. EVENT LISTENER LEAKS
// ======================

function createEventListenerLeak() {
    const container = document.createElement('div');
    container.innerHTML = `<button>Leaked Button ${Date.now()}</button>`;
    container.style.display = 'none'; // Hidden but still in memory
    
    // Add event listener WITHOUT proper cleanup
    const button = container.querySelector('button');
    
    // This creates a closure that references large data
    const largeData = new Array(100000).fill('leaked data');
    
    function leakyHandler() {
        // This closure captures largeData and button
        console.log('Leaked event fired!', largeData.length);
        // The handler references large data, preventing garbage collection
    }
    
    button.addEventListener('click', leakyHandler);
    
    // Add to DOM temporarily then remove (but listener remains)
    document.body.appendChild(container);
    setTimeout(() => {
        document.body.removeChild(container);
        // BUG: We didn't remove the event listener!
        // button.removeEventListener('click', leakyHandler);
    }, 100);
    
    eventListenerElements.push({ container, button, largeData });
    leakCount++;
    updateLeakCounters();
    
    const status = document.getElementById('eventListenerStatus');
    status.innerHTML = `<span style="color: #FF6B6B;">Created event listener leak! Elements: ${eventListenerElements.length}</span>`;
}

function fixEventListenerLeak() {
    // Properly cleanup event listeners
    eventListenerElements.forEach(({ button }) => {
        if (button && button.parentNode) {
            button.parentNode.removeChild(button);
        }
    });
    
    eventListenerElements = [];
    leakCount = Math.max(0, leakCount - 1);
    updateLeakCounters();
    
    const status = document.getElementById('eventListenerStatus');
    status.innerHTML = `<span style="color: #2ED573;">Event listeners cleaned up properly!</span>`;
}

// ======================
// 2. TIMER/INTERVAL LEAKS
// ======================

function createTimerLeak() {
    // Create multiple timers that never get cleared
    const largeArray = new Array(50000).fill('timer data');
    
    // Leaky setInterval
    const intervalId = setInterval(() => {
        // This function holds reference to largeArray
        console.log('Leaked timer tick:', largeArray.length);
        // Simulate some work that prevents GC
        const temp = largeArray.map(x => x + Math.random());
    }, 1000);
    
    // Leaky setTimeout chain
    function leakyTimeout() {
        setTimeout(() => {
            console.log('Leaked timeout:', largeArray.length);
            leakyTimeout(); // Creates infinite chain
        }, 2000);
    }
    leakyTimeout();
    
    activeTimers.push({ intervalId, type: 'interval' });
    activeTimers.push({ type: 'timeout-chain', largeArray });
    
    leakCount++;
    updateLeakCounters();
    
    console.log('Created timer leak! Active timers:', activeTimers.length);
}

function clearAllTimers() {
    // Clear all tracked intervals
    activeTimers.forEach(timer => {
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
        }
    });
    
    activeTimers = [];
    leakCount = Math.max(0, leakCount - activeTimers.length);
    updateLeakCounters();
    
    console.log('All timers cleared!');
}

// ======================
// 3. GLOBAL VARIABLE LEAKS
// ======================

function createGlobalLeak() {
    // Create large objects in global scope
    const leakId = Date.now();
    
    // This creates a global variable (bad!)
    window[`globalLeak_${leakId}`] = {
        id: leakId,
        massiveData: new Array(100000).fill(`Global leak data ${leakId}`),
        nestedObjects: Array.from({length: 1000}, (_, i) => ({
            id: i,
            data: new Array(100).fill(`nested data ${i}`)
        })),
        timestamp: Date.now()
    };
    
    // Also add to our tracking array
    globalLeakObjects.push(`globalLeak_${leakId}`);
    
    leakCount++;
    updateLeakCounters();
    
    console.log(`Created global variable leak: globalLeak_${leakId}`);
}

function clearGlobalLeaks() {
    // Remove all global leak objects
    globalLeakObjects.forEach(leakName => {
        delete window[leakName];
    });
    
    globalLeakObjects = [];
    leakCount = Math.max(0, leakCount - globalLeakObjects.length);
    updateLeakCounters();
    
    console.log('Global variable leaks cleared!');
}

// ======================
// 4. CLOSURE LEAKS
// ======================

function createClosureLeak() {
    const largeData = new Array(200000).fill('closure data');
    const metadata = {
        created: Date.now(),
        size: largeData.length,
        type: 'closure-leak'
    };
    
    // Create closure that captures large data
    function createLeakyClosure() {
        // This closure captures largeData and metadata
        return function() {
            // Even though this function might never be called,
            // the closure keeps largeData alive
            return `Closure with ${largeData.length} items, created at ${metadata.created}`;
        };
    }
    
    const leakyClosure = createLeakyClosure();
    
    // Store the closure (preventing GC)
    closureLeaks.push({
        closure: leakyClosure,
        metadata: metadata,
        largeData: largeData // Direct reference also prevents GC
    });
    
    leakCount++;
    updateLeakCounters();
    
    console.log('Created closure leak with', largeData.length, 'items');
}

function clearClosureLeaks() {
    // Clear all closure references
    closureLeaks = [];
    leakCount = Math.max(0, leakCount - 1);
    updateLeakCounters();
    
    console.log('Closure leaks cleared!');
}

// ======================
// 5. DOM REFERENCE LEAKS
// ======================

function createDOMRefLeak() {
    // Create DOM elements
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="leak-container">
            <h4>Leaked DOM Element ${Date.now()}</h4>
            <p>This element has been removed from DOM but still referenced in JS</p>
            <ul>
                ${Array.from({length: 100}, (_, i) => `<li>Item ${i}</li>`).join('')}
            </ul>
        </div>
    `;
    
    // Add to DOM temporarily
    document.body.appendChild(container);
    
    // Get references to child elements
    const allElements = container.querySelectorAll('*');
    const elementRefs = Array.from(allElements);
    
    // Remove from DOM but keep references
    setTimeout(() => {
        document.body.removeChild(container);
        // BUG: We still hold references to removed elements!
    }, 500);
    
    // Store references (preventing GC of removed elements)
    domReferenceLeaks.push({
        container: container,
        elements: elementRefs,
        timestamp: Date.now()
    });
    
    leakCount++;
    updateLeakCounters();
    
    console.log('Created DOM reference leak with', elementRefs.length, 'referenced elements');
}

function clearDOMRefs() {
    // Clear all DOM references
    domReferenceLeaks = [];
    leakCount = Math.max(0, leakCount - 1);
    updateLeakCounters();
    
    console.log('DOM reference leaks cleared!');
}

// ======================
// MEMORY MANAGEMENT TOOLS
// ======================

function forceGarbageCollection() {
    if (window.gc) {
        window.gc();
        console.log('Forced garbage collection (manual GC)');
    } else {
        console.log('Manual GC not available. Run Chrome with --js-flags="--expose-gc" to enable');
        alert('Manual GC not available. Run Chrome with --js-flags="--expose-gc" to enable manual garbage collection.');
    }
}

function generateMemoryPressure() {
    // Create temporary memory pressure to trigger GC
    console.log('Generating memory pressure...');
    
    const pressureArrays = [];
    for (let i = 0; i < 10; i++) {
        pressureArrays.push(new Array(1000000).fill(`pressure-data-${i}`));
    }
    
    setTimeout(() => {
        // Let arrays go out of scope to be garbage collected
        console.log('Memory pressure released, GC should trigger soon');
    }, 1000);
}

// ======================
// UTILITY FUNCTIONS
// ======================

// Helper to demonstrate proper cleanup
function demonstrateProperCleanup() {
    console.log(`
=== PROPER CLEANUP TECHNIQUES ===

1. Event Listeners:
   ✅ element.removeEventListener('click', handler);
   ✅ Use AbortController for modern cleanup

2. Timers:
   ✅ clearInterval(intervalId);
   ✅ clearTimeout(timeoutId);

3. Global Variables:
   ✅ delete window.variableName;
   ✅ variableName = null;

4. Closures:
   ✅ Set closure references to null
   ✅ Avoid capturing unnecessary variables

5. DOM References:
   ✅ Set element references to null after use
   ✅ Use WeakMap for element associations
    `);
}

// Add some helpful console methods
window.memoryLeakDemo = {
    createEventListenerLeak,
    createTimerLeak,
    createGlobalLeak,
    createClosureLeak,
    createDOMRefLeak,
    clearAllLeaks: () => {
        fixEventListenerLeak();
        clearAllTimers();
        clearGlobalLeaks();
        clearClosureLeaks();
        clearDOMRefs();
        leakCount = 0;
        updateLeakCounters();
    },
    demonstrateProperCleanup,
    stats: () => ({
        totalLeaks: leakCount,
        activeTimers: activeTimers.length,
        globalObjects: globalLeakObjects.length,
        closures: closureLeaks.length,
        domRefs: domReferenceLeaks.length,
        eventListeners: eventListenerElements.length
    })
};

console.log('Memory Leak Demo loaded! Use window.memoryLeakDemo for manual control.');