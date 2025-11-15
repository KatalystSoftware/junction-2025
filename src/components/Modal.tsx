import React from "react";
import { Box, Text } from "ink";

interface ModalProps {
  title: string;
  color: string;
  children: React.ReactNode;
  showContinue?: boolean;
  continueText?: string;
}

/**
 * Shared Modal component for consistent modal styling across the application
 */
export function Modal({
  title,
  color,
  children,
  showContinue = true,
  continueText = "Press SPACE to continue",
}: ModalProps) {
  return (
    <Box
      flexDirection="column"
      padding={2}
      borderStyle="double"
      borderColor={color}
    >
      <Text bold color={color}>
        {title}
      </Text>
      <Text> </Text>
      {children}
      {showContinue && (
        <>
          <Text> </Text>
          <Text dimColor>{continueText}</Text>
        </>
      )}
    </Box>
  );
}
