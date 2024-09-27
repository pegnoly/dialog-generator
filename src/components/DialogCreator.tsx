import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import useDialogsStore from "../stores/DialogStore";
import useSpeakersStore from "../stores/SpeakersStore";

import { Button, Input, Modal, Select, Typography } from "antd";

export function DialogCreator() {

    const speakersList = useSpeakersStore((state) => state.speakers);
    const createDialog = useDialogsStore((state) => state.create);

    const [open, setOpen] = useState<boolean>(false); // modal's open state
    const [name, setName] = useState<string>(""); // entered dialog name
    const [scriptName, setScriptName] = useState<string>(""); // script name
    const [currentDirectory, setCurrentDirectory] = useState<string>(""); // picked dir
    const [speakers, setSpeakers] = useState<string[]>([]);

    function close() {
        setOpen(false);
    }

    async function submit() {
        createDialog(name, currentDirectory, scriptName, speakers);
        setOpen(false);
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

    function selectSpeakers(speakers: string[]) {
        setSpeakers(speakers);
    }
  
    return (
        <>
            <Button
                onClick={() => setOpen(true)} 
                style={{width: 150}}
            >Новый диалог</Button>
            <Modal
                open={open}
                onClose={close}
                onCancel={close}
                onOk={submit}
            >
                <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <div style={{width: '50%', paddingBottom: 10}}>
                        <Input
                            onChange={(e) => changeDialogName(e.target.value)} 
                            name="Название диалога"
                        />
                    </div>
                    <div style={{width: '50%', paddingBottom: 20}}>
                        <Input
                            onChange={(e) => changeDialogScriptName(e.target.value)}
                            name="Скриптовое имя диалога"
                        />
                    </div>
                    <Button
                        onClick={() => pickDialogDirectory()}
                    >Указать путь к папке диалога</Button>
                    <Typography.Text>{currentDirectory}</Typography.Text>
                    <Select
                        style={{width: '50%'}}
                        onChange={(e) => selectSpeakers(e)} 
                        mode="multiple">{speakersList.map((s, i) => (
                        <Select.Option key={i} value={s.id}>{s.name}</Select.Option>
                    ))}</Select>
                </div>
            </Modal>
        </>
    )
} 