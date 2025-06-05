import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@chakra-ui/react"
import { DroneMenu } from "../drone-menu"

type DroneMenuProps = {
    isOpen: boolean;
    onClose: () => void
}

export const MobileDroneMenu = ({isOpen, onClose}: DroneMenuProps) => {

    return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody>
            <DroneMenu />
        </ModalBody>
      </ModalContent>
    </Modal>
    );
}