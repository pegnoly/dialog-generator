import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import useDialogsStore from "../stores/DialogStore";
import useVariantsStore from "../stores/StepsStore";
import { Button, Input, Select, Typography } from "antd";
import useSpeakersStore from "../stores/SpeakersStore";
import { Speaker } from "./types";
import TextArea from "antd/es/input/TextArea";

export function VariantDispatcher() {
    const speakers = useSpeakersStore((state) => state.speakers);
    const [currentDialog, addLabel] = useDialogsStore(useShallow((state) => [state.current_dialog, state.addLabel]));
    const [reset, counter, label, updateCounter, updateLabel, load, save] = useVariantsStore(useShallow((state) => ([
        state.reset, state.inner_counter, state.label, state.change_counter, state.change_label, state.load, state.save
    ])));

    const [newLabel, setNewLabel] = useState<string>("");

    // if new dialog was selected, then set counter to 0 and label to main
    useEffect(() => {
        if (currentDialog.id != undefined) {
            reset(); // reset will do this
        }
    }, [currentDialog]) 

    useEffect(() => {
        if (label != "" && counter != -1) {
            load(currentDialog.id!);
        }
    }, [label, counter])

    return(
        <div style={{width: '100%', display: 'flex', flexDirection: 'row'}}>
            <div style={{width: '30%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <Typography.Text>{currentDialog.name}</Typography.Text>
                <div style={{paddingTop: 20, paddingBottom: 20}}>
                    <Typography.Text style={{textAlign: 'center', fontSize: 15}}>Новый вариант диалога</Typography.Text>
                    <Input onChange={(e) => setNewLabel(e.currentTarget.value)}/>
                    <Button 
                        onClick={() => addLabel(newLabel)}
                        style={{width: '100%'}}>Добавить вариант</Button>
                </div>
                <div>
                    <Typography.Text style={{textAlign: 'center', fontSize: 15}}>Изменить вариант диалога</Typography.Text>
                    <Select 
                        style={{width: '100%'}} 
                        onChange={(e) => updateLabel(e)} 
                        value={label}
                    >{currentDialog.labels.map((l, i) => (
                        <Select.Option key={i} value={l}>{l}</Select.Option>
                    ))}</Select>
                </div>
                <div style={{paddingTop: 20, paddingBottom: 20}}>
                    <Typography.Text style={{textAlign: 'center', fontSize: 15}}>Переключить шаги диалога</Typography.Text>
                    <Button
                        style={{width: '100%'}}
                        onClick={() => updateCounter(counter + 1)}
                    >Следующий вариант</Button>
                    <Button
                        style={{width: '100%'}}
                        disabled={counter == 0}
                        onClick={() => updateCounter(counter - 1)}
                    >Предыдущий вариант</Button>
                </div>
                <Button 
                    onClick={() => save(currentDialog.id!)}
                >Сохранить вариант</Button>
                <Typography.Text>{counter}</Typography.Text>
            </div>
            <div style={{width: '70%', display: 'flex', flexDirection: 'column'}}>
                <VariantRenderer avaliable_speakers={speakers.filter((s) => currentDialog.speakers_ids.includes(s.id))}/>
            </div>
        </div>
    )
}

interface VariantRendererSchema {
    avaliable_speakers: Speaker[]
}

export function VariantRenderer(schema: VariantRendererSchema) {
    const [text, speaker, setText, setSpeaker] = useVariantsStore(useShallow((state) => [
        state.text, state.speaker, state.update_text, state.update_speaker
    ]));

    return (
        <>
            <div style={{paddingTop: 20, display: 'flex', flexDirection: 'row', justifyContent: 'center'}}>
                <div style={{paddingRight: 20}}>
                    <Typography.Text>Изменить персонажа этого шага</Typography.Text>
                </div>
                <Select
                    style={{width: '40%'}}
                    value={speaker}
                    onChange={(e) => setSpeaker(e)}
                >{schema.avaliable_speakers.map((s, i) => (
                    <Select.Option key={i} value={s.id}>{s.name}</Select.Option>
                ))}</Select>
            </div>
            <div style={{padding: 10}}>
                <TextArea  
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={15}/>
            </div>
        </>
    )
}