import { useEffect, useState } from "react";
import { Box, Button, Grid2, MenuItem, Select, Stack, TextField } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { Speaker } from "./SpeakerCreator";

type DialogStep = {
    id: string,
    variants: string[]
}

type DialogStepVariant = {
    text: string,
    speaker: string
}

export function StepRenderer(
    {speakersModels, currentDialogId}:
    {speakersModels: Speaker[], currentDialogId: string | undefined}
) {

    const [stepId, setStepId] = useState<string | undefined>();
    const [innerCounter, setInnerCounter] = useState<number>(0);
    const [variants, setVariants] = useState<string[]>([]);
    const [variant, setVariant] = useState<string | undefined>();

    // if new dialog was selected in parent component then we must to try load it first step here
    useEffect(() => {
        console.log("Current dialog id is ", currentDialogId);
        if (currentDialogId != undefined) {
            invoke("try_load_step", {dialogId: currentDialogId, innerCounter: 0})
                .then((v) => onStepLoaded(v as DialogStep))
        }
    }, [currentDialogId])

    function onStepLoaded(step: DialogStep) {
        setStepId(step.id);
        setVariants(step.variants);
        setVariant("main");
    }

    function variantChangedCallback(s: string) {
        setVariant(s);
    }

    function counterChangedCallback(n: number) {
        setInnerCounter(n);
    }

    useEffect(() => {
        if(currentDialogId != undefined) {
            invoke("try_load_step", {dialogId: currentDialogId, innerCounter: innerCounter})
            .then((v) => onStepLoaded(v as DialogStep));
        }
    }, [innerCounter])

    return(
        <>
            <Box visibility={
                // currentDialogId == null ? "hidden" : 
                "visible"}
                sx={{
                    position: "relative",
                    top: 40
                }}
            >
                <Grid2 container spacing={0.5}>
                    <Grid2 size={3.5}>
                        <StepDispatcher
                            onVariantChanged={variantChangedCallback}
                            onCounterChanged={counterChangedCallback}
                            variants={variants}
                            currentVariant={variant}
                            currentCounter={innerCounter}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <StepVariant 
                            stepId={stepId}
                            label={variant}
                            speakers={speakersModels}
                        />
                    </Grid2>
                </Grid2>
            </Box>
        </>
    )
}

// Allows to switch steps and variants 
function StepDispatcher(
    {variants, currentVariant, currentCounter, onVariantChanged, onCounterChanged}: 
    {
        variants: string[],
        currentVariant: string | undefined, 
        currentCounter: number,
        onVariantChanged: (newLabel: string) => void,
        onCounterChanged: (newCounter: number) => void
    }
) {

    function changeVariant(s: string) {
        onVariantChanged(s);
    }

    function changeCounter(n: number) {
        onCounterChanged(n);
    }

    return (
        <>
            <Stack
                sx={{
                    position: "relative",
                    top: 50,
                    left: 25
                }}
                spacing={2}
            >
                <TextField></TextField>
                <Button>Добавить вариант</Button>
                <Select defaultValue={currentVariant} onChange={(e) => changeVariant(e.target.value as string)}>
                    {variants.map((variant, index) => (
                        <MenuItem value={variant} key={index}>{variant}</MenuItem>
                    ))}
                </Select>
                <Button 
                    disabled={currentCounter == 0}
                    onClick={() => changeCounter(currentCounter - 1)}
                >Предыдущий шаг</Button>
                <Button
                    onClick={() => changeCounter(currentCounter + 1)}
                >Следующий шаг</Button>
                <label style={{
                    position: "relative",
                    left: 60
                }}>Текущий шаг</label>
                <label style={{
                    position: "relative",
                    left: 100
                }}>{currentCounter}</label>
            </Stack>
        </>
    )
}

// Here must be speakers switcher and text input
function StepVariant(
    {stepId, label, speakers}: 
    {stepId: string | undefined, label: string | undefined, speakers: Speaker[]}
) {

    const [text, setText] = useState<string>("");
    const [speaker, setSpeaker] = useState<string>("");

    useEffect(() => {
        console.log("Label was updated: ", label);
        if (stepId != undefined && label != undefined) {
            invoke("try_load_variant", {stepId: stepId, label: label}).
            then((v) => onVariantLoaded(v as DialogStepVariant));
        }
    }, [stepId, label])

    function onVariantLoaded(variant: DialogStepVariant) {
        console.log("Variant loaded: ", variant);
        setText(variant.text);
        setSpeaker(variant.speaker);
    }

    function changeText(s: string) {
        setText(s);
    }

    function changeSpeaker(s: string) {
        setSpeaker(s);
    }

    function saveVariant() {
        invoke("save_variant", {stepId: stepId, label: label, speaker: speaker, text: text});
    }

    return (
        <>
            <Stack 
                sx={{
                    position: "relative",
                    left: 140,
                    height: 50
                }} 
                justifyItems="right" 
                spacing={3}
                direction="row">
                <Select
                    sx={{
                        width: 200
                    }}
                    defaultValue={speakers.find((sp) => sp.id == speaker)?.name}
                    onChange={(e) => changeSpeaker(e.target.value as string)}
                >{
                    speakers.map((speaker, index) => (
                        <MenuItem key={index} value={speaker.id}>{speaker.name}</MenuItem>
                    ))
                }</Select>
                <Button onClick={() => saveVariant()}>Сохранить текущий вариант</Button>
            </Stack>
            <TextField
                sx={{
                    position: "relative",
                    left: 100,
                    top: 5,
                    width: 460
                }}
                onChange={(e) => changeText(e.target.value)}
                multiline
                minRows={15}
            />
        </>
    )
}