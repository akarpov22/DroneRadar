import { Box, Button, Flex, Heading, HStack, Input, Spacer, Text, VStack } from "@chakra-ui/react"
import { OlMap } from "../ol-map"
import { useDroneSelection } from "../drone-selection-provider"
import { useTranslation } from "react-i18next"
import { DroneMenu } from "../drone-menu"


export const DroneRadar = () => {
    const { selectedDrone } = useDroneSelection();
    const { i18n } = useTranslation()
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
        </VStack>
        <Box w={'80%'}>
            <OlMap/>
        </Box>
    </HStack>
    );
}