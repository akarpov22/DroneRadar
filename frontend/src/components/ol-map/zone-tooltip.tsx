import React from 'react';
import { Box, CloseButton, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface ZoneTooltipProps {
  text: string;
  onClose: () => void;
}

export const ZoneTooltip: React.FC<ZoneTooltipProps> = ({ text, onClose }) => {
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      top={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
      bg="rgba(255, 255, 255, 0.92)"
      border="1px solid"
      borderColor="blackAlpha.200"
      borderRadius="md"
      shadow="lg"
      w="min(400px, calc(100% - 2rem))"
      maxH="min(280px, 45vh)"
      fontSize="sm"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Flex
        align="center"
        justify="space-between"
        gap={2}
        px={3}
        py={2}
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="blackAlpha.100"
        bg="rgba(255, 255, 255, 0.95)"
      >
        <Text fontWeight="semibold" fontSize="sm" lineHeight="short">
          {t('flight-zone-description')}
        </Text>
        <CloseButton size="sm" onClick={onClose} />
      </Flex>
      <Box
        px={3}
        py={3}
        flex="1"
        minH={0}
        overflowY="auto"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {text}
      </Box>
    </Box>
  );
};
