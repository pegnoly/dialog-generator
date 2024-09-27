export type DialogStep = {
    id: string,
    variants: string[]
}

export type DialogStepVariant = {
    text: string,
    speaker: string
}

export enum SpeakerType {
    Hero = "Hero",
    Creature = "Creature"
}
  
export type Speaker = {
    id: string,
    name: string,
    script_name: string,
    speaker_type: SpeakerType,
    color: string
}

export type DialogLoadingModel = {
    name: string,
    id: string
}

export type Dialog = {
    name: string;
    id: string | undefined;
    script_name: string,
    speakers_ids: string[],
    labels: string[]
}