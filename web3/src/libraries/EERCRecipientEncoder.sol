// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library EERCRecipientEncoder {
    // Simple encoding format (MVP aligned to AvaCloud SDK expectations):
    // bytes:
    // [0..31]   chainId (uint256 big-endian)
    // [32..63]  babyJubJub public key X (left-padded to 32 bytes)
    // [64..95]  babyJubJub public key Y (left-padded to 32 bytes)
    // [96..127] nonce (uint256)
    // [128..]   arbitrary metadata bytes (could include memo/version)

    function encode(
        uint256 chainId,
        bytes32 pubKeyX,
        bytes32 pubKeyY,
        uint256 nonce,
        bytes memory metadata
    ) internal pure returns (bytes memory out) {
        out = new bytes(128 + metadata.length);
        assembly {
            mstore(add(out, 32), chainId)
            mstore(add(out, 64), pubKeyX)
            mstore(add(out, 96), pubKeyY)
            mstore(add(out, 128), nonce)
        }
        if (metadata.length > 0) {
            // copy metadata into out starting at offset 160 (128 + 32 for length)
            uint256 dest;
            uint256 src;
            assembly {
                dest := add(out, 160)
                src := add(metadata, 32)
            }
            _memcpy(dest, src, metadata.length);
        }
    }

    function _memcpy(uint256 dest, uint256 src, uint256 len) private pure {
        // copy 32-byte chunks
        for (uint256 i = 0; i < len; i += 32) {
            bytes32 chunk;
            assembly {
                chunk := mload(add(src, i))
                mstore(add(dest, i), chunk)
            }
        }
    }
}


