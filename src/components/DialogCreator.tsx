import { Box, Button, IconButton, List, ListItem, MenuItem, Modal, Select, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Speaker } from "./SpeakerCreator";
import DeleteIcon from '@mui/icons-material/Delete';

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

export type Dialog = {
    name: string;
    id: string;
    speakers_ids: string[];
}

export function DialogCreator(
    {speakersModels, onDialogCreated}:
    {
        speakersModels: Speaker[], 
        onDialogCreated: (d: Dialog) => void
    }
) {

    const [open, setOpen] = useState<boolean>(false);
    const [name, setName] = useState<string>("");
    const [scriptName, setScriptName] = useState<string>("");
    const [currentDirectory, setCurrentDirectory] = useState<string>("");
    const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
    const [speakers, setSpeakers] = useState<string[]>([]);

    // Called when user creates new dialog
    function setupNewDialog() {
        setOpen(true);
    }

    // Called when user enters smth into dialog name text field
    function changeDialogName(s: string) {
        setName(s);
    }

    // Called when user enters smth into dialog script name text field
    function changeDialogScriptName(s: string) {
        setScriptName(s);
    }

    // Called when user starts picking a directory
    function pickDialogDirectory() {
        invoke("pick_directory");
    }

    // Called when directory is successfully picked
    listen<string>("directory_picked", (event) => {
        setCurrentDirectory(event.payload);
    });

    function selectSpeaker(s: string) {
        setSelectedSpeaker(s)
    }

    function confirmSpeakerSelection() {
        if ((speakers.find((s) => s == selectedSpeaker)) == undefined) {
            setSpeakers([
                ...speakers,
                selectedSpeaker
            ]);    
        } 
    }

    function removeSpeaker(sp: string) {
        setSpeakers(speakers.filter((s) => s != sp))
    }

    // Called when dialog is fully created. Sends created dialog to backend and to parent component.
    function createDialog() {
        invoke("create_dialog", {
            name: name,
            scriptName: scriptName,
            directory: currentDirectory,
            speakers: speakers
        }).then((v) => onDialogCreated(v as Dialog));
        setOpen(false);
    }
  
    return (
        <>
            <Button 
                onClick={() => setupNewDialog()} 
                style={{width: 150}}
            >Новый диалог</Button>
            <Modal
                open={open}
            >
            <Box sx={style}>
                <Stack 
                    direction="column" 
                    spacing={5}>
                    <TextField 
                        onChange={(e) => changeDialogName(e.target.value)}
                        label="Название диалога"/>
                    <TextField 
                        onChange={(e) => changeDialogScriptName(e.target.value)}
                        label="Скриптовое имя диалога"/>
                    <Button
                        onClick={() => pickDialogDirectory()}
                    >Указать путь к папке диалога</Button>
                    <Stack
                        direction="row" 
                        spacing={5} 
                        justifyContent="center"
                    >
                        <Select 
                            sx={{
                                width: 150
                            }}
                            onChange={(e) => selectSpeaker(e.target.value as string)}
                        >
                            {speakersModels.map((speaker, index) => (
                                <MenuItem value={speaker.id} key={index}>{speaker.name}</MenuItem>
                            ))}
                        </Select>
                        <Button
                            onClick={() => confirmSpeakerSelection()}
                        >Выбрать персонажа</Button>
                    </Stack>
                    <List 
                            sx={{
                                width: '75%',
                                maxWidth: 250,
                                bgcolor: 'background.paper',
                                position: 'relative',
                                left: 75,
                                overflow: 'auto',
                                maxHeight: 150,
                                '& ul': { padding: 0 },
                            }}
                        >{speakers.map((sp) => (
                            <ListItem 
                                value={sp}
                                secondaryAction={
                                    <IconButton onClick={() => removeSpeaker(sp)}>
                                        <DeleteIcon/>
                                    </IconButton>
                                }
                            >
                            {speakersModels.find((sm) => sm.id == sp)?.name}</ListItem>
                        ))}</List>
                    <Stack 
                        direction="row" spacing={5} justifyContent="center">
                        <Button
                            onClick={() => createDialog()}
                        >Создать диалог</Button>
                        <Button
                            onClick={() => setOpen(false)} 
                        >Отмена</Button>
                    </Stack>
                </Stack>
            </Box>
            </Modal>
        </>
    )
} 