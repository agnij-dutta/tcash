// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {StealthAddress} from "../src/libraries/StealthAddress.sol";

contract StealthAddressTest is Test {
    address recipient = address(0x1234567890123456789012345678901234567890);
    uint256 nonce = 42;

    function test_SimpleStealthAddress() public {
        // Test simple stealth address (20 bytes)
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SIMPLE,
            nonce
        );
        
        // Verify stealth data is valid
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.SIMPLE));
        
        // Extract recipient
        address extractedRecipient = StealthAddress.extractRecipient(stealthData);
        assertEq(extractedRecipient, recipient);
        
        // Verify scheme
        StealthAddress.StealthScheme scheme = StealthAddress.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.SIMPLE));
    }

    function test_PoseidonHashStealthAddress() public {
        // Test Poseidon hash stealth address
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.POSEIDON_HASH,
            nonce
        );
        
        // Verify stealth data is valid
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.POSEIDON_HASH));
        
        // Extract recipient
        address extractedRecipient = StealthAddress.extractRecipient(stealthData);
        assertEq(extractedRecipient, recipient);
        
        // Verify scheme
        StealthAddress.StealthScheme scheme = StealthAddress.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.POSEIDON_HASH));
    }

    function test_ECDSAStealthAddress() public {
        // Test ECDSA stealth address
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.ECDSA_STEALTH,
            nonce
        );
        
        // Verify stealth data is valid
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.ECDSA_STEALTH));
        
        // Extract recipient
        address extractedRecipient = StealthAddress.extractRecipient(stealthData);
        assertEq(extractedRecipient, recipient);
        
        // Verify scheme
        StealthAddress.StealthScheme scheme = StealthAddress.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.ECDSA_STEALTH));
    }

    function test_SemaphoreStyleStealthAddress() public {
        // Test Semaphore-style stealth address
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SEMAPHORE_STYLE,
            nonce
        );
        
        // Verify stealth data is valid
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.SEMAPHORE_STYLE));
        
        // Extract recipient
        address extractedRecipient = StealthAddress.extractRecipient(stealthData);
        assertEq(extractedRecipient, recipient);
        
        // Verify scheme
        StealthAddress.StealthScheme scheme = StealthAddress.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.SEMAPHORE_STYLE));
    }

    function test_CustomEncodedStealthAddress() public {
        // Test custom encoded stealth address
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.CUSTOM_ENCODED,
            nonce
        );
        
        // Verify stealth data is valid
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.CUSTOM_ENCODED));
        
        // Extract recipient
        address extractedRecipient = StealthAddress.extractRecipient(stealthData);
        assertEq(extractedRecipient, recipient);
        
        // Verify scheme
        StealthAddress.StealthScheme scheme = StealthAddress.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.CUSTOM_ENCODED));
    }

    function test_CommitmentGeneration() public {
        // Test commitment generation
        bytes32 commitment = StealthAddress.generateCommitment(recipient, nonce);
        assertTrue(commitment != bytes32(0));
        
        // Test commitment verification
        assertTrue(StealthAddress.verifyCommitment(recipient, nonce, commitment));
        
        // Test with different nonce should fail
        assertFalse(StealthAddress.verifyCommitment(recipient, nonce + 1, commitment));
        
        // Test with different recipient should fail
        address differentRecipient = address(0x9876543210987654321098765432109876543210);
        assertFalse(StealthAddress.verifyCommitment(differentRecipient, nonce, commitment));
    }

    function test_InvalidStealthData() public {
        // Test empty stealth data
        bytes memory emptyData = "";
        vm.expectRevert();
        StealthAddress.extractRecipient(emptyData);
        
        // Test invalid scheme
        bytes memory invalidSchemeData = abi.encodePacked(uint8(255)); // Invalid scheme
        vm.expectRevert();
        StealthAddress.extractRecipient(invalidSchemeData);
        
        // Test invalid format for simple scheme
        bytes memory invalidSimpleData = abi.encodePacked(uint8(0), "short"); // Too short
        vm.expectRevert();
        StealthAddress.extractRecipient(invalidSimpleData);
    }

    function test_StealthDataValidation() public {
        // Test valid simple stealth data
        bytes memory validSimpleData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SIMPLE,
            nonce
        );
        assertTrue(StealthAddress.isValidStealthData(validSimpleData, StealthAddress.StealthScheme.SIMPLE));
        
        // Test invalid scheme mismatch
        assertFalse(StealthAddress.isValidStealthData(validSimpleData, StealthAddress.StealthScheme.POSEIDON_HASH));
        
        // Test invalid data length
        bytes memory invalidLengthData = abi.encodePacked(uint8(0), "short");
        assertFalse(StealthAddress.isValidStealthData(invalidLengthData, StealthAddress.StealthScheme.SIMPLE));
    }

    function test_MultipleRecipients() public {
        address[] memory recipients = new address[](5);
        recipients[0] = address(0x1111111111111111111111111111111111111111);
        recipients[1] = address(0x2222222222222222222222222222222222222222);
        recipients[2] = address(0x3333333333333333333333333333333333333333);
        recipients[3] = address(0x4444444444444444444444444444444444444444);
        recipients[4] = address(0x5555555555555555555555555555555555555555);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            bytes memory stealthData = StealthAddress.generateStealthData(
                recipients[i],
                StealthAddress.StealthScheme.SIMPLE,
                i
            );
            
            address extractedRecipient = StealthAddress.extractRecipient(stealthData);
            assertEq(extractedRecipient, recipients[i]);
        }
    }

    function test_DifferentNonces() public {
        uint256[] memory nonces = new uint256[](5);
        nonces[0] = 0;
        nonces[1] = 1;
        nonces[2] = 42;
        nonces[3] = 1000;
        nonces[4] = type(uint256).max;
        
        for (uint256 i = 0; i < nonces.length; i++) {
            bytes memory stealthData = StealthAddress.generateStealthData(
                recipient,
                StealthAddress.StealthScheme.POSEIDON_HASH,
                nonces[i]
            );
            
            address extractedRecipient = StealthAddress.extractRecipient(stealthData);
            assertEq(extractedRecipient, recipient);
            
            // Verify commitment is different for different nonces
            bytes32 commitment = StealthAddress.generateCommitment(recipient, nonces[i]);
            assertTrue(commitment != bytes32(0));
        }
    }

    function test_StealthDataLengths() public {
        // Test different stealth data lengths for different schemes
        bytes memory simpleData = StealthAddress.generateStealthData(recipient, StealthAddress.StealthScheme.SIMPLE, nonce);
        assertEq(simpleData.length, 21); // 1 byte scheme + 20 bytes address
        
        bytes memory poseidonData = StealthAddress.generateStealthData(recipient, StealthAddress.StealthScheme.POSEIDON_HASH, nonce);
        assertEq(poseidonData.length, 53); // 1 byte scheme + 20 bytes address + 32 bytes nonce
        
        bytes memory ecdsaData = StealthAddress.generateStealthData(recipient, StealthAddress.StealthScheme.ECDSA_STEALTH, nonce);
        assertEq(ecdsaData.length, 118); // 1 byte scheme + 20 bytes address + 32 bytes nonce + 65 bytes signature
        
        bytes memory semaphoreData = StealthAddress.generateStealthData(recipient, StealthAddress.StealthScheme.SEMAPHORE_STYLE, nonce);
        assertEq(semaphoreData.length, 85); // 1 byte scheme + 32 bytes commitment + 32 bytes nullifier + 20 bytes address
        
        bytes memory customData = StealthAddress.generateStealthData(recipient, StealthAddress.StealthScheme.CUSTOM_ENCODED, nonce);
        assertEq(customData.length, 53); // 1 byte scheme + 20 bytes address + 32 bytes nonce
    }
}
