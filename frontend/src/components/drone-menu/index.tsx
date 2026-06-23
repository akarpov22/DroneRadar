import { Heading, useBreakpointValue, VStack, Button } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { useDroneSelection } from "../drone-selection-provider"
import { EditMenu } from "./edit"


export const DroneMenu = () => {
    const { selectedDrone, isDisplayOwned, setIsDisplayOwned} = useDroneSelection();
    const { t } = useTranslation()
    const isDesktop = useBreakpointValue({ base: false, md: true });


    return (
        <VStack w={isDesktop?'20%':'100%'}  h={'100%'}>
            <Heading w="100%">Drone Radar</Heading>
            {selectedDrone && <EditMenu drone={selectedDrone}/>}

            {isDesktop &&
            <Button size={'xs'} mt={'auto'} mb={3} onClick={() => setIsDisplayOwned(!isDisplayOwned)}>
                {isDisplayOwned?t('show-all'):t('show-only-owned')}
            </Button>}
        </VStack>
    )
}