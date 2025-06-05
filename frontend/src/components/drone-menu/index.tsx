import { Button, Input, Text, VStack } from "@chakra-ui/react"
import { Drone } from "../drone-data-provider"
import { useTranslation } from "react-i18next"

type DroneMenuProps = {drone: Drone | undefined}

export const DroneMenu = ({drone}: DroneMenuProps) => {
    const { t } = useTranslation();

    if (!drone)
        return null;

    return (
    <VStack w={'90%'}>
        <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('yours-drone')}</Text>
        <Input type="text" placeholder={`${t('enter-serial-number')}...`} variant={'subtle'}/>
        <Button ml={'auto'} size={'xs'}>{t('manage')}</Button>
    </VStack>
    )
}