import { useState } from "react";
import { Box, Button, MenuItem, Modal, Select, Stack, TextField } from "@mui/material";
import { HexColorPicker } from "react-colorful";
import { invoke } from "@tauri-apps/api/core";

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

export enum SpeakerType {
    Hero = "Hero",
    Creature = "Creature"
}
  
export type Speaker = {
    id: string;
    name: string;
}

export function SpeakerCreator(
    {onSpeakerCreated}:
    {
        onSpeakerCreated: (s: Speaker) => void
    }
) {

    const [open, setOpen] = useState<boolean>(false);
    const [type, setType] = useState<SpeakerType>(SpeakerType.Hero);
    const [color, setColor] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [scriptName, setScriptName] = useState<string>("");

    function changeColor(s: string) {
        setColor(s);
    }

    function changeType(st: SpeakerType) {
        setType(st);
    }
    
    function changeName(s: string) {
        setName(s);
    }

    function changeScriptName(s: string) {
        setScriptName(s);
    }

    function createSpeaker() {
        invoke("create_speaker", {
            name: name,
            scriptName: scriptName,
            color: color,
            speakerType: type
        }).then((v) => onSpeakerCreated(v as Speaker));
    }

    return (
        <>
            <Button onClick={() => setOpen(true)}
                style={{width: 150}}
            >Добавить персонажа</Button>
            <Modal
                open={open}
            >
                <Box sx={style}>
                    <Stack 
                        direction="column" 
                        spacing={2} 
                        justifyContent="center"
                    >
                        <TextField 
                            onChange={(e) => changeName(e.target.value)}
                            label="Имя персонажа"/>
                        <TextField
                            onChange={(e) => changeScriptName(e.target.value)} 
                            label="Скриптовое имя персонажа"/>
                        <Select
                            onChange={(e) => changeType(e.target.value as SpeakerType)}
                        >
                            <MenuItem value={SpeakerType.Creature}>Существо</MenuItem>
                            <MenuItem value={SpeakerType.Hero}>Герой</MenuItem>
                        </Select>
                        <HexColorPicker
                            onChange={(s) => changeColor(s)}/>
                        <Button
                            onClick={() => createSpeaker()}
                        >Создать</Button>
                        <Button
                            onClick={() => setOpen(false)}
                        >Закрыть</Button>
                    </Stack>
                </Box>
            </Modal>
        </>
    )
}