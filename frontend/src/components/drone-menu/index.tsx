import { Button, Input, Text, VStack } from "@chakra-ui/react"
import { Drone } from "../drone-data-provider"
import { useTranslation } from "react-i18next"
import { useState } from "react"

type DroneMenuProps = {drone: Drone | undefined}

export const DroneMenu = ({drone}: DroneMenuProps) => {
    const { t } = useTranslation();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [serialNumber, setSerialNumber] = useState('')

    if (!drone)
        return null;

    if (!isAccessGranted)
        return (
            <VStack w={'90%'}>
                <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('yours-drone')}</Text>
                <Input type="text" placeholder={`${t('enter-serial-number')}...`} variant={'subtle'} onInput={(e: React.ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value)}/>
                <Button ml={'auto'} size={'xs'} 
                onClick={(e) => {
                    if (serialNumber === drone.serial)
                        setIsAccessGranted(true)
                }}
            >
                {t('manage')}
            </Button>
            </VStack>
    )

    return (
        <VStack w={'90%'}>
            <Text>Authorized</Text>
        </VStack>
    )
}