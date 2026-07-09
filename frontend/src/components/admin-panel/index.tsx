import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminCatalogTab } from './admin-catalog-tab';
import { AdminUsersTab } from './admin-users-tab';

type AdminPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
};

export const AdminPanel = ({ isOpen, onClose, currentUserId }: AdminPanelProps) => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      scrollBehavior="inside"
      size="lg"
      onCloseComplete={() => setTabIndex(0)}
    >
      <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(12px)" />
      <ModalContent mx={4} maxH="90vh" display="flex" flexDirection="column">
        <ModalHeader flexShrink={0}>{t('admin-panel')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6} overflowY="auto">
          <Tabs index={tabIndex} onChange={setTabIndex} variant="enclosed" colorScheme="blue">
            <TabList mb={4}>
              <Tab>{t('admin-tab-users')}</Tab>
              <Tab>{t('admin-tab-catalog')}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <AdminUsersTab isActive={isOpen && tabIndex === 0} currentUserId={currentUserId} />
              </TabPanel>
              <TabPanel px={0}>
                <AdminCatalogTab isActive={isOpen && tabIndex === 1} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
