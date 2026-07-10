import { Heading, useBreakpointValue, VStack, Box, Button } from "@chakra-ui/react"
import { useTranslation } from "react-i18next"
import { UserZonesSidebar } from "../user-zones-sidebar"
import { DroneList } from "./drone-list"
import { NotificationCenter } from "../notification-center"
import { useDroneSelection } from "../drone-selection-provider"

export const DroneMenu = () => {
    const { t } = useTranslation()
    const { showOnlyMine, setShowOnlyMine, canManageDrones } = useDroneSelection()
    const isDesktop = useBreakpointValue({ base: false, md: true });

    return (
        <VStack w={isDesktop?'20%':'100%'} h={'100%'} align="stretch" spacing={0} overflow="hidden">
            <Heading w="100%" flexShrink={0} px={2} pt={2}>Drone Radar</Heading>

            <Box flexShrink={0} px={2} overflow="hidden">
                <UserZonesSidebar />
            </Box>

            <Box
                flex={1}
                minH={0}
                px={2}
                w="100%"
                display="flex"
                flexDirection="column"
                overflow="hidden"
            >
                <DroneList />
                {canManageDrones && <NotificationCenter />}
            </Box>

            {canManageDrones && (
                <Button
                    size="xs"
                    mb={3}
                    mx={2}
                    flexShrink={0}
                    variant="outline"
                    onClick={() => setShowOnlyMine((value) => !value)}
                >
                    {showOnlyMine ? t('show-all') : t('show-only-owned')}
                </Button>
            )}
        </VStack>
    )
}
