'use client';

import { AnimatePresence, type Variants, motion } from 'motion/react';
import { type ReceivedChatMessage } from '@livekit/components-react';
import { ShimmerText } from '@/components/livekit/shimmer-text';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';

const MotionMessage = motion.create('p');

const viewVariants: Variants = {
  visible: {
    opacity: 1,
    transition: {
      ease: [0.12, 0, 0.39, 0],
      duration: 0.5,
      delay: 0.8,
    },
  },
  hidden: {
    opacity: 0,
    transition: {
      ease: [0.12, 0, 0.39, 0],
      duration: 0.5,
      delay: 0,
    },
  },
};

const VIEW_MOTION_PROPS = {
  variants: viewVariants,
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
} as const;

interface PreConnectMessageProps {
  messages?: ReceivedChatMessage[];
  className?: string;
}

export function PreConnectMessage({ className, messages = [] }: PreConnectMessageProps) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {messages.length === 0 && (
        <MotionMessage
          {...VIEW_MOTION_PROPS}
          aria-hidden={messages.length > 0}
          className={cn('pointer-events-none text-center', className)}
        >
          <ShimmerText className="text-sm font-semibold">
            {t('session.agentListening')}
          </ShimmerText>
        </MotionMessage>
      )}
    </AnimatePresence>
  );
}
