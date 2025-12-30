import { useEffect, useRef, useState } from 'react';
import { type Transition, type Variants, motion } from 'motion/react';
import { PaperPlaneRightIcon, SpinnerIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/livekit/button';

const containerVariants: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    marginBottom: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    marginBottom: 12,
  },
};

const containerTransition: Transition = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
};

const MOTION_PROPS = {
  variants: containerVariants,
  initial: 'hidden',
  transition: containerTransition,
} as const;

interface ChatInputProps {
  chatOpen: boolean;
  isAgentAvailable?: boolean;
  onSend?: (message: string) => void;
}

export function ChatInput({
  chatOpen,
  isAgentAvailable = false,
  onSend = async () => { },
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSending(true);
      await onSend(message);
      setMessage('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const isDisabled = isSending || !isAgentAvailable || message.trim().length === 0;

  useEffect(() => {
    if (chatOpen && isAgentAvailable) return;
    // when not disabled refocus on input
    inputRef.current?.focus();
  }, [chatOpen, isAgentAvailable]);

  return (
    <motion.div
      inert={!chatOpen}
      {...MOTION_PROPS}
      animate={chatOpen ? 'visible' : 'hidden'}
      className="flex w-full overflow-hidden"
    >
      <form
        onSubmit={handleSubmit}
        className="flex grow items-center gap-3 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 p-3 shadow-lg"
      >
        <input
          autoFocus
          ref={inputRef}
          type="text"
          value={message}
          disabled={!chatOpen}
          placeholder="Type your message here... / अपना संदेश लिखें..."
          onChange={(e) => setMessage(e.target.value)}
          className="h-10 flex-1 bg-transparent text-white placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 px-2"
        />
        <Button
          size="icon"
          type="submit"
          disabled={isDisabled}
          variant={isDisabled ? 'secondary' : 'primary'}
          title={isSending ? 'Sending...' : 'Send'}
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          {isSending ? (
            <SpinnerIcon className="animate-spin h-5 w-5" weight="bold" />
          ) : (
            <PaperPlaneRightIcon weight="bold" className="h-5 w-5" />
          )}
        </Button>
      </form>
    </motion.div>
  );
}
