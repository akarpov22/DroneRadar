import { IconButton, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const switcherStyles = {
  size: 'md' as const,
  isRound: true,
  bg: 'whiteAlpha.900',
  backdropFilter: 'blur(8px)',
  shadow: 'md',
  color: 'gray.700',
  _hover: { bg: 'white' },
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const label = isEnglish ? 'UA' : 'ENG';

  return (
    <IconButton
      {...switcherStyles}
      aria-label={isEnglish ? t('lang-switch-to-uk') : t('lang-switch-to-en')}
      icon={
        <Text fontSize="xs" fontWeight="bold" lineHeight={1}>
          {label}
        </Text>
      }
      onClick={() => i18n.changeLanguage(isEnglish ? 'uk' : 'en')}
    />
  );
}
