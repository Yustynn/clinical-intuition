import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Theme } from '../../utils/theme';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  theme: Theme;
}

const Sheet: React.FC<SheetProps> = ({ open, onClose, title, children, theme }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={`relative z-10 w-full sm:w-[560px] max-w-[95vw] ${theme.radius} p-5 ${theme.card}`}
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-sm opacity-90 space-y-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;