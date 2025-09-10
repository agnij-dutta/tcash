const { poseidon2 } = require("poseidon-lite");

/**
 * Debug Merkle tree logic by manually computing a 2-level tree
 */
function debugMerkleTree() {
    console.log("🔍 Debugging Merkle Tree Logic");
    console.log("==============================");

    // Create a simple 2-level tree
    const leaf = BigInt("12345");
    console.log("Leaf:", leaf.toString());

    // Level 0 -> 1: Hash leaf with sibling
    const sibling0 = BigInt("67890");
    console.log("Sibling 0:", sibling0.toString());
    
    // Test both left and right positions
    console.log("\n--- Testing leaf as LEFT child (pathIndex=0) ---");
    const level1_left = poseidon2([leaf, sibling0]);
    console.log("Level 1 Hash (leaf left):", level1_left.toString());

    console.log("\n--- Testing leaf as RIGHT child (pathIndex=1) ---");
    const level1_right = poseidon2([sibling0, leaf]);
    console.log("Level 1 Hash (leaf right):", level1_right.toString());

    // Level 1 -> 2: Hash level1 with sibling
    const sibling1 = BigInt("111222");
    console.log("\nSibling 1:", sibling1.toString());

    console.log("\n--- Level 1 LEFT as LEFT child (pathIndex=0) ---");
    const root_ll = poseidon2([level1_left, sibling1]);
    console.log("Root (L,L):", root_ll.toString());

    console.log("\n--- Level 1 LEFT as RIGHT child (pathIndex=1) ---");
    const root_lr = poseidon2([sibling1, level1_left]);
    console.log("Root (L,R):", root_lr.toString());

    console.log("\n--- Level 1 RIGHT as LEFT child (pathIndex=0) ---");
    const root_rl = poseidon2([level1_right, sibling1]);
    console.log("Root (R,L):", root_rl.toString());

    console.log("\n--- Level 1 RIGHT as RIGHT child (pathIndex=1) ---");
    const root_rr = poseidon2([sibling1, level1_right]);
    console.log("Root (R,R):", root_rr.toString());

    return {
        leaf: leaf.toString(),
        scenarios: [
            {
                name: "Leaf Left, Level1 Left",
                pathElements: [sibling0.toString(), sibling1.toString()],
                pathIndices: ["0", "0"],
                expectedRoot: root_ll.toString()
            },
            {
                name: "Leaf Left, Level1 Right", 
                pathElements: [sibling0.toString(), sibling1.toString()],
                pathIndices: ["0", "1"],
                expectedRoot: root_lr.toString()
            },
            {
                name: "Leaf Right, Level1 Left",
                pathElements: [sibling0.toString(), sibling1.toString()],
                pathIndices: ["1", "0"], 
                expectedRoot: root_rl.toString()
            },
            {
                name: "Leaf Right, Level1 Right",
                pathElements: [sibling0.toString(), sibling1.toString()],
                pathIndices: ["1", "1"],
                expectedRoot: root_rr.toString()
            }
        ]
    };
}

/**
 * Manually verify circuit logic
 */
function verifyCircuitLogic(leaf, pathElements, pathIndices, expectedRoot) {
    console.log("\n🧮 Manually Verifying Circuit Logic");
    console.log("===================================");
    console.log("Leaf:", leaf);
    console.log("PathElements:", pathElements);
    console.log("PathIndices:", pathIndices);
    console.log("Expected Root:", expectedRoot);

    let currentHash = BigInt(leaf);
    console.log("\nStep-by-step computation:");
    console.log("Level 0:", currentHash.toString());

    for (let i = 0; i < pathElements.length; i++) {
        const sibling = BigInt(pathElements[i]);
        const pathIndex = parseInt(pathIndices[i]);
        
        console.log(`\nLevel ${i} -> ${i+1}:`);
        console.log(`  Current: ${currentHash.toString()}`);
        console.log(`  Sibling: ${sibling.toString()}`);
        console.log(`  PathIndex: ${pathIndex} (${pathIndex === 0 ? 'current is LEFT' : 'current is RIGHT'})`);

        // Circuit logic: 
        // left = (1 - pathIndex) * current + pathIndex * sibling
        // right = pathIndex * current + (1 - pathIndex) * sibling
        const left = (1n - BigInt(pathIndex)) * currentHash + BigInt(pathIndex) * sibling;
        const right = BigInt(pathIndex) * currentHash + (1n - BigInt(pathIndex)) * sibling;
        
        console.log(`  Left input: ${left.toString()}`);
        console.log(`  Right input: ${right.toString()}`);
        
        currentHash = poseidon2([left, right]);
        console.log(`  Result: ${currentHash.toString()}`);
    }

    const matches = currentHash.toString() === expectedRoot;
    console.log(`\nFinal Root: ${currentHash.toString()}`);
    console.log(`Expected: ${expectedRoot}`);
    console.log(`Match: ${matches ? '✅ YES' : '❌ NO'}`);

    return matches;
}

// Run debug
if (require.main === module) {
    const scenarios = debugMerkleTree();
    
    console.log("\n🧪 Testing Each Scenario:");
    console.log("=========================");
    
    let passCount = 0;
    for (const scenario of scenarios.scenarios) {
        console.log(`\n--- ${scenario.name} ---`);
        const passes = verifyCircuitLogic(
            scenarios.leaf,
            scenario.pathElements,
            scenario.pathIndices,
            scenario.expectedRoot
        );
        if (passes) passCount++;
    }

    console.log(`\n📊 Results: ${passCount}/${scenarios.scenarios.length} scenarios passed`);
    
    if (passCount === scenarios.scenarios.length) {
        console.log("✅ Circuit logic is correct!");
    } else {
        console.log("❌ Circuit logic has issues - need to fix the selector logic");
    }
}

module.exports = { debugMerkleTree, verifyCircuitLogic };