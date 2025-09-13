// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IEERCConverter} from "../src/interfaces/IEERCConverter.sol";

contract ConfigureEERCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Configuring EERC Converter with account:", deployer);

        // Fuji testnet EERC Converter address
        address converterAddress = 0x372dAB27c8d223Af11C858ea00037Dc03053B22E;
        IEERCConverter converter = IEERCConverter(converterAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Set auditor public key (if you have the private key for the converter owner)
        // Note: This requires the converter owner's private key
        // bytes32 auditorPubKeyX = 0xa8b2d1acbd7dbd138d3114972d3c5b34c104a6b073aace27f328890d8c8195d1;
        // bytes32 auditorPubKeyY = 0x0000000000000000000000000000000000000000000000000000000000000000;
        // converter.setAuditorPublicKey(abi.encodePacked(auditorPubKeyX), abi.encodePacked(auditorPubKeyY));

        console.log("EERC Converter address:", converterAddress);
        console.log("Auditor public key X:", "0xa8b2d1acbd7dbd138d3114972d3c5b34c104a6b073aace27f328890d8c8195d1");
        console.log("Note: Auditor key is already set on the converter");
        console.log("Converter owner:", 0xb73c17CC80527e300D122263D67144112F92e804);

        vm.stopBroadcast();
    }
}
