const express = require('express');
const router = express.Router();
const SelfService = require('../services/SelfService');
const { User, KYCSession, createOrUpdateUserKYC } = require('../models');

// Initialize services
const selfService = new SelfService();
console.log('✅ KYC routes loaded - validateWalletAddress middleware removed');

// ========================================
// Middleware
// ========================================

// Basic request validation middleware
const validateRequest = (req, res, next) => {
  req.requestId = req.requestId || Math.random().toString(36).substring(2, 15);
  next();
};

// User authentication middleware (implement based on your auth system)
const authenticateUser = (req, res, next) => {
  // TODO: Implement your authentication logic here
  // For now, we'll extract user info from headers or token

  const userId = req.headers['x-user-id'] || req.query.userId;
  const userEmail = req.headers['x-user-email'] || req.query.userEmail;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User ID is required. Set x-user-id header or userId query parameter.',
      requestId: req.requestId,
    });
  }

  req.user = {
    id: userId,
    email: userEmail,
  };

  next();
};


// ========================================
// Onchain KYC Routes
// ========================================

/**
 * Initiate onchain KYC verification
 * POST /api/kyc/onchain/initiate
 */
router.post('/onchain/initiate', validateRequest, authenticateUser, async (req, res) => {
  try {
    const { walletAddress, requirements = {} } = req.body;
    const userId = req.user.id;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        requestId: req.requestId,
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        requestId: req.requestId,
      });
    }

    console.log(`🚀 KYC initiation request from user ${userId} for wallet ${walletAddress}`);

    // Check if user is already verified
    const existingUser = await User.findByWalletAddress(walletAddress);
    if (existingUser && existingUser.isKYCVerified()) {
      return res.status(400).json({
        success: false,
        error: 'User already verified',
        kycStatus: existingUser.getKYCStatus(),
        requestId: req.requestId,
      });
    }

    // Check for active sessions
    const activeSessions = await KYCSession.findActiveByUser(userId);
    if (activeSessions.length > 0) {
      const activeSession = activeSessions[0];
      return res.status(409).json({
        success: false,
        error: 'Active verification session exists',
        sessionId: activeSession.sessionId,
        status: activeSession.status,
        expiresAt: activeSession.timings.expiresAt,
        requestId: req.requestId,
      });
    }

    // Validate requirements
    const validationResult = selfService.validateRequirements(requirements);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification requirements',
        details: validationResult.errors,
        supportedConfig: validationResult.supportedConfig,
        requestId: req.requestId,
      });
    }

    // Initiate KYC with Self service
    const result = await selfService.initiateOnchainKYC(userId, walletAddress, requirements);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.requestId,
      });
    }

    // Create KYC session
    const kycSession = new KYCSession({
      sessionId: result.session.sessionId,
      userId: userId,
      userEmail: req.user.email,
      walletAddress: walletAddress,
      status: 'qr_generated',
      method: 'self_onchain',
      requirements: result.session.requirements,
      selfData: {
        scope: result.sessionData.scope,
        configId: result.sessionData.configId,
        qrCodeData: new Map(Object.entries(result.sessionData)),
      },
      timings: {
        createdAt: new Date(),
        qrGeneratedAt: new Date(),
        expiresAt: result.session.expiresAt,
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
      },
    });

    await kycSession.save();
    await kycSession.addTimelineEvent('session_created', {
      userId,
      walletAddress,
      method: 'self_onchain',
    });

    console.log(`✅ KYC session created: ${kycSession.sessionId}`);

    res.json({
      success: true,
      sessionData: result.sessionData,
      session: {
        sessionId: kycSession.sessionId,
        status: kycSession.status,
        expiresAt: kycSession.timings.expiresAt,
        progressPercentage: kycSession.progressPercentage,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ KYC initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to initiate KYC',
      requestId: req.requestId,
    });
  }
});

/**
 * Enhanced Self.xyz verification webhook endpoint
 * POST /api/kyc/onchain/verify
 */
