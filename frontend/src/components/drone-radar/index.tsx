import { Box, Button, Flex, Heading, HStack, Input, Spacer, Text, VStack } from "@chakra-ui/react"
import { OlMap } from "../ol-map"
import { useDroneSelection } from "../drone-selection-provider"
import { useTranslation } from "react-i18next"
import { DroneMenu } from "../drone-menu"
import { t } from "i18next"


export const DroneRadar = () => {
    const { selectedDrone, isDisplayOwned, setIsDisplayOwned} = useDroneSelection();
    const { i18n, t } = useTranslation()
    const isEnglish = i18n.language === 'en'

    return (
    <HStack w={'100%'} h={'100vh'}>
        <VStack w={'20%'}  h={'100%'}>
            <Flex align="center" justify="space-between" w={'100%'}>
                    <Heading>Drone Radar</Heading>
                    <Button size={'xs'} onClick={() => i18n.changeLanguage(isEnglish?'uk':'en')} mx={'auto'} my={'auto'}>
                        {isEnglish?"Українська": "English"}
                    </Button>
            </Flex>
            {selectedDrone && <DroneMenu drone={selectedDrone}/>}

            <Button size={'xs'} mt={'auto'} mb={3} onClick={() => setIsDisplayOwned(!isDisplayOwned)}>
                {isDisplayOwned?t('show-all'):t('show-only-owned')}
            </Button>
        </VStack>
        <Box w={'80%'}>
            <OlMap/>
        </Box>
    </HStack>
    );
}