"use client";

import { usePublicClient, useWalletClient, useAccount } from "wagmi";
import { useEERC as useEERCSDK } from "@avalabs/eerc-sdk";
import { CONTRACT_ADDRESSES, CIRCUIT_URLS } from "@/config/contracts";
import { useEffect, useState, useCallback, useRef } from "react";
import { SecureStorage } from "@/lib/crypto";

// Storage keys for persistence
const STORAGE_KEYS = {
    DECRYPTION_KEY: "eerc-decryption-key",
    REGISTRATION_STATUS: "eerc-registration-status",
    USER_PUBLIC_KEY: "eerc-user-public-key",
} as const;

// Registration status type
type RegistrationStatus =
    | "not_started"
    | "key_generated"
    | "registered"
    | "failed";

export function useEERC() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const [decryptionKey, setDecryptionKey] = useState<string | undefined>();
    const [registrationStatus, setRegistrationStatus] =
        useState<RegistrationStatus>("not_started");
    const [transactionHash, setTransactionHash] = useState<
        string | undefined
    >();
    const [logs, setLogs] = useState<
        Array<{
            timestamp: Date;
            level: "info" | "warn" | "error";
            message: string;
            data?: any;
        }>
    >([]);
    const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
    const hasCheckedRegistration = useRef(false);

    // Logging utility with useCallback to prevent re-renders
    const addLog = useCallback(
        (level: "info" | "warn" | "error", message: string, data?: any) => {
            const logEntry = {
                timestamp: new Date(),
                level,
                message,
                data,
            };

            setLogs((prev) => [...prev.slice(-49), logEntry]); // Keep last 50 logs
            console.log(`[eERC ${level.toUpperCase()}]`, message, data || "");
        },
        []
    );

    // Debug circuit URLs
    useEffect(() => {
        addLog("info", "Circuit URLs configuration", {
            circuits: CIRCUIT_URLS,
        });
    }, [addLog]);

    // Initialize eERC SDK
    const eERC = useEERCSDK(
        publicClient as any,
        walletClient as any,
        CONTRACT_ADDRESSES.eERC,
        CIRCUIT_URLS,
        decryptionKey
    );

    // Check registration status on-chain with proper state management
    const checkRegistrationStatus = useCallback(async (): Promise<boolean> => {
        if (!address || !publicClient || isCheckingRegistration) {
            if (!address || !publicClient) {
                addLog(
                    "warn",
                    "Cannot check registration: missing address or client"
                );
            }
            return false;
        }

        setIsCheckingRegistration(true);

        try {
            addLog("info", "Checking on-chain registration status", {
                address,
            });

            // Call the registrar contract to check if user is registered
            const isRegistered = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.registrar as `0x${string}`,
                abi: [
                    {
                        name: "isUserRegistered",
                        type: "function",
                        stateMutability: "view",
                        inputs: [{ name: "user", type: "address" }],
                        outputs: [{ name: "", type: "bool" }],
                    },
                ],
                functionName: "isUserRegistered",
                args: [address as `0x${string}`],
            });

            addLog("info", "Registration status checked", {
                address,
                isRegistered,
            });

            if (isRegistered) {
                setRegistrationStatus("registered");
                SecureStorage.store(
                    STORAGE_KEYS.REGISTRATION_STATUS,
                    "registered"
                );
            }

            hasCheckedRegistration.current = true;
            return isRegistered as boolean;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addLog("error", "Failed to check registration status", {
                error: errorMessage,
                address,
            });
            return false;
        } finally {
            setIsCheckingRegistration(false);
        }
    }, [address, publicClient, isCheckingRegistration, addLog]);

    // Enhanced debug logging
    useEffect(() => {
        const state = {
            address,
            hasPublicClient: !!publicClient,
            hasWalletClient: !!walletClient,
            hasDecryptionKey: !!decryptionKey,
            isInitialized: eERC.isInitialized,
            registrationStatus,
            contractAddress: CONTRACT_ADDRESSES.eERC,
            chainId: publicClient?.chain?.id,
        };

        addLog("info", "eERC Hook State Updated", state);
    }, [
        address,
        publicClient,
        walletClient,
        decryptionKey,
        eERC.isInitialized,
        registrationStatus,
    ]);

    // Load persistent data on mount and verify with blockchain
    useEffect(() => {
        if (!address) return;

        addLog("info", "Loading persistent data for address", { address });

        // Load decryption key
        const storedKey = SecureStorage.retrieve(STORAGE_KEYS.DECRYPTION_KEY);
        if (storedKey) {
            setDecryptionKey(storedKey);
            addLog("info", "Decryption key loaded from storage");
        }

        // Load registration status from storage
        const storedStatus = SecureStorage.retrieve(
            STORAGE_KEYS.REGISTRATION_STATUS
        ) as RegistrationStatus;
        if (storedStatus) {
            setRegistrationStatus(storedStatus);
            addLog("info", "Registration status loaded from storage", {
                status: storedStatus,
            });

            // If stored status says registered, verify with blockchain
            if (
                storedStatus === "registered" &&
                publicClient &&
                !hasCheckedRegistration.current
            ) {
                hasCheckedRegistration.current = true;
                checkRegistrationStatus()
                    .then((isRegisteredOnChain) => {
                        if (!isRegisteredOnChain) {
                            // Stored status is incorrect, reset it
                            addLog(
                                "warn",
                                "Stored registration status incorrect, user not registered on-chain"
                            );
                            setRegistrationStatus("not_started");
                            SecureStorage.store(
                                STORAGE_KEYS.REGISTRATION_STATUS,
                                "not_started"
                            );
                        } else {
                            addLog(
                                "info",
                                "Registration status verified on-chain"
                            );
                        }
                    })
                    .catch((error) => {
                        addLog(
                            "error",
                            "Failed to verify registration status",
                            { error }
                        );
                    });
            }
        } else {
            // No stored status, check blockchain if possible
            if (publicClient && !hasCheckedRegistration.current) {
                hasCheckedRegistration.current = true;
                setTimeout(() => {
                    checkRegistrationStatus()
                        .then((isRegisteredOnChain) => {
                            if (isRegisteredOnChain) {
                                addLog(
                                    "info",
                                    "Found existing registration on-chain"
                                );
                                setRegistrationStatus("registered");
                                SecureStorage.store(
                                    STORAGE_KEYS.REGISTRATION_STATUS,
                                    "registered"
                                );
                            }
                        })
                        .catch((error) => {
                            addLog(
                                "warn",
                                "Could not check registration status",
                                { error }
                            );
                        });
                }, 2000); // Delay to avoid immediate firing
            }
        }
    }, [address, publicClient, checkRegistrationStatus, addLog]);

    // Enhanced registration with comprehensive error handling and logging
    const handleRegister = useCallback(async () => {
        if (!address) {
            const error = new Error("Wallet not connected");
            addLog("error", "Registration failed: No wallet connected");
            throw error;
        }

        addLog("info", "Starting registration process", { address });
        setRegistrationStatus("not_started");

        try {
            addLog("info", "Calling eERC.register()");
            const result = await eERC.register();

            addLog("info", "Registration successful", {
                result: {
                    ...result,
                    key: result.key ? "[REDACTED]" : undefined, // Don't log the actual key
                },
            });

            // Save registration data
            if (result.key) {
                setDecryptionKey(result.key);
                SecureStorage.store(STORAGE_KEYS.DECRYPTION_KEY, result.key);
            }

            if (result.transactionHash) {
                setTransactionHash(result.transactionHash);
                addLog("info", "Registration transaction submitted", {
                    hash: result.transactionHash,
                });
            }

            setRegistrationStatus("registered");
            SecureStorage.store(STORAGE_KEYS.REGISTRATION_STATUS, "registered");

            return result;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addLog("error", "Registration failed", {
                error: errorMessage,
                address,
            });
            setRegistrationStatus("failed");
            SecureStorage.store(STORAGE_KEYS.REGISTRATION_STATUS, "failed");
            throw error;
        }
    }, [address, eERC, addLog]);

    const handleGenerateDecryptionKey = useCallback(async () => {
        if (!address) {
            const error = new Error("Wallet not connected");
            addLog("error", "Key generation failed: No wallet connected");
            throw error;
        }

        addLog("info", "Starting decryption key generation", { address });

        try {
            addLog("info", "Calling eERC.generateDecryptionKey()");
            const key = await eERC.generateDecryptionKey();

            addLog("info", "Decryption key generated successfully");

            setDecryptionKey(key);
            SecureStorage.store(STORAGE_KEYS.DECRYPTION_KEY, key);
            setRegistrationStatus("key_generated");
            SecureStorage.store(
                STORAGE_KEYS.REGISTRATION_STATUS,
                "key_generated"
            );

            return key;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addLog("error", "Key generation failed", {
                error: errorMessage,
                address,
            });
            setRegistrationStatus("failed");
            throw error;
        }
    }, [address, eERC, addLog]);

    // Clear all stored data (for testing/reset)
    const clearStoredData = useCallback(() => {
        addLog("info", "Clearing all stored data");
        SecureStorage.remove(STORAGE_KEYS.DECRYPTION_KEY);
        SecureStorage.remove(STORAGE_KEYS.REGISTRATION_STATUS);
        SecureStorage.remove(STORAGE_KEYS.USER_PUBLIC_KEY);
        setDecryptionKey(undefined);
        setRegistrationStatus("not_started");
        setTransactionHash(undefined);
        setLogs([]);
        hasCheckedRegistration.current = false;
    }, [addLog]);

    return {
        ...eERC,
        register: handleRegister,
        generateDecryptionKey: handleGenerateDecryptionKey,
        checkRegistrationStatus,
        clearStoredData,

        // Enhanced state
        isConnected: !!walletClient && !!address,
        isInitialized: eERC.isInitialized && !!publicClient && !!walletClient,
        isRegistered: registrationStatus === "registered", // Add this for dashboard compatibility
        registrationStatus,
        transactionHash,
        logs,

        // Computed properties
        canRegister:
            !!address &&
            !!walletClient &&
            eERC.isInitialized &&
            registrationStatus === "key_generated",
        canGenerateKey:
            !!address &&
            !!walletClient &&
            eERC.isInitialized &&
            registrationStatus === "not_started",
        isRegistrationComplete: registrationStatus === "registered",

        // Utility functions
        addLog,
    };
}