router.post('/onchain/verify', validateRequest, async (req, res) => {
  try {
    const verificationData = req.body;
    const signature = req.headers['x-self-signature'] || req.headers[process.env.WEBHOOK_SIGNATURE_HEADER || 'x-signature'];
    const sessionId = req.headers['x-session-id'] || verificationData.sessionId;

    console.log('🔄 Received Self verification webhook for session:', sessionId);

    // Validate session exists
    const session = await KYCSession.findBySessionId(sessionId);
    if (!session) {
      console.error('❌ Session not found:', sessionId);
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requestId: req.requestId,
      });
    }

    // Process verification using Self service
    const result = await selfService.processVerification(verificationData, signature);

    if (!result.success) {
      console.error('❌ Verification processing failed:', result.error);
      
      // Update session with error
      await session.updateOne({
        status: 'verification_failed',
        'timings.failedAt': new Date(),
        error: result.error
      });
      
      await session.addTimelineEvent('verification_failed', {
        error: result.error,
        details: result.details
      });

      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.requestId,
      });
    }

    // Update session with successful verification
    await session.updateOne({
      status: 'verification_completed',
      'timings.verifiedAt': new Date(),
      verificationResult: result.verificationData,
      onchainData: result.onchainData
    });

    await session.addTimelineEvent('verification_completed', {
      nationality: result.verificationData.nationality,
      documentType: result.verificationData.documentType,
      isOfacClear: result.verificationData.isOfacClear,
      onchainTxHash: result.onchainData?.transactionHash
    });

    // Update user KYC status
    await createOrUpdateUserKYC(
      session.userId,
      session.walletAddress,
      result.verificationData,
      result.onchainData
    );

    console.log(`✅ KYC verification completed for session: ${sessionId}`);

    res.json({
      success: true,
      message: 'Verification completed successfully',
      sessionId: sessionId,
      status: 'verification_completed',
      verificationData: {
        nationality: result.verificationData.nationality,
        documentType: result.verificationData.documentType,
        isOfacClear: result.verificationData.isOfacClear,
        verificationCount: result.verificationData.verificationCount,
        timestamp: result.verificationData.timestamp
      },
      onchainData: result.onchainData,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Verification webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to process verification',
      requestId: req.requestId,
    });
  }
});

/**
 * Poll verification status
 * GET /api/kyc/onchain/poll/:sessionId
 */
router.get('/onchain/poll/:sessionId', validateRequest, async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`🔄 Polling status for session: ${sessionId}`);

    const session = await KYCSession.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requestId: req.requestId,
      });
    }

    // Check if session has expired
    const now = new Date();
    if (session.timings.expiresAt < now) {
      await session.updateOne({
        status: 'expired',
        'timings.expiredAt': now
      });

      await session.addTimelineEvent('session_expired', {
        expiredAt: now
      });

      return res.json({
        success: true,
        status: 'expired',
        message: 'Session has expired',
        sessionId: sessionId,
        requestId: req.requestId,
      });
    }

    // Return current session status
    const response = {
      success: true,
      status: session.status,
      sessionId: sessionId,
      progressPercentage: session.progressPercentage,
      expiresAt: session.timings.expiresAt,
      requestId: req.requestId,
    };

    // Add verification data if completed
    if (session.status === 'verification_completed' && session.verificationResult) {
      response.verificationData = {
        nationality: session.verificationResult.nationality,
        documentType: session.verificationResult.documentType,
        isOfacClear: session.verificationResult.isOfacClear,
        verificationCount: session.verificationResult.verificationCount,
        timestamp: session.verificationResult.timestamp
      };
      
      response.onchainData = session.onchainData;
    }

    // Add error if failed
    if (session.status === 'verification_failed' && session.error) {
      response.error = session.error;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Poll status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to poll status',
      requestId: req.requestId,
    });
  }
});

/**
 * Simulate mobile app scan (development only)
 * POST /api/kyc/onchain/simulate-scan
 */
