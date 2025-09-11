// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../interfaces/IVerifier.sol";

contract MockVerifier is IVerifier {
    bool public shouldVerify;
    constructor(bool _shouldVerify) { shouldVerify = _shouldVerify; }
    function setShouldVerify(bool v) external { shouldVerify = v; }
    function verifyProof(
        uint[2] calldata /*_pA*/,
        uint[2][2] calldata /*_pB*/,
        uint[2] calldata /*_pC*/,
        uint[3] calldata /*_pubSignals*/
    ) external view override returns (bool) { 
        return shouldVerify; 
    }
}




