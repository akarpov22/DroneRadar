import { Box, Heading, HStack, VStack } from "@chakra-ui/react"
import { OlMap } from "../ol-map"
import {  useDrones } from "../drone-data-provider"


export const DroneRadar = () => {
    const drones = useDrones();

    console.log("drones", drones)

    return <HStack w={'100%'} h={'100vh'}>
                <VStack w={'20%'}  h={'100%'}>
                    <Heading>Drone Radar</Heading>
                </VStack>
                <Box w={'80%'}>
                    <OlMap/>
                </Box>
            </HStack>
}