router.post('/onchain/simulate-scan', validateRequest, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not available in production',
      requestId: req.requestId,
    });
  }

  try {
    const { sessionId, mockUserData } = req.body;

    console.log(`🧪 Simulating scan for session: ${sessionId}`);

    const session = await KYCSession.findBySessionId(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requestId: req.requestId,
      });
    }

    // Update session to scanned status
    await session.updateOne({
      status: 'app_processing',
      'timings.scannedAt': new Date()
    });

    await session.addTimelineEvent('qr_scanned', {
      simulatedScan: true,
      mockData: !!mockUserData
    });

    // Simulate processing delay
    setTimeout(async () => {
      try {
        // Generate mock verification data
        const mockVerificationData = {
          nullifier: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          userIdentifier: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          nationality: mockUserData?.nationality || 'US',
          documentType: mockUserData?.documentType || 1,
          ageAtLeast: mockUserData?.ageAtLeast || 25,
          isOfacMatch: mockUserData?.isOfacMatch || false,
          attestationId: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          proof: '0x' + Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          timestamp: Date.now(),
          verificationCount: 1
        };

        const mockOnchainData = {
          transactionHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          blockNumber: Math.floor(Math.random() * 1000000) + 20000000,
          gasUsed: '125000',
          network: 'Celo Alfajores',
          contractAddress: '0x31fE360492189a0c03BACaE36ef9be682Ad3727B'
        };

        // Complete verification
        await session.updateOne({
          status: 'verification_completed',
          'timings.verifiedAt': new Date(),
          verificationResult: mockVerificationData,
          onchainData: mockOnchainData
        });

        await session.addTimelineEvent('verification_completed', {
          simulatedVerification: true,
          nationality: mockVerificationData.nationality,
          documentType: mockVerificationData.documentType,
          isOfacClear: !mockVerificationData.isOfacMatch,
          onchainTxHash: mockOnchainData.transactionHash
        });

        // Update user KYC status
        await createOrUpdateUserKYC(
          session.userId,
          session.walletAddress,
          mockVerificationData,
          mockOnchainData
        );

        console.log(`✅ Mock verification completed for session: ${sessionId}`);
      } catch (error) {
        console.error('❌ Mock verification error:', error);
        
        await session.updateOne({
          status: 'verification_failed',
          'timings.failedAt': new Date(),
          error: 'Mock verification failed'
        });
      }
    }, 3000); // 3 second delay

    res.json({
      success: true,
      message: 'QR code scan simulated',
      sessionId: sessionId,
      status: 'app_processing',
      expectedCompletion: new Date(Date.now() + 3000),
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Simulate scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to simulate scan',
      requestId: req.requestId,
    });
  }
});
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.requestId,
      });
    }

    const { user: userData, verificationResult, onchainResult } = result;

    // Find and update the KYC session
    const session = await KYCSession.findOne({
      walletAddress: userData.walletAddress,
      status: { $in: ['qr_generated', 'qr_scanned', 'in_progress', 'proof_submitted'] },
    }).sort({ 'timings.createdAt': -1 });

    if (session) {
      await session.updateStatus('blockchain_confirmed', {
        transactionHash: userData.transactionHash,
      });

      await session.updateVerificationResults({
        nullifier: verificationResult.nullifier,
        userIdentifier: verificationResult.userIdentifier,
        nationality: verificationResult.nationality,
        documentType: verificationResult.documentType,
        ageAtLeast: verificationResult.ageAtLeast,
        isOfacMatch: verificationResult.isOfacMatch,
        isOfacClear: !verificationResult.isOfacMatch,
      });

      await session.updateBlockchainData({
        transactionHash: userData.transactionHash,
        blockNumber: onchainResult.blockNumber,
        gasUsed: onchainResult.gasUsed,
      });
    }

    // Create or update user record
    const user = await createOrUpdateUserKYC(
      verificationData.userContextData?.userId || userData.walletAddress,
      userData.walletAddress,
      {
        nullifier: verificationResult.nullifier,
        transactionHash: userData.transactionHash,
        blockNumber: onchainResult.blockNumber,
        nationality: verificationResult.nationality,
        documentType: verificationResult.documentType,
        ageAtLeast: verificationResult.ageAtLeast,
        isOfacClear: !verificationResult.isOfacMatch,
        email: verificationData.userContextData?.email,
      },
      session?.sessionId
    );

    console.log(`✅ KYC verification completed for ${userData.walletAddress}`);

    res.json({
      success: true,
      message: 'KYC verification completed successfully',
      user: {
        walletAddress: userData.walletAddress,
        isVerified: true,
        verifiedAt: userData.verifiedAt,
        nationality: userData.nationality,
        transactionHash: userData.transactionHash,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Verification webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Verification processing failed',
      requestId: req.requestId,
    });
  }
});

