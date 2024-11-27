import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SpeakerType } from "./types";
import useSpeakersStore from "../stores/SpeakersStore";
import { Button, Input, Modal, Select, Typography } from "antd";

export function SpeakerCreator() {

    const [open, setOpen] = useState<boolean>(false);
    const [type, setType] = useState<SpeakerType>(SpeakerType.Hero);
    const [color, setColor] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [scriptName, setScriptName] = useState<string>("");

    const addSpeaker = useSpeakersStore((state) => state.create);

    function close() {
        setOpen(false);
    }

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

    return (
        <>
            <Button onClick={() => setOpen(true)}>Добавить персонажа</Button>
            <Modal
                open={open}
                onCancel={close}
                onClose={close}
                onOk={() => {
                    addSpeaker(name, scriptName, color, type);
                    setOpen(false);
                }}
            >
                <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '80%'}}>
                    <Typography.Text>Имя персонажа</Typography.Text>
                    <Input onChange={(e) => changeName(e.currentTarget.value)}/>
                    <Typography.Text>Скриптовое имя персонажа</Typography.Text>
                    <Input onChange={(e) => changeScriptName(e.currentTarget.value)}/>
                    <Typography.Text>Тип персонажа</Typography.Text>
                    <Select onChange={(e) => changeType(e)}>
                        <Select.Option key={1} value={SpeakerType.Hero}>Герой</Select.Option>
                        <Select.Option key={2} value={SpeakerType.Creature}>Существо</Select.Option>
                    </Select>
                    <Typography.Text>Цвет персонажа</Typography.Text>
                    <HexColorPicker onChange={(e) => changeColor(e)}/>
                </div>
            </Modal>
        </>
    )
    // return (
    //     <>
    //         <Button onClick={() => setOpen(true)}
    //             style={{width: 150}}
    //         >Добавить персонажа</Button>
    //         <Modal
    //             open={open}
    //         >
    //             <Box sx={style}>
    //                 <Stack 
    //                     direction="column" 
    //                     spacing={2} 
    //                     justifyContent="center"
    //                 >
    //                     <TextField 
    //                         onChange={(e) => changeName(e.target.value)}
    //                         label="Имя персонажа"/>
    //                     <TextField
    //                         onChange={(e) => changeScriptName(e.target.value)} 
    //                         label="Скриптовое имя персонажа"/>
    //                     <Select
    //                         onChange={(e) => changeType(e.target.value as SpeakerType)}
    //                     >
    //                         <MenuItem value={SpeakerType.Creature}>Существо</MenuItem>
    //                         <MenuItem value={SpeakerType.Hero}>Герой</MenuItem>
    //                     </Select>
    //                     <HexColorPicker
    //                         onChange={(s) => changeColor(s)}/>
    //                     <Button
    //                         onClick={() => createSpeaker()}
    //                     >Создать</Button>
    //                     <Button
    //                         onClick={() => setOpen(false)}
    //                     >Закрыть</Button>
    //                 </Stack>
    //             </Box>
    //         </Modal>
    //     </>
    //)
}