import { Box, HStack, useBreakpointValue } from "@chakra-ui/react"
import { OlMap } from "../ol-map"
import { useDroneSelection } from "../drone-selection-provider"
import { DroneMenu } from "../drone-menu"
import { MobileDroneMenu } from "../mobile-drone-menu"
import { useEffect, useState } from "react"


export const DroneRadar = () => {
    const { selectedDrone } = useDroneSelection()
    const [isOpen, setIsOpen] = useState(false)
    const isDesktop = useBreakpointValue({ base: false, md: true });

    useEffect(() => {
        if (!!selectedDrone && !isDesktop)
            setIsOpen(true);
    }, [selectedDrone]);

    return (
    <HStack w={'100%'} h={'100vh'}>
        {isDesktop ? <DroneMenu /> : <MobileDroneMenu isOpen={isOpen} onClose={() => setIsOpen(false)}/>}
        <Box w={isDesktop?'80%':'100%'}>
            <OlMap/>
        </Box>
    </HStack>
    );
}