/**
 * Get onchain KYC status for a wallet address
 * GET /api/kyc/onchain/status/:walletAddress
 */
router.get('/onchain/status/:walletAddress', validateRequest, async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        requestId: req.requestId,
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        requestId: req.requestId,
      });
    }

    console.log(`🔍 Checking KYC status for ${walletAddress}`);

    // Get onchain status from Self service (which queries the smart contract)
    const onchainResult = await selfService.getOnchainKYCStatus(walletAddress);

    if (!onchainResult.success) {
      return res.status(500).json({
        success: false,
        error: onchainResult.error,
        requestId: req.requestId,
      });
    }

    // Get user data from database
    const userWithKYC = await User.findByWalletAddress(walletAddress);

    // Get recent session data
    const recentSessions = await KYCSession.findByWalletAddress(walletAddress)
      .limit(3)
      .select('sessionId status timings.createdAt timings.sessionCompletedAt blockchainData.transactionHash')
      .sort({ 'timings.createdAt': -1 });

    const kycStatus = {
      walletAddress,
      isVerified: onchainResult.kycData.isVerified,

      // Onchain data (source of truth)
      onchain: onchainResult.kycData,

      // Database data (additional context)
      user: userWithKYC ? {
        userId: userWithKYC.userId,
        email: userWithKYC.email,
        kycStatus: userWithKYC.getKYCStatus(),
        primaryWallet: userWithKYC.primaryWallet,
      } : null,

      // Recent activity
      recentSessions: recentSessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        createdAt: session.timings.createdAt,
        completedAt: session.timings.sessionCompletedAt,
        transactionHash: session.blockchainData?.transactionHash,
      })),

      // Metadata
      lastCheckedAt: new Date(),
      requestId: req.requestId,
    };

    res.json({
      success: true,
      kycStatus,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching KYC status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to fetch KYC status',
      requestId: req.requestId,
    });
  }
});

/**
 * Get KYC session details
 * GET /api/kyc/onchain/session/:sessionId
 */
router.get('/onchain/session/:sessionId', validateRequest, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await KYCSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requestId: req.requestId,
      });
    }

    res.json({
      success: true,
      session: session.getSummary(),
      timeline: session.timeline,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Get verification statistics
 * GET /api/kyc/onchain/statistics
 */
router.get('/onchain/statistics', validateRequest, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30d';

    // Get statistics from Self service (contract data)
    const contractStats = await selfService.getVerificationStatistics();

    // Get database statistics
    const dbStats = await KYCSession.getStatistics(timeframe);

    res.json({
      success: true,
      statistics: {
        contract: contractStats.success ? contractStats.statistics : null,
        sessions: dbStats,
        timeframe,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Get supported configuration
 * GET /api/kyc/onchain/config
 */
router.get('/onchain/config', validateRequest, async (req, res) => {
  try {
    const selfConfig = selfService.getCurrentConfiguration();
    const networkInfo = selfService.getNetworkInfo();
    const documentTypes = selfService.getSupportedDocumentTypes();

    res.json({
      success: true,
      configuration: {
        self: selfConfig,
        network: networkInfo,
        documentTypes,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Health check for KYC services
 * GET /api/kyc/health
 */
router.get('/health', validateRequest, async (req, res) => {
  try {
    const healthCheck = await selfService.healthCheck();

    res.json({
      success: true,
      health: healthCheck,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      requestId: req.requestId,
    });
  }
});

// ========================================
// Error Handling
// ========================================

// Handle 404 for KYC routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'KYC endpoint not found',
    availableEndpoints: [
      'POST /api/kyc/onchain/initiate',
      'POST /api/kyc/onchain/verify',
      'GET /api/kyc/onchain/status/:walletAddress',
      'GET /api/kyc/onchain/session/:sessionId',
      'GET /api/kyc/onchain/statistics',
      'GET /api/kyc/onchain/config',
      'GET /api/kyc/health',
    ],
    requestId: req.requestId,
  });
});

module.exports = router;