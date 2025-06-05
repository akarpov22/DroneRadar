import { Input, Text, VStack } from "@chakra-ui/react";
import { Drone } from "../../utils/types"
import { useTranslation } from "react-i18next";

type ModelDescriptionProps = {drone: Drone | undefined}

export const ModelDescription = ({drone}: ModelDescriptionProps) => {
    const { t } = useTranslation();

    if (!drone?.model || drone?.model.name === 'Other')
        return null;

    const {model} = drone

    return (
        <VStack w={'90%'}>
        <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('name')}</Text>
        <Input readOnly value={model.name}/>

        <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('manufacturer')}</Text>
        <Input readOnly value={model.manufacturer}/>

        <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('max-range')}</Text>
        <Input readOnly value={model.maxRange}/>

        <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('max-speed')}</Text>
        <Input readOnly value={model.maxSpeed}/>
    </VStack>
    );
}