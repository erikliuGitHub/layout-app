import express from 'express';
import * as authController from '../../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate user (mocked)
// @access  Public
router.post('/login', authController.login);

export default router;
