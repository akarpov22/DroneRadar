import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { OlMap } from "../ol-map"


export const DroneMap = () => {

    return <HStack h={'100%'} w={'100%'}>
        <VStack w={'20%'} h={"100%"}>
            <Heading>Drone Radar</Heading>
        </VStack>
        <Box w={'80%'}>
            <OlMap/>
        </Box>
    </HStack>
}