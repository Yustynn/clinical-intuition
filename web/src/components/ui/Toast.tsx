import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../../utils/theme';

interface ToastProps {
  show: boolean;
  message: string;
  theme: Theme;
}

const Toast: React.FC<ToastProps> = ({ show, message, theme }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${theme.toast} px-4 py-2 rounded shadow-lg font-mono`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;