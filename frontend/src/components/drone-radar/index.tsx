import { Box, Heading, HStack, VStack } from "@chakra-ui/react"
import { OlMap } from "../ol-map"


export const DroneRadar = () => {
    return (
    <HStack w={'100%'} h={'100vh'}>
        <VStack w={'20%'}  h={'100%'}>
            <Heading>Drone Radar</Heading>
        </VStack>
        <Box w={'80%'}>
            <OlMap/>
        </Box>
    </HStack>
    );
}