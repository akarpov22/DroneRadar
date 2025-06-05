import { Button, Flex, Heading, useBreakpointValue, VStack } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { useDroneSelection } from "../drone-selection-provider"
import { EditMenu } from "./edit"


export const DroneMenu = () => {
    const { selectedDrone, isDisplayOwned, setIsDisplayOwned} = useDroneSelection();
    const { i18n, t } = useTranslation()
    const isEnglish = i18n.language === 'en'
    const isDesktop = useBreakpointValue({ base: false, md: true });


    return (
        <VStack w={isDesktop?'20%':'100%'}  h={'100%'}>
            <Flex align="center" justify="space-between" w={'100%'}>
                    <Heading>Drone Radar</Heading>
                    <Button size={'xs'} onClick={() => i18n.changeLanguage(isEnglish?'uk':'en')} mx={'auto'} my={'auto'}>
                        {isEnglish?"Українська": "English"}
                    </Button>
            </Flex>
            {selectedDrone && <EditMenu drone={selectedDrone}/>}

            {isDesktop &&
            <Button size={'xs'} mt={'auto'} mb={3} onClick={() => setIsDisplayOwned(!isDisplayOwned)}>
                {isDisplayOwned?t('show-all'):t('show-only-owned')}
            </Button>}
        </VStack>
    )
}