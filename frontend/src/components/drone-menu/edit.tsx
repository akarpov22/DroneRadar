import { Button, Input, Select, Text, VStack } from "@chakra-ui/react"
import { Drone } from "../../utils/types" 
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useDrones } from "../drone-data-provider"
import { ModelDescription } from "./model-description"
import { useMutation } from "@apollo/client"
import { ASSIGN_MODEL } from "../../utils/graphql-queries"

type EditMenuProps = {drone: Drone | undefined}

export const EditMenu = ({drone}: EditMenuProps) => {
    const [ assignModelMutation ] = useMutation(ASSIGN_MODEL, {refetchQueries: 'active'})
    const { models } = useDrones();
    const { t } = useTranslation();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [serialNumber, setSerialNumber] = useState('')
    const [selectedModel, setSelectedModel] = useState<string | null>()

    const defaultModel = models.find(model => model.id === drone?.model?.id)

    if (!drone)
        return null;

    if (!isAccessGranted)
        return (
            <VStack w={'90%'}>
                <ModelDescription drone={drone}/>
                <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('yours-drone')}</Text>
                <Input type="text" placeholder={`${t('enter-serial-number')}...`} variant={'subtle'} onInput={(e: React.ChangeEvent<HTMLInputElement>) => setSerialNumber(e.target.value)}/>
                <Button ml={'auto'} size={'xs'} 
                onClick={() => {
                    if (serialNumber === drone.serial){
                        const myDrones: string[] = JSON.parse(localStorage.getItem('myDrones') ?? '[]');
                        localStorage.setItem('myDrones', JSON.stringify(myDrones.concat(drone.serial)));
                        setIsAccessGranted(true)
                    }
                }}
            >
                {t('manage')}
            </Button>
            </VStack>
    )

    return (
        <VStack w={'90%'}>
            <Text w={'100%'} textAlign={'left'} fontWeight={'semibold'} mt={5}>{t('drone-model')}</Text>
            <Select 
            placeholder={t('select-model')}
            value={selectedModel ?? undefined}
            onChange={(e) => {
                setSelectedModel(e.target.value ?? null)
            }}
            defaultValue={defaultModel?.id}
            >
                {models.map(model => (
                    <option value={model.id} key={model.id}>
                    {`${model.manufacturer} ${model.name}`}
                    </option>))}
            </Select>
            <Button ml={'auto'} size={'xs'} 
                onClick={(e) => {
                    assignModelMutation({variables:{ input: {
                        droneId: drone.id,
                        modelId: selectedModel
                        }
            }})
                }}
            >
                {t('save')}
            </Button>
            
        </VStack>
    )
}