import React, { createContext, useContext, useCallback, useState } from 'react';
import { YStack } from 'tamagui';
import { Text } from './Text';
import { CheckCircle2, AlertCircle, Info, XCircle } from '@tamagui/lucide-icons';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
    warning: (m) => show(m, 'warning'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <YStack
        position="absolute"
        top={60}
        left={0}
        right={0}
        alignItems="center"
        gap="$2"
        pointerEvents="box-none"
        zIndex={9999}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </YStack>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const iconMap = {
    success: <CheckCircle2 size={20} color="$success500" />,
    error: <XCircle size={20} color="$danger500" />,
    info: <Info size={20} color="$info500" />,
    warning: <AlertCircle size={20} color="$warning500" />,
  };

  return (
    <YStack
      backgroundColor="$surfaceElevated"
      borderRadius="$lg"
      padding="$3"
      paddingHorizontal="$4"
      flexDirection="row"
      alignItems="center"
      gap="$3"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      shadowRadius={12}
      elevation={6}
      maxWidth="90%"
      onPress={onDismiss}
    >
      {iconMap[toast.variant]}
      <Text variant="bodySmall" flex={1}>{toast.message}</Text>
    </YStack>
  );
};
