/**
 * Seryvo Platform - OTP Verification Modal
 * Modal for sending and verifying OTP codes during registration/login
 */

import { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import OTPInput from './OTPInput';

interface OTPVerificationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Called when verification is successful with the verification token */
  onVerified: (token: string) => void;
  /** Email or phone to verify */
  identifier: string;
  /** Type of identifier */
  identifierType: 'email' | 'phone';
  /** Purpose of verification */
  purpose?: 'registration' | 'login' | 'password_reset' | 'phone_verify';
  /** Custom title */
  title?: string;
}

type Step = 'sending' | 'input' | 'success' | 'error';

// Simulated API functions (replace with real API calls)
async function sendOTP(
  identifier: string,
  identifierType: 'email' | 'phone',
  _purpose: string
): Promise<{ success: boolean; message: string; expires_in_seconds: number; masked_identifier: string }> {
  // In production, call the real API
  // return await authApi.sendOTP({ identifier, identifier_type: identifierType, purpose });
  
  // Demo simulation
  await new Promise(resolve => setTimeout(resolve, 1500));
  const masked = identifierType === 'email' 
    ? identifier.replace(/^(.{1})(.*)(@.*)$/, '$1***$3')
    : `***-***-${identifier.slice(-4)}`;
  
  // For demo, always succeed
  return {
    success: true,
    message: `Verification code sent to your ${identifierType}`,
    expires_in_seconds: 300,
    masked_identifier: masked,
  };
}

async function verifyOTP(
  identifier: string,
  identifierType: 'email' | 'phone',
  code: string,
  _purpose: string
): Promise<{ success: boolean; message: string; verification_token?: string }> {
  // In production, call the real API
  // return await authApi.verifyOTP({ identifier, identifier_type: identifierType, code, purpose });
  
  // Demo simulation - accept any 6-digit code
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (code.length === 6) {
    return {
      success: true,
      message: 'Verification successful',
      verification_token: 'demo_verification_token_' + Date.now(),
    };
  }
  
  return {
    success: false,
    message: 'Invalid verification code',
  };
}

export default function OTPVerificationModal({
  isOpen,
  onClose,
  onVerified,
  identifier,
  identifierType,
  purpose = 'registration',
  title,
}: OTPVerificationModalProps) {
  const [step, setStep] = useState<Step>('sending');
  const [_code, setCode] = useState('');
  const [error, setError] = useState('');
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [expiresIn, setExpiresIn] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Send OTP when modal opens
  useEffect(() => {
    if (isOpen && step === 'sending') {
      handleSendOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Countdown timer for expiry
  useEffect(() => {
    if (step === 'input' && expiresIn > 0) {
      const timer = setInterval(() => {
        setExpiresIn(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError('Code expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, expiresIn]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 'input') {
      setCanResend(true);
    }
  }, [resendCooldown, step]);

  const handleSendOTP = async () => {
    setStep('sending');
    setError('');
    setCode('');
    setCanResend(false);
    setResendCooldown(60);

    try {
      const result = await sendOTP(identifier, identifierType, purpose);
      if (result.success) {
        setMaskedIdentifier(result.masked_identifier);
        setExpiresIn(result.expires_in_seconds);
        setStep('input');
      } else {
        setError(result.message);
        setStep('error');
      }
    } catch (_err) {
      setError('Failed to send verification code. Please try again.');
      setStep('error');
    }
  };

  const handleVerify = useCallback(async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    
    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyOTP(identifier, identifierType, otpCode, purpose);
      if (result.success && result.verification_token) {
        setStep('success');
        setIsVerifying(false);
        setTimeout(() => {
          onVerified(result.verification_token ?? '');
        }, 1000);
      } else {
        setError(result.message);
        setIsVerifying(false);
        setCode('');
      }
    } catch (_err) {
      setError('Verification failed. Please try again.');
      setIsVerifying(false);
      setCode('');
    }
  }, [identifier, identifierType, purpose, onVerified]);

  const handleResend = () => {
    if (canResend) {
      handleSendOTP();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const modalTitle = title || (
    purpose === 'registration' 
      ? 'Verify Your Email' 
      : purpose === 'phone_verify' 
        ? 'Verify Your Phone' 
        : 'Enter Verification Code'
  );

  const Icon = identifierType === 'email' ? Mail : Phone;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <div className="p-4 sm:p-6">
        {/* Sending State */}
        {step === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600 dark:text-gray-300">
              Sending verification code...
            </p>
          </div>
        )}

        {/* Input State */}
        {step === 'input' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                We sent a verification code to
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {maskedIdentifier}
              </p>
            </div>

            <div className="w-full max-w-xs">
              <OTPInput
                length={6}
                onComplete={handleVerify}
                onChange={setCode}
                error={!!error}
                disabled={isVerifying}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              {expiresIn > 0 ? (
                <p>Code expires in {formatTime(expiresIn)}</p>
              ) : (
                <p className="text-red-500">Code expired</p>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  Resend Code
                </button>
              ) : resendCooldown > 0 ? (
                <p className="text-gray-400 text-sm">
                  Resend in {resendCooldown}s
                </p>
              ) : null}
            </div>

            <Button variant="secondary" onClick={onClose} className="mt-4">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}

        {/* Verifying State */}
        {isVerifying && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600 dark:text-gray-300">
              Verifying code...
            </p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Verification Successful!
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Redirecting...
            </p>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Verification Failed
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
              {error}
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSendOTP}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
