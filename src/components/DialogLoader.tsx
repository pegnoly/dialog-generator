import { FormControl, InputLabel, Stack, Select, MenuItem, Button } from "@mui/material"

export type DialogLoadingModel = {
    name: string,
    id: string
}

export function DialogLoader({models} : {models: DialogLoadingModel[]}) {
    return(
        <>
            <Stack spacing={5} direction="column">
                <FormControl 
                    variant="standard" 
                    sx={{ m: 1, minWidth: 300, height: 15 }} 
                    style={{position: "relative", top: -10}}
                >
                    <InputLabel id="demo-simple-select-standard-label">Выбрать существующий диалог</InputLabel>
                    <Select
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        label="Выбрать существующий диалог"
                    >
                        {
                            models.map((model, index) => 
                            <MenuItem 
                                value={model.id} 
                                key={index}
                            >{model.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button>Загрузить диалог</Button>
            </Stack>
        </>
    )
}