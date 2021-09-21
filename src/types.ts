export interface BoardConfig {
	rows: number;
	columns: number;
	mines: number;
}

export type Preset = "Baby" | "Beginner" | "Intermediate" | "Expert";

export interface PresetValue extends BoardConfig {
	name: Preset;
}

export type Presets = Record<Preset, PresetValue>;

export type CellStatus =
	| "hidden"
	| "flagged"
	| "question"
	| "revealed"
	| "exploded";

export type GameState = "idle" | "active" | "won" | "lost";
