// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {Groth16Verifier} from "../../zk/contracts/verifiers/DepositVerifier.sol";

/**
 * @title DepositVerifierWrapper
 * @dev Wrapper contract that implements IVerifier interface and calls the real DepositVerifier
 */
contract DepositVerifierWrapper is IVerifier {
    Groth16Verifier public immutable depositVerifier;
    
    constructor(address _depositVerifier) {
        depositVerifier = Groth16Verifier(_depositVerifier);
    }
    
    /**
     * @dev Verifies a deposit proof using the real Groth16 verifier
     * @param _pA Proof A component
     * @param _pB Proof B component  
     * @param _pC Proof C component
     * @param _pubSignals Public signals [commitment, token, denominationId]
     * @return true if proof is valid, false otherwise
     */
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external view override returns (bool) {
        return depositVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
    }
}
