import { Heading, useBreakpointValue, VStack, Button, Box } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { useDroneSelection } from "../drone-selection-provider"
import { EditMenu } from "./edit"
import { UserZonesSidebar } from "../user-zones-sidebar"

export const DroneMenu = () => {
    const { selectedDrone, isDisplayOwned, setIsDisplayOwned} = useDroneSelection();
    const { t } = useTranslation()
    const isDesktop = useBreakpointValue({ base: false, md: true });


    return (
        <VStack w={isDesktop?'20%':'100%'} h={'100%'} align="stretch" spacing={0} overflow="hidden">
            <Heading w="100%" flexShrink={0} px={2} pt={2}>Drone Radar</Heading>

            <Box flexShrink={0} px={2}>
                <UserZonesSidebar />
            </Box>

            <Box flex={1} minH={0} overflowY="auto" px={2} w="100%">
                {selectedDrone && <EditMenu drone={selectedDrone}/>}
            </Box>

            {isDesktop &&
            <Button size={'xs'} mt={'auto'} mb={3} mx={2} flexShrink={0} onClick={() => setIsDisplayOwned(!isDisplayOwned)}>
                {isDisplayOwned?t('show-all'):t('show-only-owned')}
            </Button>}
        </VStack>
    )
}
