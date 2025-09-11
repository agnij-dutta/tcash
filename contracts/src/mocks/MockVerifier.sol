// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVerifier} from "../interfaces/IVerifier.sol";

contract MockVerifier is IVerifier {
    bool public shouldVerify;
    constructor(bool _shouldVerify) { shouldVerify = _shouldVerify; }
    function setShouldVerify(bool v) external { shouldVerify = v; }
    function verifyProof(bytes calldata, uint256[] calldata) external view returns (bool) { return shouldVerify; }
}




