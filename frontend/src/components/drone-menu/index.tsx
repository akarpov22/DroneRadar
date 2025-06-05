import { Button, Input, Text, VStack } from "@chakra-ui/react"
import { Drone } from "../../utils/types" 
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useDrones } from "../drone-data-provider"
import { Select } from "chakra-react-select"
import { ModelDescription } from "./model-description"
import { useMutation } from "@apollo/client"
import { ASSIGN_MODEL } from "../../utils/graphql-queries"

type DroneMenuProps = {drone: Drone | undefined}

export const DroneMenu = ({drone}: DroneMenuProps) => {
    const [ assignModelMutation ] = useMutation(ASSIGN_MODEL, {refetchQueries: 'active'})
    const { models } = useDrones();
    const { t } = useTranslation();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [serialNumber, setSerialNumber] = useState('')
    const [selectedModel, setSelectedModel] = useState<string | null>()

    const options = models.map(model => (
        {
           label: `${model.manufacturer} ${model.name}`,
           value: model.id
        }));
    const defaultOption = options.find(option => option.value === drone?.model?.id)

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
            value={options.find(opt => opt.value === selectedModel)}
            onChange={(option) => {
                setSelectedModel(option?.value ?? null)
            }}
            defaultValue={defaultOption}
            options={options}
            />
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