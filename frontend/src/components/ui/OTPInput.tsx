/**
 * Seryvo Platform - OTP Input Component
 * A 6-digit OTP input with auto-focus and paste support
 */

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OTPInputProps {
  /** Number of digits (default: 6) */
  length?: number;
  /** Called when all digits are entered */
  onComplete: (code: string) => void;
  /** Called on any change */
  onChange?: (code: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Class name for container */
  className?: string;
}

export default function OTPInput({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  className = '',
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Notify parent of changes
  useEffect(() => {
    const code = values.join('');
    onChange?.(code);
    if (code.length === length && values.every(v => v !== '')) {
      onComplete(code);
    }
  }, [values, length, onComplete, onChange]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.select();
    }
  }, [length]);

  const handleChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  }, [values, length, focusInput]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // If current input is empty, go back to previous
        focusInput(index - 1);
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
      } else {
        // Clear current input
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
      e.preventDefault();
    }
  }, [values, length, focusInput]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '').slice(0, length);
    
    if (digits.length > 0) {
      const newValues = [...values];
      for (let i = 0; i < digits.length; i++) {
        newValues[i] = digits[i];
      }
      setValues(newValues);
      
      // Focus the next empty input or the last one
      const nextEmpty = newValues.findIndex(v => v === '');
      focusInput(nextEmpty >= 0 ? nextEmpty : length - 1);
    }
  }, [values, length, focusInput]);

  const handleFocus = useCallback((index: number) => {
    inputRefs.current[index]?.select();
  }, []);

  // Reset function for external use (prefixed with _ to indicate it's intentionally unused)
  const _reset = useCallback(() => {
    setValues(Array(length).fill(''));
    focusInput(0);
  }, [length, focusInput]);

  return (
    <div className={`flex gap-2 sm:gap-3 justify-center ${className}`}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={el => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            w-10 h-12 sm:w-12 sm:h-14
            text-center text-xl sm:text-2xl font-semibold
            rounded-lg border-2 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white'
            }
          `}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}

// Export a hook for external reset
export function useOTPInput() {
  const [key, setKey] = useState(0);
  const reset = useCallback(() => setKey(k => k + 1), []);
  return { key, reset };
}
